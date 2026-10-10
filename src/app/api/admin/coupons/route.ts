import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";

const couponSchema = z.object({
  code: z.string().min(3).regex(/^[A-Z0-9_-]+$/, "Uppercase letters, numbers, hyphens, and underscores only"),
  type: z.enum(["PERCENTAGE", "FLAT"]),
  value: z.coerce.number().positive(),
  minOrderAmount: z.coerce.number().nonnegative().default(0),
  maxDiscountAmount: z.coerce.number().nonnegative().optional().nullable(),
  validFrom: z.string().optional().nullable(),
  validTo: z.string().optional().nullable(),
  usageLimit: z.coerce.number().positive().optional().nullable(),
  perUserLimit: z.coerce.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const adminClient = createAdminClient();
    const { data: coupons, error } = await adminClient
      .from("coupons")
      .select(`
        *,
        redemptions:coupon_redemptions(count)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    
    // Process count
    const processedCoupons = (coupons || []).map(c => ({
      ...c,
      usage_count: c.redemptions?.[0]?.count || 0
    }));

    return NextResponse.json({ success: true, data: processedCoupons });
  } catch (err: any) {
    console.error("GET /api/admin/coupons error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin"]);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }
    
    const d = parsed.data;
    const adminClient = createAdminClient();
    
    // Check code uniqueness
    const { data: existing } = await adminClient.from("coupons").select("id").eq("code", d.code).single();
    if (existing) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
    }
    
    const { data: coupon, error } = await adminClient.from("coupons").insert({
      code: d.code,
      type: d.type,
      value: d.value,
      min_order_amount: d.minOrderAmount,
      max_discount_amount: d.maxDiscountAmount || null,
      valid_from: d.validFrom || null,
      valid_to: d.validTo || null,
      usage_limit: d.usageLimit || null,
      per_user_limit: d.perUserLimit || null,
      is_active: d.isActive,
    }).select().single();
    
    if (error) throw error;
    
    // Log to audit log
    await adminClient.from("admin_audit_log").insert({
      admin_id: auth!.id,
      action: "CREATE_COUPON",
      entity_type: "coupon",
      entity_id: coupon.id,
      details: { code: d.code }
    });

    return NextResponse.json({ success: true, data: coupon });
  } catch (err: any) {
    console.error("POST /api/admin/coupons error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
