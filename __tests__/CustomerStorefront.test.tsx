import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้ (Raynue Morning)",
    tagline: "อาหารเช้าโฮมเมด อบอุ่น สดใหม่ทุกวัน",
    isOpen: true,
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
    prepTimeMinutes: 15,
    phone: "089-123-4567",
    address: "ซอยสุขุมวิท 38",
    lineOaId: "@raynue",
    lineOaUrl: "https://line.me/R/ti/p/@raynue",
    promptPayId: "0891234567",
    promptPayName: "ร้านเรณู เช้านี้",
    bankName: "ธนาคารกสิกรไทย",
    bankAccountNumber: "123-4-56789-0",
    bankAccountName: "บจก. เรณู มอร์นิ่ง",
    pickupTimeSlots: ["รับทันที (เตรียมอาหาร 15-20 นาที)", "07:00 - 07:15 น."],
    announcement: "สั่งล่วงหน้าและรับหน้าร้านได้ทันที",
  },
  categories: [
    { id: "all", name: "ทั้งหมด", icon: "Utensils" },
    { id: "sets", name: "เซ็ตอาหารเช้าครบชุด", icon: "Sunrise" },
  ],
  items: [
    {
      id: "set-raynue-signature",
      categoryId: "sets",
      name: "เซ็ตอรุณสวัสดิ์เรณู (Signature Breakfast Set)",
      description: "ไข่กระทะทรงเครื่องหมูสับกุนเชียง",
      price: 119,
      image: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666",
      popular: true,
      soldOut: false,
    },
  ],
};

describe("CustomerStorefront customerPhone validation", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/promptpay")) {
        return {
          ok: true,
          json: async () => ({ qrDataUrl: "data:image/png;base64,MOCK" }),
        } as Response;
      }
      if (url.includes("/api/orders")) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            order: {
              id: "2026-11-06-A001-0001",
              queueNumber: "#A001",
              dateKey: "2026-11-06",
              createdAt: new Date().toISOString(),
              customerName: "คุณพลอย",
              customerPhone: "0812345678",
              customerContact: "",
              pickupTime: "รับทันที (เตรียมอาหาร 15-20 นาที)",
              paymentMethod: "counter",
              items: [
                {
                  id: "set-raynue-signature",
                  name: "เซ็ตอรุณสวัสดิ์เรณู (Signature Breakfast Set)",
                  price: 119,
                  quantity: 1,
                },
              ],
              totalQuantity: 1,
              totalAmount: 119,
              status: "pending",
              lineSent: true,
            },
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => mockStoreData,
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function openCheckoutAndSubmitWithPhone(phoneValue: string) {
    render(<CustomerStorefront initialData={mockStoreData} />);

    // Add 1 item to cart
    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);

    // Open checkout modal
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    // Select pay at counter to isolate customerPhone validation from slip upload
    fireEvent.click(screen.getByRole("button", { name: /ชำระที่หน้าร้าน/i }));

    // Fill customer name, customerPhone, and LINE ID (required for counter payment)
    fireEvent.change(screen.getByPlaceholderText(/เช่น คุณพลอย/i), {
      target: { value: "คุณพลอย" },
    });
    fireEvent.change(screen.getByPlaceholderText(/เช่น 081/i), {
      target: { value: phoneValue },
    });
    fireEvent.change(screen.getByPlaceholderText(/LINE ID/i), {
      target: { value: "U8189cf6745fc0d808977bdb0b9f22995" },
    });

    // Submit order form
    fireEvent.click(
      screen.getByRole("button", { name: /ยืนยันการสั่งอาหารเช้า/i })
    );
  }

  it.each([
    ["contains hyphens", "081-234-5678"],
    ["contains spaces", "081 234 5678"],
    ["starts with invalid prefix 02", "0212345678"],
    ["starts with invalid prefix 07", "0712345678"],
    ["has fewer than 10 digits (9 digits)", "081234567"],
    ["has more than 10 digits (11 digits)", "08123456789"],
    ["contains non-numeric characters", "081234567a"],
  ])(
    "rejects invalid customerPhone when it %s (%s)",
    async (_reason, invalidPhone) => {
      openCheckoutAndSubmitWithPhone(invalidPhone);

      const errorBanner = await screen.findByText(
        /กรุณากรอกเบอร์โทรศัพท์ 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09 โดยไม่เว้นวรรคหรือขีด/
      );
      expect(errorBanner).toBeDefined();

      const orderApiCalls = fetchMock.mock.calls.filter(([url]) =>
        String(url).includes("/api/orders")
      );
      expect(orderApiCalls).toHaveLength(0);
    }
  );

  it.each([
    ["06 prefix", "0612345678"],
    ["08 prefix", "0812345678"],
    ["09 prefix", "0912345678"],
  ])(
    "accepts valid 10-digit customerPhone with %s (%s) and submits order",
    async (_label, validPhone) => {
      openCheckoutAndSubmitWithPhone(validPhone);

      await waitFor(() => {
        const orderApiCalls = fetchMock.mock.calls.filter(([url]) =>
          String(url).includes("/api/orders")
        );
        expect(orderApiCalls).toHaveLength(1);
      });

      expect(await screen.findByText("#A001")).toBeDefined();
    }
  );
});
