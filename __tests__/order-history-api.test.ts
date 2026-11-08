// @vitest-environment node
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  ensureDataDirs,
  getOrderDates,
  getOrders,
  getOrdersByDate,
  getStoreData,
  saveOrders,
} from "@/lib/storage";
import { ordersToCsv } from "@/lib/order-history";
import { OrderRecord } from "@/types/store";

vi.mock("@/lib/line", () => ({
  sendOrderToLineOA: async () => ({ sent: false }),
}));

import { POST } from "@/app/api/orders/route";
import { PATCH } from "@/app/api/admin/route";

describe("Order history storage partitioning, status audit trail, stock restoration, and CSV export", () => {
  const originalDataDir = process.env.DATA_DIR;
  let tempDataDir: string;

  beforeEach(async () => {
    tempDataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "raynue-order-history-"));
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

  it("partitions orders by dateKey into data/orders/<dateKey>.json and lists available dates descending", async () => {
    const sampleOrders: OrderRecord[] = [
      {
        id: "2026-11-07-A001-1111",
        queueNumber: "#A001",
        dateKey: "2026-11-07",
        createdAt: "2026-11-07T01:00:00.000Z",
        customerName: "สมชาย",
        customerPhone: "0811111111",
        customerContact: "",
        pickupTime: "รับทันที",
        paymentMethod: "counter",
        items: [{ id: "set-raynue-signature", name: "เซ็ตอรุณสวัสดิ์เรณู", price: 119, quantity: 2 }],
        totalQuantity: 2,
        totalAmount: 238,
        status: "pending",
        lineSent: false,
      },
      {
        id: "2026-11-06-A001-2222",
        queueNumber: "#A001",
        dateKey: "2026-11-06",
        createdAt: "2026-11-06T02:00:00.000Z",
        customerName: "สายใจ",
        customerPhone: "0822222222",
        customerContact: "",
        pickupTime: "08:00 - 08:15",
        paymentMethod: "promptpay",
        slipUrl: "/api/slips/2026-11-06-A001.jpg",
        items: [{ id: "drink-iced-kopi", name: "กาแฟโบราณเรณู", price: 50, quantity: 1 }],
        totalQuantity: 1,
        totalAmount: 50,
        status: "completed",
        lineSent: true,
      },
    ];

    await saveOrders(sampleOrders);

    const partitionNov07 = path.join(tempDataDir, "orders", "2026-11-07.json");
    const partitionNov06 = path.join(tempDataDir, "orders", "2026-11-06.json");

    expect(fs.existsSync(partitionNov07)).toBe(true);
    expect(fs.existsSync(partitionNov06)).toBe(true);

    const nov07Orders = await getOrdersByDate("2026-11-07");
    expect(nov07Orders).toHaveLength(1);
    expect(nov07Orders[0].customerName).toBe("สมชาย");

    const nov06Orders = await getOrdersByDate("2026-11-06");
    expect(nov06Orders).toHaveLength(1);
    expect(nov06Orders[0].customerName).toBe("สายใจ");

    const dates = await getOrderDates();
    expect(dates).toEqual(["2026-11-07", "2026-11-06"]);
  });

  it("records statusHistory and updatedAt on order creation and status updates, and restores stock on cancel", async () => {
    const initialStore = await getStoreData();
    const targetItem = initialStore.items[0];
    const startQty = targetItem.quantity ?? 50;

    const fd = new FormData();
    fd.set("customerName", "กิตติ");
    fd.set("customerPhone", "0899999999");
    fd.set("customerContact", "U8189cf6745fc0d808977bdb0b9f22995");
    fd.set("pickupTime", "รับทันที");
    fd.set("paymentMethod", "counter");
    fd.set("items", JSON.stringify([{ id: targetItem.id, quantity: 3 }]));

    const postRes = await POST(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: fd,
      })
    );
    expect(postRes.status).toBe(200);
    const postJson = await postRes.json();
    const createdOrder: OrderRecord = postJson.order;

    expect(createdOrder.updatedAt).toBeTruthy();
    expect(createdOrder.statusHistory).toEqual([
      { status: "pending", timestamp: createdOrder.createdAt },
    ]);

    const afterOrderStore = await getStoreData();
    expect(afterOrderStore.items[0].quantity).toBe(startQty - 3);

    // Transition to preparing
    const prepRes = await PATCH(
      new NextRequest("http://localhost/api/admin", {
        method: "PATCH",
        headers: { "x-admin-pin": "1234", "content-type": "application/json" },
        body: JSON.stringify({
          action: "update_order_status",
          orderId: createdOrder.id,
          status: "preparing",
        }),
      })
    );
    expect(prepRes.status).toBe(200);

    // Transition to cancelled -> should restore stock (+3) and append to statusHistory
    const cancelRes = await PATCH(
      new NextRequest("http://localhost/api/admin", {
        method: "PATCH",
        headers: { "x-admin-pin": "1234", "content-type": "application/json" },
        body: JSON.stringify({
          action: "update_order_status",
          orderId: createdOrder.id,
          status: "cancelled",
        }),
      })
    );
    expect(cancelRes.status).toBe(200);
    const cancelJson = await cancelRes.json();
    const updatedOrder: OrderRecord = cancelJson.orders.find(
      (o: OrderRecord) => o.id === createdOrder.id
    );

    expect(updatedOrder.status).toBe("cancelled");
    expect(updatedOrder.statusHistory).toHaveLength(3);
    expect(updatedOrder.statusHistory?.map((h) => h.status)).toEqual([
      "pending",
      "preparing",
      "cancelled",
    ]);

    const restoredStore = await getStoreData();
    expect(restoredStore.items[0].quantity).toBe(startQty);
    expect(restoredStore.items[0].soldOut).toBe(false);

    // Verify daily partition file was also updated with cancelled status
    const dateOrders = await getOrdersByDate(createdOrder.dateKey);
    expect(dateOrders[0].status).toBe("cancelled");
    expect(dateOrders[0].statusHistory).toHaveLength(3);
  });

  it("formats orders into UTF-8 BOM CSV via ordersToCsv", async () => {
    const orders: OrderRecord[] = [
      {
        id: "2026-11-07-A001-1111",
        queueNumber: "#A001",
        dateKey: "2026-11-07",
        createdAt: "2026-11-07T01:00:00.000Z",
        updatedAt: "2026-11-07T01:15:00.000Z",
        customerName: "สมชาย ใจดี",
        customerPhone: "0811111111",
        customerContact: "@somchai",
        pickupTime: "รับทันที",
        paymentMethod: "counter",
        items: [{ id: "item-1", name: "ข้าวต้มปลา, พิเศษ", price: 95, quantity: 2 }],
        totalQuantity: 2,
        totalAmount: 190,
        status: "completed",
        lineSent: true,
      },
    ];

    const csv = ordersToCsv(orders);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("queueNumber,dateKey,createdAt,updatedAt,status,customerName,customerPhone,pickupTime,paymentMethod,totalQuantity,totalAmount,items");
    expect(csv).toContain("#A001");
    expect(csv).toContain("2026-11-07");
    expect(csv).toContain("สมชาย ใจดี");
    expect(csv).toContain('"2x ข้าวต้มปลา, พิเศษ"');
  });
});
