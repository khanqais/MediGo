import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import { UserRole } from "@/types/user";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Initialize auth listener — call once on mount */
  initialize: () => () => void;
  /** Fetch the profile from the profiles table */
  fetchProfile: () => Promise<void>;
  /** Sign out of Supabase */
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    // If no Supabase auth cookie exists in browser, user is anonymous.
    // Avoid loading the ~55KB Supabase client bundle on initial landing!
    if (
      typeof document !== "undefined" &&
      !document.cookie.includes("-auth-token") &&
      !document.cookie.includes("sb-")
    ) {
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return () => {};
    }

    let unsub: (() => void) | null = null;
    let active = true;

    import("@/lib/supabase/client").then(({ createClient }) => {
      if (!active) return;
      const supabase = createClient();

      // Get initial session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active) return;
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session?.user,
          isLoading: false,
        });
        if (session?.user) {
          get().fetchProfile();
        }
      });

      // Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!active) return;
        set({
          session,
          user: session?.user ?? null,
          isAuthenticated: !!session?.user,
          isLoading: false,
        });
        if (session?.user) {
          get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });

      unsub = () => subscription.unsubscribe();
    });

    return () => {
      active = false;
      if (unsub) unsub();
    };
  },

  fetchProfile: async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const userId = get().user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, avatar_url, role")
      .eq("id", userId)
      .single();

    if (!error && data) {
      set({ profile: data });
    }
  },

  logout: async () => {
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signOut();
    set({
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
    });
  },
}));
