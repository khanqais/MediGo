export type SalesMode = "otc_only" | "full";

export const OTC_ONLY_STOREFRONT_LABEL = "Prescription medicines coming soon";
export const OTC_ONLY_ORDER_ERROR =
  "Prescription medicines coming soon. Only OTC medicines can be ordered.";

export function getSalesMode(): SalesMode {
  const raw = (
    process.env.SALES_MODE ||
    process.env.NEXT_PUBLIC_SALES_MODE ||
    "otc_only"
  )
    .trim()
    .toLowerCase();
  return raw === "full" ? "full" : "otc_only";
}

export function isOtcOnlyMode(): boolean {
  return getSalesMode() === "otc_only";
}

export function isOtcMedicine(med: {
  drug_schedule?: string | null;
  drugSchedule?: string | null;
  prescription_required?: boolean | null;
  prescriptionRequired?: boolean | null;
  name?: string | null;
}): boolean {
  const rawSchedule = med.drug_schedule ?? med.drugSchedule;
  if (!rawSchedule) return false;
  const schedule = String(rawSchedule).trim().toUpperCase();
  const rx = Boolean(med.prescription_required ?? med.prescriptionRequired);
  if (schedule !== "OTC") return false;
  if (rx) return false;
  return true;
}

export function otcOnlyRejection(name?: string | null): string {
  if (name) {
    return `${OTC_ONLY_ORDER_ERROR} Cannot order ${name}.`;
  }
  return OTC_ONLY_ORDER_ERROR;
}

export function findBlockedOtcOnlyItem<T extends Parameters<typeof isOtcMedicine>[0]>(
  medicines: T[]
): T | undefined {
  if (!isOtcOnlyMode()) return undefined;
  return medicines.find((med) => !isOtcMedicine(med));
}
