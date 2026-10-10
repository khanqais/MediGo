import { createAdminClient } from "@/lib/supabase/server";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface RateLimitOptions {
  /**
   * Fail-Closed strategy:
   * When true, if the database / RPC errors out or times out, the request is BLOCKED (success: false).
   * Recommended for sensitive endpoints such as authentication, password reset, and coupon validation.
   *
   * Fail-Open strategy (default, failClosed: false):
   * When false, errors allow the request through (success: true) so database hiccups do not cause
   * a full platform outage for public browsing / search.
   */
  failClosed?: boolean;
}

export async function rateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  // Service-role client is strictly required because check_rate_limit execution
  // is revoked from PUBLIC, anon, and authenticated roles.
  const adminClient = createAdminClient();
  const now = Date.now();
  const resetTime = now + windowMs;

  const { data, error } = await adminClient.rpc("check_rate_limit", {
    p_key: identifier,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error || !data) {
    // Fail loudly with structured log and metric identifier
    console.error(
      `[RATE_LIMIT_ERROR] [METRIC:rate_limit_rpc_error] RPC check_rate_limit failed for key="${identifier}". Error:`,
      error
    );

    if (options.failClosed) {
      // FAIL-CLOSED: Block the request for security-sensitive endpoints (coupons, auth)
      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetTime,
      };
    }

    // FAIL-OPEN: Allow the request to prevent customer disruption on standard endpoints
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: resetTime,
    };
  }

  const result = data as {
    allowed: boolean;
    remaining: number;
    reset_time: string;
  };

  return {
    success: result.allowed,
    limit,
    remaining: result.remaining,
    reset: new Date(result.reset_time).getTime(),
  };
}

/**
 * Extract client IP only from platform-trusted header.
 *
 * Header Selection Rationale:
 * - On Vercel, the edge proxy strips client-provided `x-real-ip` and sets it to the actual
 *   TCP client IP.
 * - The `x-forwarded-for` header can be prepended with spoofed IPs by malicious clients
 *   (e.g., `X-Forwarded-For: 1.1.1.1, client_ip`), making the first entry client-controlled.
 * - Therefore, we ONLY trust `x-real-ip` set by Vercel.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }
  return `unknown-ip-${crypto.randomUUID()}`;
}

