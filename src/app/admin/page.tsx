"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  LogOut,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShoppingBag,
  Store,
  Utensils,
} from "lucide-react";
import { MenuItem, OrderRecord, StoreData } from "@/types/store";
import { buildPickupTimeSlots } from "@/lib/pickup";
import { formatBangkokTime, ordersToCsv } from "@/lib/order-history";

type OrderStatus = OrderRecord["status"];

const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    icon: string;
    card: string;
    pill: string;
    next?: { status: OrderStatus; label: string; className: string };
  }
> = {
  pending: {
    label: "รอเตรียมอาหาร",
    icon: "⏳",
    card: "border-l-amber-400",
    pill: "bg-amber-100 text-amber-900",
    next: { status: "preparing", label: "🍳 เริ่มปรุง", className: "bg-amber-500 text-white" },
  },
  preparing: {
    label: "กำลังปรุง",
    icon: "🍳",
    card: "border-l-orange-500",
    pill: "bg-orange-100 text-orange-900",
    next: { status: "ready", label: "✅ พร้อมรับหน้าร้าน", className: "bg-blue-600 text-white" },
  },
  ready: {
    label: "พร้อมรับ",
    icon: "✅",
    card: "border-l-blue-500",
    pill: "bg-blue-100 text-blue-900",
    next: { status: "completed", label: "🎉 ลูกค้ารับแล้ว", className: "bg-emerald-600 text-white" },
  },
  completed: {
    label: "รับแล้ว",
    icon: "🎉",
    card: "border-l-emerald-500",
    pill: "bg-emerald-100 text-emerald-900",
  },
  cancelled: {
    label: "ยกเลิก",
    icon: "❌",
    card: "border-l-rose-400",
    pill: "bg-rose-100 text-rose-900",
  },
};

