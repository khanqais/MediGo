-- A5. Atomic order status transition function
-- Handles cancel, reject, admin status changes in one transaction
-- with optimistic locking, history, stock restore, and audit log.

-- Valid transition map encoded in the function
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
BEGIN
    -- 1. Lock the order row
    SELECT * INTO v_order_current
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_current IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Optimistic lock: caller must know the current status
    IF v_order_current.status != p_old_status THEN
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH',
            'current_status', v_order_current.status);
    END IF;

    -- 3. Validate transition against the state machine
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

    -- 4. Update the order
    UPDATE public.orders
    SET status = p_new_status,
        payment_status = COALESCE(p_new_payment_status, payment_status),
        updated_at = NOW()
    WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        -- Concurrent modification between our SELECT FOR UPDATE and UPDATE
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH');
    END IF;

    -- 5. Restore stock if cancelling or rejecting
    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    -- 6. Insert status history
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

    -- 7. Audit log for admin actions
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

    -- 8. Record refund in payments if refund_id provided
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

-- Only callable via service_role (API routes use createAdminClient)
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM anon;
