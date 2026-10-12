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
   * When true, if the database / RPC errors out or times out, or when IP is unknown,
   * the request is BLOCKED (success: false).
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
  const now = Date.now();
  const resetTime = now + windowMs;

  const isUnknownIp =
    identifier === "unknown" ||
    identifier.endsWith("_unknown") ||
    identifier.endsWith(":unknown");

  if (isUnknownIp) {
    const isDev = process.env.NODE_ENV === "development";

    // Fail-closed for security-sensitive endpoints (coupon validation, auth) EXCEPT in development
    if (options.failClosed && !isDev) {
      console.warn(
        `[RATE_LIMIT_METRIC:unknown_ip_fail_closed] Blocked request with unknown IP on sensitive endpoint for key="${identifier}"`
      );
      return {
        success: false,
        limit: 0,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Shared "unknown" bucket gets a stricter limit
    limit = Math.max(1, Math.min(limit, Math.floor(limit / 5) || 5));
  }

  // Service-role client is strictly required because check_rate_limit execution
  // is revoked from PUBLIC, anon, and authenticated roles.
  const adminClient = createAdminClient();

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

    const isDev = process.env.NODE_ENV === "development";
    if (options.failClosed && !isDev) {
      // FAIL-CLOSED: Block the request for security-sensitive endpoints (coupons, auth) in production
      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetTime,
      };
    }

    // FAIL-OPEN: Allow the request to prevent customer disruption on standard endpoints or in development
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
 * Extract client IP from documented platform headers in fixed order:
 * 1. x-real-ip (Vercel / standard proxy edge)
 * 2. x-vercel-forwarded-for (Vercel edge proxy)
 * 3. cf-connecting-ip (Cloudflare)
 * 4. x-forwarded-for (only if RATE_LIMIT_TRUST_PROXY_HEADERS is enabled for non-Vercel hosts)
 *
 * When all trusted headers are missing, returns shared "unknown" bucket.
 */
export function getClientIp(req: Request): string {
  // 1. Primary: x-real-ip
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim().length > 0) {
    return realIp.trim();
  }

  // 2. Documented platform header: x-vercel-forwarded-for
  const vercelForwarded = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded && vercelForwarded.trim().length > 0) {
    return vercelForwarded.split(",")[0].trim();
  }

  // 3. Documented platform header: cf-connecting-ip (only trusted when explicitly configured behind Cloudflare or proxy trust is enabled)
  const trustCloudflare =
    process.env.RATE_LIMIT_TRUST_CLOUDFLARE === "true" ||
    process.env.RATE_LIMIT_TRUST_CLOUDFLARE === "1" ||
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === "true" ||
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === "1";

  if (trustCloudflare) {
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    if (cfConnectingIp && cfConnectingIp.trim().length > 0) {
      return cfConnectingIp.trim();
    }
  }

  // 4. x-forwarded-for (only trusted when RATE_LIMIT_TRUST_PROXY_HEADERS is explicitly set)
  const trustProxy =
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === "true" ||
    process.env.RATE_LIMIT_TRUST_PROXY_HEADERS === "1";

  if (trustProxy) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor && forwardedFor.trim().length > 0) {
      return forwardedFor.split(",")[0].trim();
    }
  }

  console.warn(
    "[RATE_LIMIT_METRIC:missing_client_ip] Missing trusted client IP header, using shared unknown bucket"
  );
  return "unknown";
}
