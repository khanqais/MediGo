import crypto from "crypto";

/**
 * Verify CRON_SECRET bearer token.
 * Returns true if the token matches, false otherwise.
 * Safe when lengths differ: length is checked before timingSafeEqual.
 * Never throws — returns false on any mismatch, ensuring 401 not 500.
 */
export function verifyCronSecret(request: Request): boolean {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }

    const token = authHeader.substring(7);
    const expectedToken = process.env.CRON_SECRET || "";

    if (expectedToken.length === 0) {
      return false;
    }

    const expectedBuffer = Buffer.from(expectedToken, "utf8");
    const actualBuffer = Buffer.from(token, "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}
