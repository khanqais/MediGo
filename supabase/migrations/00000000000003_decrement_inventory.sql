-- Atomic inventory decrement function.
-- Uses a single UPDATE with a WHERE guard clause so that two concurrent
-- checkouts can never over-sell: the row-level lock acquired by UPDATE
-- serialises access, and the WHERE condition rejects the second caller
-- if stock has already dropped below the requested quantity.
--
-- Called from POST /api/orders as:
--   adminClient.rpc("decrement_inventory", { med_id: <uuid>, qty: <int> })
-- Returns TRUE if the deduction succeeded, FALSE if insufficient stock.

CREATE OR REPLACE FUNCTION public.decrement_inventory(med_id UUID, qty INTEGER)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE public.inventory
    SET stock_quantity = stock_quantity - qty,
        updated_at = now()
    WHERE medicine_id = med_id
      AND stock_quantity >= qty;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    RETURN rows_affected > 0;
END;
$$;

-- Only the service role (admin client) should call this.
REVOKE EXECUTE ON FUNCTION public.decrement_inventory(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_inventory(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_inventory(UUID, INTEGER) FROM anon;
