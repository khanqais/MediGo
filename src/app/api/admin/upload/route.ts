import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { verifyRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { auth, errorResponse } = await verifyRole(["admin", "pharmacist"]);
  if (errorResponse) return errorResponse;

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          "Cloudinary credentials not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env.local",
      },
      { status: 500 }
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  try {
    const contentType = request.headers.get("content-type") || "";

    let fileBuffer: Buffer | null = null;
    let mimeType = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      fileBuffer = Buffer.from(bytes);
      mimeType = file.type || "image/jpeg";
    } else {
      const body = await request.json();
      const base64Data = body.image || body.data;

      if (!base64Data) {
        return NextResponse.json(
          { error: "No image data provided" },
          { status: 400 }
        );
      }

      // If already a data URI
      if (base64Data.startsWith("data:")) {
        const uploadResponse = await cloudinary.uploader.upload(base64Data, {
          folder: "medigo/medicines",
          resource_type: "image",
        });

        return NextResponse.json({
          success: true,
          url: uploadResponse.secure_url,
          public_id: uploadResponse.public_id,
        });
      }

      fileBuffer = Buffer.from(base64Data, "base64");
    }

    if (!fileBuffer) {
      return NextResponse.json({ error: "Failed to read image" }, { status: 400 });
    }

    const dataUri = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;

    const uploadResponse = await cloudinary.uploader.upload(dataUri, {
      folder: "medigo/medicines",
      resource_type: "image",
    });

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      public_id: uploadResponse.public_id,
    });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload image to Cloudinary" },
      { status: 500 }
    );
  }
}
