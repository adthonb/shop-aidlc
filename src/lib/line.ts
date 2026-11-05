import { OrderRecord } from "@/types/store";
import { formatBangkokTime } from "@/lib/storage";

export async function sendOrderToLineOA(
  order: OrderRecord,
  publicBaseUrl: string
): Promise<{ sent: boolean; error?: string }> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = process.env.LINE_TARGET_ID;

  if (!channelAccessToken || !targetId) {
    return {
      sent: false,
      error: "ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN หรือ LINE_TARGET_ID ในระบบ (.env.local)",
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
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelAccessToken}`,
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
