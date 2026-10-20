/**
 * Central admin access rules.
 *
 * Access to the /admin portal is granted when EITHER:
 *  1. The signed-in user's email is listed in the `ADMIN_EMAILS`
 *     environment variable (comma-separated, case-insensitive), OR
 *  2. The user's profile role is `admin` or `pharmacist`.
 *
 * `ADMIN_EMAILS` is the primary, environment-driven gate. It is read on the
 * server only, so the list is never shipped to the browser.
 *
 * This module is intentionally dependency-free so it can be imported from
 * middleware (Edge runtime), server components, and API route handlers.
 */

export const ADMIN_PORTAL_ROLES = ["admin", "pharmacist"] as const;

/** Parse the ADMIN_EMAILS env var into a normalised list of addresses. */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

/** True when the given email is explicitly allow-listed for the admin portal. */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;

  const normalised = email.trim().toLowerCase();
  if (!normalised) return false;

  const allowList = getAdminEmails();
  if (allowList.length === 0) return false;

  return allowList.includes(normalised);
}

/**
 * True when the user may enter the admin portal, either because their email is
 * allow-listed or because they hold a privileged database role.
 */
export function hasAdminPortalAccess(
  email?: string | null,
  role?: string | null
): boolean {
  if (isAdminEmail(email)) return true;
  return role === "admin" || role === "pharmacist";
}
