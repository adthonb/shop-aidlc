import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้ (Raynue Morning)",
    tagline: "อาหารเช้าโฮมเมด อบอุ่น สดใหม่ทุกวัน",
    isOpen: true,
    openHours: "06:00 - 11:30 น.",
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
      calories: "520 kcal",
    },
  ],
};

describe("Typography hierarchy (H3 = 16px / text-base, H2 = 20px / text-xl, H1 = 24px / text-2xl)", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders H1 as text-2xl (24px), H2 as text-xl (20px), H3 as text-base (16px), and description as text-sm (14px)", () => {
    const { container } = render(
      <CustomerStorefront initialData={mockStoreData} />
    );

    // Add item and open checkout so modal H2 and H3 headings are also rendered
    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    const h1Elements = Array.from(container.querySelectorAll("h1"));
    const h2Elements = Array.from(container.querySelectorAll("h2"));
    const h3Elements = Array.from(container.querySelectorAll("h3"));

    expect(h1Elements.length).toBeGreaterThan(0);
    expect(h2Elements.length).toBeGreaterThan(0);
    expect(h3Elements.length).toBeGreaterThan(0);

    for (const h1 of h1Elements) {
      expect(h1.className).toContain("text-2xl");
    }
    for (const h2 of h2Elements) {
      expect(h2.className).toContain("text-xl");
    }
    for (const h3 of h3Elements) {
      expect(h3.className).toContain("text-base");
    }

    const description = screen.getByText("ไข่กระทะทรงเครื่องหมูสับกุนเชียง");
    expect(description.className).toContain("text-sm");
  });
});
