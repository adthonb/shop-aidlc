import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "Raynue Morning",
    tagline: "Breakfast",
    isOpen: true,
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
    prepTimeMinutes: 15,
    phone: "089-123-4567",
    address: "Sukhumvit 38",
    lineOaId: "@raynue",
    lineOaUrl: "https://line.me/R/ti/p/@raynue",
    promptPayId: "0891234567",
    promptPayName: "Raynue",
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    pickupTimeSlots: ["รับทันที (เตรียมอาหาร 15-20 นาที)"],
    announcement: "",
  },
  categories: [{ id: "all", name: "ทั้งหมด", icon: "Utensils" }],
  items: [
    {
      id: "set-raynue-signature",
      categoryId: "all",
      name: "Breakfast Set",
      description: "Set",
      price: 119,
      image: "https://example.com/item.jpg",
      popular: true,
      soldOut: false,
      quantity: 20,
    },
  ],
};

describe("CustomerStorefront LINE ID field restriction for counter payment", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function openCheckout() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => mockStoreData,
      }))
    );
    render(<CustomerStorefront initialData={mockStoreData} />);
    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );
  }

  it("makes LINE ID input readOnly when counter payment is selected to prevent manual typing", () => {
    openCheckout();

    // Default payment is PromptPay -> input is editable (not readOnly)
    const lineInput = screen.getByPlaceholderText(/LINE ID/i) as HTMLInputElement;
    expect(lineInput.readOnly).toBe(false);

    // Switch to counter payment -> input must be readOnly
    fireEvent.click(screen.getByRole("button", { name: /ชำระที่หน้าร้าน/i }));
    expect(lineInput.readOnly).toBe(true);

    // Shows informative placeholder indicating auto-fill via LINE OA
    expect(lineInput.placeholder).toMatch(/แอด LINE OA|อัตโนมัติ/i);

    // Switch back to PromptPay -> input is editable again
    fireEvent.click(screen.getByRole("button", { name: /สแกน PromptPay/i }));
    expect(lineInput.readOnly).toBe(false);
  });

  it("displays verified badge when LINE ID is populated from LINE OA return flow", () => {
    window.history.replaceState({}, "", "/?lineId=U8189cf6745fc0d808977bdb0b9f22995");
    openCheckout();

    fireEvent.click(screen.getByRole("button", { name: /ชำระที่หน้าร้าน/i }));
    const lineInput = screen.getByPlaceholderText(/LINE ID/i) as HTMLInputElement;
    expect(lineInput.value).toBe("U8189cf6745fc0d808977bdb0b9f22995");
    expect(lineInput.readOnly).toBe(true);

    // Verified badge indicator should be present
    expect(screen.getByText(/ยืนยันผ่าน LINE OA แล้ว/i)).toBeDefined();
  });
});
