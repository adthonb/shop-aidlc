import fs from "fs/promises";
import path from "path";
import { OrderRecord, StoreData } from "@/types/store";

const DEFAULT_STORE_DATA: StoreData = {
  store: {
    storeName: "เรณู เช้านี้ (Raynue Morning)",
    tagline: "อาหารเช้าโฮมเมด อบอุ่น สดใหม่ทุกวัน สั่งล่วงหน้าไม่ต้องรอคิว",
    isOpen: true,
    openTime: "15:00:00+07:00",
    closeTime: "20:00:00+07:00",
    prepTimeMinutes: 15,
    phone: "089-123-4567",
    address: "ซอยสุขุมวิท 38 (ใกล้ BTS ทองหล่อ จอดรถหน้าร้านรับของได้ทันที)",
    googleMapUrl: "https://maps.app.goo.gl/RaynueMorningBtsThongLo",
    lineOaId: "@raynue",
    lineOaUrl: "https://line.me/R/ti/p/@raynue",
    promptPayId: "0891234567",
    promptPayName: "ร้านเรณู เช้านี้ (Raynue Store)",
    bankName: "ธนาคารกสิกรไทย (KBank)",
    bankAccountNumber: "123-4-56789-0",
    bankAccountName: "บจก. เรณู มอร์นิ่ง",
    pickupTimeSlots: [
      "รับทันที (เตรียมอาหาร 15-20 นาที)",
      "15:00 - 15:15 น.",
      "15:30 - 15:45 น.",
      "16:00 - 16:15 น.",
      "16:30 - 16:45 น.",
      "17:00 - 17:15 น.",
      "17:30 - 17:45 น.",
      "18:00 - 18:15 น.",
      "18:30 - 18:45 น.",
      "19:00 - 19:15 น.",
      "19:30 - 20:00 น.",
    ],
    announcement:
      "☀️ สั่งล่วงหน้าและรับหน้าร้านได้ทันที! เมนูอาหารเช้าจัดเซ็ตครบจบ อิ่มอร่อยพร้อมเริ่มวันใหม่",
  },
  categories: [
    { id: "all", name: "ทั้งหมด", icon: "Utensils" },
    { id: "sets", name: "เซ็ตอาหารเช้าครบชุด", icon: "Sunrise" },
    { id: "rice-porridge", name: "โจ๊ก & ข้าวต้มโฮมเมด", icon: "Soup" },
    { id: "toast-sandwiches", name: "ปังปิ้ง & แซนด์วิช", icon: "Croissant" },
    { id: "drinks", name: "เครื่องดื่มยามเช้า", icon: "Coffee" },
  ],
  items: [
    {
      id: "set-raynue-signature",
      categoryId: "sets",
      name: "เซ็ตอรุณสวัสดิ์เรณู (Signature Breakfast Set)",
      description:
        "ไข่กระทะทรงเครื่องหมูสับกุนเชียง เสิร์ฟคู่ขนมปังเวียดนามอบกรอบ และกาแฟโบราณหรือชาไทย",
      price: 119,
      image:
        "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80",
      popular: true,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "set-american-homestyle",
      categoryId: "sets",
      name: "เซ็ตอเมริกันเบรกฟาสต์ครบชุด (All-Day Morning Box)",
      description:
        "ไข่ดาว 2 ฟอง เบคอนรมควันย่าง ไส้กรอกหนังกรอบ แฮชบราวน์ ขนมปังปิ้งทาเนย และสลัดผักสด",
      price: 135,
      image:
        "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80",
      popular: true,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "set-boiled-eggs-toast",
      categoryId: "sets",
      name: "เซ็ตไข่ลวกโบราณ & ปังปิ้งสังขยาใบเตย",
      description:
        "ไข่ลวกเยิ้มกำลังดี 2 ฟอง พร้อมขนมปังปิ้งเตาถ่านสังขยาใบเตยเคี่ยวสด และโกปี๊โบราณ",
      price: 89,
      image:
        "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=800&q=80",
      popular: false,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "porridge-pork-egg",
      categoryId: "rice-porridge",
      name: "โจ๊กหมูสับตับนุ่ม ไข่ลวก ขิงซอย",
      description:
        "โจ๊กข้าวหอมมะลิเคี่ยวจนเนียนนุ่ม หมูสับปรุงรสก้อนโต ตับลวกนุ่ม และไข่ลวก พร้อมปาท่องโก๋กรอบ",
      price: 75,
      image:
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80",
      popular: true,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "boiled-rice-seabass",
      categoryId: "rice-porridge",
      name: "ข้าวต้มปลากะพงหมูบะช่อ น้ำซุปกระดูกหมู",
      description:
        "เนื้อปลากะพงสดชิ้นหนา ลวกไร้คาว พร้อมหมูบะช่อ กระเทียมเจียวหอมๆ และน้ำจิ้มเต้าเจี้ยวรสเด็ด",
      price: 95,
      image:
        "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
      popular: false,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "sandwich-brioche-ham-cheese",
      categoryId: "toast-sandwiches",
      name: "บริยอชโทสต์แฮมชีสไข่คนทรัฟเฟิล",
      description:
        "ขนมปังบริยอชปิ้งเนยหอมกรุ่น สอดไส้แฮม เชดดาร์ชีสเยิ้ม และสแครมเบิลเอ้กซอสทรัฟเฟิล",
      price: 99,
      image:
        "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80",
      popular: true,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "banh-mi-vietnam",
      categoryId: "toast-sandwiches",
      name: "บั๋นหมี่เวียดนามหมูยอหมูอบทรงเครื่อง",
      description:
        "ขนมปังฝรั่งเศสเปลือกบางกรอบ ไส้หมูอบ หมูยออุบล ตับบดโฮมเมด และผักดองสามรส",
      price: 85,
      image:
        "https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=800&q=80",
      popular: false,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "drink-iced-kopi",
      categoryId: "drinks",
      name: "กาแฟโบราณเรณู (สูตรเข้มข้น หอมมัน)",
      description:
        "กาแฟคั่วบดสูตรดั้งเดิม ชงสดแก้วต่อแก้ว หวานมันกำลังดี แยกน้ำแข็งพร้อมรับกลับบ้าน",
      price: 50,
      image:
        "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80",
      popular: true,
      soldOut: false,
      quantity: 50,
    },
    {
      id: "drink-soy-milk-patongo",
      categoryId: "drinks",
      name: "น้ำเต้าหู้คั้นสดทรงเครื่อง + ปาท่องโก๋เกลียว (ชุดคู่)",
      description:
        "น้ำเต้าหู้ถั่วเหลืองแท้ 100% หอมใบเตย ใส่ลูกเดือยฟองเต้าหู้ เสิร์ฟคู่ปาท่องโก๋ 2 ตัว",
      price: 55,
      image:
        "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80",
      popular: false,
      soldOut: false,
      quantity: 50,
    },
  ],
};

