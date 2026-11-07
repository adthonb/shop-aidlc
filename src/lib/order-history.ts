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
