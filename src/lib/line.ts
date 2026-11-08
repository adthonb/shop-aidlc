import { OrderRecord } from "@/types/store";
import { formatBangkokTime } from "@/lib/storage";

/**
 * LINE Platform issues a user ID as a string formatted as `U[0-9a-f]{32}`
 * Reference: https://developers.line.biz/en/docs/messaging-api/getting-user-ids/#what-is-user-id
 */
export const LINE_USER_ID_REGEX = /^U[0-9a-f]{32}$/;

export function isValidLineUserIdFormat(userId: string): boolean {
  return LINE_USER_ID_REGEX.test(userId.trim());
}

/**
 * Validates a LINE user ID using the format `U[0-9a-f]{32}` and, when LINE channel
 * credentials are configured, verifies the user ID via the Get profile endpoint
 * (`GET https://api.line.me/v2/bot/profile/{userId}` returning HTTP 200).
 * Reference: https://developers.line.biz/en/docs/messaging-api/getting-user-ids/#user-id-validation
 */
export async function validateLineUserId(
  userId: string
): Promise<{ valid: boolean; displayName?: string; error?: string }> {
  const trimmed = userId.trim();
  if (!isValidLineUserIdFormat(trimmed)) {
    return {
      valid: false,
      error:
        "รูปแบบ LINE User ID ไม่ถูกต้อง (ต้องเป็นรหัส U[0-9a-f]{32} จากการกดปุ่มในแชท LINE OA)",
    };
  }

  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return { valid: true };
  }

  try {
    const tokenResponse = await fetch("https://api.line.me/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: channelId,
        client_secret: channelSecret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      return { valid: true };
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!tokenData.access_token) {
      return { valid: true };
    }

    const profileResponse = await fetch(
      `https://api.line.me/v2/bot/profile/${encodeURIComponent(trimmed)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    if (profileResponse.status !== 200) {
      return {
        valid: false,
        error:
          "ไม่พบข้อมูล LINE User ID นี้ในระบบ กรุณาแอด LINE OA ของร้านแล้วกดปุ่มกลับมาที่หน้าเว็บ",
      };
    }

    const profileData = (await profileResponse.json()) as {
      displayName?: string;
    };
    return { valid: true, displayName: profileData.displayName };
  } catch {
    return { valid: true };
  }
}

export async function sendOrderToLineOA(
  order: OrderRecord,
  publicBaseUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  const targetId = process.env.LINE_TARGET_ID;

  if (!channelId || !channelSecret || !targetId) {
    return {
      sent: false,
      error:
        "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ID, LINE_CHANNEL_SECRET หรือ LINE_TARGET_ID ในระบบ (.env.local)",
    };
  }

  const paymentLabel =
    order.paymentMethod === "promptpay"
      ? "✅ โอนเงิน PromptPay (แนบสลิปแล้ว)"
      : "💵 ชำระเงินที่หน้าร้านตอนรับของ";

  const fullSlipUrl =
    order.slipUrl && publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, "")}${order.slipUrl}`
      : undefined;

  const isHttpsSlip = fullSlipUrl?.startsWith("https://");

  const itemRows = order.items.map((item) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: `${item.quantity}x ${item.name}`,
        size: "sm",
        color: "#362417",
        flex: 4,
        wrap: true,
      },
      {
        type: "text",
        text: `฿${(item.price * item.quantity).toLocaleString()}`,
        size: "sm",
        color: "#362417",
        align: "end",
        weight: "bold",
        flex: 1,
      },
    ],
  }));

  // Build Flex Message Bubble
  const flexBubble: Record<string, unknown> = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#D97706",
      paddingAll: "16px",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: "☀️ ออเดอร์ใหม่ (รับหน้าร้าน)",
              color: "#FDFBF7",
              size: "sm",
              weight: "bold",
              flex: 3,
            },
            {
              type: "text",
              text: order.queueNumber,
              color: "#FFFFFF",
              size: "xl",
              weight: "bold",
              align: "end",
              flex: 2,
            },
          ],
        },
        {
          type: "text",
          text: `เวลารับ: ${order.pickupTime}`,
          color: "#FEF3C7",
          size: "sm",
          margin: "xs",
          weight: "bold",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      paddingAll: "16px",
      contents: [
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: `👤 ลูกค้า: ${order.customerName}`,
              size: "sm",
              weight: "bold",
              color: "#23170E",
            },
            {
              type: "text",
              text: `📞 โทร: ${order.customerPhone}`,
              size: "sm",
              color: "#4A3525",
            },
            ...(order.customerContact
              ? [
                  {
                    type: "text",
                    text: `💬 LINE/Email: ${order.customerContact}`,
                    size: "xs",
                    color: "#6B5344",
                  },
                ]
              : []),
            {
              type: "text",
              text: `🕒 สั่งเมื่อ: ${formatBangkokTime(order.createdAt)}`,
              size: "xs",
              color: "#8C7360",
            },
          ],
        },
        {
          type: "separator",
          color: "#E8D7B9",
        },
        {
          type: "box",
          layout: "vertical",
          spacing: "xs",
          contents: itemRows,
        },
        {
          type: "separator",
          color: "#E8D7B9",
        },
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: `รวมทั้งหมด (${order.totalQuantity} รายการ)`,
              size: "md",
              weight: "bold",
              color: "#23170E",
            },
            {
              type: "text",
              text: `฿${order.totalAmount.toLocaleString()}`,
              size: "lg",
              weight: "bold",
              color: "#D97706",
              align: "end",
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          backgroundColor:
            order.paymentMethod === "promptpay" ? "#ECFDF5" : "#FFFBEB",
          cornerRadius: "8px",
          paddingAll: "10px",
          contents: [
            {
              type: "text",
              text: paymentLabel,
              size: "xs",
              weight: "bold",
              color:
                order.paymentMethod === "promptpay" ? "#047857" : "#B45309",
              wrap: true,
            },
          ],
        },
      ],
    },
  };

  if (isHttpsSlip && fullSlipUrl) {
    flexBubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#4A3525",
          height: "sm",
          action: {
            type: "uri",
            label: "ดูรูปสลิปโอนเงิน",
            uri: fullSlipUrl,
          },
        },
      ],
    };
  }

  const messages: Array<Record<string, unknown>> = [
    {
      type: "flex",
      altText: `ออเดอร์ใหม่ ${order.queueNumber} - คุณ${order.customerName} ยอด ฿${order.totalAmount} (${order.pickupTime})`,
      contents: flexBubble,
    },
  ];

  // Also attach image message directly if public HTTPS URL is available
  if (isHttpsSlip && fullSlipUrl) {
    messages.push({
      type: "image",
      originalContentUrl: fullSlipUrl,
      previewImageUrl: fullSlipUrl,
    });
  }

  try {
    const tokenResponse = await fetch("https://api.line.me/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: channelId,
        client_secret: channelSecret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return {
        sent: false,
        error: `LINE Token Error (${tokenResponse.status}): ${errText}`,
      };
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!tokenData.access_token) {
      return {
        sent: false,
        error: "LINE Token Error: ไม่พบ access_token จากระบบ LINE",
      };
    }

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        to: targetId,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        sent: false,
        error: `LINE API Error (${response.status}): ${errText}`,
      };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Unknown LINE API error",
    };
  }
}

