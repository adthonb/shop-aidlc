import fs from "fs/promises";
import path from "path";
import { OrderRecord, StoreData } from "@/types/store";

const DATA_DIR = path.join(process.cwd(), "data");
const MENU_FILE = path.join(DATA_DIR, "menu.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SLIPS_DIR = path.join(DATA_DIR, "slips");

export async function ensureDataDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(SLIPS_DIR, { recursive: true });
}

export async function getStoreData(): Promise<StoreData> {
  await ensureDataDirs();
  const raw = await fs.readFile(MENU_FILE, "utf-8");
  return JSON.parse(raw) as StoreData;
}

export async function saveStoreData(data: StoreData): Promise<void> {
  await ensureDataDirs();
  await fs.writeFile(MENU_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function getOrders(): Promise<OrderRecord[]> {
  await ensureDataDirs();
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(raw) as OrderRecord[];
  } catch {
    return [];
  }
}

export async function saveOrders(orders: OrderRecord[]): Promise<void> {
  await ensureDataDirs();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf-8");
}

export function getBangkokDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

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

export async function generateNextQueueNumber(): Promise<{
  queueNumber: string;
  dateKey: string;
}> {
  const dateKey = getBangkokDateKey();
  const orders = await getOrders();
  const todayOrders = orders.filter((o) => o.dateKey === dateKey);
  const nextIndex = todayOrders.length + 1;
  const queueNumber = `#A${String(nextIndex).padStart(3, "0")}`;
  return { queueNumber, dateKey };
}

export function getSlipsDir(): string {
  return SLIPS_DIR;
}
