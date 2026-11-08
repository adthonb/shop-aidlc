import { NextRequest, NextResponse } from "next/server";
import { replyLineStorefrontLink } from "@/lib/line";

export const dynamic = "force-dynamic";

interface LineWebhookEvent {
  type?: string;
  replyToken?: string;
  source?: {
    type?: string;
    userId?: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { events?: LineWebhookEvent[] };
    const events = Array.isArray(body.events) ? body.events : [];

    const configuredBaseUrl =
      process.env.PUBLIC_BASE_URL ||
      req.headers.get("origin") ||
      `http://${req.headers.get("host") || "localhost:3000"}`;

    for (const event of events) {
      const userId = event.source?.userId?.trim();
      const replyToken = event.replyToken?.trim();
      if (
        (event.type === "follow" || event.type === "message") &&
        userId &&
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
