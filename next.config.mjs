export default function nextConfig() {
  return {
    transpilePackages: ["@supabase/auth-js"],
    images: {
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
    },
    experimental: {
      optimizePackageImports: [
        "lucide-react",
        "@radix-ui/react-tabs",
        "@radix-ui/react-dialog",
        "@radix-ui/react-accordion",
        "@radix-ui/react-slider",
      ],
    },
    env: {
      SALES_MODE: process.env.SALES_MODE || "otc_only",
    },
  };
}
