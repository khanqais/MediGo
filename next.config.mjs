import { PHASE_PRODUCTION_BUILD } from "next/constants.js";

function assertProductionComplianceEnv() {
  const shouldEnforce =
    process.env.VERCEL_ENV === "production" ||
    process.env.COMPLIANCE_CHECK === "strict";
  if (!shouldEnforce) return;

  const complianceKeys = [
    "NEXT_PUBLIC_DRUG_LICENSE_NO",
    "NEXT_PUBLIC_LICENSING_AUTHORITY",
    "NEXT_PUBLIC_REGISTERED_ENTITY",
    "NEXT_PUBLIC_SUPPORT_PHONE",
    "NEXT_PUBLIC_SUPPORT_EMAIL",
  ];

  const pendingKeys = new Set();

  for (const key of Object.keys(process.env)) {
    if (!key.startsWith("NEXT_PUBLIC_")) continue;
    const value = String(process.env[key] ?? "");
    if (value.toUpperCase().includes("PENDING")) {
      pendingKeys.add(key);
    }
  }

  // Unset values still resolve to PENDING-* defaults in src/config/site.ts
  for (const key of ["NEXT_PUBLIC_DRUG_LICENSE_NO", "NEXT_PUBLIC_LICENSING_AUTHORITY", "NEXT_PUBLIC_REGISTERED_ENTITY"]) {
    const value = process.env[key];
    if (!value || value.toUpperCase().includes("PENDING")) {
      pendingKeys.add(key);
    }
  }

  if (pendingKeys.size > 0) {
    throw new Error(
      `Production build blocked: these NEXT_PUBLIC compliance values still contain PENDING (or are unset and default to PENDING): ${[...pendingKeys].join(", ")}`
    );
  }

  void complianceKeys;
}

export default function nextConfig(phase) {
  const isBuild = process.argv.some((arg) => arg.includes("build"));
  if (
    isBuild &&
    (process.env.VERCEL_ENV === "production" ||
      process.env.COMPLIANCE_CHECK === "strict")
  ) {
    assertProductionComplianceEnv();
  }

  return {
    transpilePackages: ["@supabase/auth-js"],
    env: {
      SALES_MODE: process.env.SALES_MODE || "otc_only",
    },
  };
}
