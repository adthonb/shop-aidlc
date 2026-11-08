import { OrderRecord } from "@/types/store";

export function formatBangkokTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function isValidJpgSlip(
  filename: string,
  mimeType = "",
  buffer?: Uint8Array
): boolean {
  const name = (filename || "").trim().toLowerCase();
  const mime = (mimeType || "").trim().toLowerCase();
  if (!name.endsWith(".jpg")) {
    return false;
  }
  if (mime !== "image/jpeg" && mime !== "image/jpg") {
    return false;
  }
  if (buffer && buffer.length >= 4) {
    // Reject PNG (89 50 4E 47), GIF ('GIF'), WebP ('RIFF'), PDF ('%PDF'), or HTML/SVG ('<')
    if (
      (buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47) ||
      (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) ||
      (buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46) ||
      (buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46) ||
      buffer[0] === 0x3c
    ) {
      return false;
    }
  }
  return true;
}

export function buildSlipFilename(
  orderId: string,
  _mimeType = "image/jpeg"
): string {
  void _mimeType;
  return `${orderId}.jpg`;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "");
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ordersToCsv(orders: OrderRecord[]): string {
  const headers = [
    "queueNumber",
    "dateKey",
    "createdAt",
    "updatedAt",
    "status",
    "customerName",
    "customerPhone",
    "pickupTime",
    "paymentMethod",
    "totalQuantity",
    "totalAmount",
    "items",
  ];

  const rows = orders.map((order) => {
    const itemsSummary = order.items
      .map((item) => `${item.quantity}x ${item.name}`)
      .join("; ");
    return [
      order.queueNumber,
      order.dateKey,
      order.createdAt,
      order.updatedAt || order.createdAt,
      order.status,
      order.customerName,
      order.customerPhone,
      order.pickupTime,
      order.paymentMethod,
      order.totalQuantity,
      order.totalAmount,
      itemsSummary,
    ]
      .map(escapeCsvCell)
      .join(",");
  });

  return `\uFEFF${[headers.join(","), ...rows].join("\n")}`;
}