function getDataDir(): string {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function getMenuFile(): string {
  return path.join(getDataDir(), "menu.json");
}

function getOrdersFile(): string {
  return path.join(getDataDir(), "orders.json");
}

export async function ensureDataDirs() {
  const dataDir = getDataDir();
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(path.join(dataDir, "slips"), { recursive: true });
}

export async function getStoreData(): Promise<StoreData> {
  await ensureDataDirs();
  const menuFile = getMenuFile();
  try {
    const raw = await fs.readFile(menuFile, "utf-8");
    return JSON.parse(raw) as StoreData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      const seeded = structuredClone(DEFAULT_STORE_DATA);
      await fs.writeFile(menuFile, JSON.stringify(seeded, null, 2), "utf-8");
      return seeded;
    }
    throw err;
  }
}

export async function saveStoreData(data: StoreData): Promise<void> {
  await ensureDataDirs();
  await fs.writeFile(getMenuFile(), JSON.stringify(data, null, 2), "utf-8");
}

export async function getOrders(): Promise<OrderRecord[]> {
  await ensureDataDirs();
  try {
    const raw = await fs.readFile(getOrdersFile(), "utf-8");
    return JSON.parse(raw) as OrderRecord[];
  } catch {
    return [];
  }
}

export async function saveOrders(orders: OrderRecord[]): Promise<void> {
  await ensureDataDirs();
  await fs.writeFile(getOrdersFile(), JSON.stringify(orders, null, 2), "utf-8");
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
  return path.join(getDataDir(), "slips");
}
