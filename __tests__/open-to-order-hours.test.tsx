import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { NextRequest } from "next/server";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";
import {
  isWithinOperatingHours,
  isStoreOpenToOrder,
  getBangkokCurrentHHMM,
} from "@/lib/store-hours";
import { POST as handlePostOrder } from "@/app/api/orders/route";
import * as storage from "@/lib/storage";

const mockStoreData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้ (Raynue Morning)",
    tagline: "อาหารเช้าโฮมเมด อบอุ่น สดใหม่ทุกวัน",
    isOpen: true,
    openTime: "06:30:00+07:00",
    closeTime: "13:00:00+07:00",
    prepTimeMinutes: 15,
    phone: "089-123-4567",
    address: "สุขุมวิท 38",
    googleMapUrl: "https://maps.app.goo.gl/RaynueMorning",
    lineOaId: "@raynue",
    lineOaUrl: "https://line.me/R/ti/p/@raynue",
    promptPayId: "0891234567",
    promptPayName: "ร้านเรณู เช้านี้",
    bankName: "ธนาคารกสิกรไทย",
    bankAccountNumber: "123-4-56789-0",
    bankAccountName: "บจก. เรณู มอร์นิ่ง",
    pickupTimeSlots: [
      "รับทันที (เตรียมอาหาร 15-20 นาที)",
      "06:30 - 06:45 น.",
      "07:00 - 07:15 น.",
    ],
    announcement: "สั่งล่วงหน้าไม่ต้องรอคิว",
  },
  categories: [
    { id: "all", name: "ทั้งหมด", icon: "Utensils" },
    { id: "sets", name: "เซ็ตอาหารเช้า", icon: "Sunrise" },
  ],
  items: [
    {
      id: "set-pan-egg",
      categoryId: "sets",
      name: "เซ็ตไข่กระทะต้นตำรับ",
      description: "ไข่กระทะทรงเครื่องหมูสับกุนเชียง",
      price: 89,
      image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666",
      popular: true,
      soldOut: false,
      quantity: 10,
    },
  ],
};

