-- 00000000000017_hardening_security_and_roles.sql
-- Enforce actor role / ownership verification in process_order_status_update
-- and fix search_path on cleanup_rate_limits.

CREATE OR REPLACE FUNCTION public.process_order_status_update(
    p_order_id UUID,
    p_old_status TEXT,
    p_new_status TEXT,
    p_new_payment_status TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_refund_id TEXT DEFAULT NULL,
    p_is_admin_action BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_order_current RECORD;
    v_allowed_transitions TEXT[];
    v_actor_role TEXT;
BEGIN
    -- 1. Lock the order row
    SELECT * INTO v_order_current
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_current IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Verify actor permissions and ownership
    IF p_is_admin_action THEN
        IF p_changed_by IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'ADMIN_ACTOR_REQUIRED');
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_changed_by;
        IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'pharmacist') THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROLE');
        END IF;
    ELSE
        -- Customer action or automated cron (p_changed_by is NULL)
        IF p_changed_by IS NOT NULL THEN
            IF v_order_current.user_id != p_changed_by THEN
                RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_OWNERSHIP');
            END IF;
            -- Customer can only cancel
            IF p_new_status != 'CANCELLED' THEN
                RETURN jsonb_build_object('success', false, 'error', 'CUSTOMER_CAN_ONLY_CANCEL');
            END IF;
        END IF;
    END IF;

    -- 3. Optimistic lock: caller must match current status
    IF v_order_current.status != p_old_status THEN
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH',
            'current_status', v_order_current.status);
    END IF;

    -- 4. Validate transition against the state machine
    v_allowed_transitions := CASE v_order_current.status
        WHEN 'PENDING' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'PENDING_PRESCRIPTION_APPROVAL' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'CONFIRMED' THEN ARRAY['PROCESSING','PACKED','CANCELLED']
        WHEN 'PROCESSING' THEN ARRAY['PACKED','CANCELLED']
        WHEN 'PACKED' THEN ARRAY['SHIPPED','CANCELLED']
        WHEN 'SHIPPED' THEN ARRAY['OUT_FOR_DELIVERY','CANCELLED']
        WHEN 'OUT_FOR_DELIVERY' THEN ARRAY['DELIVERED','CANCELLED']
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_new_status = ANY(v_allowed_transitions)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION',
            'from', p_old_status, 'to', p_new_status,
            'allowed', to_jsonb(v_allowed_transitions));
    END IF;

    -- 5. Update the order
    UPDATE public.orders
    SET status = p_new_status,
        payment_status = COALESCE(p_new_payment_status, payment_status),
        updated_at = NOW()
    WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH');
    END IF;

    -- 6. Restore stock if cancelling or rejecting
    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    -- 7. Insert status history
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

    -- 8. Audit log for admin actions
    IF p_is_admin_action AND p_changed_by IS NOT NULL THEN
        INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
        VALUES (p_changed_by, 'UPDATE_ORDER_STATUS', 'orders', p_order_id::text,
            jsonb_build_object(
                'old_status', p_old_status,
                'new_status', p_new_status,
                'notes', p_notes,
                'refund_id', p_refund_id
            ));
    END IF;

    -- 9. Record refund in payments if refund_id provided
    IF p_refund_id IS NOT NULL THEN
        UPDATE public.payments
        SET status = 'REFUNDED',
            razorpay_signature = p_refund_id,
            updated_at = NOW()
        WHERE order_id = p_order_id AND status = 'SUCCESS';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM anon;

-- Set search_path on cleanup_rate_limits and restrict execution
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.rate_limits 
    WHERE last_refilled < now() - INTERVAL '1 day';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon;
