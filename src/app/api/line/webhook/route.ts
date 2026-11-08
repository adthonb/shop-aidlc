import { NextRequest, NextResponse } from "next/server";
import { isValidLineUserIdFormat, replyLineStorefrontLink } from "@/lib/line";

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
    const body = (await req.json()) as {
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
