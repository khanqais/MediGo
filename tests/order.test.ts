import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../src/app/api/admin/orders/[id]/status/route";
import { VALID_TRANSITIONS } from "../src/lib/order-status";
import { DbOrderStatus } from "../src/types/order";

let mockRole: string = "admin";
let mockAuthError: any = null;

vi.mock("@/lib/auth/roles", () => ({
  verifyRole: vi.fn(async (allowedRoles: string[]) => {
    if (mockAuthError) return { auth: null, errorResponse: mockAuthError };
    if (!allowedRoles.includes(mockRole)) {
      return {
        auth: null,
        errorResponse: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
      };
    }
    return { auth: { id: "admin-uuid-1", role: mockRole }, errorResponse: null };
  }),
}));

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

function createChainableBuilder(resolvedData: any, error: any = null) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
  };
  return builder;
}

function makeStatusRequest(orderId: string, status: string, notes?: string): Request {
  return new Request(`http://localhost/api/admin/orders/${orderId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  });
}

describe("Order State Machine & Status Updates (Real Code)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRole = "admin";
    mockAuthError = null;
  });

  describe("VALID_TRANSITIONS Definition", () => {
    it("defines correct valid next steps for non-terminal statuses", () => {
      expect(VALID_TRANSITIONS.PENDING).toEqual(["CONFIRMED", "CANCELLED"]);
      expect(VALID_TRANSITIONS.CONFIRMED).toEqual(["PROCESSING", "PACKED", "CANCELLED"]);
      expect(VALID_TRANSITIONS.PROCESSING).toEqual(["PACKED", "CANCELLED"]);
      expect(VALID_TRANSITIONS.PACKED).toEqual(["SHIPPED", "CANCELLED"]);
      expect(VALID_TRANSITIONS.SHIPPED).toEqual(["OUT_FOR_DELIVERY", "CANCELLED"]);
      expect(VALID_TRANSITIONS.OUT_FOR_DELIVERY).toEqual(["DELIVERED", "CANCELLED"]);
    });

    it("defines DELIVERED and CANCELLED as terminal states with no transitions", () => {
      expect(VALID_TRANSITIONS.DELIVERED).toEqual([]);
      expect(VALID_TRANSITIONS.CANCELLED).toEqual([]);
    });
  });

  describe("POST /api/admin/orders/[id]/status Route Handler", () => {
    it("rejects invalid status transitions with 400", async () => {
      // Order currently in PENDING cannot jump directly to DELIVERED
      mockFrom.mockReturnValue(
        createChainableBuilder({
          id: "order-1",
          status: "PENDING",
          payment_method: "ONLINE",
          payment_status: "PAID",
          stock_restored: false,
        })
      );

      const req = makeStatusRequest("order-1", "DELIVERED");
      const res = await POST(req, { params: { id: "order-1" } });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid status transition");
      expect(json.error).toContain("Cannot transition from PENDING to DELIVERED");
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("processes valid transitions and calls process_order_status_update RPC", async () => {
      mockFrom.mockReturnValue(
        createChainableBuilder({
          id: "order-1",
          status: "PENDING",
          payment_method: "ONLINE",
          payment_status: "PAID",
          stock_restored: false,
        })
      );

      mockRpc.mockResolvedValue({
        data: { success: true },
        error: null,
      });

      const req = makeStatusRequest("order-1", "CONFIRMED", "Verified by pharmacy");
      const res = await POST(req, { params: { id: "order-1" } });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("CONFIRMED");

      expect(mockRpc).toHaveBeenCalledWith("process_order_status_update", {
        p_order_id: "order-1",
        p_old_status: "PENDING",
        p_new_status: "CONFIRMED",
        p_new_payment_status: "PAID",
        p_changed_by: "admin-uuid-1",
        p_notes: "Verified by pharmacy",
        p_is_admin_action: true,
      });
    });

    it("returns 409 Conflict when concurrent modification occurs in DB", async () => {
      mockFrom.mockReturnValue(
        createChainableBuilder({
          id: "order-1",
          status: "CONFIRMED",
          payment_method: "ONLINE",
          payment_status: "PAID",
          stock_restored: false,
        })
      );

      // RPC returns error indicating status mismatch / concurrent edit
      mockRpc.mockResolvedValue({
        data: { success: false, error: "STATUS_MISMATCH" },
        error: null,
      });

      const req = makeStatusRequest("order-1", "PROCESSING");
      const res = await POST(req, { params: { id: "order-1" } });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toContain("Conflict: Order status was modified by another request.");
    });

    it("returns 403 Forbidden when called by unauthorized role (e.g. customer)", async () => {
      mockRole = "customer";

      const req = makeStatusRequest("order-1", "CONFIRMED");
      const res = await POST(req, { params: { id: "order-1" } });

      expect(res.status).toBe(403);
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });
});
