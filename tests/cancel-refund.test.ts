import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// Mock Razorpay
const mockRefund = vi.fn();
const mockFetchMultipleRefund = vi.fn();

vi.mock("razorpay", () => ({
  default: vi.fn().mockImplementation(() => ({
    payments: {
      refund: mockRefund,
      fetchMultipleRefund: mockFetchMultipleRefund,
    },
  })),
}));

vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_key");
vi.stubEnv("RAZORPAY_KEY_SECRET", "rzp_test_secret");

import { POST } from "../src/app/api/orders/[id]/cancel/route";

function createChainableBuilder(resolvedData: any, error: any = null) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
  };
  return builder;
}

function makeRequest(orderId: string): Request {
  return new Request(`http://localhost/api/orders/${orderId}/cancel`, {
    method: "POST",
  });
}

describe("Order Cancel - Refund Safety with Dedicated Refunds Table", () => {
  const user = { id: "user-123" };
  const onlineOrder = {
    id: "order-abc",
    user_id: "user-123",
    status: "CONFIRMED",
    payment_status: "PAID",
    payment_method: "ONLINE",
    total_amount: 500,
    stock_restored: false,
  };
  const successPayment = {
    id: "pay-1",
    razorpay_payment_id: "pay_rzp_999",
    amount: 500,
    status: "SUCCESS",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user }, error: null });
  });

  it("1. Razorpay failure: leaves order un-cancelled and removes pending refund lock from refunds table", async () => {
    let refundCallCount = 0;
    const deleteBuilder = createChainableBuilder({ id: "pending-ref-id" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        return createChainableBuilder(successPayment);
      }
      if (table === "refunds") {
        refundCallCount++;
        if (refundCallCount === 1) {
          // Check existing refund in refunds table: none
          return createChainableBuilder(null, { code: "PGRST116" });
        }
        if (refundCallCount === 2) {
          // Insert PENDING lock row into refunds table
          return createChainableBuilder({ id: "pending-ref-id" });
        }
        // Cleanup delete from refunds table
        return deleteBuilder;
      }
      return createChainableBuilder(null);
    });

    mockFetchMultipleRefund.mockResolvedValue({ items: [] });
    mockRefund.mockRejectedValue(new Error("Gateway connection timeout"));

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });

    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("Refund failed. Order not cancelled.");
    expect(json.error).toContain("Gateway connection timeout");

    // Must NOT have called the DB cancel RPC
    expect(mockRpc).not.toHaveBeenCalled();
    // Must have deleted the pending refund lock from refunds table
    expect(deleteBuilder.delete).toHaveBeenCalled();
  });

  it("2. Double click: detects in-flight PENDING refund in refunds table and returns 409 without calling Razorpay", async () => {
    const existingRefundRecord = {
      id: "ref-rec-already-exists",
      status: "PENDING",
      razorpay_refund_id: null,
      created_at: new Date().toISOString(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        return createChainableBuilder(successPayment);
      }
      if (table === "refunds") {
        // Found existing PENDING refund in refunds table
        return createChainableBuilder(existingRefundRecord);
      }
      return createChainableBuilder(null);
    });

    // Razorpay says no refund has completed yet (first click still running)
    mockFetchMultipleRefund.mockResolvedValue({ items: [] });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Refund is in progress");
    // Razorpay refund MUST NOT be called again
    expect(mockRefund).not.toHaveBeenCalled();
  });

  it("3. DB failure after refund: recovers on subsequent retry without calling Razorpay again", async () => {
    const completedRefundRecord = {
      id: "ref-rec-done",
      status: "REFUNDED",
      razorpay_refund_id: "rfnd_existing_777",
      created_at: new Date().toISOString(),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        return createChainableBuilder(successPayment);
      }
      if (table === "refunds") {
        // Found existing REFUNDED record in refunds table
        return createChainableBuilder(completedRefundRecord);
      }
      return createChainableBuilder(null);
    });

    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    // CRITICAL: Razorpay refund was NOT called again
    expect(mockRefund).not.toHaveBeenCalled();
    // Atomic status update was called with the existing refund id
    expect(mockRpc).toHaveBeenCalledWith("process_order_status_update", expect.objectContaining({
      p_refund_id: "rfnd_existing_777",
      p_new_status: "CANCELLED",
    }));
  });

  it("4. COD orders: cancel directly without Razorpay calls", async () => {
    const codOrder = {
      ...onlineOrder,
      payment_method: "COD",
      payment_status: "PENDING",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") return createChainableBuilder(codOrder);
      return createChainableBuilder(null);
    });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockRefund).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith("process_order_status_update", expect.objectContaining({
      p_new_status: "CANCELLED",
    }));
  });

  it("5. Stale PENDING refund in refunds table (> 5 mins) is cleared and retry occurs", async () => {
    const existingStaleRefundRecord = {
      id: "ref-rec-stale",
      status: "PENDING",
      razorpay_refund_id: null,
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };
    let refundCallCount = 0;
    const deleteBuilder = createChainableBuilder({ id: "ref-rec-stale" });
    const updateRefundBuilder = createChainableBuilder({ id: "ref-rec-stale" });
    const updatePaymentBuilder = createChainableBuilder({ id: "pay-1" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") return createChainableBuilder(onlineOrder);
      if (table === "payments") {
        return createChainableBuilder(successPayment);
      }
      if (table === "refunds") {
        refundCallCount++;
        if (refundCallCount === 1) return createChainableBuilder(existingStaleRefundRecord);
        if (refundCallCount === 2) return deleteBuilder;
        if (refundCallCount === 3) return createChainableBuilder({ id: "new-pending-ref" });
        return updateRefundBuilder;
      }
      return createChainableBuilder(null);
    });

    mockFetchMultipleRefund.mockResolvedValue({ items: [] });
    mockRefund.mockResolvedValue({ id: "rfnd_new_success" });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });
    expect(res.status).toBe(200);
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(mockRefund).toHaveBeenCalled();
  });

  it("6. Concurrent race: unique constraint violation 23505 on refunds insert returns 409 Conflict", async () => {
    let refundCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        return createChainableBuilder(successPayment);
      }
      if (table === "refunds") {
        refundCallCount++;
        if (refundCallCount === 1) {
          // No existing refund record found when queried
          return createChainableBuilder(null, { code: "PGRST116" });
        }
        if (refundCallCount === 2) {
          // Concurrent race: insert fails with 23505 on refunds.razorpay_payment_id
          return createChainableBuilder(null, {
            code: "23505",
            message: "duplicate key value violates unique constraint \"refunds_razorpay_payment_id_key\"",
          });
        }
      }
      return createChainableBuilder(null);
    });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("Refund is in progress. Please retry shortly.");
    expect(mockRefund).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("7. Successful refund flow: updates both refunds record and original payment row", async () => {
    let refundCallCount = 0;
    let paymentCallCount = 0;
    const updateRefundBuilder = createChainableBuilder({ id: "ref-1", status: "REFUNDED" });
    const updatePaymentBuilder = createChainableBuilder({ id: "pay-1", status: "REFUNDED" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") return createChainableBuilder(onlineOrder);
      if (table === "payments") {
        paymentCallCount++;
        if (paymentCallCount === 1) return createChainableBuilder(successPayment);
        return updatePaymentBuilder;
      }
      if (table === "refunds") {
        refundCallCount++;
        if (refundCallCount === 1) return createChainableBuilder(null, { code: "PGRST116" });
        if (refundCallCount === 2) return createChainableBuilder({ id: "ref-1" });
        return updateRefundBuilder;
      }
      return createChainableBuilder(null);
    });

    mockFetchMultipleRefund.mockResolvedValue({ items: [] });
    mockRefund.mockResolvedValue({ id: "rfnd_success_123" });
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(updateRefundBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "REFUNDED",
      razorpay_refund_id: "rfnd_success_123",
    }));

    expect(updatePaymentBuilder.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "REFUNDED",
    }));
  });

  it("8. Refund update error: returns 500 when refunds table update fails after gateway refund", async () => {
    let refundCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") return createChainableBuilder(onlineOrder);
      if (table === "payments") return createChainableBuilder(successPayment);
      if (table === "refunds") {
        refundCallCount++;
        if (refundCallCount === 1) return createChainableBuilder(null, { code: "PGRST116" });
        if (refundCallCount === 2) return createChainableBuilder({ id: "ref-1" });
        // update fails
        const failingUpdate = {
          update: vi.fn(() => failingUpdate),
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: "db write failed" } }),
        };
        return failingUpdate;
      }
      return createChainableBuilder(null);
    });

    mockFetchMultipleRefund.mockResolvedValue({ items: [] });
    mockRefund.mockResolvedValue({ id: "rfnd_gateway_ok" });

    const res = await POST(makeRequest("order-abc"), { params: { id: "order-abc" } });
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("failed to update record");
  });
});
