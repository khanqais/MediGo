import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSalesMode,
  isOtcOnlyMode,
  isOtcMedicine,
  findBlockedOtcOnlyItem,
  OTC_ONLY_ORDER_ERROR,
  OTC_ONLY_STOREFRONT_LABEL,
} from "../src/lib/sales-mode";

describe("sales mode", () => {
  const originalSales = process.env.SALES_MODE;
  const originalPublic = process.env.NEXT_PUBLIC_SALES_MODE;

  afterEach(() => {
    if (originalSales === undefined) delete process.env.SALES_MODE;
    else process.env.SALES_MODE = originalSales;
    if (originalPublic === undefined) delete process.env.NEXT_PUBLIC_SALES_MODE;
    else process.env.NEXT_PUBLIC_SALES_MODE = originalPublic;
  });

  it("defaults to otc_only", () => {
    delete process.env.SALES_MODE;
    delete process.env.NEXT_PUBLIC_SALES_MODE;
    expect(getSalesMode()).toBe("otc_only");
    expect(isOtcOnlyMode()).toBe(true);
  });

  it("treats full as the only opt-in away from otc_only", () => {
    process.env.SALES_MODE = "full";
    expect(getSalesMode()).toBe("full");
    expect(isOtcOnlyMode()).toBe(false);
  });

  it("classifies OTC vs prescription / scheduled medicines", () => {
    expect(isOtcMedicine({ drugSchedule: "OTC", prescriptionRequired: false })).toBe(true);
    expect(isOtcMedicine({ drug_schedule: "OTC", prescription_required: false })).toBe(true);
    expect(isOtcMedicine({ drug_schedule: "H", prescription_required: false })).toBe(false);
    expect(isOtcMedicine({ drugSchedule: "H1" })).toBe(false);
    expect(isOtcMedicine({ drugSchedule: "X" })).toBe(false);
    expect(isOtcMedicine({ drugSchedule: "OTC", prescriptionRequired: true })).toBe(false);
    // Fail closed: NULL or undefined schedule counts as non-OTC
    expect(isOtcMedicine({ drug_schedule: null, prescription_required: false })).toBe(false);
    expect(isOtcMedicine({ drugSchedule: null, prescriptionRequired: false })).toBe(false);
    expect(isOtcMedicine({ prescription_required: false })).toBe(false);
    expect(isOtcMedicine({})).toBe(false);
  });

  it("finds blocked items only in otc_only mode", () => {
    process.env.SALES_MODE = "otc_only";
    const blocked = findBlockedOtcOnlyItem([
      { name: "Crocin", drug_schedule: "OTC", prescription_required: false },
      { name: "Amoxil", drug_schedule: "H", prescription_required: true },
    ]);
    expect(blocked?.name).toBe("Amoxil");

    process.env.SALES_MODE = "full";
    expect(
      findBlockedOtcOnlyItem([{ name: "Amoxil", drug_schedule: "H", prescription_required: true }])
    ).toBeUndefined();

    // Medicine with null drug_schedule is blocked in otc_only mode
    process.env.SALES_MODE = "otc_only";
    const nullScheduleBlocked = findBlockedOtcOnlyItem([
      { name: "Unclassified Med", drug_schedule: null, prescription_required: false },
    ]);
    expect(nullScheduleBlocked?.name).toBe("Unclassified Med");
  });

  it("exposes a clear storefront and API message", () => {
    expect(OTC_ONLY_STOREFRONT_LABEL).toBe("Prescription medicines coming soon");
    expect(OTC_ONLY_ORDER_ERROR).toContain("Only OTC medicines can be ordered");
  });
});

describe("POST /api/orders and /api/orders/validate reject non-OTC in otc_only", () => {
  const originalSales = process.env.SALES_MODE;

  beforeEach(() => {
    process.env.SALES_MODE = "otc_only";
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (originalSales === undefined) delete process.env.SALES_MODE;
    else process.env.SALES_MODE = originalSales;
    vi.doUnmock("@/lib/supabase/server");
  });

  function mockSupabase(medicines: unknown[]) {
    const user = { id: "11111111-1111-1111-1111-111111111111" };
    const from = vi.fn((table: string) => {
      const builder: any = {
        select: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        single: vi.fn(async () => {
          if (table === "addresses") {
            return { data: { id: "22222222-2222-2222-2222-222222222222" }, error: null };
          }
          return { data: null, error: null };
        }),
      };
      if (table === "medicines") {
        builder.in = vi.fn(async () => ({ data: medicines, error: null }));
      }
      return builder;
    });

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user }, error: null }) },
        from,
      }),
      createAdminClient: () => ({ from, rpc: vi.fn() }),
    }));
  }

  it("validate returns 400 for Schedule H items", async () => {
    mockSupabase([
      {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Amoxicillin",
        price: 10,
        mrp: 12,
        is_active: true,
        prescription_required: true,
        drug_schedule: "H",
        inventory: { stock_quantity: 20, reserved_quantity: 0 },
      },
    ]);

    const { POST } = await import("../src/app/api/orders/validate/route");
    const res = await POST(
      new Request("http://localhost/api/orders/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ medicine_id: "33333333-3333-3333-3333-333333333333", quantity: 1 }],
          address_id: "22222222-2222-2222-2222-222222222222",
        }),
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("OTC");
  });

  it("create order returns 400 for Schedule H items", async () => {
    mockSupabase([
      {
        id: "33333333-3333-3333-3333-333333333333",
        name: "Amoxicillin",
        price: 10,
        mrp: 12,
        is_active: true,
        prescription_required: true,
        drug_schedule: "H",
        inventory: [{ stock_quantity: 20, reserved_quantity: 0 }],
      },
    ]);

    const { POST } = await import("../src/app/api/orders/route");
    const res = await POST(
      new Request("http://localhost/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ medicine_id: "33333333-3333-3333-3333-333333333333", quantity: 1 }],
          address_id: "22222222-2222-2222-2222-222222222222",
          payment_method: "COD",
        }),
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain("OTC");
  });
});
