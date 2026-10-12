import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "../src/app/api/admin/medicines/[id]/route";
import { NextRequest } from "next/server";

let currentRole = "pharmacist";

vi.mock("@/lib/auth/roles", () => ({
  verifyRole: vi.fn(async () => {
    return { auth: { id: "user_test_id", role: currentRole }, errorResponse: null };
  }),
}));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

function createChainableBuilder(resolvedData: any, error: any = null) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    update: vi.fn(() => builder),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  };
  return builder;
}

const existingMed = {
  id: "med1",
  name: "Paracetamol 500",
  slug: "paracetamol-500",
  brand: "Calpol",
  composition: "Paracetamol 500mg",
  mrp: 100,
  price: 80,
  drug_schedule: "OTC",
  reorder_level: 10,
  is_active: true,
  manufacturer: "GSK",
};

describe("Pharmacist Medicine Restrictions on PUT /api/admin/medicines/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Pharmacist changing price returns 403", async () => {
    currentRole = "pharmacist";
    mockFrom.mockReturnValue(createChainableBuilder(existingMed));

    const req = new NextRequest("http://localhost/api/admin/medicines/med1", {
      method: "PUT",
      body: JSON.stringify({
        ...existingMed,
        price: 90, // Changed from 80
        drugSchedule: "OTC",
        isActive: true,
        manufacturer: "GSK",
      }),
    });

    const res = await PUT(req, { params: { id: "med1" } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Pharmacists cannot change restricted fields/);
  });

  it("Pharmacist changing isActive returns 403", async () => {
    currentRole = "pharmacist";
    mockFrom.mockReturnValue(createChainableBuilder(existingMed));

    const req = new NextRequest("http://localhost/api/admin/medicines/med1", {
      method: "PUT",
      body: JSON.stringify({
        ...existingMed,
        price: 80,
        drugSchedule: "OTC",
        isActive: false, // Changed
        manufacturer: "GSK",
      }),
    });

    const res = await PUT(req, { params: { id: "med1" } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Pharmacists cannot change restricted fields/);
  });

  it("Pharmacist changing composition returns 403", async () => {
    currentRole = "pharmacist";
    mockFrom.mockReturnValue(createChainableBuilder(existingMed));

    const req = new NextRequest("http://localhost/api/admin/medicines/med1", {
      method: "PUT",
      body: JSON.stringify({
        ...existingMed,
        composition: "New Composition", // Changed
        price: 80,
        drugSchedule: "OTC",
        isActive: true,
        manufacturer: "GSK",
      }),
    });

    const res = await PUT(req, { params: { id: "med1" } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Pharmacists cannot change restricted fields/);
  });

  it("Pharmacist changing drug_schedule returns 403", async () => {
    currentRole = "pharmacist";
    mockFrom.mockReturnValue(createChainableBuilder(existingMed));

    const req = new NextRequest("http://localhost/api/admin/medicines/med1", {
      method: "PUT",
      body: JSON.stringify({
        ...existingMed,
        drugSchedule: "H", // Changed from OTC
        price: 80,
        isActive: true,
        manufacturer: "GSK",
      }),
    });

    const res = await PUT(req, { params: { id: "med1" } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Pharmacists cannot change restricted fields/);
  });

  it("Pharmacist changing prescription_required returns 403", async () => {
    currentRole = "pharmacist";
    mockFrom.mockReturnValue(createChainableBuilder(existingMed));

    const req = new NextRequest("http://localhost/api/admin/medicines/med1", {
      method: "PUT",
      body: JSON.stringify({
        ...existingMed,
        prescriptionRequired: true, // Changed from false
        drugSchedule: "OTC",
        price: 80,
        isActive: true,
        manufacturer: "GSK",
      }),
    });

    const res = await PUT(req, { params: { id: "med1" } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Pharmacists cannot change restricted fields/);
  });

  it("Pharmacist changing manufacturer returns 403", async () => {
    currentRole = "pharmacist";
    mockFrom.mockReturnValue(createChainableBuilder(existingMed));

    const req = new NextRequest("http://localhost/api/admin/medicines/med1", {
      method: "PUT",
      body: JSON.stringify({
        ...existingMed,
        manufacturer: "Modified Manufacturer Ltd", // Changed from GSK
        drugSchedule: "OTC",
        price: 80,
        isActive: true,
      }),
    });

    const res = await PUT(req, { params: { id: "med1" } });
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/Pharmacists cannot change restricted fields/);
  });

  it("Admin changing price, MRP, isActive, composition, manufacturer and drug_schedule succeeds with 200", async () => {
    currentRole = "admin";
    const updatedMed = {
      ...existingMed,
      mrp: 150,
      price: 120,
      drug_schedule: "H",
      is_active: false,
      composition: "New",
      manufacturer: "New Corp",
    };
    mockFrom.mockReturnValue(createChainableBuilder(updatedMed));

    const req = new NextRequest("http://localhost/api/admin/medicines/med1", {
      method: "PUT",
      body: JSON.stringify({
        name: updatedMed.name,
        slug: updatedMed.slug,
        brand: updatedMed.brand,
        composition: updatedMed.composition,
        mrp: 150,
        price: 120,
        drugSchedule: "H",
        isActive: false,
        manufacturer: "New Corp",
      }),
    });

    const res = await PUT(req, { params: { id: "med1" } });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.price).toBe(120);
    expect(json.data.mrp).toBe(150);
  });
});
