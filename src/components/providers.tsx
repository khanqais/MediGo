"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { useAuthStore } from "@/store/authStore";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    // Yield to main thread for initial paint before starting auth subscription
    const start = () => {
      cleanup = initialize();
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const handle = (window as any).requestIdleCallback(start, { timeout: 1500 });
      return () => {
        (window as any).cancelIdleCallback(handle);
        cleanup?.();
      };
    } else {
      const timer = setTimeout(start, 50);
      return () => {
        clearTimeout(timer);
        cleanup?.();
      };
    }
  }, [initialize]);

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthInitializer>
        {children}
      </AuthInitializer>
      <Toaster position="top-center" richColors />
    </>
  );
}
