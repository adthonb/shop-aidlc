import { NextRequest, NextResponse } from "next/server";
import { payloadFor, renderThaiQRPayment } from "thai-qr-payment";
import { getStoreData } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const amountParam = Number(searchParams.get("amount") || "0");
    const storeData = await getStoreData();
    const promptPayId =
      process.env.PROMPTPAY_ID || storeData.store.promptPayId || "0891234567";

    const amount = amountParam > 0 ? amountParam : undefined;

    const payload = payloadFor({
      recipient: promptPayId,
      amount,
    });

    const svg = renderThaiQRPayment({
      recipient: promptPayId,
      amount,
      errorCorrectionLevel: "H",
    });

    const qrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    return NextResponse.json({
      promptPayId,
      promptPayName: storeData.store.promptPayName,
      amount: amountParam,
      payload,
      svg,
      qrDataUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to generate QR",
      },
      { status: 500 }
    );
  }
}
