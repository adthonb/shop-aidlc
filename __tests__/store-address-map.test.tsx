import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomerStorefront from "../src/components/CustomerStorefront";
import AdminPage from "../src/app/admin/page";
import { StoreData } from "../src/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "เรณู อาหารเช้า (Raynue Morning)",
    tagline: "มื้อเช้าโฮมเมด อบอุ่น สดใหม่ทุกเช้า",
    openHours: "06:00 - 11:30 น. (อังคาร - อาทิตย์)",
    openTime: "2026-11-06T06:00:00+07:00",
    closeTime: "2026-11-06T11:30:00+07:00",
    prepTimeMinutes: 15,
    phone: "081-234-5678",
    address: "ซอยสุขุมวิท 38 (ใกล้ BTS ทองหล่อ จอดรถหน้าร้านรับของได้ทันที)",
    googleMapUrl: "https://maps.app.goo.gl/RaynueMorningShop123",
    lineOaId: "@raynue",
    lineOaUrl: "https://line.me/R/ti/p/@raynue",
    isOpen: true,
    pickupTimeSlots: ["รับทันที (15-20 นาที)", "07:00 - 07:30 น."],
    promptPayId: "0812345678",
    promptPayName: "ร้านเรณู",
    bankName: "กสิกรไทย",
    bankAccountNumber: "123-4-56789-0",
    bankAccountName: "ร้านเรณู",
    announcement: "สั่งล่วงหน้าแล้วมารับได้เลย",
  },
  categories: [
    { id: "all", name: "ทั้งหมด", icon: "🌅" },
    { id: "sets", name: "เซ็ตอาหารเช้า", icon: "🍳" },
  ],
  items: [
    {
      id: "set-pan-egg",
      categoryId: "sets",
      name: "เซ็ตไข่กระทะต้นตำรับ + ขนมปังเวียดนาม",
      description: "ไข่กระทะทรงเครื่องหมูสับกุนเชียง",
      price: 89,
      image: "/images/pan-egg.jpg",
      popular: true,
      soldOut: false,
      calories: "420 kcal",
    },
  ],
};

describe("Store Address Text and Google Maps URL Configuration", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders configured store address text and exact Google Maps URL on CustomerStorefront", () => {
    render(<CustomerStorefront initialData={mockStoreData} />);

    const addressLink = screen.getByRole("link", {
      name: mockStoreData.store.address,
    });
    expect(addressLink).toBeDefined();
    expect(addressLink.getAttribute("href")).toBe(
      "https://maps.app.goo.gl/RaynueMorningShop123"
    );
    expect(addressLink.getAttribute("target")).toBe("_blank");
    expect(addressLink.getAttribute("rel")).toContain("noopener");
  });

  it("allows setting store address text and Google Maps URL in AdminPage store settings", async () => {
    sessionStorage.setItem("raynue_admin_pin", "1234");

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          const parsed = JSON.parse(String(init.body));
          return {
            ok: true,
            json: async () => ({
              success: true,
              storeData: {
                ...mockStoreData,
                store: parsed.store || mockStoreData.store,
              },
            }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({
            storeData: mockStoreData,
            orders: [],
            todayKey: "2026-11-06",
            lineConfigured: true,
          }),
        } as Response;
      }
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);

    const settingsTab = await screen.findByRole("button", {
      name: /ตั้งค่าร้าน/,
    });
    fireEvent.click(settingsTab);

    const addressInput = screen.getByLabelText("ที่อยู่ร้าน") as HTMLInputElement;
    const mapUrlInput = screen.getByLabelText(
      "ลิงก์ Google Maps"
    ) as HTMLInputElement;

    expect(addressInput.value).toBe(mockStoreData.store.address);
    expect(mapUrlInput.value).toBe(mockStoreData.store.googleMapUrl);

    fireEvent.change(addressInput, {
      target: { value: "สุขุมวิท 55 (ทองหล่อ ซอย 10)" },
    });
    fireEvent.change(mapUrlInput, {
      target: { value: "https://maps.app.goo.gl/Thonglor10" },
    });

    const saveButton = screen.getByRole("button", {
      name: /บันทึกการตั้งค่าร้าน/,
    });
    fireEvent.click(saveButton);

    await waitFor(() => {
      const patchCalls = fetchMock.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH"
      );
      expect(patchCalls).toHaveLength(1);

      const [, patchInit] = patchCalls[0] as unknown as [string, RequestInit];
      const payload = JSON.parse(String(patchInit.body));

      expect(payload.action).toBe("update_store_settings");
      expect(payload.store.address).toBe("สุขุมวิท 55 (ทองหล่อ ซอย 10)");
      expect(payload.store.googleMapUrl).toBe(
        "https://maps.app.goo.gl/Thonglor10"
      );
    });
  });
});
