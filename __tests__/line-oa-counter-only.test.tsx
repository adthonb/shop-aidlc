import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "Raynue",
    tagline: "tagline",
    isOpen: true,
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
    prepTimeMinutes: 15,
    phone: "089-123-4567",
    address: "addr",
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
      id: "item-1",
      categoryId: "all",
      name: "Set",
      description: "d",
      price: 100,
      image: "https://example.com/a.jpg",
      soldOut: false,
      quantity: 20,
    },
  ],
};

describe("Add LINE OA block visibility", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function openCheckout() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/api/promptpay")) {
          return {
            ok: true,
            json: async () => ({ qrDataUrl: "data:image/png;base64,MOCK" }),
          } as Response;
        }
        return { ok: true, json: async () => mockStoreData } as Response;
      })
    );
    render(<CustomerStorefront initialData={mockStoreData} />);
    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );
  }

  it("does NOT show Add LINE OA block when PromptPay QR payment is selected", () => {
    openCheckout();
    expect(screen.queryByRole("link", { name: /แอด LINE OA/i })).toBeNull();
  });

  it("shows Add LINE OA block directly under the LINE ID input only for counter payment", () => {
    openCheckout();
    fireEvent.click(screen.getByRole("button", { name: /ชำระที่หน้าร้าน/i }));
    const input = screen.getByPlaceholderText(/LINE ID/i);
    const sibling = input.nextElementSibling;
    expect(sibling?.tagName).toBe("DIV");
    expect(sibling?.querySelector("a")?.getAttribute("href")).toBe(
      "https://line.me/R/ti/p/@raynue"
    );

    fireEvent.click(screen.getByRole("button", { name: /สแกน PromptPay/i }));
    expect(screen.queryByRole("link", { name: /แอด LINE OA/i })).toBeNull();
  });
});
