-- 00000000000024_order_status_raise_exceptions.sql
-- Ensure process_order_status_update raises exceptions on ownership violation and invalid customer target status

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
    SELECT * INTO v_order_current
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_current IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: order does not exist'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_is_admin_action THEN
        IF p_changed_by IS NULL THEN
            RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED: staff actions require an admin_id'
                USING ERRCODE = 'P0001';
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_changed_by;
        IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'pharmacist') THEN
            RAISE EXCEPTION 'FORBIDDEN_ROLE: actor lacks staff privileges'
                USING ERRCODE = 'P0001';
        END IF;
    ELSE
        IF p_changed_by IS NOT NULL THEN
            IF v_order_current.user_id != p_changed_by THEN
                RAISE EXCEPTION 'FORBIDDEN_OWNERSHIP: customers can only cancel their own orders'
                    USING ERRCODE = 'P0001';
            END IF;
            IF p_new_status != 'CANCELLED' THEN
                RAISE EXCEPTION 'CUSTOMER_CAN_ONLY_CANCEL: customers may only transition to CANCELLED'
                    USING ERRCODE = 'P0001';
            END IF;
            IF v_order_current.status IN ('PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN
                RAISE EXCEPTION 'CUSTOMER_CANCEL_NOT_ALLOWED: customers cannot cancel after PACKED'
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    IF v_order_current.status != p_old_status THEN
        RAISE EXCEPTION 'STATUS_MISMATCH: current status is %', v_order_current.status
            USING ERRCODE = 'P0001';
    END IF;

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
        RAISE EXCEPTION 'INVALID_TRANSITION: cannot change status from % to %', p_old_status, p_new_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.orders
    SET status = p_new_status,
        payment_status = COALESCE(p_new_payment_status, payment_status),
        updated_at = NOW()
    WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RAISE EXCEPTION 'STATUS_MISMATCH'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

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
