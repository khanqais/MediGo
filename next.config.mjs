export default function nextConfig() {
  return {
    transpilePackages: ["@supabase/auth-js"],
    images: {
      formats: ["image/avif", "image/webp"],
      remotePatterns: [
        {
          protocol: "https",
          hostname: "**",
        },
        {
          protocol: "http",
          hostname: "**",
        },
      ],
      minimumCacheTTL: 86400,
    },
    experimental: {
      optimizePackageImports: [
        "lucide-react",
        "@radix-ui/react-tabs",
        "@radix-ui/react-dialog",
        "@radix-ui/react-accordion",
        "@radix-ui/react-slider",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-popover",
        "@radix-ui/react-select",
        "@radix-ui/react-tooltip",
        "sonner",
      ],
    },
    env: {
      SALES_MODE: process.env.SALES_MODE || "otc_only",
    },
  };
}
