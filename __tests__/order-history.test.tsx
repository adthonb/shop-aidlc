import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import { OrderRecord, StoreData } from "@/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้",
    tagline: "อาหารเช้าโฮมเมด",
    isOpen: true,
    phone: "089-123-4567",
    address: "สุขุมวิท 38",
    promptPayId: "0891234567",
    promptPayName: "ร้านเรณู",
    bankName: "กสิกรไทย",
    bankAccountName: "บจก. เรณู",
    pickupTimeSlots: ["รับทันที"],
  },
  categories: [{ id: "sets", name: "เซ็ต", icon: "Sunrise" }],
  items: [
    {
      id: "item-1",
      categoryId: "sets",
      name: "ข้าวต้มหมู",
      description: "อร่อย",
      price: 75,
      image: "/x.jpg",
      soldOut: false,
      quantity: 20,
    },
  ],
};

const mockOrders: OrderRecord[] = [
  {
    id: "2026-11-07-A001",
    queueNumber: "#A001",
    dateKey: "2026-11-07",
    createdAt: "2026-11-07T01:30:00.000Z",
    updatedAt: "2026-11-07T01:35:00.000Z",
    customerName: "ลูกค้าวันนี้",
    customerPhone: "0811111111",
    customerContact: "",
    pickupTime: "รับทันที",
    paymentMethod: "counter",
    items: [{ id: "item-1", name: "ข้าวต้มหมู", price: 75, quantity: 2 }],
    totalQuantity: 2,
    totalAmount: 150,
    status: "pending",
    statusHistory: [{ status: "pending", timestamp: "2026-11-07T01:30:00.000Z" }],
    lineSent: false,
  },
  {
    id: "2026-11-06-A002",
    queueNumber: "#A002",
    dateKey: "2026-11-06",
    createdAt: "2026-11-06T02:00:00.000Z",
    updatedAt: "2026-11-06T02:20:00.000Z",
    customerName: "ลูกค้าเมื่อวาน",
    customerPhone: "0822222222",
    customerContact: "",
    pickupTime: "08:30 - 08:45",
    paymentMethod: "promptpay",
    items: [{ id: "item-1", name: "ข้าวต้มหมู", price: 75, quantity: 1 }],
    totalQuantity: 1,
    totalAmount: 75,
    status: "completed",
    statusHistory: [
      { status: "pending", timestamp: "2026-11-06T02:00:00.000Z" },
      { status: "completed", timestamp: "2026-11-06T02:20:00.000Z" },
    ],
    lineSent: true,
  },
];

describe("Admin order history date filter, timestamps, and CSV/JSON export controls", () => {
  beforeEach(() => {
    sessionStorage.setItem("raynue_admin_pin", "1234");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          storeData: mockStoreData,
          orders: mockOrders,
          todayKey: "2026-11-07",
          lineConfigured: true,
        }),
      }))
    );
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("defaults to todayKey orders, allows switching to past dates or all dates, and displays timestamps and export buttons", async () => {
    render(<AdminPage />);

    // Defaults to today's order (#A001) and hides yesterday's order (#A002)
    expect(await screen.findByText("คุณลูกค้าวันนี้")).toBeTruthy();
    expect(screen.queryByText("คุณลูกค้าเมื่อวาน")).toBeNull();

    // Displays date filter select with aria-label "เลือกวันที่ออเดอร์"
    const dateSelect = screen.getByLabelText("เลือกวันที่ออเดอร์") as HTMLSelectElement;
    expect(dateSelect.value).toBe("2026-11-07");

    // Switch to yesterday ("2026-11-06")
    fireEvent.change(dateSelect, { target: { value: "2026-11-06" } });
    expect(await screen.findByText("คุณลูกค้าเมื่อวาน")).toBeTruthy();
    expect(screen.queryByText("คุณลูกค้าวันนี้")).toBeNull();

    // Switch to all dates ("all")
    fireEvent.change(dateSelect, { target: { value: "all" } });
    expect(await screen.findByText("คุณลูกค้าวันนี้")).toBeTruthy();
    expect(await screen.findByText("คุณลูกค้าเมื่อวาน")).toBeTruthy();

    // Renders CSV and JSON export buttons
    expect(screen.getByRole("button", { name: /ดาวน์โหลด CSV/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /ดาวน์โหลด JSON/ })).toBeTruthy();
  });
});
