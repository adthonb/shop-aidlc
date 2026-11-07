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

describe("Standardized slip filename (<orderId>.<ext>) and date-partitioned storage", () => {
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

  it("buildSlipFilename constructs <orderId>.<ext> matching MIME type", () => {
    expect(buildSlipFilename("2026-11-08-A001-4829", "image/png")).toBe(
      "2026-11-08-A001-4829.png"
    );
    expect(buildSlipFilename("2026-11-08-A001-4829", "image/webp")).toBe(
      "2026-11-08-A001-4829.webp"
    );
    expect(buildSlipFilename("2026-11-08-A001-4829", "image/jpeg")).toBe(
      "2026-11-08-A001-4829.jpg"
    );
  });

  it("saves uploaded PromptPay slip as <orderId>.<ext> in data/slips/<dateKey>/ and serves it via GET /api/slips/[filename]", async () => {
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
    expect(postRes.status).toBe(200);
    const { order } = await postRes.json();

    const expectedFilename = `${order.id}.png`;
    expect(order.slipUrl).toBe(`/api/slips/${expectedFilename}`);

    // Stored under data/slips/<dateKey>/<orderId>.png
    const partitionedSlipPath = path.join(getSlipsDir(), order.dateKey, expectedFilename);
    expect(fs.existsSync(partitionedSlipPath)).toBe(true);

    // Served via GET /api/slips/[filename]
    const getRes = await GET_SLIP(
      new NextRequest(`http://localhost/api/slips/${expectedFilename}`),
      { params: Promise.resolve({ filename: expectedFilename }) }
    );
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toBe("image/png");
    const servedBytes = Buffer.from(await getRes.arrayBuffer());
    expect(servedBytes.equals(pngBytes)).toBe(true);
  });

  it("maintains backward compatibility for legacy flat slips in data/slips/<filename>", async () => {
    const legacyFilename = "2026-11-01-A001-9999.jpg";
    const legacyBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    await fsp.writeFile(path.join(getSlipsDir(), legacyFilename), legacyBytes);

    const getRes = await GET_SLIP(
      new NextRequest(`http://localhost/api/slips/${legacyFilename}`),
      { params: Promise.resolve({ filename: legacyFilename }) }
    );
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toBe("image/jpeg");
  });
});
