import { NextRequest, NextResponse } from "next/server";
import { isValidLineUserIdFormat, replyLineStorefrontLink } from "@/lib/line";
import { verifyLineSignature } from "@/lib/line-security";

export const dynamic = "force-dynamic";

interface LineWebhookEvent {
  type?: string;
  timestamp?: number;
  replyToken?: string;
  mode?: "active" | "standby" | string;
  webhookEventId?: string;
  deliveryContext?: {
    isRedelivery?: boolean;
  };
  source?: {
    type?: "user" | "group" | "room" | string;
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature") || "";
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    // Enforce HMAC-SHA256 signature verification when LINE_CHANNEL_SECRET is configured
    if (channelSecret) {
      if (!signature || !verifyLineSignature(rawBody, signature, channelSecret)) {
        return NextResponse.json(
          { error: "Invalid or missing LINE webhook signature" },
          { status: 401 }
        );
      }
    }

    const body = JSON.parse(rawBody || "{}") as {
      destination?: string;
      events?: LineWebhookEvent[];
    };
    const events = Array.isArray(body.events) ? body.events : [];

    const configuredBaseUrl =
      process.env.PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      `http://${req.headers.get("host") || "localhost:3000"}`;

    for (const event of events) {
      if (event.mode && event.mode !== "active") {
        continue;
      }
      if (event.source?.type && event.source.type !== "user") {
        continue;
      }

      const userId = event.source?.userId?.trim();
      const replyToken = event.replyToken?.trim();
      if (
        (event.type === "follow" || event.type === "message") &&
        userId &&
        isValidLineUserIdFormat(userId) &&
        replyToken
      ) {
        await replyLineStorefrontLink(replyToken, userId, configuredBaseUrl);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 400 }
    );
  }
}
