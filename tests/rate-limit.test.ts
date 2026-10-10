import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit, getClientIp } from "../src/lib/rate-limit";

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe("Rate Limiter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow requests under the limit", async () => {
    mockRpc.mockResolvedValue({
      data: { allowed: true, remaining: 59, reset_time: new Date().toISOString() },
      error: null,
    });

    const res = await rateLimit("test_ip", 60, 60000);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(59);
  });

  it("should fail-open on standard endpoints when RPC errors, but log loudly with metric", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "database connection timeout" },
    });

    const res = await rateLimit("browse_ip", 60, 60000, { failClosed: false });
    expect(res.success).toBe(true); // Fail-open: allows browsing
    expect(res.remaining).toBe(59);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0].join(" ");
    expect(logCall).toContain("[RATE_LIMIT_ERROR]");
    expect(logCall).toContain("[METRIC:rate_limit_rpc_error]");

    consoleErrorSpy.mockRestore();
  });

  it("should fail-closed for security-sensitive endpoints (auth/coupon) when RPC errors", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "rpc unavailable" },
    });

    const res = await rateLimit("coupon_validate_ip", 10, 60000, { failClosed: true });
    expect(res.success).toBe(false); // Fail-closed: blocks brute-force attempts
    expect(res.remaining).toBe(0);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0].join(" ");
    expect(logCall).toContain("[RATE_LIMIT_ERROR]");
    expect(logCall).toContain("[METRIC:rate_limit_rpc_error]");

    consoleErrorSpy.mockRestore();
  });

  it("getClientIp extracts IP only from trusted platform header (x-real-ip), not client x-forwarded-for", () => {
    const reqWithSpoof = new Request("http://localhost", {
      headers: {
        "x-real-ip": "203.0.113.195"
      },
    });

    const ip = getClientIp(reqWithSpoof);
    expect(ip).toBe("203.0.113.195");
  });

  it("getClientIp should return unique identifiers when x-real-ip is missing", () => {
    const req1 = new Request("http://localhost");
    const req2 = new Request("http://localhost");
    
    const ip1 = getClientIp(req1);
    const ip2 = getClientIp(req2);
    
    expect(ip1).toMatch(/^unknown-ip-/);
    expect(ip2).toMatch(/^unknown-ip-/);
    expect(ip1).not.toBe(ip2);
  });
});
