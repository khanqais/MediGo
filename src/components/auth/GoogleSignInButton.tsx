"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface GoogleSignInButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  text?: string;
  redirectTo?: string;
  className?: string;
  mode?: "login" | "register";
  iconOnly?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function GoogleLogo({ className = "w-5 h-5 shrink-0" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  text,
  redirectTo = "/profile",
  className,
  mode = "login",
  iconOnly = false,
  onClick,
  disabled,
  ...props
}: GoogleSignInButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const defaultText = mode === "register" ? "Sign up with Google" : "Sign in with Google";
  const displayText = text ?? defaultText;
  const accessibleLabel = isConnecting ? "Connecting to Google..." : displayText;

  const handleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    if (isConnecting) return;
    setIsConnecting(true);

    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : "";
      const callbackUrl = `${origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        toast.error(error.message || "Unable to connect with Google");
        setIsConnecting(false);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to connect with Google";
      toast.error(errorMessage || "Unable to connect with Google");
      setIsConnecting(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={accessibleLabel}
      aria-busy={isConnecting}
      disabled={disabled || isConnecting}
      onClick={handleSignIn}
      className={cn(
        "relative inline-flex items-center justify-center font-medium select-none",
        "bg-white border border-slate-300 text-slate-700 shadow-sm",
        "hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "active:scale-[0.98] transition-all duration-150",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100",
        iconOnly
          ? "p-2.5 rounded-xl aspect-square"
          : "w-full gap-2.5 px-4 py-2.5 text-sm rounded-xl",
        className
      )}
      {...props}
    >
      {isConnecting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin text-slate-600 shrink-0" />
          {!iconOnly && <span className="truncate">Connecting to Google...</span>}
        </>
      ) : (
        <>
          <GoogleLogo className="w-5 h-5 shrink-0" />
          {!iconOnly && <span className="truncate">{displayText}</span>}
        </>
      )}
    </button>
  );
}

export default GoogleSignInButton;
