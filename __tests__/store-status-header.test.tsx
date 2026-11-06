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
    phone: "081-234-5678",
    address: "สุขุมวิท 101",
    isOpen: true,
    pickupTimeSlots: ["รับทันที (15-20 นาที)", "07:00 - 07:30 น."],
    promptPayId: "0812345678",
    promptPayName: "ร้านเรณู",
    bankName: "กสิกรไทย",
    bankAccountNo: "123-4-56789-0",
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

describe("Header Self-Pickup badge and Store Status layout", () => {
  it("renders 'สั่งล่วงหน้า • รับที่หน้าร้าน (Self-Pickup)' with 14px (text-sm) font size and places store status on its own line", () => {
    render(<CustomerStorefront initialData={mockStoreData} />);

    const selfPickupBadge = screen.getByText(
      /สั่งล่วงหน้า • รับที่หน้าร้าน \(Self-Pickup\)/i
    );
    expect(selfPickupBadge.className).toContain("text-sm");

    const statusBadge = screen.getByText("เปิดรับออเดอร์");
    expect(statusBadge.className).toContain("whitespace-nowrap");
    expect(statusBadge.parentElement).not.toBe(selfPickupBadge);
    expect(selfPickupBadge.parentElement?.className).toContain("flex-col");
  });
});
