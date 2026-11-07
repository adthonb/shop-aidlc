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
    const slipsDir = getSlipsDir();
    const dateMatch = safeFilename.match(/^(\d{4}-\d{2}-\d{2})-/);

    let fileBuffer: Buffer;
    if (dateMatch) {
      try {
        fileBuffer = await fs.readFile(
          path.join(slipsDir, dateMatch[1], safeFilename)
        );
      } catch {
        fileBuffer = await fs.readFile(path.join(slipsDir, safeFilename));
      }
    } else {
      fileBuffer = await fs.readFile(path.join(slipsDir, safeFilename));
    }
    const ext = path.extname(safeFilename).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

    return new NextResponse(new Uint8Array(fileBuffer), {
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
