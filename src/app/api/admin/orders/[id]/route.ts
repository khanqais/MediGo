import { NextResponse } from "next/server";
import { verifyRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  try {
    const orderId = params.id;
    const adminClient = createClient();

    // 1. Fetch order
    const { data: order, error: orderError } = await adminClient
      .from("orders")
      .select(`
        *,
        profiles:user_id (id, full_name, email, phone)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Fetch order items with medicines
    const { data: items, error: itemsError } = await adminClient
      .from("order_items")
      .select(`
        id,
        quantity,
        price,
        total,
        medicine:medicine_id (id, name, brand, slug, image_url, drug_schedule, pack_size)
      `)
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    }

    // 3. Fetch status history
    const { data: history } = await adminClient
      .from("order_status_history")
      .select(`
        id,
        status,
        notes,
        created_at,
        changed_by,
        profiles:changed_by (full_name, email)
      `)
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    // 4. Fetch prescription if attached
    let prescription = null;
    const rxId = order.prescription_id;
    if (rxId) {
      const { data: rx } = await adminClient
        .from("prescriptions")
        .select("*")
        .eq("id", rxId)
        .single();

      if (rx) {
        let signedUrl = null;
        if (rx.file_path) {
          const { data } = await adminClient.storage
            .from("prescriptions")
            .createSignedUrl(rx.file_path, 3600);
          signedUrl = data?.signedUrl || null;
        }
        prescription = {
          ...rx,
          url: signedUrl,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        items: items || [],
        status_history: history || [],
        prescription,
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/orders/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