const ORDER_STATUS_ORDER: OrderStatus[] = [
  "pending",
  "preparing",
  "ready",
  "completed",
  "cancelled",
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, idx) => {
  const hours = String(Math.floor(idx / 2)).padStart(2, "0");
  const minutes = idx % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

function extractTimeHHMM(
  isoTime: string | undefined,
  fallback: string
): string {
  const match =
    isoTime?.match(/T(\d{2}:\d{2})/) || isoTime?.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : fallback;
}

function toBangkokIso8601(hhmm: string): string {
  return `${hhmm}:00+07:00`;
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [todayKey, setTodayKey] = useState<string>("");
  const [lineConfigured, setLineConfigured] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "settings">(
    "orders"
  );
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    categoryId: "sets",
    name: "",
    description: "",
    price: 89,
    image: "",
    popular: false,
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderStatus | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const fetchAdminData = async (currentPin: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin", {
        headers: { "x-admin-pin": currentPin },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "รหัส PIN ไม่ถูกต้อง");
      }
      const resolvedTodayKey = data.todayKey || "";
      const loadedStoreData = data.storeData as StoreData;
      if (loadedStoreData?.store) {
        const openHHMM = extractTimeHHMM(
          loadedStoreData.store.openTime,
          "06:00"
        );
        const closeHHMM = extractTimeHHMM(
          loadedStoreData.store.closeTime,
          "11:30"
        );
        const nextStore = {
          ...loadedStoreData.store,
          openTime: toBangkokIso8601(openHHMM),
          closeTime: toBangkokIso8601(closeHHMM),
        };
        loadedStoreData.store = nextStore;
      }
      setStoreData(loadedStoreData);
      setOrders(data.orders || []);
      setTodayKey(resolvedTodayKey);
      setSelectedDate((prev) => prev || resolvedTodayKey || "all");
      setLineConfigured(Boolean(data.lineConfigured));
      setPin(currentPin);
      setIsAuthenticated(true);
      sessionStorage.setItem("raynue_admin_pin", currentPin);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "ไม่สามารถเข้าสู่ระบบได้"
      );
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedPin = sessionStorage.getItem("raynue_admin_pin");
    if (!savedPin) return;
    const timer = setTimeout(() => {
      void fetchAdminData(savedPin);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAdminData(pin);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("raynue_admin_pin");
    setIsAuthenticated(false);
    setPin("");
  };

  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    if (todayKey) dates.add(todayKey);
    for (const o of orders) {
      if (o.dateKey) dates.add(o.dateKey);
    }
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [orders, todayKey]);

  const effectiveSelectedDate = selectedDate || todayKey || "all";

  const dateFilteredOrders = useMemo(
    () =>
      effectiveSelectedDate === "all"
        ? orders
        : orders.filter((o) => o.dateKey === effectiveSelectedDate),
    [orders, effectiveSelectedDate]
  );

  const selectedDateRevenue = useMemo(
    () =>
      dateFilteredOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [dateFilteredOrders]
  );

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    if (typeof window === "undefined") return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const suffix = effectiveSelectedDate === "all" ? "all" : effectiveSelectedDate;
    triggerDownload(
      ordersToCsv(dateFilteredOrders),
      `raynue-orders-${suffix}.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  const handleExportJson = () => {
    const suffix = effectiveSelectedDate === "all" ? "all" : effectiveSelectedDate;
    triggerDownload(
      JSON.stringify(dateFilteredOrders, null, 2),
      `raynue-orders-${suffix}.json`,
      "application/json;charset=utf-8;"
    );
  };

  const adminPatch = async (payload: Record<string, unknown>, toastMsg: string) => {
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": pin,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "บันทึกไม่สำเร็จ");
      if (data.storeData) setStoreData(data.storeData);
      if (data.orders) setOrders(data.orders);
      showToast(toastMsg);
    } catch (err) {
      alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const todayOrders = useMemo(
    () => orders.filter((o) => o.dateKey === todayKey),
    [orders, todayKey]
  );

  const todayRevenue = useMemo(
    () =>
      todayOrders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.totalAmount, 0),
    [todayOrders]
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-cream-200 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-sunrise-500/15 text-sunrise-600 flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-espresso-900">
            จัดการร้านเรณู (Admin)
          </h1>
          <p className="text-xs text-espresso-700/75 mt-1">
            กรอกรหัสผ่านผู้ดูแลระบบ (PIN เริ่มต้น: 1234 หรือตั้งค่าใน ADMIN_PIN)
          </p>

          <form onSubmit={handleLogin} className="mt-5 space-y-4">
            <input
              type="password"
              inputMode="numeric"
              placeholder="รหัส PIN ร้านค้า"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-cream-300 bg-cream-50 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-sunrise-500"
              autoFocus
            />
            {authError && (
              <p className="text-xs text-rose-600 font-semibold text-center">
                {authError}
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-white font-bold text-sm transition"
            >
              {isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบจัดการร้าน"}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-cream-200 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-espresso-700 hover:text-espresso-900 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับสู่หน้าสั่งอาหารของลูกค้า
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-20 max-w-2xl mx-auto border-x border-cream-200">
      {/* Top Admin Header */}
      <header className="bg-espresso-900 text-white p-5 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-2xl font-bold">ระบบจัดการร้าน (Admin)</h1>
              <span
                className={`px-2.5 py-1 rounded-full text-sm font-bold ${
                  storeData?.store.isOpen
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                    : "bg-rose-500/30 text-rose-200 border border-rose-400/30"
                }`}
              >
                {storeData?.store.isOpen ? "เปิดร้านอยู่" : "ปิดรับออเดอร์"}
              </span>
            </div>
            <p className="text-xs text-cream-200/80 mt-0.5">
              {storeData?.store.storeName} • ประจำวันที่ {todayKey}
            </p>
          </div>

        </div>

        {/* Header actions: large labelled touch targets */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => fetchAdminData(pin)}
            className="min-h-11 inline-flex items-center justify-center gap-1.5 px-2 rounded-xl bg-white/15 active:bg-white/25 text-white text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            รีเฟรช
          </button>
          <Link
            href="/"
            className="min-h-11 inline-flex items-center justify-center gap-1.5 px-2 rounded-xl bg-white/15 active:bg-white/25 text-white text-sm font-semibold"
          >
            <Store className="w-4 h-4 shrink-0" />
            หน้าร้าน
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 inline-flex items-center justify-center gap-1.5 px-2 rounded-xl bg-rose-500/30 active:bg-rose-500/50 text-rose-100 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            ออกจากระบบ
          </button>
        </div>

        {/* Store Open / Close Quick Master Switch */}
        {storeData && (
          <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Store className="w-4 h-4 text-sunrise-400 shrink-0" />
              <span>สถานะการรับออเดอร์หน้าเว็บ:</span>
            </div>
            <button
              type="button"
              onClick={() =>
                adminPatch(
                  {
                    action: "toggle_store_open",
                    isOpen: !storeData.store.isOpen,
                  },
                  storeData.store.isOpen
                    ? "ปิดรับออเดอร์ชั่วคราวแล้ว"
                    : "เปิดรับออเดอร์หน้าเว็บแล้ว"
                )
              }
              className={`w-full min-h-12 px-4 rounded-xl text-sm font-bold transition ${
                storeData.store.isOpen
                  ? "bg-rose-500 active:bg-rose-600 text-white"
                  : "bg-emerald-500 active:bg-emerald-600 text-white"
              }`}
            >
              {storeData.store.isOpen
                ? "กดเพื่อปิดรับออเดอร์"
                : "กดเพื่อเปิดรับออเดอร์"}
            </button>
          </div>
        )}
      </header>

      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-espresso-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* LINE OA Status Warning if not configured */}
      {!lineConfigured && (
        <div className="mx-4 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-espresso-800 leading-relaxed">
          💡 <strong>สถานะ LINE Messaging API:</strong> ยังไม่ได้ตั้งค่า{" "}
          <code className="bg-amber-100 px-1 py-0.5 rounded">
            LINE_CHANNEL_ACCESS_TOKEN
          </code>{" "}
          และ{" "}
          <code className="bg-amber-100 px-1 py-0.5 rounded">
            LINE_TARGET_ID
          </code>{" "}
          ในไฟล์ <code className="bg-amber-100 px-1 py-0.5 rounded">.env.local</code>{" "}
          (ออเดอร์ยังถูกบันทึกและแสดงในหน้านี้ตามปกติ)
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-xs">
          <span className="text-xs text-espresso-700/70">ออเดอร์วันนี้</span>
          <p className="text-2xl font-extrabold text-espresso-900 mt-0.5">
            {todayOrders.length} คิว
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-cream-200 shadow-xs">
          <span className="text-xs text-espresso-700/70">ยอดขายวันนี้</span>
          <p className="text-2xl font-extrabold text-sunrise-600 mt-0.5">
            ฿{todayRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-4 flex gap-2 border-b border-cream-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "orders"
              ? "bg-espresso-900 text-white shadow-xs"
              : "bg-white text-espresso-800 border border-cream-200"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          รายการออเดอร์ ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("menu")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "menu"
              ? "bg-espresso-900 text-white shadow-xs"
              : "bg-white text-espresso-800 border border-cream-200"
          }`}
        >
          <Utensils className="w-4 h-4" />
          จัดการเมนู & ของหมด
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            activeTab === "settings"
              ? "bg-espresso-900 text-white shadow-xs"
              : "bg-white text-espresso-800 border border-cream-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          ตั้งค่าร้าน
        </button>
      </div>

      {/* TAB 1: ORDERS LIST */}
      {activeTab === "orders" && (
        <div className="p-4 space-y-3">
          {/* Date history selector & CSV/JSON export toolbar */}
          <div className="bg-white rounded-2xl p-3 border border-cream-200 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="admin-order-date-select"
                className="text-sm font-bold text-espresso-900"
              >
                ประวัติออเดอร์ตามวันที่
              </label>
              <span className="text-sm font-bold text-sunrise-600">
                {dateFilteredOrders.length} คิว • ฿{selectedDateRevenue.toLocaleString()}
              </span>
            </div>
            <select
              id="admin-order-date-select"
              aria-label="เลือกวันที่ออเดอร์"
              value={effectiveSelectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full min-h-11 px-3 rounded-xl text-sm font-bold border border-cream-300 bg-cream-50 text-espresso-900"
            >
              {availableDates.map((d) => {
                const count = orders.filter((o) => o.dateKey === d).length;
                const label =
                  d === todayKey ? `วันนี้ (${d}) — ${count} คิว` : `${d} — ${count} คิว`;
                return (
                  <option key={d} value={d}>
                    {label}
                  </option>
                );
              })}
              <option value="all">ทุกวัน ({orders.length} คิว)</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                className="min-h-11 px-3 rounded-xl text-sm font-bold border border-cream-300 bg-white text-espresso-900 active:bg-cream-100"
              >
                ดาวน์โหลด CSV
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="min-h-11 px-3 rounded-xl text-sm font-bold border border-cream-300 bg-white text-espresso-900 active:bg-cream-100"
              >
                ดาวน์โหลด JSON
              </button>
            </div>
          </div>

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-2">
            {(["all", ...ORDER_STATUS_ORDER] as const).map((key) => {
              const count =
                key === "all"
                  ? dateFilteredOrders.length
                  : dateFilteredOrders.filter((o) => o.status === key).length;
              const label = key === "all" ? "ทั้งหมด" : ORDER_STATUS_META[key].label;
              const active = orderFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOrderFilter(key)}
                  aria-pressed={active}
                  className={`min-h-11 px-3.5 rounded-xl text-sm font-bold border transition ${
                    active
                      ? "bg-espresso-900 text-white border-espresso-900"
                      : "bg-white text-espresso-800 border-cream-300"
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          {dateFilteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-cream-200 text-sm text-espresso-700/70">
              ยังไม่มีรายการสั่งอาหารเข้ามาในระบบ
            </div>
          ) : (
            dateFilteredOrders
              .filter((o) => orderFilter === "all" || o.status === orderFilter)
              .map((order) => {
                const meta = ORDER_STATUS_META[order.status];
                return (
                  <div
                    key={order.id}
                    className={`bg-white rounded-2xl p-4 border border-cream-200 border-l-8 ${meta.card} shadow-xs space-y-3`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-3 py-1 rounded-lg bg-espresso-900 text-sunrise-400 font-black text-lg">
                          {order.queueNumber}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-sm font-bold ${meta.pill}`}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <span className="text-lg font-extrabold text-sunrise-600 shrink-0">
                        ฿{order.totalAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1.5 min-w-0">
                      <p className="text-sm font-bold text-espresso-900 break-words">
                        คุณ{order.customerName}
                      </p>
                      <p className="flex items-start gap-2 text-sm text-espresso-700/80">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0 text-sunrise-500" />
                        <span className="break-words min-w-0">
                          เวลารับ: <strong>{order.pickupTime}</strong> • สั่งเมื่อ{" "}
                          {formatBangkokTime(order.createdAt)} ({order.dateKey})
                        </span>
                      </p>
                    </div>

                    {/* Items */}
                    <div className="bg-cream-50 rounded-xl p-3 space-y-1.5 text-sm border border-cream-200">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex justify-between gap-3">
                          <span className="font-medium text-espresso-900 break-words min-w-0">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-bold shrink-0">
                            ฿{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 mt-2 border-t border-cream-200 flex justify-between text-sm font-extrabold">
                        <span>รวม ({order.totalQuantity} รายการ)</span>
                        <span className="text-sunrise-600">
                          ฿{order.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Payment, call and slip */}
                    <p
                      className={`text-sm font-semibold ${
                        order.paymentMethod === "promptpay"
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {order.paymentMethod === "promptpay"
                        ? "✅ โอนเงิน PromptPay"
                        : "💵 ชำระที่หน้าร้าน"}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="min-h-11 inline-flex items-center justify-center gap-1.5 px-2 rounded-xl border border-sunrise-500 text-sunrise-700 text-sm font-bold"
                      >
                        <Phone className="w-4 h-4 shrink-0" />
                        โทร {order.customerPhone}
                      </a>
                      {order.slipUrl && (
                        <a
                          href={order.slipUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="min-h-11 inline-flex items-center justify-center gap-1.5 px-2 rounded-xl bg-emerald-100 text-emerald-900 text-sm font-bold"
                        >
                          <ExternalLink className="w-4 h-4 shrink-0" />
                          ดูรูปสลิป
                        </a>
                      )}
                    </div>

                    {/* One-tap next step */}
                    {meta.next && (
                      <button
                        type="button"
                        onClick={() =>
                          adminPatch(
                            {
                              action: "update_order_status",
                              orderId: order.id,
                              status: meta.next!.status,
                            },
                            `อัปเดตสถานะคิว ${order.queueNumber} แล้ว`
                          )
                        }
                        className={`w-full min-h-12 rounded-xl text-sm font-bold shadow-sm active:scale-[0.99] ${meta.next.className}`}
                      >
                        {meta.next.label}
                      </button>
                    )}

                    {/* Any-status selector (incl. cancel) */}
                    <select
                      aria-label={`สถานะออเดอร์ ${order.queueNumber}`}
                      value={order.status}
                      onChange={(e) =>
                        adminPatch(
                          {
                            action: "update_order_status",
                            orderId: order.id,
                            status: e.target.value,
                          },
                          `อัปเดตสถานะคิว ${order.queueNumber} แล้ว`
                        )
                      }
                      className="w-full min-h-11 px-3 rounded-xl text-sm font-bold border border-cream-300 bg-white text-espresso-900"
                    >
                      <option value="pending">⏳ รอเตรียมอาหาร</option>
                      <option value="preparing">🍳 กำลังปรุง</option>
                      <option value="ready">✅ พร้อมรับหน้าร้าน</option>
                      <option value="completed">🎉 ลูกค้ารับแล้ว</option>
                      <option value="cancelled">❌ ยกเลิก</option>
                    </select>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* TAB 2: MENU & SOLD-OUT TOGGLES */}
      {activeTab === "menu" && storeData && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-espresso-900">
              รายการเมนูทั้งหมด ({storeData.items.length} เมนู)
            </h2>
            <button
              type="button"
              onClick={() => setIsAddingItem(!isAddingItem)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sunrise-500 hover:bg-sunrise-600 text-white text-sm font-bold shadow-xs"
            >
              <Plus className="w-4 h-4" />
              เพิ่มเมนูใหม่
            </button>
          </div>

          {/* Add New Item Form */}
          {isAddingItem && (
            <div className="bg-white rounded-2xl p-4 border-2 border-sunrise-400 space-y-3">
              <h3 className="text-base font-bold text-espresso-900">
                เพิ่มเมนูอาหารเช้าใหม่
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="ชื่อเมนูอาหารเช้า"
                  value={newItemForm.name}
                  onChange={(e) =>
                    setNewItemForm({ ...newItemForm, name: e.target.value })
                  }
                  className="col-span-2 px-3 py-2 rounded-xl border border-cream-300 text-sm"
                />
                <input
                  type="text"
                  placeholder="คำอธิบายเมนู"
                  value={newItemForm.description}
                  onChange={(e) =>
                    setNewItemForm({
                      ...newItemForm,
                      description: e.target.value,
                    })
                  }
                  className="col-span-2 px-3 py-2 rounded-xl border border-cream-300 text-sm"
                />
                <select
                  value={newItemForm.categoryId}
                  onChange={(e) =>
                    setNewItemForm({
                      ...newItemForm,
                      categoryId: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl border border-cream-300 text-sm"
                >
                  {storeData.categories
                    .filter((c) => c.id !== "all")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  placeholder="ราคา (บาท)"
                  value={newItemForm.price}
                  onChange={(e) =>
                    setNewItemForm({
                      ...newItemForm,
                      price: Number(e.target.value),
                    })
                  }
                  className="px-3 py-2 rounded-xl border border-cream-300 text-sm"
                />
                <input
                  type="text"
                  placeholder="URL รูปภาพ (เว้นว่างใช้รูปเริ่มต้นได้)"
                  value={newItemForm.image}
                  onChange={(e) =>
                    setNewItemForm({ ...newItemForm, image: e.target.value })
                  }
                  className="col-span-2 px-3 py-2 rounded-xl border border-cream-300 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-3 py-1.5 rounded-lg bg-cream-100 text-sm font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!newItemForm.name.trim()) return;
                    adminPatch(
                      { action: "add_item", item: newItemForm },
                      "เพิ่มเมนูใหม่เรียบร้อยแล้ว"
                    );
                    setIsAddingItem(false);
                    setNewItemForm({
                      categoryId: "sets",
                      name: "",
                      description: "",
                      price: 89,
                      image: "",
                      popular: false,
                    });
                  }}
                  className="px-4 py-1.5 rounded-lg bg-espresso-900 text-white text-sm font-bold"
                >
                  บันทึกเมนูใหม่
                </button>
              </div>
            </div>
          )}

          {/* Menu Items List with Instant Sold-Out Switch */}
          <div className="space-y-2.5">
            {storeData.items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3.5 border border-cream-200 flex flex-col gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover bg-cream-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-espresso-900 break-words leading-snug">
                      {item.name}
                    </p>
                    <p className="text-sm font-extrabold text-sunrise-600 mt-0.5">
                      ฿{item.price.toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="mt-2 min-h-11 inline-flex items-center justify-center gap-1.5 px-4 rounded-xl border border-espresso-700/40 bg-cream-50 text-espresso-900 text-sm font-bold active:bg-cream-200"
                    >
                      <Pencil className="w-4 h-4 shrink-0" />
                      แก้ไขชื่อ/ราคา
                    </button>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={`จำนวนคงเหลือ ${item.name}`}
                        value={quantityDrafts[item.id] ?? String(item.quantity ?? "")}
                        placeholder="ไม่จำกัด"
                        onChange={(e) =>
                          setQuantityDrafts((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="w-24 min-h-11 px-2 rounded-xl border border-cream-300 text-sm"
                      />
                      <button
                        type="button"
                        aria-label={`บันทึกจำนวน ${item.name}`}
                        onClick={() => {
                          const draft = quantityDrafts[item.id];
                          const quantity = Number(draft ?? item.quantity);
                          if (draft === "" || !Number.isInteger(quantity) || quantity < 0) {
                            alert("กรุณากรอกจำนวนเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป");
                            return;
                          }
                          adminPatch(
                            {
                              action: "update_item_quantity",
                              itemId: item.id,
                              quantity,
                            },
                            `อัปเดตจำนวน "${item.name}" เป็น ${quantity} ที่แล้ว`
                          );
                          setQuantityDrafts((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          });
                        }}
                        className="min-h-11 px-4 rounded-xl bg-espresso-900 text-white text-sm font-bold"
                      >
                        บันทึก
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    adminPatch(
                      {
                        action: "toggle_item_sold_out",
                        itemId: item.id,
                        soldOut: !item.soldOut,
                      },
                      item.soldOut
                        ? `เปิดขาย "${item.name}" แล้ว`
                        : `ตั้งค่า "${item.name}" เป็นสินค้าหมดแล้ว`
                    )
                  }
                  className={`w-full px-3.5 py-2 rounded-xl text-sm font-bold transition ${
                    item.soldOut
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                  }`}
                >
                  {item.soldOut ? "❌ หมดวันนี้ (กดเพื่อเปิดขาย)" : "✅ มีสินค้าพร้อมขาย"}
                </button>
              </div>
            ))}
          </div>

          {/* Edit Item Modal */}
          {editingItem && (
            <div className="fixed inset-0 z-50 bg-espresso-900/60 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-md rounded-2xl p-5 space-y-3">
                <h3 className="text-base font-bold text-espresso-900">
                  แก้ไขเมนู: {editingItem.name}
                </h3>
                <div>
                  <label className="text-sm font-semibold block mb-1">
                    ชื่อเมนู
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1">
                    รายละเอียด
                  </label>
                  <input
                    type="text"
                    value={editingItem.description}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold block mb-1">
                    ราคา (บาท)
                  </label>
                  <input
                    type="number"
                    value={editingItem.price}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        price: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl bg-cream-100 text-sm font-semibold"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      adminPatch(
                        { action: "update_item", item: editingItem },
                        "บันทึกการแก้ไขเมนูแล้ว"
                      );
                      setEditingItem(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-espresso-900 text-white text-sm font-bold"
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STORE SETTINGS */}
      {activeTab === "settings" && storeData && (
        <div className="p-4">
          <div className="bg-white rounded-2xl p-5 border border-cream-200 space-y-3.5">
            <h2 className="text-xl font-bold text-espresso-900">
              ตั้งค่าข้อมูลร้าน & บัญชีรับโอนเงิน
            </h2>

            <div>
              <label className="block text-xs font-semibold mb-1">ชื่อร้าน</label>
              <input
                type="text"
                value={storeData.store.storeName}
                onChange={(e) =>
                  setStoreData({
                    ...storeData,
                    store: { ...storeData.store, storeName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                ข้อความประกาศหน้าร้าน (Announcement)
              </label>
              <input
                type="text"
                value={storeData.store.announcement || ""}
                onChange={(e) =>
                  setStoreData({
                    ...storeData,
                    store: { ...storeData.store, announcement: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="store-open-time"
                  className="block text-xs font-semibold mb-1"
                >
                  เวลาเปิดร้าน
                </label>
                <select
                  id="store-open-time"
                  aria-label="เวลาเปิดร้าน"
                  value={extractTimeHHMM(
                    storeData.store.openTime,
                    "06:00"
                  )}
                  onChange={(e) => {
                    const nextOpen = e.target.value;
                    const currentClose = extractTimeHHMM(
                      storeData.store.closeTime,
                      "11:30"
                    );
                    const nextOpenIso = toBangkokIso8601(nextOpen);
                    const nextCloseIso = toBangkokIso8601(currentClose);
                    const nextStore = {
                      ...storeData.store,
                      openTime: nextOpenIso,
                      closeTime: nextCloseIso,
                      pickupTimeSlots: buildPickupTimeSlots(
                        nextOpenIso,
                        nextCloseIso,
                        storeData.store.pickupTimeSlots
                      ),
                    };
                    setStoreData({
                      ...storeData,
                      store: nextStore,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t} น.
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="store-close-time"
                  className="block text-xs font-semibold mb-1"
                >
                  เวลาปิดร้าน
                </label>
                <select
                  id="store-close-time"
                  aria-label="เวลาปิดร้าน"
                  value={extractTimeHHMM(
                    storeData.store.closeTime,
                    "11:30"
                  )}
                  onChange={(e) => {
                    const currentOpen = extractTimeHHMM(
                      storeData.store.openTime,
                      "06:00"
                    );
                    const nextClose = e.target.value;
                    const nextOpenIso = toBangkokIso8601(currentOpen);
                    const nextCloseIso = toBangkokIso8601(nextClose);
                    const nextStore = {
                      ...storeData.store,
                      openTime: nextOpenIso,
                      closeTime: nextCloseIso,
                      pickupTimeSlots: buildPickupTimeSlots(
                        nextOpenIso,
                        nextCloseIso,
                        storeData.store.pickupTimeSlots
                      ),
                    };
                    setStoreData({
                      ...storeData,
                      store: nextStore,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 bg-white text-xs"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t} น.
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                เบอร์โทรร้าน
              </label>
              <input
                type="text"
                value={storeData.store.phone}
                onChange={(e) =>
                  setStoreData({
                    ...storeData,
                    store: { ...storeData.store, phone: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="store-address"
                className="block text-xs font-semibold mb-1"
              >
                ที่อยู่ร้าน
              </label>
              <input
                id="store-address"
                type="text"
                placeholder="เช่น ซอยสุขุมวิท 38 (ใกล้ BTS ทองหล่อ)"
                value={storeData.store.address}
                onChange={(e) =>
                  setStoreData({
                    ...storeData,
                    store: { ...storeData.store, address: e.target.value },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="store-google-map-url"
                className="block text-xs font-semibold mb-1"
              >
                ลิงก์ Google Maps
              </label>
              <input
                id="store-google-map-url"
                type="url"
                placeholder="เช่น https://maps.app.goo.gl/..."
                value={storeData.store.googleMapUrl || ""}
                onChange={(e) =>
                  setStoreData({
                    ...storeData,
                    store: {
                      ...storeData.store,
                      googleMapUrl: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  เบอร์ / เลข PromptPay (สร้าง QR)
                </label>
                <input
                  type="text"
                  value={storeData.store.promptPayId}
                  onChange={(e) =>
                    setStoreData({
                      ...storeData,
                      store: {
                        ...storeData.store,
                        promptPayId: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  ชื่อบัญชี PromptPay
                </label>
                <input
                  type="text"
                  value={storeData.store.promptPayName}
                  onChange={(e) =>
                    setStoreData({
                      ...storeData,
                      store: {
                        ...storeData.store,
                        promptPayName: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  ธนาคาร
                </label>
                <input
                  type="text"
                  value={storeData.store.bankName}
                  onChange={(e) =>
                    setStoreData({
                      ...storeData,
                      store: { ...storeData.store, bankName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  เลขที่บัญชีธนาคาร
                </label>
                <input
                  type="text"
                  value={storeData.store.bankAccountNumber}
                  onChange={(e) =>
                    setStoreData({
                      ...storeData,
                      store: {
                        ...storeData.store,
                        bankAccountNumber: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const openHHMM = extractTimeHHMM(
                  storeData.store.openTime,
                  "06:00"
                );
                const closeHHMM = extractTimeHHMM(
                  storeData.store.closeTime,
                  "11:30"
                );
                const nextOpenIso = toBangkokIso8601(openHHMM);
                const nextCloseIso = toBangkokIso8601(closeHHMM);
                const nextStore = {
                  ...storeData.store,
                  openTime: nextOpenIso,
                  closeTime: nextCloseIso,
                  pickupTimeSlots: buildPickupTimeSlots(
                    nextOpenIso,
                    nextCloseIso,
                    storeData.store.pickupTimeSlots
                  ),
                };
                adminPatch(
                  {
                    action: "update_store_settings",
                    store: nextStore,
                  },
                  "บันทึกการตั้งค่าร้านเรียบร้อยแล้ว"
                );
              }}
              className="w-full py-3 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4 text-sunrise-400" />
              บันทึกการตั้งค่าร้าน
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
