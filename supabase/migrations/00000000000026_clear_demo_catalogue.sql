-- ---------------------------------------------------------------------------
-- Clear the demo medicine catalogue.
--
-- The storefront now shows ONLY medicines an admin publishes through
-- /admin/medicines. This migration removes the sample rows that previously
-- shipped with the repository.
--
-- Safety: if any order history references the existing medicines we deactivate
-- them instead of deleting, so invoices and order items stay intact. Public
-- storefront queries filter on `is_active = true`, so either branch leaves the
-- shop visibly empty until real stock is added.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    v_order_item_count bigint;
BEGIN
    SELECT count(*) INTO v_order_item_count FROM public.order_items;

    IF v_order_item_count = 0 THEN
        -- inventory and inventory_batches cascade from medicines.
        DELETE FROM public.medicines;
        RAISE NOTICE 'Cleared demo medicine catalogue (% rows removed).', v_order_item_count;
    ELSE
        UPDATE public.medicines SET is_active = false;
        RAISE NOTICE 'Order history found: demo medicines deactivated instead of deleted.';
    END IF;
END
$$;
