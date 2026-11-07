import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import {
  ensureDataDirs,
  generateNextQueueNumber,
  getOrders,
  getSlipsDir,
  getStoreData,
  saveOrders,
  saveStoreData,
} from "@/lib/storage";
import { OrderItem, OrderRecord, PaymentMethod } from "@/types/store";
import { sendOrderToLineOA } from "@/lib/line";
import { buildSlipFilename } from "@/lib/order-history";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await ensureDataDirs();
    const storeData = await getStoreData();

    if (!storeData.store.isOpen) {
      return NextResponse.json(
        { error: "ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว กรุณาลองใหม่อีกครั้งในเวลาทำการ" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const customerName = String(formData.get("customerName") || "").trim();
    const customerPhone = String(formData.get("customerPhone") || "").trim();
    const customerContact = String(formData.get("customerContact") || "").trim();
    const pickupTime = String(formData.get("pickupTime") || "").trim();
    const paymentMethod = String(
      formData.get("paymentMethod") || "promptpay"
    ) as PaymentMethod;
    const itemsRaw = String(formData.get("items") || "[]");
    const slipFile = formData.get("slip") as File | null;

    if (!customerName || !customerPhone || !pickupTime) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อ เบอร์โทรศัพท์ และเวลารับอาหารให้ครบถ้วน" },
        { status: 400 }
      );
    }

    let parsedItems: Array<{ id: string; quantity: number }> = [];
    try {
      parsedItems = JSON.parse(itemsRaw);
    } catch {
      return NextResponse.json(
        { error: "ข้อมูลรายการอาหารไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ" },
        { status: 400 }
      );
    }

    // Validate items against server menu & calculate accurate totals
    const validatedItems: OrderItem[] = [];
    let totalQuantity = 0;
    let totalAmount = 0;

    for (const entry of parsedItems) {
      const qty = Math.floor(Number(entry.quantity));
      if (!qty || qty <= 0) continue;

      const menuItem = storeData.items.find((i) => i.id === entry.id);
      if (!menuItem) {
        return NextResponse.json(
          { error: `ไม่พบเมนูรหัส ${entry.id}` },
          { status: 400 }
        );
      }
      if (menuItem.soldOut) {
        return NextResponse.json(
          { error: `ขออภัย เมนู "${menuItem.name}" หมดแล้วในวันนี้` },
          { status: 400 }
        );
      }

      if (typeof menuItem.quantity === "number" && qty > menuItem.quantity) {
        return NextResponse.json(
          {
            error: `ขออภัย เมนู "${menuItem.name}" เหลือเพียง ${menuItem.quantity} ที่`,
          },
          { status: 400 }
        );
      }

      validatedItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
      });
      totalQuantity += qty;
      totalAmount += menuItem.price * qty;
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ" },
        { status: 400 }
      );
    }

    if (paymentMethod === "promptpay" && (!slipFile || slipFile.size === 0)) {
      return NextResponse.json(
        { error: "กรุณาแนบรูปสลิปโอนเงินสำหรับการชำระผ่าน PromptPay" },
        { status: 400 }
      );
    }

    const { queueNumber, dateKey } = await generateNextQueueNumber();
    const orderId = `${dateKey}-${queueNumber.replace("#", "")}-${Date.now()
      .toString()
      .slice(-4)}`;

    let slipUrl: string | undefined;
    if (slipFile && slipFile.size > 0) {
      const arrayBuffer = await slipFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = buildSlipFilename(orderId, slipFile.type);
      const dateSlipDir = path.join(getSlipsDir(), dateKey);
      await fs.mkdir(dateSlipDir, { recursive: true });
      const destPath = path.join(dateSlipDir, filename);
      await fs.writeFile(destPath, buffer);
      slipUrl = `/api/slips/${filename}`;
    }

    const createdAt = new Date().toISOString();
    const newOrder: OrderRecord = {
      id: orderId,
      queueNumber,
      dateKey,
      createdAt,
      updatedAt: createdAt,
      customerName,
      customerPhone,
      customerContact,
      pickupTime,
      paymentMethod,
      slipUrl,
      items: validatedItems,
      totalQuantity,
      totalAmount,
      status: "pending",
      statusHistory: [{ status: "pending", timestamp: createdAt }],
      lineSent: false,
    };

    const configuredBaseUrl =
      process.env.PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      `http://${req.headers.get("host") || "localhost:3000"}`;

    const lineResult = await sendOrderToLineOA(newOrder, configuredBaseUrl);
    newOrder.lineSent = lineResult.sent;
    if (lineResult.error) {
      newOrder.lineError = lineResult.error;
    }

    const allOrders = await getOrders();
    allOrders.unshift(newOrder);
    await saveOrders(allOrders);

    // Deduct ordered quantities from stock; mark sold out when depleted
    for (const ordered of validatedItems) {
      const menuItem = storeData.items.find((i) => i.id === ordered.id);
      if (menuItem && typeof menuItem.quantity === "number") {
        menuItem.quantity = Math.max(0, menuItem.quantity - ordered.quantity);
        if (menuItem.quantity === 0) menuItem.soldOut = true;
      }
    }
    await saveStoreData(storeData);

    return NextResponse.json({
      success: true,
      order: newOrder,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการสั่งอาหาร",
      },
      { status: 500 }
    );
  }
}
