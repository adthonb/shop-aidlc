import { NextRequest, NextResponse } from "next/server";
import {
  getBangkokDateKey,
  getOrders,
  getStoreData,
  saveOrders,
  saveStoreData,
} from "@/lib/storage";
import { MenuItem, OrderRecord } from "@/types/store";

export const dynamic = "force-dynamic";

function checkPin(req: NextRequest): boolean {
  const adminPin = process.env.ADMIN_PIN || "1234";
  const providedPin = req.headers.get("x-admin-pin") || "";
  return providedPin === adminPin;
}

export async function GET(req: NextRequest) {
  if (!checkPin(req)) {
    return NextResponse.json(
      { error: "รหัสผ่านผู้ดูแลระบบ (PIN) ไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  const storeData = await getStoreData();
  const orders = await getOrders();
  const todayKey = getBangkokDateKey();

  return NextResponse.json({
    storeData,
    orders,
    todayKey,
    lineConfigured: Boolean(
      process.env.LINE_CHANNEL_ID &&
        process.env.LINE_CHANNEL_SECRET &&
        process.env.LINE_TARGET_ID
    ),
  });
}

export async function PATCH(req: NextRequest) {
  if (!checkPin(req)) {
    return NextResponse.json(
      { error: "รหัสผ่านผู้ดูแลระบบ (PIN) ไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "toggle_store_open") {
      const storeData = await getStoreData();
      storeData.store.isOpen = Boolean(body.isOpen);
      await saveStoreData(storeData);
      return NextResponse.json({ success: true, storeData });
    }

    if (action === "toggle_item_sold_out") {
      const storeData = await getStoreData();
      const item = storeData.items.find((i) => i.id === body.itemId);
      if (!item) {
        return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 404 });
      }
      item.soldOut = Boolean(body.soldOut);
      await saveStoreData(storeData);
      return NextResponse.json({ success: true, storeData });
    }

    if (action === "update_item") {
      const storeData = await getStoreData();
      const idx = storeData.items.findIndex((i) => i.id === body.item?.id);
      if (idx === -1) {
        return NextResponse.json({ error: "ไม่พบเมนู" }, { status: 404 });
      }
      storeData.items[idx] = {
        ...storeData.items[idx],
        ...(body.item as Partial<MenuItem>),
        price: Number(body.item.price) || storeData.items[idx].price,
      };
      await saveStoreData(storeData);
      return NextResponse.json({ success: true, storeData });
    }

    if (action === "add_item") {
      const storeData = await getStoreData();
      const newItem: MenuItem = {
        id: `item-${Date.now()}`,
        categoryId: body.item.categoryId || "sets",
        name: String(body.item.name || "เมนูใหม่").trim(),
        description: String(body.item.description || "").trim(),
        price: Number(body.item.price) || 60,
        image:
          String(body.item.image || "").trim() ||
          "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80",
        popular: Boolean(body.item.popular),
        soldOut: false,
      };
      storeData.items.push(newItem);
      await saveStoreData(storeData);
      return NextResponse.json({ success: true, storeData });
    }

    if (action === "update_store_settings") {
      const storeData = await getStoreData();
      const nextStore = {
        ...storeData.store,
        ...body.store,
      };
      storeData.store = nextStore;
      await saveStoreData(storeData);
      return NextResponse.json({ success: true, storeData });
    }

    if (action === "update_order_status") {
      const orders = await getOrders();
      const order = orders.find((o) => o.id === body.orderId);
      if (!order) {
        return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
      }
      order.status = body.status as OrderRecord["status"];
      await saveOrders(orders);
      return NextResponse.json({ success: true, orders });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