describe("TDD: Open to order status corresponding to openTime and closeTime", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("store-hours calculation logic", () => {
    it("converts Date to Bangkok time (UTC+7) HH:MM correctly", () => {
      // 2026-11-09T01:30:00.000Z is 08:30:00+07:00 in Asia/Bangkok
      const utcDate = new Date("2026-11-09T01:30:00.000Z");
      expect(getBangkokCurrentHHMM(utcDate)).toBe("08:30");

      // 2026-11-09T14:10:00.000Z is 21:10:00+07:00 in Asia/Bangkok
      const nightDate = new Date("2026-11-09T14:10:00.000Z");
      expect(getBangkokCurrentHHMM(nightDate)).toBe("21:10");
    });

    it("evaluates daytime operating hours (06:30 - 13:00) accurately", () => {
      const open = "06:30:00+07:00";
      const close = "13:00:00+07:00";

      expect(isWithinOperatingHours(open, close, "06:29")).toBe(false);
      expect(isWithinOperatingHours(open, close, "06:30")).toBe(true);
      expect(isWithinOperatingHours(open, close, "10:00")).toBe(true);
      expect(isWithinOperatingHours(open, close, "12:59")).toBe(true);
      expect(isWithinOperatingHours(open, close, "13:00")).toBe(false);
      expect(isWithinOperatingHours(open, close, "21:10")).toBe(false);
    });

    it("evaluates overnight operating hours (18:00 - 02:00) spanning midnight", () => {
      const open = "18:00:00+07:00";
      const close = "02:00:00+07:00";

      expect(isWithinOperatingHours(open, close, "17:59")).toBe(false);
      expect(isWithinOperatingHours(open, close, "18:00")).toBe(true);
      expect(isWithinOperatingHours(open, close, "23:59")).toBe(true);
      expect(isWithinOperatingHours(open, close, "00:00")).toBe(true);
      expect(isWithinOperatingHours(open, close, "01:59")).toBe(true);
      expect(isWithinOperatingHours(open, close, "02:00")).toBe(false);
      expect(isWithinOperatingHours(open, close, "12:00")).toBe(false);
    });

    it("isStoreOpenToOrder checks both isOpen master toggle and operating hours", () => {
      const store = {
        isOpen: true,
        openTime: "06:30:00+07:00",
        closeTime: "13:00:00+07:00",
      };

      // Inside hours and isOpen is true -> open to order
      expect(isStoreOpenToOrder(store, "08:00")).toBe(true);

      // Outside hours even if isOpen is true -> closed
      expect(isStoreOpenToOrder(store, "21:10")).toBe(false);
      expect(isStoreOpenToOrder(store, "05:00")).toBe(false);

      // Inside hours but manually toggled off by admin -> closed
      expect(
        isStoreOpenToOrder({ ...store, isOpen: false }, "08:00")
      ).toBe(false);

      // Fallback when openTime/closeTime are missing
      expect(isStoreOpenToOrder({ isOpen: true })).toBe(true);
      expect(isStoreOpenToOrder({ isOpen: false })).toBe(false);
    });
  });

  describe("CustomerStorefront open to order status UI", () => {
    it("renders 'เปิดรับออเดอร์' badge and allows adding to cart when within openTime and closeTime", () => {
      render(
        <CustomerStorefront
          initialData={mockStoreData}
          currentTime="08:00"
        />
      );

      const statusBadge = screen.getByText("เปิดรับออเดอร์");
      expect(statusBadge).toBeDefined();
      expect(screen.queryByText(/ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว คุณสามารถเลือกดูเมนูได้/)).toBeNull();

      // Adding to cart should be enabled
      const addButton = screen.getByRole("button", { name: /เพิ่ม/i });
      expect(addButton).toBeDefined();
      expect(addButton.hasAttribute("disabled")).toBe(false);

      fireEvent.click(addButton);
      expect(
        screen.getByRole("button", {
          name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i,
        })
      ).toBeDefined();
    });

    it("renders 'ปิดรับออเดอร์ชั่วคราว' badge, displays closed banner, and disables ordering when outside openTime and closeTime", () => {
      render(
        <CustomerStorefront
          initialData={mockStoreData}
          currentTime="21:10"
        />
      );

      const statusBadge = screen.getByText("ปิดรับออเดอร์ชั่วคราว");
      expect(statusBadge).toBeDefined();
      expect(screen.queryByText("เปิดรับออเดอร์")).toBeNull();

      // Closed banner should be shown with formatted hours
      expect(
        screen.getByText(
          /ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว คุณสามารถเลือกดูเมนูได้ และกลับมาสั่งได้ในเวลา 06:30 - 13:00 น\./
        )
      ).toBeDefined();

      // Add to cart buttons should be disabled
      const addButton = screen.getByRole("button", { name: /เพิ่ม/i });
      expect(addButton.hasAttribute("disabled")).toBe(true);
    });

    it("renders 'ปิดรับออเดอร์ชั่วคราว' when store.isOpen is false even if within operating hours", () => {
      const closedStoreData: StoreData = {
        ...mockStoreData,
        store: {
          ...mockStoreData.store,
          isOpen: false,
        },
      };

      render(
        <CustomerStorefront
          initialData={closedStoreData}
          currentTime="08:00"
        />
      );

      expect(screen.getByText("ปิดรับออเดอร์ชั่วคราว")).toBeDefined();
      expect(screen.queryByText("เปิดรับออเดอร์")).toBeNull();
      const addButton = screen.getByRole("button", { name: /เพิ่ม/i });
      expect(addButton.hasAttribute("disabled")).toBe(true);
    });
  });

  describe("POST /api/orders rejects orders when outside openTime and closeTime", () => {
    it("returns 400 when store is outside openTime and closeTime at order submission", async () => {
      vi.spyOn(storage, "ensureDataDirs").mockResolvedValue(undefined);
      vi.spyOn(storage, "getStoreData").mockResolvedValue({
        ...mockStoreData,
        store: {
          ...mockStoreData.store,
          isOpen: true,
          openTime: "06:30:00+07:00",
          closeTime: "13:00:00+07:00",
        },
      });

      // Mock system time to 21:10 (outside operating hours)
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-11-09T14:10:00.000Z")); // 21:10 Bangkok time

      const formData = new FormData();
      formData.append("customerName", "สมชาย");
      formData.append("customerPhone", "0812345678");
      formData.append("pickupTime", "รับทันที (เตรียมอาหาร 15-20 นาที)");
      formData.append(
        "items",
        JSON.stringify([{ id: "set-pan-egg", quantity: 1 }])
      );

      const req = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: formData,
      });

      const response = await handlePostOrder(req);
      expect(response.status).toBe(400);

      const body = await response.json();
      expect(body.error).toContain("ขณะนี้ร้านปิดรับออเดอร์ชั่วคราว");
    });
  });
});
