import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import AdminPage from "@/app/admin/page";
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
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "บจก. เรณู มอร์นิ่ง",
    pickupTimeSlots: ["รับทันที (เตรียมอาหาร 15-20 นาที)"],
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
      quantity: 20,
    },
    {
      id: "set-american-homestyle",
      categoryId: "sets",
      name: "เซ็ตอเมริกันเบรกฟาสต์ครบชุด",
      description: "ไข่ดาว 2 ฟอง เบคอนรมควันย่าง",
      price: 135,
      image: "https://images.unsplash.com/photo-1525351484163-7529414344d8",
      popular: false,
      soldOut: false,
      quantity: 15,
    },
  ],
};

describe("Menu image 108px size and larger add/quantity buttons", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders each menu item image at 108px (w-[108px] h-[108px]) on Front page (CustomerStorefront)", () => {
    render(<CustomerStorefront initialData={mockStoreData} />);

    for (const item of mockStoreData.items) {
      const img = screen.getByAltText(item.name) as HTMLImageElement;
      const wrapper = img.parentElement as HTMLElement;
      expect(wrapper.className).toContain("w-[108px]");
      expect(wrapper.className).toContain("h-[108px]");
      expect(img.className).toContain("w-[108px]");
      expect(img.className).toContain("h-[108px]");
    }
  });

  it("renders each menu item image at 108px (w-[108px] h-[108px]) on Admin page", async () => {
    sessionStorage.setItem("raynue_admin_pin", "1234");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          storeData: mockStoreData,
          orders: [],
          todayKey: "2026-11-08",
          lineConfigured: true,
        }),
      }))
    );

    render(<AdminPage />);

    const menuTab = await screen.findByRole("button", {
      name: /จัดการเมนู/,
    });
    fireEvent.click(menuTab);

    for (const item of mockStoreData.items) {
      const img = screen.getByAltText(item.name) as HTMLImageElement;
      expect(img.className).toContain("w-[108px]");
      expect(img.className).toContain("h-[108px]");
    }
  });

  it("renders larger rectangular ratio add menu button and quantity stepper controls on Front page", () => {
    render(<CustomerStorefront initialData={mockStoreData} />);

    const addButtons = screen.getAllByRole("button", { name: /เพิ่ม/i });
    expect(addButtons.length).toBeGreaterThan(0);

    const firstAddButton = addButtons[0];
    expect(firstAddButton.className).toContain("min-w-[96px]");
    expect(firstAddButton.className).toContain("h-9");
    expect(firstAddButton.className).toContain("px-5");
    expect(firstAddButton.className).toContain("rounded-lg");
    expect(firstAddButton.className).toContain("text-sm");

    // Click add button to reveal quantity stepper
    fireEvent.click(firstAddButton);

    const decreaseButton = screen.getByRole("button", { name: "ลดจำนวน" });
    const increaseButton = screen.getByRole("button", { name: "เพิ่มจำนวน" });

    expect(decreaseButton.className).toContain("w-10");
    expect(decreaseButton.className).toContain("h-8");
    expect(decreaseButton.className).toContain("rounded-md");
    expect(increaseButton.className).toContain("w-10");
    expect(increaseButton.className).toContain("h-8");
    expect(increaseButton.className).toContain("rounded-md");

    const qtyDisplay = decreaseButton.parentElement?.querySelector("span");
    expect(qtyDisplay?.textContent).toBe("1");
    expect(qtyDisplay?.className).toContain("text-base");
  });
});
