"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clock,
  Coffee,
  Copy,
  Croissant,
  Download,
  Flame,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Plus,
  QrCode,
  ShoppingBag,
  Soup,
  Sparkles,
  Store,
  Sunrise,
  Trash2,
  Upload,
  Utensils,
  X,
} from "lucide-react";
import {
  MenuItem,
  OrderRecord,
  PaymentMethod,
  StoreData,
} from "@/types/store";
import { buildPickupTimeSlots } from "@/lib/pickup";
import { isValidJpgSlip } from "@/lib/order-history";
import { isStoreOpenToOrder } from "@/lib/store-hours";

function extractHHMM(isoOrTime?: string): string | null {
  if (!isoOrTime) return null;
  const match =
    isoOrTime.match(/T(\d{2}:\d{2})/) || isoOrTime.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function formatStoreOpenHours(store: StoreData["store"]): string {
  const openHHMM = extractHHMM(store.openTime);
  const closeHHMM = extractHHMM(store.closeTime);
  if (openHHMM && closeHHMM) {
    return `${openHHMM} - ${closeHHMM} น.`;
  }
  return "06:00 - 11:30 น.";
}

export default function CustomerStorefront({
  initialData,
  currentTime,
}: {
  initialData: StoreData;
  currentTime?: Date | string;
}) {
  const [storeData, setStoreData] = useState<StoreData>(initialData);

  const isOrderOpen = useMemo(
    () => isStoreOpenToOrder(storeData.store, currentTime),
    [storeData.store, currentTime]
  );

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const availablePickupSlots = useMemo(
    () =>
      buildPickupTimeSlots(
        storeData.store.openTime,
        storeData.store.closeTime,
        storeData.store.pickupTimeSlots
      ),
    [
      storeData.store.openTime,
      storeData.store.closeTime,
      storeData.store.pickupTimeSlots,
    ]
  );

  // Checkout states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [lineVerificationToken, setLineVerificationToken] = useState("");
  const [pickupTime, setPickupTime] = useState(
    () =>
      buildPickupTimeSlots(
        initialData.store.openTime,
        initialData.store.closeTime,
        initialData.store.pickupTimeSlots
      )[0] || "รับทันที (เตรียมอาหาร 15-20 นาที)"
  );
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("promptpay");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  // PromptPay QR states
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState(false);
  const [downloadedQr, setDownloadedQr] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedPromptPay, setCopiedPromptPay] = useState(false);

  // Submission & Confirmation states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(
    null
  );
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persist customer info & cart in localStorage
  useEffect(() => {
    const restoreSavedState = async () => {
      try {
        const savedCart = localStorage.getItem("raynue_cart");
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
        let parsedCustomer: { name?: string; phone?: string; contact?: string } =
          {};
        const savedCustomer = localStorage.getItem("raynue_customer");
        if (savedCustomer) {
          parsedCustomer = JSON.parse(savedCustomer);
          if (parsedCustomer.name) setCustomerName(parsedCustomer.name);
          if (parsedCustomer.phone) setCustomerPhone(parsedCustomer.phone);
          if (parsedCustomer.contact) setCustomerContact(parsedCustomer.contact);
        }
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const lineIdParam = (
            params.get("lineId") ||
            params.get("line_id") ||
            ""
          ).trim();
          const lineTokenParam = (
            params.get("lineToken") ||
            params.get("lt") ||
            ""
          ).trim();
          if (lineTokenParam) {
            setLineVerificationToken(lineTokenParam);
          }
          if (lineIdParam) {
            setCustomerContact(lineIdParam);
            localStorage.setItem(
              "raynue_customer",
              JSON.stringify({
                ...parsedCustomer,
                contact: lineIdParam,
              })
            );
          }
        }
      } catch {
        // Ignore storage errors
      }
    };
    void restoreSavedState();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("raynue_cart", JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  // Periodically refresh menu availability
  useEffect(() => {
    const refreshMenu = async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
        if (res.ok) {
          const fresh = (await res.json()) as StoreData;
          setStoreData(fresh);
        }
      } catch {
        // Ignore network errors
      }
    };
    const interval = setInterval(refreshMenu, 30000);
    return () => clearInterval(interval);
  }, []);

  // Synchronize document.title and head > title tag with storeName
  useEffect(() => {
    const storeName = storeData?.store?.storeName;
    if (storeName && typeof document !== "undefined") {
      document.title = storeName;
      let headTitle = document.querySelector("head > title");
      if (!headTitle) {
        headTitle = document.createElement("title");
        document.head.appendChild(headTitle);
      }
      headTitle.textContent = storeName;
    }
  }, [storeData?.store?.storeName]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "all") return storeData.items;
    return storeData.items.filter((i) => i.categoryId === activeCategory);
  }, [storeData.items, activeCategory]);

  const cartEntries = useMemo(() => {
    const list: Array<{ item: MenuItem; quantity: number }> = [];
    for (const [id, qty] of Object.entries(cart)) {
      if (qty <= 0) continue;
      const item = storeData.items.find((i) => i.id === id);
      if (item && !item.soldOut) {
        list.push({ item, quantity: qty });
      }
    }
    return list;
  }, [cart, storeData.items]);

  const totalQuantity = useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.quantity, 0),
    [cartEntries]
  );

  const totalAmount = useMemo(
    () => cartEntries.reduce((sum, e) => sum + e.item.price * e.quantity, 0),
    [cartEntries]
  );

  // Fetch dynamic PromptPay QR whenever checkout opens or totalAmount changes
  useEffect(() => {
    if (!isCheckoutOpen || totalAmount <= 0 || paymentMethod !== "promptpay") {
      return;
    }
    let cancelled = false;
    const loadQr = async () => {
      setIsLoadingQr(true);
      try {
        const res = await fetch(`/api/promptpay?amount=${totalAmount}`);
        const data = await res.json();
        if (!cancelled && data.qrDataUrl) {
          setQrDataUrl(data.qrDataUrl);
        }
      } catch {
        // Ignore network errors
      } finally {
        if (!cancelled) setIsLoadingQr(false);
      }
    };
    void loadQr();

    return () => {
      cancelled = true;
    };
  }, [isCheckoutOpen, totalAmount, paymentMethod]);

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[itemId];
      } else {
        copy[itemId] = next;
      }
      return copy;
    });
  };

  const clearCart = () => {
    setCart({});
    setIsCheckoutOpen(false);
  };

  const handleSlipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidJpgSlip(file.name, file.type)) {
      setSlipFile(null);
      setSlipPreview(null);
      setSubmitError("อนุญาตเฉพาะไฟล์สลิปนามสกุล .jpg เท่านั้น");
      e.target.value = "";
      return;
    }
    setSlipFile(file);
    const url = URL.createObjectURL(file);
    setSlipPreview(url);
    setSubmitError(null);
  };

  const copyText = async (text: string, type: "account" | "promptpay") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "account") {
        setCopiedAccount(true);
        setTimeout(() => setCopiedAccount(false), 2000);
      } else {
        setCopiedPromptPay(true);
        setTimeout(() => setCopiedPromptPay(false), 2000);
      }
    } catch {
      // Ignore clipboard error
    }
  };

  const downloadQrImage = async () => {
    if (!qrDataUrl) return;
    setIsDownloadingQr(true);
    try {
      let href = qrDataUrl;
      const isJsdom =
        typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);

      if (qrDataUrl.startsWith("data:image/svg+xml") && !isJsdom) {
        const pngUrl = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              const width = img.naturalWidth ? img.naturalWidth * 2 : 720;
              const height = img.naturalHeight ? img.naturalHeight * 2 : 960;
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(qrDataUrl);
                return;
              }
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/png"));
            } catch {
              resolve(qrDataUrl);
            }
          };
          img.onerror = () => resolve(qrDataUrl);
          img.src = qrDataUrl;
        });
        href = pngUrl;
      }

      const link = document.createElement("a");
      link.download = `Raynue-PromptPay-${totalAmount}.png`;
      link.href = href;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownloadedQr(true);
      setTimeout(() => setDownloadedQr(false), 3000);
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isOrderOpen) {
      setSubmitError("ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว");
      return;
    }

    if (cartEntries.length === 0) {
      setSubmitError("กรุณาเลือกรายการอาหารอย่างน้อย 1 รายการ");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setSubmitError("กรุณากรอกชื่อและเบอร์โทรศัพท์สำหรับรับอาหาร");
      return;
    }

    if (!/^(06|08|09)\d{8}$/.test(customerPhone)) {
      setSubmitError(
        "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09 โดยไม่เว้นวรรคหรือขีด"
      );
      return;
    }

    if (paymentMethod === "counter") {
      if (!customerContact.trim()) {
        setSubmitError(
          "กรุณาระบุ LINE ID สำหรับการชำระที่หน้าร้าน (แอด LINE OA แล้วกดปุ่มกลับมาที่หน้าเว็บ)"
        );
        return;
      }
      if (!/^U[0-9a-f]{32}$/.test(customerContact.trim())) {
        setSubmitError(
          "รูปแบบ LINE User ID ไม่ถูกต้อง (ต้องเป็นรหัส U[0-9a-f]{32} จากการกดปุ่มในแชท LINE OA)"
        );
        return;
      }
    }

    if (paymentMethod === "promptpay" && !slipFile) {
      setSubmitError("กรุณาแนบรูปสลิปโอนเงินก่อนยืนยันออเดอร์");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save customer details for next visit
      localStorage.setItem(
        "raynue_customer",
        JSON.stringify({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          contact: customerContact.trim(),
        })
      );

      const formData = new FormData();
      formData.append("customerName", customerName.trim());
      formData.append("customerPhone", customerPhone.trim());
      formData.append("customerContact", customerContact.trim());
      if (lineVerificationToken) {
        formData.append("lineToken", lineVerificationToken);
      }
      formData.append("pickupTime", pickupTime);
      formData.append("paymentMethod", paymentMethod);
      formData.append(
        "items",
        JSON.stringify(
          cartEntries.map((entry) => ({
            id: entry.item.id,
            quantity: entry.quantity,
          }))
        )
      );
      if (slipFile && paymentMethod === "promptpay") {
        formData.append("slip", slipFile);
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถส่งออเดอร์ได้ กรุณาลองอีกครั้ง");
      }

      setConfirmedOrder(data.order as OrderRecord);
      setCart({});
      localStorage.removeItem("raynue_cart");
      setSlipFile(null);
      setSlipPreview(null);
      setIsCheckoutOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการส่งออเดอร์"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate a crisp PNG receipt card using HTML5 Canvas for customer download
  const downloadReceiptImage = async (order: OrderRecord) => {
    setIsDownloadingReceipt(true);
    try {
      const canvas = document.createElement("canvas");
      const width = 720;
      const baseHeight = 580 + order.items.length * 54;
      canvas.width = width;
      canvas.height = baseHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Background
      ctx.fillStyle = "#FDFBF7";
      ctx.fillRect(0, 0, width, baseHeight);

      // Header Banner
      ctx.fillStyle = "#D97706";
      ctx.fillRect(0, 0, width, 150);

      // Store Name & Queue
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 28px sans-serif";
      ctx.fillText(storeData.store.storeName, 40, 58);

      ctx.fillStyle = "#FEF3C7";
      ctx.font = "20px sans-serif";
      ctx.fillText("ใบรับออเดอร์สั่งล่วงหน้า (Self-Pickup Receipt)", 40, 95);
      ctx.fillText(`เวลารับอาหาร: ${order.pickupTime}`, 40, 128);

      // Queue badge on right
      ctx.fillStyle = "#23170E";
      ctx.fillRect(width - 210, 30, 170, 90);
      ctx.fillStyle = "#F59E0B";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText("หมายเลขคิว", width - 170, 58);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 40px sans-serif";
      ctx.fillText(order.queueNumber, width - 185, 102);

      // Customer info
      let y = 200;
      ctx.fillStyle = "#23170E";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(`ลูกค้า: คุณ${order.customerName}`, 40, y);
      y += 34;
      ctx.fillStyle = "#4A3525";
      ctx.font = "20px sans-serif";
      ctx.fillText(`เบอร์โทร: ${order.customerPhone}`, 40, y);
      y += 34;
      ctx.fillStyle = "#6B5344";
      ctx.font = "18px sans-serif";
      ctx.fillText(
        `วิธีชำระเงิน: ${
          order.paymentMethod === "promptpay"
            ? "โอนเงิน PromptPay (แนบสลิปแล้ว)"
            : "ชำระเงินที่หน้าร้านตอนรับของ"
        }`,
        40,
        y
      );

      // Divider
      y += 28;
      ctx.strokeStyle = "#E8D7B9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();

      // Items Header
      y += 38;
      ctx.fillStyle = "#23170E";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText("รายการอาหารเช้า", 40, y);
      ctx.fillText("ราคา", width - 110, y);

      // Items list
      y += 16;
      for (const item of order.items) {
        y += 42;
        ctx.fillStyle = "#362417";
        ctx.font = "20px sans-serif";
        const title =
          item.name.length > 36 ? item.name.slice(0, 36) + "..." : item.name;
        ctx.fillText(`${item.quantity}x  ${title}`, 40, y);

        ctx.font = "bold 20px sans-serif";
        ctx.fillText(
          `฿${(item.price * item.quantity).toLocaleString()}`,
          width - 110,
          y
        );
      }

      // Divider
      y += 30;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 40, y);
      ctx.stroke();

      // Total
      y += 48;
      ctx.fillStyle = "#23170E";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(`ยอดรวมทั้งสิ้น (${order.totalQuantity} รายการ)`, 40, y);
      ctx.fillStyle = "#D97706";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText(`฿${order.totalAmount.toLocaleString()}`, width - 140, y);

      // Footer note
      y += 55;
      ctx.fillStyle = "#6B5344";
      ctx.font = "18px sans-serif";
      ctx.fillText(
        "กรุณาแสดงหน้าจอหรือใบเสร็จนี้ พร้อมแจ้งหมายเลขคิวที่หน้าร้าน ขอบคุณค่ะ ☀️",
        40,
        y
      );

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `Raynue-${order.queueNumber.replace("#", "")}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Sunrise":
        return <Sunrise className="w-4 h-4" />;
      case "Soup":
        return <Soup className="w-4 h-4" />;
      case "Croissant":
        return <Croissant className="w-4 h-4" />;
      case "Coffee":
        return <Coffee className="w-4 h-4" />;
      default:
        return <Utensils className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 pb-32 max-w-md mx-auto shadow-xl shadow-espresso-900/5 relative border-x border-cream-200">
      <title>{storeData.store.storeName}</title>
      {/* Top Hero Header */}
      <header className="relative bg-gradient-to-br from-espresso-900 via-espresso-800 to-sunrise-600 text-cream-50 pt-7 pb-6 px-5 rounded-b-[2rem] shadow-md overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-sunrise-400/20 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <div className="mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-cream-50/20 backdrop-blur-sm text-white border border-cream-50/30 shadow-xs">
              <Sunrise className="w-4 h-4 text-sunrise-400 shrink-0" />
              สั่งล่วงหน้า • รับที่หน้าร้าน (Self-Pickup)
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            {storeData.store.storeName}
          </h1>

          <div className="mt-2">
            {isOrderOpen ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                เปิดรับออเดอร์
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap bg-rose-500/30 text-rose-200 border border-rose-400/30">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                ปิดรับออเดอร์ชั่วคราว
              </span>
            )}
          </div>

          <p className="text-sm text-cream-200 mt-2 leading-relaxed">
            {storeData.store.tagline}
          </p>

          <div className="mt-4 pt-3 border-t border-cream-50/15 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-sm text-cream-100">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sunrise-400 shrink-0" />
              <span>เปิด {formatStoreOpenHours(storeData.store)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-sunrise-400 shrink-0" />
              <a
                href={`tel:${storeData.store.phone}`}
                className="underline decoration-cream-300/40"
              >
                {storeData.store.phone}
              </a>
            </div>
            <div className="flex items-center gap-1.5 w-full">
              <MapPin className="w-3.5 h-3.5 text-sunrise-400 shrink-0" />
              <a
                href={
                  storeData.store.googleMapUrl?.trim() ||
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    storeData.store.address
                  )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="truncate underline decoration-cream-300/40 hover:text-white"
              >
                {storeData.store.address}
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Store Closed Alert Banner */}
      {!isOrderOpen && (
        <div className="mx-4 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2.5">
          <Store className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว คุณสามารถเลือกดูเมนูได้ และกลับมาสั่งได้ในเวลา{" "}
            {formatStoreOpenHours(storeData.store)} ค่ะ
          </span>
        </div>
      )}

      {/* Morning Announcement Banner */}
      {storeData.store.announcement && isOrderOpen && (
        <div className="mx-4 mt-4 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-espresso-800 text-sm flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-sunrise-500 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{storeData.store.announcement}</span>
        </div>
      )}

      {/* Sticky Category Bar */}
      <div className="sticky top-0 z-20 bg-cream-50/95 backdrop-blur-md py-3 px-4 border-b border-cream-200/80 mt-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {storeData.categories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  active
                    ? "bg-espresso-900 text-cream-50 shadow-sm scale-[1.02]"
                    : "bg-cream-100 text-espresso-700 hover:bg-cream-200 border border-cream-300/60"
                }`}
              >
                {renderCategoryIcon(cat.icon)}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Section Info */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-xl font-bold text-espresso-900">
          {storeData.categories.find((c) => c.id === activeCategory)?.name ||
            "เมนูอาหารเช้า"}
        </h2>
        <span className="text-sm text-espresso-700/70">
          จัดเซ็ตครบชุด • กดเลือกจำนวนได้เลย
        </span>
      </div>

      {/* Menu List (Quantity Only - Completed Breakfast Sets) */}
      <div className="px-4 space-y-3.5">
        {filteredItems.map((item) => {
          const qty = cart[item.id] || 0;
          const isDisabled = item.soldOut || !isOrderOpen;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-3.5 border transition-all flex gap-3.5 ${
                qty > 0
                  ? "border-sunrise-500 ring-1 ring-sunrise-400/50 shadow-md"
                  : "border-cream-200 shadow-sm"
              } ${item.soldOut ? "opacity-65 grayscale-[30%]" : ""}`}
            >
              {/* Item Thumbnail */}
              <div className="relative w-[108px] h-[108px] rounded-xl overflow-hidden bg-cream-100 shrink-0">
                <img
                  src={item.image}
                  alt={item.name}
                  width={108}
                  height={108}
                  className="w-[108px] h-[108px] object-cover"
                  loading="lazy"
                />
                {item.popular && !item.soldOut && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sunrise-500 text-white shadow">
                    <Flame className="w-2.5 h-2.5 fill-current" /> ขายดี
                  </span>
                )}
                {item.soldOut && (
                  <div className="absolute inset-0 bg-espresso-900/65 flex items-center justify-center">
                    <span className="px-2 py-1 rounded-md bg-white/95 text-espresso-900 text-[11px] font-bold">
                      หมดวันนี้
                    </span>
                  </div>
                )}
              </div>

              {/* Item Content & Quantity Stepper */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-espresso-900 leading-snug">
                    {item.name}
                  </h3>
                  <p className="text-sm text-espresso-700/80 mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-lg font-extrabold text-sunrise-600">
                      ฿{item.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity Controls */}
                  {item.soldOut ? (
                    <span className="text-sm font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                      สินค้าหมด
                    </span>
                  ) : qty === 0 ? (
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => updateQuantity(item.id, 1)}
                      className="min-w-[96px] h-9 inline-flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-lg bg-sunrise-500 hover:bg-sunrise-600 active:scale-95 text-white text-sm font-bold shadow-sm transition disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      เพิ่ม
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-2 bg-cream-100 border border-sunrise-400/60 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-10 h-8 rounded-md bg-white text-espresso-900 hover:bg-cream-200 active:scale-95 flex items-center justify-center shadow-sm transition"
                        aria-label="ลดจำนวน"
                      >
                        <Minus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                      <span className="min-w-[2rem] text-center text-base font-extrabold text-espresso-900">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-10 h-8 rounded-md bg-sunrise-500 text-white hover:bg-sunrise-600 active:scale-95 flex items-center justify-center shadow-sm transition"
                        aria-label="เพิ่มจำนวน"
                      >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info & Link to Admin */}
      <footer className="mt-10 px-6 py-6 text-center text-sm text-espresso-700/60 border-t border-cream-200/80">
        <p className="font-semibold text-espresso-800">
          {storeData.store.storeName}
        </p>
        <p className="mt-0.5">สั่งอาหารเช้าล่วงหน้า รับที่หน้าร้าน สดใหม่ทุกวัน</p>
        <div className="mt-3 flex items-center justify-center gap-4">
          <a
            href={storeData.store.lineOaUrl}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-700 hover:underline font-medium inline-flex items-center gap-1"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            LINE OA: {storeData.store.lineOaId}
          </a>
          <span>•</span>
          <a
            href="/admin"
            className="text-espresso-700/60 hover:text-espresso-900 underline"
          >
            สำหรับร้านค้า (Admin)
          </a>
        </div>
      </footer>

      {/* Floating Sticky Bottom Cart Bar */}
      {totalQuantity > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 max-w-md mx-auto p-4 bg-gradient-to-t from-cream-50 via-cream-50/95 to-transparent">
          <button
            type="button"
            onClick={() => {
              setSubmitError(null);
              setIsCheckoutOpen(true);
            }}
            className="w-full py-3.5 px-5 rounded-2xl bg-espresso-900 hover:bg-espresso-800 active:scale-[0.99] text-white shadow-xl shadow-espresso-900/25 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-sunrise-500 text-white font-extrabold text-sm">
                {totalQuantity}
              </div>
              <div className="text-left">
                <p className="text-sm text-cream-200 font-medium">
                  ตะกร้าอาหารเช้าของคุณ
                </p>
                <p className="text-sm font-bold text-white">
                  ตรวจสอบรายการ & สั่งรับหน้าร้าน
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-lg font-extrabold text-sunrise-400">
                ฿{totalAmount.toLocaleString()}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Checkout Bottom Sheet Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-40 bg-espresso-900/60 backdrop-blur-xs flex items-end justify-center">
          <div className="bg-cream-50 w-full max-w-md max-h-[92vh] rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-white border-b border-cream-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-sunrise-500" />
                <h2 className="text-xl font-bold text-espresso-900">
                  ยืนยันออเดอร์รับที่หน้าร้าน
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-10 h-10 rounded-full bg-cream-100 text-espresso-800 flex items-center justify-center hover:bg-cream-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form
              onSubmit={handleSubmitOrder}
              className="p-5 overflow-y-auto space-y-5 flex-1"
            >
              {/* 1. Order Items Summary */}
              <div className="bg-white rounded-2xl p-4 border border-cream-200 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-espresso-900">
                    รายการที่เลือก ({totalQuantity} ชุด)
                  </h3>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-rose-600 hover:bg-rose-50 font-semibold"
                  >
                    <Trash2 className="w-4 h-4" />
                    ล้างตะกร้า
                  </button>
                </div>

                <div className="divide-y divide-cream-200/70">
                  {cartEntries.map(({ item, quantity }) => (
                    <div
                      key={item.id}
                      className="py-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-espresso-900 break-words leading-snug min-w-0 flex-1">
                          {item.name}
                        </p>
                        <span className="text-sm font-extrabold text-espresso-900 shrink-0">
                          ฿{(item.price * quantity).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-espresso-700/70">
                          ฿{item.price.toLocaleString()} / ชุด
                        </span>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-10 h-8 rounded-md bg-cream-100 text-espresso-900 flex items-center justify-center"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="min-w-[1.75rem] text-center text-base font-bold">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-10 h-8 rounded-md bg-sunrise-500 text-white flex items-center justify-center"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-cream-200 flex items-center justify-between">
                  <span className="text-sm font-bold text-espresso-900">
                    ยอดชำระทั้งหมด
                  </span>
                  <span className="text-xl font-extrabold text-sunrise-600">
                    ฿{totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 2. Customer & Pickup Details */}
              <div className="bg-white rounded-2xl p-4 border border-cream-200 shadow-xs space-y-3.5">
                <h3 className="text-base font-bold text-espresso-900">
                  ข้อมูลผู้รับ & เวลารับอาหาร
                </h3>

                <div>
                  <label className="block text-sm font-semibold text-espresso-800 mb-1">
                    ชื่อ / ชื่อเล่น สำหรับเรียกคิว <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณพลอย, คุณนนท์"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-sunrise-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-espresso-800 mb-1">
                    เบอร์โทรศัพท์ติดต่อ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    placeholder="เช่น 0812345678 (ตัวเลข 10 หลักติดกัน)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-sunrise-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-espresso-800">
                      {paymentMethod === "counter" ? (
                        <>
                          LINE ID สำหรับยืนยันออเดอร์หน้าร้าน{" "}
                          <span className="text-rose-500">*</span>
                        </>
                      ) : (
                        "LINE ID หรือ อีเมล (ถ้ามี)"
                      )}
                    </label>
                    {paymentMethod === "counter" && customerContact.trim() && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        ยืนยันผ่าน LINE OA แล้ว
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    readOnly={paymentMethod === "counter"}
                    placeholder={
                      paymentMethod === "counter"
                        ? "LINE ID จะแสดงที่นี่หลังแอด LINE OA อัตโนมัติ"
                        : "ระบุ LINE ID หรือกดปุ่มแอด LINE OA เพื่อรับ LINE ID"
                    }
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-sm focus:outline-none transition ${
                      paymentMethod === "counter"
                        ? "bg-cream-100/80 text-espresso-900 cursor-not-allowed font-mono text-xs select-none"
                        : "bg-cream-50/50 text-espresso-900 focus:ring-2 focus:ring-sunrise-500"
                    }`}
                  />
                  {paymentMethod === "counter" && (
                    <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-espresso-800 leading-relaxed space-y-2.5">
                      <p>
                        💡 <strong>สำหรับชำระเงินที่หน้าร้าน:</strong> กรุณาแอด LINE OA ของร้าน แล้วกดปุ่มจากในแชท LINE เพื่อกลับมาหน้าสั่งอาหาร ระบบจะใส่ LINE ID ลงในช่องให้อัตโนมัติ (ป้องกันออเดอร์ปลอม)
                      </p>
                      <a
                        href={storeData.store.lineOaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition"
                      >
                        <MessageCircle className="w-4 h-4 shrink-0" />
                        <span>
                          แอด LINE OA ({storeData.store.lineOaId}) เพื่อรับ LINE ID
                        </span>
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-espresso-800 mb-1">
                    เลือกเวลารับอาหารที่หน้าร้าน <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-cream-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sunrise-500"
                  >
                    {availablePickupSlots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Payment Method Selection */}
              <div className="bg-white rounded-2xl p-4 border border-cream-200 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-espresso-900">
                  เลือกวิธีชำระเงิน
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("promptpay")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      paymentMethod === "promptpay"
                        ? "border-sunrise-500 bg-amber-50/70 ring-1 ring-sunrise-500"
                        : "border-cream-300 bg-cream-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <QrCode className="w-4 h-4 text-sunrise-600" />
                      {paymentMethod === "promptpay" && (
                        <span className="w-4 h-4 rounded-full bg-sunrise-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-espresso-900 mt-1">
                      สแกน PromptPay
                    </span>
                    <span className="text-sm text-espresso-700/75">
                      โอนเงิน & แนบสลิป
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("counter")}
                    className={`p-3 rounded-xl border text-left transition flex flex-col gap-1 ${
                      paymentMethod === "counter"
                        ? "border-sunrise-500 bg-amber-50/70 ring-1 ring-sunrise-500"
                        : "border-cream-300 bg-cream-50/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <Store className="w-4 h-4 text-sunrise-600" />
                      {paymentMethod === "counter" && (
                        <span className="w-4 h-4 rounded-full bg-sunrise-500 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-espresso-900 mt-1">
                      ชำระที่หน้าร้าน
                    </span>
                    <span className="text-sm text-espresso-700/75">
                      เงินสด หรือ สแกนตอนรับของ
                    </span>
                  </button>
                </div>

                {/* Dynamic PromptPay QR + Bank Info + Slip Upload */}
                {paymentMethod === "promptpay" && (
                  <div className="pt-2 space-y-4">
                    <div className="bg-cream-50 rounded-2xl p-4 border border-cream-300 text-center">
                      <div className="inline-block px-3 py-1 rounded-full bg-blue-900 text-white text-sm font-bold tracking-wide mb-2">
                        THAI QR PROMPTPAY
                      </div>
                      <p className="text-sm text-espresso-800 font-medium">
                        สแกนด้วยแอปธนาคารใดก็ได้ (ระบุยอดอัตโนมัติ)
                      </p>

                      <div className="my-3 flex justify-center">
                        {isLoadingQr ? (
                          <div className="w-56 h-72 rounded-2xl bg-white border border-cream-200 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-sunrise-500 animate-spin" />
                          </div>
                        ) : qrDataUrl ? (
                          <img
                            src={qrDataUrl}
                            alt="Thai QR PromptPay Card"
                            className="w-56 h-auto rounded-2xl border border-cream-200 shadow-sm bg-white"
                          />
                        ) : null}
                      </div>

                      <p className="text-base font-extrabold text-sunrise-600">
                        ยอดโอน ฿{totalAmount.toLocaleString()}.00 บาท
                      </p>
                      <p className="text-sm font-semibold text-espresso-900 mt-0.5">
                        ชื่อบัญชี: {storeData.store.promptPayName}
                      </p>

                      {qrDataUrl && (
                        <div className="mt-3">
                          <button
                            type="button"
                            disabled={isDownloadingQr}
                            onClick={() => void downloadQrImage()}
                            className={`w-full min-h-11 py-2.5 px-4 rounded-xl text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60 ${
                              downloadedQr
                                ? "bg-emerald-700 hover:bg-emerald-800"
                                : "bg-espresso-900 hover:bg-espresso-800 active:scale-[0.99]"
                            }`}
                          >
                            {downloadedQr ? (
                              <>
                                <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                                <span>บันทึกรูป QR ลงมือถือแล้ว</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 text-sunrise-400 shrink-0" />
                                <span>
                                  {isDownloadingQr
                                    ? "กำลังบันทึกรูป QR..."
                                    : "บันทึกรูป QR ลงมือถือ"}
                                </span>
                              </>
                            )}
                          </button>
                          <p className="text-sm text-espresso-700/75 mt-1.5">
                            1) กดบันทึกรูป QR ลงมือถือ • 2) เปิดแอปธนาคารสแกนจากอัลบั้มรูป • 3) แนบสลิปด้านล่าง
                          </p>
                        </div>
                      )}

                      {/* Copyable PromptPay & Bank Account Details */}
                      <div className="mt-3 pt-3 border-t border-cream-200 text-left space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2.5 rounded-xl border border-cream-200">
                          <div className="min-w-0">
                            <span className="text-espresso-700/70 block text-sm">
                              พร้อมเพย์ (PromptPay)
                            </span>
                            <span className="font-bold text-espresso-900">
                              {storeData.store.promptPayId}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              copyText(storeData.store.promptPayId, "promptpay")
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-cream-100 hover:bg-cream-200 text-espresso-800 font-semibold text-sm shrink-0"
                          >
                            {copiedPromptPay ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                คัดลอกแล้ว
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                คัดลอก
                              </>
                            )}
                          </button>
                        </div>

                        {Boolean(
                          storeData.store.bankName?.trim() &&
                            storeData.store.bankAccountNumber?.trim()
                        ) && (
                          <div className="flex items-center justify-between gap-2 bg-white px-3 py-2.5 rounded-xl border border-cream-200">
                            <div className="min-w-0">
                              <span className="text-espresso-700/70 block text-sm break-words">
                                {storeData.store.bankName}
                                {storeData.store.bankAccountName?.trim()
                                  ? ` (${storeData.store.bankAccountName})`
                                  : ""}
                              </span>
                              <span className="font-bold text-espresso-900">
                                {storeData.store.bankAccountNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                copyText(
                                  storeData.store.bankAccountNumber || "",
                                  "account"
                                )
                              }
                              className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-cream-100 hover:bg-cream-200 text-espresso-800 font-semibold text-sm shrink-0"
                            >
                              {copiedAccount ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  คัดลอกแล้ว
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  คัดลอก
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Slip Upload Input */}
                    <div>
                      <label className="block text-sm font-bold text-espresso-900 mb-1.5">
                        แนบรูปสลิปโอนเงิน <span className="text-rose-500">*</span>
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".jpg,image/jpeg"
                        onChange={handleSlipChange}
                        className="hidden"
                      />

                      {slipPreview ? (
                        <div className="relative rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 p-3 flex items-center gap-3">
                          <img
                            src={slipPreview}
                            alt="ตัวอย่างสลิป"
                            className="w-16 h-20 object-cover rounded-lg border border-emerald-200 bg-white"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-emerald-900 truncate">
                              แนบสลิปเรียบร้อยแล้ว
                            </p>
                            <p className="text-sm text-emerald-700 truncate mt-0.5">
                              {slipFile?.name}
                            </p>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-sunrise-600 underline"
                            >
                              <ImageIcon className="w-4 h-4" />
                              เปลี่ยนรูปสลิป
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-5 px-4 rounded-2xl border-2 border-dashed border-sunrise-400 bg-amber-50/40 hover:bg-amber-50 text-espresso-800 flex flex-col items-center justify-center gap-1.5 transition"
                        >
                          <Upload className="w-6 h-6 text-sunrise-500" />
                          <span className="text-sm font-bold">
                            กดเพื่อเลือกรูปสลิปโอนเงิน
                          </span>
                          <span className="text-sm text-espresso-700/70">
                            รองรับเฉพาะไฟล์ภาพ JPEG จากแอปธนาคาร
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {paymentMethod === "counter" && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-espresso-800 leading-relaxed">
                    💡 ร้านจะเริ่มเตรียมอาหารตามเวลารับที่คุณเลือก และคุณสามารถชำระด้วยเงินสดหรือสแกนจ่ายที่เคาน์เตอร์หน้าร้านตอนมารับอาหารได้เลยค่ะ
                  </div>
                )}
              </div>

              {submitError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
                  ⚠️ {submitError}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-1 pb-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 px-6 rounded-2xl bg-sunrise-500 hover:bg-sunrise-600 active:scale-[0.99] text-white font-extrabold text-base shadow-lg shadow-sunrise-500/25 flex items-center justify-center gap-2 transition disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      กำลังส่งออเดอร์ไปที่ร้าน...
                    </>
                  ) : (
                    <>
                      <span>ยืนยันการสั่งอาหารเช้า • ฿{totalAmount.toLocaleString()}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirmation & Queue Card Modal */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-50 bg-espresso-900/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-cream-50 w-full max-w-md rounded-3xl shadow-2xl border border-cream-200 overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Top Ticket Banner */}
            <div className="bg-gradient-to-br from-sunrise-500 to-sunrise-600 text-white p-6 text-center relative">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xs mx-auto flex items-center justify-center mb-2">
                <Check className="w-7 h-7 text-white stroke-[3]" />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-amber-100">
                สั่งอาหารเช้าสำเร็จแล้ว!
              </p>
              <h2 className="text-xl font-bold mt-0.5">
                หมายเลขคิวรับอาหารของคุณ
              </h2>

              <div className="mt-3 inline-block px-6 py-2.5 rounded-2xl bg-espresso-900 text-sunrise-400 text-4xl font-black tracking-wider shadow-inner">
                {confirmedOrder.queueNumber}
              </div>

              <p className="text-sm text-amber-100 mt-3 font-medium">
                เวลารับอาหาร: <strong className="text-white">{confirmedOrder.pickupTime}</strong>
              </p>
            </div>

            {/* Ticket Body */}
            <div className="p-5 space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-cream-200 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-espresso-700/70">ชื่อผู้รับ:</span>
                  <span className="font-bold text-espresso-900">
                    คุณ{confirmedOrder.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-espresso-700/70">เบอร์โทรศัพท์:</span>
                  <span className="font-bold text-espresso-900">
                    {confirmedOrder.customerPhone}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-espresso-700/70">การชำระเงิน:</span>
                  <span className="font-bold text-emerald-700">
                    {confirmedOrder.paymentMethod === "promptpay"
                      ? "โอนเงิน PromptPay (แนบสลิปแล้ว)"
                      : "ชำระที่หน้าร้านตอนรับของ"}
                  </span>
                </div>

                <div className="border-t border-dashed border-cream-300 my-2 pt-2 space-y-1.5">
                  {confirmedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-2">
                      <span className="text-espresso-800 break-words min-w-0">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-bold text-espresso-900 shrink-0">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-cream-200 pt-2 flex justify-between items-center text-sm">
                  <span className="font-bold text-espresso-900">
                    รวมทั้งหมด ({confirmedOrder.totalQuantity} รายการ)
                  </span>
                  <span className="text-base font-extrabold text-sunrise-600">
                    ฿{confirmedOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Save Receipt Image & Open LINE OA */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={isDownloadingReceipt}
                  onClick={() => downloadReceiptImage(confirmedOrder)}
                  className="w-full py-3.5 px-4 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <Download className="w-4 h-4 text-sunrise-400" />
                  {isDownloadingReceipt
                    ? "กำลังสร้างรูปใบเสร็จ..."
                    : "บันทึกรูปใบเสร็จ / หมายเลขคิวลงมือถือ"}
                </button>

                <a
                  href={storeData.store.lineOaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  ติดต่อร้านผ่าน LINE OA ({storeData.store.lineOaId})
                </a>

                <button
                  type="button"
                  onClick={() => setConfirmedOrder(null)}
                  className="w-full py-3 px-4 rounded-xl bg-cream-200/70 hover:bg-cream-200 text-espresso-800 text-sm font-semibold transition"
                >
                  กลับสู่หน้าเมนูหลัก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
