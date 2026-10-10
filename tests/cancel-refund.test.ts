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

describe("Order Cancel - Refund Safety", () => {
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

  it("1. Razorpay failure: leaves order un-cancelled and removes pending refund lock", async () => {
    let paymentCallCount = 0;
    const deleteBuilder = createChainableBuilder({ id: "pending-ref-id" });

    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        paymentCallCount++;
        if (paymentCallCount === 1) {
          // Fetch SUCCESS payment
          return createChainableBuilder(successPayment);
        }
        if (paymentCallCount === 2) {
          // Check existing refund: none
          return createChainableBuilder(null, { code: "PGRST116" });
        }
        if (paymentCallCount === 3) {
          // Insert PENDING_REFUND
          return createChainableBuilder({ id: "pending-ref-id" });
        }
        // Cleanup delete
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
    // Must have deleted the pending refund lock
    expect(deleteBuilder.delete).toHaveBeenCalled();
  });

  it("2. Double click: detects in-flight or existing refund and does not call Razorpay twice", async () => {
    const existingRefundRecord = {
      id: "ref-rec-already-exists",
      status: "PENDING_REFUND",
      razorpay_signature: null,
    };

    let paymentCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        paymentCallCount++;
        if (paymentCallCount === 1) {
          return createChainableBuilder(successPayment);
        }
        if (paymentCallCount === 2) {
          // Found existing PENDING_REFUND from first click!
          return createChainableBuilder(existingRefundRecord);
        }
        return createChainableBuilder({ id: "updated" });
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
    // Scenario: Razorpay refund succeeded earlier, but DB cancel crashed.
    // Database has an existing REFUNDED record with signature 'rfnd_existing_777'.
    const completedRefundRecord = {
      id: "ref-rec-done",
      status: "REFUNDED",
      razorpay_signature: "rfnd_existing_777",
    };

    let paymentCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "orders") {
        return createChainableBuilder(onlineOrder);
      }
      if (table === "payments") {
        paymentCallCount++;
        if (paymentCallCount === 1) {
          return createChainableBuilder(successPayment);
        }
        if (paymentCallCount === 2) {
          // Found existing REFUNDED record!
          return createChainableBuilder(completedRefundRecord);
        }
        return createChainableBuilder({});
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

    it("5. Stale PENDING_REFUND is cleared and retry occurs", async () => {
    const existingStaleRefundRecord = {
      id: "ref-rec-stale",
      status: "PENDING_REFUND",
      razorpay_signature: null,
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    };
    let paymentCallCount = 0;
    const deleteBuilder = createChainableBuilder({ id: "ref-rec-stale" });
    mockFrom.mockImplementation((table) => {
      if (table === "orders") return createChainableBuilder(onlineOrder);
      if (table === "payments") {
        paymentCallCount++;
        if (paymentCallCount === 1) return createChainableBuilder(successPayment);
        if (paymentCallCount === 2) return createChainableBuilder(existingStaleRefundRecord);
        if (paymentCallCount === 3) return deleteBuilder;
        if (paymentCallCount === 4) return createChainableBuilder({ id: "new-pending-ref" });
        return createChainableBuilder({ id: "updated" });
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

  
});

});
