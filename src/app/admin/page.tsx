"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShoppingBag,
  Store,
  Utensils,
} from "lucide-react";
import { MenuItem, OrderRecord, StoreData } from "@/types/store";

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
      setLineConfigured(Boolean(data.lineConfigured));
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
    if (savedPin) {
      setPin(savedPin);
      fetchAdminData(savedPin);
    }
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

  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>({});

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
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-espresso-700 hover:text-espresso-900 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              กลับสู่หน้าสั่งอาหารของลูกค้า
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 pb-20 max-w-2xl mx-auto border-x border-cream-200">
      {/* Top Admin Header */}
      <header className="bg-espresso-900 text-white p-5 sticky top-0 z-20 shadow-md">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">ระบบจัดการร้าน (Admin)</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAdminData(pin)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a
              href="/"
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold"
            >
              หน้าร้าน
            </a>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Store Open / Close Quick Master Switch */}
        {storeData && (
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Store className="w-4 h-4 text-sunrise-400" />
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                storeData.store.isOpen
                  ? "bg-rose-500 hover:bg-rose-600 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
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
          {orders.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-cream-200 text-xs text-espresso-700/70">
              ยังไม่มีรายการสั่งอาหารเข้ามาในระบบ
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-4 border border-cream-200 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-espresso-900 text-sunrise-400 font-black text-sm">
                        {order.queueNumber}
                      </span>
                      <span className="text-sm font-bold text-espresso-900">
                        คุณ{order.customerName}
                      </span>
                      <a
                        href={`tel:${order.customerPhone}`}
                        className="text-xs text-sunrise-600 font-semibold underline"
                      >
                        {order.customerPhone}
                      </a>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-espresso-700/80 mt-1.5">
                      <Clock className="w-3.5 h-3.5 text-sunrise-500" />
                      <span>
                        เวลารับ: <strong>{order.pickupTime}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Order Status Selector */}
                  <select
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
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                      order.status === "completed"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : order.status === "ready"
                        ? "bg-blue-50 text-blue-800 border-blue-300"
                        : order.status === "cancelled"
                        ? "bg-rose-50 text-rose-800 border-rose-300"
                        : "bg-amber-50 text-amber-900 border-amber-300"
                    }`}
                  >
                    <option value="pending">⏳ รอเตรียมอาหาร</option>
                    <option value="preparing">🍳 กำลังปรุง</option>
                    <option value="ready">✅ พร้อมรับหน้าร้าน</option>
                    <option value="completed">🎉 ลูกค้ารับแล้ว</option>
                    <option value="cancelled">❌ ยกเลิก</option>
                  </select>
                </div>

                {/* Items */}
                <div className="bg-cream-50 rounded-xl p-3 space-y-1 text-xs border border-cream-200">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="font-medium text-espresso-900">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-bold">
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

                {/* Payment & Slip Link */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                  <span
                    className={`font-semibold ${
                      order.paymentMethod === "promptpay"
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {order.paymentMethod === "promptpay"
                      ? "✅ โอนเงิน PromptPay"
                      : "💵 ชำระที่หน้าร้าน"}
                  </span>

                  {order.slipUrl && (
                    <a
                      href={order.slipUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold"
                    >
                      <span>ดูรูปสลิปโอนเงิน</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sunrise-500 hover:bg-sunrise-600 text-white text-xs font-bold shadow-xs"
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
                  className="col-span-2 px-3 py-2 rounded-xl border border-cream-300 text-xs"
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
                  className="col-span-2 px-3 py-2 rounded-xl border border-cream-300 text-xs"
                />
                <select
                  value={newItemForm.categoryId}
                  onChange={(e) =>
                    setNewItemForm({
                      ...newItemForm,
                      categoryId: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-xl border border-cream-300 text-xs"
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
                  className="px-3 py-2 rounded-xl border border-cream-300 text-xs"
                />
                <input
                  type="text"
                  placeholder="URL รูปภาพ (เว้นว่างใช้รูปเริ่มต้นได้)"
                  value={newItemForm.image}
                  onChange={(e) =>
                    setNewItemForm({ ...newItemForm, image: e.target.value })
                  }
                  className="col-span-2 px-3 py-2 rounded-xl border border-cream-300 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingItem(false)}
                  className="px-3 py-1.5 rounded-lg bg-cream-100 text-xs font-semibold"
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
                  className="px-4 py-1.5 rounded-lg bg-espresso-900 text-white text-xs font-bold"
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
                className="bg-white rounded-2xl p-3.5 border border-cream-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover bg-cream-100 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-espresso-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs font-extrabold text-sunrise-600 mt-0.5">
                      ฿{item.price.toLocaleString()}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="text-[11px] text-espresso-700/70 underline mt-0.5"
                    >
                      แก้ไขชื่อ/ราคา
                    </button>
                    <div className="flex items-center gap-1.5 mt-1.5">
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
                        className="w-20 px-2 py-1 rounded-lg border border-cream-300 text-xs"
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
                        className="px-2.5 py-1 rounded-lg bg-espresso-900 text-white text-[11px] font-bold"
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
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
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
                  <label className="text-xs font-semibold block mb-1">
                    ชื่อเมนู
                  </label>
                  <input
                    type="text"
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">
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
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1">
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
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 rounded-xl bg-cream-100 text-xs font-semibold"
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
                    className="px-4 py-2 rounded-xl bg-espresso-900 text-white text-xs font-bold"
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
                    const nextStore = {
                      ...storeData.store,
                      openTime: toBangkokIso8601(nextOpen),
                      closeTime: toBangkokIso8601(currentClose),
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
                    const nextStore = {
                      ...storeData.store,
                      openTime: toBangkokIso8601(currentOpen),
                      closeTime: toBangkokIso8601(nextClose),
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
                const nextStore = {
                  ...storeData.store,
                  openTime: toBangkokIso8601(openHHMM),
                  closeTime: toBangkokIso8601(closeHHMM),
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
