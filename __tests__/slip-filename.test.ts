// @vitest-environment node
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ensureDataDirs, getSlipsDir } from "@/lib/storage";
import { buildSlipFilename } from "@/lib/order-history";

vi.mock("@/lib/line", () => ({
  sendOrderToLineOA: async () => ({ sent: false }),
}));

import { POST } from "@/app/api/orders/route";
import { GET as GET_SLIP } from "@/app/api/slips/[filename]/route";

describe("Strict .jpg-only slip filename (<orderId>.jpg) and date-partitioned storage", () => {
  const originalDataDir = process.env.DATA_DIR;
  let tempDataDir: string;

  beforeEach(async () => {
    tempDataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "raynue-slip-test-"));
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

  it("buildSlipFilename strictly constructs <orderId>.jpg", () => {
    expect(buildSlipFilename("2026-11-08-A001-4829", "image/jpeg")).toBe(
      "2026-11-08-A001-4829.jpg"
    );
    expect(buildSlipFilename("2026-11-08-A001-4829", "image/png")).toBe(
      "2026-11-08-A001-4829.jpg"
    );
  });

  it("saves uploaded .jpg PromptPay slip as <orderId>.jpg in data/slips/<dateKey>/ and serves it via GET /api/slips/[filename]", async () => {
    const jpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const slipFile = new File([jpgBytes], "my-slip.jpg", { type: "image/jpeg" });

    const fd = new FormData();
    fd.set("customerName", "วิชาญ");
    fd.set("customerPhone", "0812345678");
    fd.set("pickupTime", "รับทันที");
    fd.set("paymentMethod", "promptpay");
    fd.set("items", JSON.stringify([{ id: "set-raynue-signature", quantity: 1 }]));
    fd.set("slip", slipFile);

    const postRes = await POST(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: fd,
      })
    );
    expect(postRes.status).toBe(200);
    const { order } = await postRes.json();

    const expectedFilename = `${order.id}.jpg`;
    expect(order.slipUrl).toBe(`/api/slips/${expectedFilename}`);

    // Stored under data/slips/<dateKey>/<orderId>.jpg
    const partitionedSlipPath = path.join(getSlipsDir(), order.dateKey, expectedFilename);
    expect(fs.existsSync(partitionedSlipPath)).toBe(true);

    // Served via GET /api/slips/[filename]
    const getRes = await GET_SLIP(
      new NextRequest(`http://localhost/api/slips/${expectedFilename}`),
      { params: Promise.resolve({ filename: expectedFilename }) }
    );
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toBe("image/jpeg");
    const servedBytes = Buffer.from(await getRes.arrayBuffer());
    expect(servedBytes.equals(jpgBytes)).toBe(true);
  });

  it("rejects non-.jpg slip uploads (e.g. .png) with 400", async () => {
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const slipFile = new File([pngBytes], "my-slip.png", { type: "image/png" });

    const fd = new FormData();
    fd.set("customerName", "วิชาญ");
    fd.set("customerPhone", "0812345678");
    fd.set("pickupTime", "รับทันที");
    fd.set("paymentMethod", "promptpay");
    fd.set("items", JSON.stringify([{ id: "set-raynue-signature", quantity: 1 }]));
    fd.set("slip", slipFile);

    const postRes = await POST(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: fd,
      })
    );
    expect(postRes.status).toBe(400);
    const body = await postRes.json();
    expect(body.error).toMatch(/\.jpg/i);
  });

  it("does not fall back to flat data/slips/<filename> and requires date-partitioned path", async () => {
    const flatFilename = "2026-11-01-A001-9999.jpg";
    const flatBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    await fsp.writeFile(path.join(getSlipsDir(), flatFilename), flatBytes);

    const getRes = await GET_SLIP(
      new NextRequest(`http://localhost/api/slips/${flatFilename}`),
      { params: Promise.resolve({ filename: flatFilename }) }
    );
    expect(getRes.status).toBe(404);
  });
});
