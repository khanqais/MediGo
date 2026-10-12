import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it("should fail-closed for security-sensitive endpoints (auth/coupon) when RPC errors in non-dev", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "rpc unavailable" },
    });

    const res = await rateLimit("coupon_validate_1.2.3.4", 10, 60000, { failClosed: true });
    expect(res.success).toBe(false); // Fail-closed: blocks brute-force attempts
    expect(res.remaining).toBe(0);

    expect(consoleErrorSpy).toHaveBeenCalled();
    const logCall = consoleErrorSpy.mock.calls[0].join(" ");
    expect(logCall).toContain("[RATE_LIMIT_ERROR]");
    expect(logCall).toContain("[METRIC:rate_limit_rpc_error]");

    consoleErrorSpy.mockRestore();
  });

  it("getClientIp extracts IP primarily from x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-real-ip": "203.0.113.195",
        "x-vercel-forwarded-for": "198.51.100.1",
        "cf-connecting-ip": "192.0.2.1",
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe("203.0.113.195");
  });

  it("getClientIp falls back to x-vercel-forwarded-for when x-real-ip is missing", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-vercel-forwarded-for": "198.51.100.5, 10.0.0.1",
        "cf-connecting-ip": "192.0.2.1",
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe("198.51.100.5");
  });

  it("getClientIp ignores cf-connecting-ip by default without RATE_LIMIT_TRUST_CLOUDFLARE or proxy trust", () => {
    const req = new Request("http://localhost", {
      headers: {
        "cf-connecting-ip": "192.0.2.77",
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe("unknown");
  });

  it("getClientIp trusts cf-connecting-ip when RATE_LIMIT_TRUST_CLOUDFLARE is enabled", () => {
    vi.stubEnv("RATE_LIMIT_TRUST_CLOUDFLARE", "true");

    const req = new Request("http://localhost", {
      headers: {
        "cf-connecting-ip": "192.0.2.77",
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe("192.0.2.77");
  });

  it("getClientIp trusts cf-connecting-ip when RATE_LIMIT_TRUST_PROXY_HEADERS is enabled", () => {
    vi.stubEnv("RATE_LIMIT_TRUST_PROXY_HEADERS", "true");

    const req = new Request("http://localhost", {
      headers: {
        "cf-connecting-ip": "192.0.2.77",
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe("192.0.2.77");
  });

  it("getClientIp ignores x-forwarded-for by default without RATE_LIMIT_TRUST_PROXY_HEADERS", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "203.0.113.88, 10.0.0.1",
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe("unknown");
  });

  it("getClientIp trusts x-forwarded-for when RATE_LIMIT_TRUST_PROXY_HEADERS is enabled", () => {
    vi.stubEnv("RATE_LIMIT_TRUST_PROXY_HEADERS", "true");

    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "203.0.113.88, 10.0.0.1",
      },
    });

    const ip = getClientIp(req);
    expect(ip).toBe("203.0.113.88");
  });

  it("getClientIp returns shared 'unknown' bucket when all headers are missing", () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const req1 = new Request("http://localhost");
    const req2 = new Request("http://localhost");

    const ip1 = getClientIp(req1);
    const ip2 = getClientIp(req2);

    expect(ip1).toBe("unknown");
    expect(ip2).toBe("unknown");
    expect(ip1).toBe(ip2);

    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnCall = consoleWarnSpy.mock.calls[0].join(" ");
    expect(warnCall).toContain("[RATE_LIMIT_METRIC:missing_client_ip]");

    consoleWarnSpy.mockRestore();
  });

  it("rateLimit fails closed immediately on unknown IP for sensitive endpoints in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await rateLimit("coupon_validate_unknown", 10, 60000, { failClosed: true });

    expect(res.success).toBe(false);
    expect(res.limit).toBe(0);
    expect(res.remaining).toBe(0);
    expect(mockRpc).not.toHaveBeenCalled();

    expect(consoleWarnSpy).toHaveBeenCalled();
    const warnCall = consoleWarnSpy.mock.calls[0].join(" ");
    expect(warnCall).toContain("[RATE_LIMIT_METRIC:unknown_ip_fail_closed]");

    consoleWarnSpy.mockRestore();
  });

  it("rateLimit NEVER fails closed on missing IP in development (NODE_ENV=development)", async () => {
    vi.stubEnv("NODE_ENV", "development");

    mockRpc.mockResolvedValue({
      data: { allowed: true, remaining: 1, reset_time: new Date().toISOString() },
      error: null,
    });

    const res = await rateLimit("coupon_validate_unknown", 10, 60000, { failClosed: true });

    // Must not fail closed immediately
    expect(res.success).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", expect.objectContaining({
      p_key: "coupon_validate_unknown",
    }));
  });

  it("rateLimit applies stricter limit for shared unknown bucket on non-sensitive endpoints", async () => {
    mockRpc.mockResolvedValue({
      data: { allowed: true, remaining: 5, reset_time: new Date().toISOString() },
      error: null,
    });

    const res = await rateLimit("search_unknown", 60, 60000, { failClosed: false });
    expect(res.success).toBe(true);

    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: "search_unknown",
      p_limit: 12,
      p_window_ms: 60000,
    });
  });
});
