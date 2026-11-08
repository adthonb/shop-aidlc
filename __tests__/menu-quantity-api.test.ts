// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { StoreData, OrderRecord } from "@/types/store";

let store: StoreData;
let orders: OrderRecord[];

vi.mock("@/lib/storage", () => ({
  ensureDataDirs: async () => {},
  getBangkokDateKey: () => "2026-11-07",
  generateNextQueueNumber: async () => ({ queueNumber: "#A001", dateKey: "2026-11-07" }),
  getSlipsDir: () => "/tmp",
  getStoreData: async () => structuredClone(store),
  saveStoreData: async (d: StoreData) => {
    store = structuredClone(d);
  },
  getOrders: async () => structuredClone(orders),
  saveOrders: async (o: OrderRecord[]) => {
    orders = structuredClone(o);
  },
}));

vi.mock("@/lib/line", () => ({
  sendOrderToLineOA: async () => ({ sent: false }),
}));

import { PATCH } from "@/app/api/admin/route";
import { POST } from "@/app/api/orders/route";

function freshStore(): StoreData {
  return {
    store: {
      storeName: "s",
      tagline: "t",
      isOpen: true,
      phone: "1",
      address: "a",
      promptPayId: "1",
      promptPayName: "n",
      bankName: "b",
      bankAccountName: "a",
      pickupTimeSlots: [],
    },
    categories: [],
    items: [
      {
        id: "item-1",
        categoryId: "sets",
        name: "ข้าวต้ม",
        description: "",
        price: 50,
        image: "",
        soldOut: false,
        quantity: 5,
      },
    ],
  };
}

function adminReq(body: unknown) {
  return new NextRequest("http://localhost/api/admin", {
    method: "PATCH",
    headers: { "x-admin-pin": "1234", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function orderReq(qty: number) {
  const fd = new FormData();
  fd.set("customerName", "A");
  fd.set("customerPhone", "081");
  fd.set("customerContact", "U1234567890");
  fd.set("pickupTime", "รับทันที");
  fd.set("paymentMethod", "counter");
  fd.set("items", JSON.stringify([{ id: "item-1", quantity: qty }]));
  return new NextRequest("http://localhost/api/orders", { method: "POST", body: fd });
}

beforeEach(() => {
  store = freshStore();
  orders = [];
});

describe("update_item_quantity admin action", () => {
  it("sets the quantity and keeps the item on sale when > 0", async () => {
    store.items[0].soldOut = true;
    const res = await PATCH(adminReq({ action: "update_item_quantity", itemId: "item-1", quantity: 20 }));
    expect(res.status).toBe(200);
    expect(store.items[0].quantity).toBe(20);
    expect(store.items[0].soldOut).toBe(false);
  });

  it("marks item sold out when quantity is 0", async () => {
    await PATCH(adminReq({ action: "update_item_quantity", itemId: "item-1", quantity: 0 }));
    expect(store.items[0].quantity).toBe(0);
    expect(store.items[0].soldOut).toBe(true);
  });

  it("rejects negative or non-integer quantities and unknown items", async () => {
    expect((await PATCH(adminReq({ action: "update_item_quantity", itemId: "item-1", quantity: -1 }))).status).toBe(400);
    expect((await PATCH(adminReq({ action: "update_item_quantity", itemId: "item-1", quantity: 1.5 }))).status).toBe(400);
    expect((await PATCH(adminReq({ action: "update_item_quantity", itemId: "nope", quantity: 1 }))).status).toBe(404);
    expect(store.items[0].quantity).toBe(5);
  });

  it("add_item stores the provided quantity", async () => {
    await PATCH(adminReq({ action: "add_item", item: { name: "ใหม่", price: 40, quantity: 7 } }));
    expect(store.items[1].quantity).toBe(7);
  });
});

describe("order placement respects quantity", () => {
  it("decrements stock after an order", async () => {
    const res = await POST(orderReq(2));
    expect(res.status).toBe(200);
    expect(store.items[0].quantity).toBe(3);
    expect(store.items[0].soldOut).toBe(false);
  });

  it("marks item sold out when stock reaches 0", async () => {
    const res = await POST(orderReq(5));
    expect(res.status).toBe(200);
    expect(store.items[0].quantity).toBe(0);
    expect(store.items[0].soldOut).toBe(true);
  });

  it("rejects an order exceeding remaining stock", async () => {
    const res = await POST(orderReq(6));
    expect(res.status).toBe(400);
    expect(store.items[0].quantity).toBe(5);
    expect(orders).toHaveLength(0);
  });
});
