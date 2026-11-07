// @vitest-environment node
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { ensureDataDirs, getImagesDir } from "@/lib/storage";
import { GET as GET_IMAGE } from "@/app/api/images/[filename]/route";

describe("Menu images volume storage (data/images) and GET /api/images/[filename]", () => {
  const originalDataDir = process.env.DATA_DIR;
  let tempDataDir: string;

  beforeEach(async () => {
    tempDataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "raynue-images-test-"));
    process.env.DATA_DIR = tempDataDir;
    await ensureDataDirs();
  });

  afterEach(async () => {
    if (originalDataDir === undefined) {
      delete process.env.DATA_DIR;
    } else {
      process.env.DATA_DIR = originalDataDir;
    }
    if (tempDataDir && fs.existsSync(tempDataDir)) {
      await fsp.rm(tempDataDir, { recursive: true, force: true });
    }
  });

  it("creates data/images directory via ensureDataDirs and exposes getImagesDir()", () => {
    const imagesDir = getImagesDir();
    expect(imagesDir).toBe(path.join(tempDataDir, "images"));
    expect(fs.existsSync(imagesDir)).toBe(true);
  });

  it("serves jpg, png, and webp images from data/images/<filename> with matching Content-Type", async () => {
    const jpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const webpBytes = Buffer.from("RIFFxxxxWEBPVP8 ", "ascii");

    await fsp.writeFile(path.join(getImagesDir(), "set-signature.jpg"), jpgBytes);
    await fsp.writeFile(path.join(getImagesDir(), "porridge.png"), pngBytes);
    await fsp.writeFile(path.join(getImagesDir(), "kopi.webp"), webpBytes);

    const jpgRes = await GET_IMAGE(
      new NextRequest("http://localhost/api/images/set-signature.jpg"),
      { params: Promise.resolve({ filename: "set-signature.jpg" }) }
    );
    expect(jpgRes.status).toBe(200);
    expect(jpgRes.headers.get("Content-Type")).toBe("image/jpeg");
    expect(Buffer.from(await jpgRes.arrayBuffer()).equals(jpgBytes)).toBe(true);

    const pngRes = await GET_IMAGE(
      new NextRequest("http://localhost/api/images/porridge.png"),
      { params: Promise.resolve({ filename: "porridge.png" }) }
    );
    expect(pngRes.status).toBe(200);
    expect(pngRes.headers.get("Content-Type")).toBe("image/png");

    const webpRes = await GET_IMAGE(
      new NextRequest("http://localhost/api/images/kopi.webp"),
      { params: Promise.resolve({ filename: "kopi.webp" }) }
    );
    expect(webpRes.status).toBe(200);
    expect(webpRes.headers.get("Content-Type")).toBe("image/webp");
  });

  it("returns 404 when image does not exist in data/images", async () => {
    const missingRes = await GET_IMAGE(
      new NextRequest("http://localhost/api/images/missing.jpg"),
      { params: Promise.resolve({ filename: "missing.jpg" }) }
    );
    expect(missingRes.status).toBe(404);
  });
});
