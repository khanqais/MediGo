/**
 * Translate low-level Supabase failures into messages an operator can act on.
 */
export interface SupabaseErrorLike {
  message?: string;
  code?: string;
}

/** True when the service-role credentials are missing, revoked, or wrong. */
export function isInvalidServiceKeyError(error?: SupabaseErrorLike | null): boolean {
  if (!error) return false;

  const message = (error.message ?? "").toLowerCase();

  return (
    message.includes("invalid api key") ||
    message.includes("invalid jwt") ||
    message.includes("jwt expired") ||
    error.code === "PGRST301"
  );
}

export const SERVICE_KEY_HELP =
  "Supabase rejected the server credentials. Copy the service_role secret key from Supabase → Project Settings → API into SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart the server.";

/** Standard 503 response for broken server credentials. */
export function serviceKeyErrorBody() {
  return {
    error: SERVICE_KEY_HELP,
    code: "INVALID_SERVICE_KEY",
  };
}
