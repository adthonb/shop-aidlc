import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import CustomerStorefront from "../src/components/CustomerStorefront";
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

describe("Store Address Google Maps Link", () => {
  it("renders store address as a clickable link to Google Maps in a new tab", () => {
    render(<CustomerStorefront initialData={mockStoreData} />);

    const addressLink = screen.getByRole("link", {
      name: mockStoreData.store.address,
    });
    expect(addressLink).toBeDefined();
    expect(addressLink.getAttribute("href")).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        mockStoreData.store.address
      )}`
    );
    expect(addressLink.getAttribute("target")).toBe("_blank");
    expect(addressLink.getAttribute("rel")).toContain("noopener");
  });
});
