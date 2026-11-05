import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getSlipsDir } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await context.params;
    const safeFilename = path.basename(filename);
    const filePath = path.join(getSlipsDir(), safeFilename);

    const fileBuffer = await fs.readFile(filePath);
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Slip not found", { status: 404 });
  }
}
