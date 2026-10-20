import * as React from "react";
import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin-access";
import { UserRole } from "@/types/user";

export interface AuthenticatedUser {
  id: string;
  email?: string;
  role: UserRole;
  fullName?: string | null;
}

const requestCache =
  typeof (React as any).cache === "function"
    ? (React as any).cache
    : <T extends (...args: any[]) => any>(fn: T): T => fn;

const getProfile = requestCache(async (userId: string) => {
  const adminClient = createAdminClient();
  return adminClient
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();
});

/**
 * Server-side role check for API route handlers and server actions.
 * Verifies the user session via Supabase server client (getUser)
 * and retrieves their verified role from the profiles table.
 *
 * If the user is unauthenticated or does not possess one of the allowed roles,
 * throws an error.
 *
 * Users whose email appears in `ADMIN_EMAILS` are always treated as `admin`,
 * regardless of the role stored on their profile. This lets a single Gmail
 * address in the environment file own the portal without manual DB edits.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    const error = new Error("UNAUTHORIZED");
    (error as any).status = 401;
    throw error;
  }

  // Environment allow-list takes precedence over the stored profile role.
  if (isAdminEmail(user.email)) {
    if (!allowedRoles.includes("admin")) {
      const error = new Error("FORBIDDEN");
      (error as any).status = 403;
      throw error;
    }

    const { data: profile, error: profileError } = await getProfile(user.id);

    return {
      id: user.id,
      email: user.email || profile?.email || "",
      role: "admin",
      fullName: profileError ? null : profile?.full_name,
    };
  }

  // Fetch the role from profiles using adminClient to ensure trusted server check (cached per request)
  const { data: profile, error: profileError } = await getProfile(user.id);

  if (profileError || !profile) {
    const error = new Error("PROFILE_NOT_FOUND");
    (error as any).status = 404;
    throw error;
  }

  const role = (profile.role || "customer") as UserRole;
  if (!allowedRoles.includes(role)) {
    const error = new Error("FORBIDDEN");
    (error as any).status = 403;
    throw error;
  }

  return {
    id: user.id,
    email: user.email || profile.email,
    role,
    fullName: profile.full_name,
  };
}

/**
 * Convenience helper for API route handlers:
 * Returns { auth, errorResponse }.
 * If errorResponse is present, the route handler can return it immediately.
 */
export async function verifyRole(allowedRoles: UserRole[]) {
  try {
    const auth = await requireRole(allowedRoles);
    return { auth, errorResponse: null };
  } catch (err: any) {
    if (err.message === "UNAUTHORIZED" || err.status === 401) {
      return {
        auth: null,
        errorResponse: NextResponse.json(
          { error: "Unauthorized: Please log in to proceed" },
          { status: 401 }
        ),
      };
    }
    if (err.message === "FORBIDDEN" || err.status === 403) {
      return {
        auth: null,
        errorResponse: NextResponse.json(
          { error: "Forbidden: You do not have permission to perform this action" },
          { status: 403 }
        ),
      };
    }
    return {
      auth: null,
      errorResponse: NextResponse.json(
        { error: "Authentication failed" },
        { status: 500 }
      ),
    };
  }
}
