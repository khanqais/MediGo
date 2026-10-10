import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const order_id = formData.get("order_id") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Server-side validation
    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPG, PNG, and PDF are allowed." }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 5MB." }, { status: 400 });
    }

    // Validate order ownership if order_id is provided
    const adminClient = createAdminClient();
    if (order_id) {
      const { data: order, error: orderError } = await adminClient
        .from("orders")
        .select("id, user_id")
        .eq("id", order_id)
        .single();

      if (orderError || !order || order.user_id !== user.id) {
        return NextResponse.json({ error: "Forbidden: order not found or does not belong to you" }, { status: 403 });
      }
    }

    // Derive file extension from validated MIME type, not from user-supplied filename
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "application/pdf": "pdf"
    };
    const fileExt = mimeToExt[file.type];
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let isValidMagic = false;
    if (file.type === "image/jpeg" && buffer.length >= 3) {
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) isValidMagic = true;
    } else if (file.type === "image/png" && buffer.length >= 8) {
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 && 
          buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) isValidMagic = true;
    } else if (file.type === "application/pdf" && buffer.length >= 4) {
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) isValidMagic = true;
    }

    if (!isValidMagic) {
      return NextResponse.json({ error: "Invalid file content. File does not match its claimed type." }, { status: 400 });
    }

    const { error: uploadError } = await adminClient.storage
      .from("prescriptions")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload file to storage" }, { status: 500 });
    }

    // Insert into prescriptions table
    const { data: prescription, error: dbError } = await adminClient
      .from("prescriptions")
      .insert({
        user_id: user.id,
        order_id: order_id || null,
        file_path: filePath,
        status: "PENDING"
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Attempt to clean up the orphaned file
      await adminClient.storage.from("prescriptions").remove([filePath]);
      return NextResponse.json({ error: "Failed to save prescription record" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: prescription });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: prescriptions, error: dbError } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (dbError) {
      return NextResponse.json({ error: "Failed to fetch prescriptions" }, { status: 500 });
    }

    // Get signed URLs for all prescriptions
    const adminClient = createAdminClient();
    const prescriptionsWithUrls = await Promise.all(prescriptions.map(async (rx) => {
      const { data, error } = await adminClient.storage
        .from("prescriptions")
        .createSignedUrl(rx.file_path, 3600); // 1 hour expiry
        
      return {
        ...rx,
        url: error ? null : data.signedUrl
      };
    }));

    return NextResponse.json({ success: true, data: prescriptionsWithUrls });
  } catch (error: any) {
    console.error("GET prescriptions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