export async function replyLineStorefrontLink(
  replyToken: string,
  userId: string,
  publicBaseUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    return {
      sent: false,
      error: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ID หรือ LINE_CHANNEL_SECRET",
    };
  }

  const returnUrl = `${publicBaseUrl.replace(/\/$/, "")}/?lineId=${encodeURIComponent(
    userId
  )}`;

  const flexBubble: Record<string, unknown> = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#D97706",
      paddingAll: "14px",
      contents: [
        {
          type: "text",
          text: "☀️ ยืนยัน LINE ID สำเร็จ",
          color: "#FFFFFF",
          size: "md",
          weight: "bold",
        },
      ],
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "16px",
      contents: [
        {
          type: "text",
          text: "กดปุ่มด้านล่างเพื่อกลับไปหน้าสั่งอาหารเช้า ระบบจะกรอก LINE ID ลงในช่องให้อัตโนมัติค่ะ",
          size: "sm",
          color: "#362417",
          wrap: true,
        },
        {
          type: "text",
          text: `LINE ID: ${userId}`,
          size: "xs",
          color: "#6B5344",
          margin: "sm",
          wrap: true,
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#23170E",
          height: "sm",
          action: {
            type: "uri",
            label: "กลับไปสั่งอาหารเช้า",
            uri: returnUrl,
          },
        },
      ],
    },
  };

  try {
    const tokenResponse = await fetch("https://api.line.me/oauth2/v3/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: channelId,
        client_secret: channelSecret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      return {
        sent: false,
        error: `LINE Token Error (${tokenResponse.status}): ${errText}`,
      };
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!tokenData.access_token) {
      return {
        sent: false,
        error: "LINE Token Error: ไม่พบ access_token",
      };
    }

    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.access_token}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "flex",
            altText: `กดปุ่มเพื่อกลับไปสั่งอาหารเช้า (LINE ID: ${userId})`,
            contents: flexBubble,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        sent: false,
        error: `LINE Reply Error (${response.status}): ${errText}`,
      };
    }

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      error: err instanceof Error ? err.message : "Unknown LINE reply error",
    };
  }
}
