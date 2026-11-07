import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import { OrderRecord, StoreData } from "@/types/store";

const storeData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้",
    tagline: "t",
    isOpen: true,
    phone: "089",
    address: "a",
    promptPayId: "1",
    promptPayName: "n",
    bankName: "b",
    bankAccountName: "a",
    pickupTimeSlots: ["รับทันที"],
  },
  categories: [{ id: "sets", name: "เซ็ต", icon: "Sunrise" }],
  items: [
    {
      id: "item-1",
      categoryId: "sets",
      name: "ข้าวต้ม",
      description: "d",
      price: 50,
      image: "/x.jpg",
      soldOut: false,
      quantity: 12,
    },
  ],
};

const order: OrderRecord = {
  id: "o1",
  queueNumber: "#A001",
  dateKey: "2026-11-07",
  createdAt: "2026-11-07T01:00:00.000Z",
  customerName: "สมชาย",
  customerPhone: "0811111111",
  customerContact: "",
  pickupTime: "รับทันที",
  paymentMethod: "counter",
  items: [{ id: "item-1", name: "ข้าวต้ม", price: 50, quantity: 2 }],
  totalQuantity: 2,
  totalAmount: 100,
  status: "pending",
  lineSent: false,
};

const SMALL = /(^|\s)(text-xs|text-\[\d+px\])(\s|$)/;

function smallTextElements(container: HTMLElement) {
  return Array.from(container.querySelectorAll("*")).filter((el) =>
    SMALL.test(el.getAttribute("class") || "")
  );
}

describe("Admin page menu and ordering font size is 14px (text-sm)", () => {
  beforeEach(() => {
    sessionStorage.setItem("raynue_admin_pin", "1234");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          storeData,
          orders: [order],
          todayKey: "2026-11-07",
          lineConfigured: false,
        }),
      }))
    );
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("uses text-sm and no smaller font classes in the orders tab", async () => {
    const { container } = render(<AdminPage />);
    await screen.findByText("#A001");
    const name = screen.getByText("คุณสมชาย");
    expect(name.className).toContain("text-sm");
    const tab = Array.from(container.querySelectorAll("div.p-4.space-y-3"))[0] as HTMLElement;
    expect(tab).toBeTruthy();
    expect(smallTextElements(tab)).toHaveLength(0);
  });

  it("uses text-sm and no smaller font classes in the menu tab", async () => {
    const { container } = render(<AdminPage />);
    fireEvent.click(await screen.findByRole("button", { name: /จัดการเมนู/ }));
    const name = screen.getByText("ข้าวต้ม", { selector: "p" });
    expect(name.className).toContain("text-sm");
    const tab = name.closest("div.space-y-2\\.5") as HTMLElement;
    expect(tab).toBeTruthy();
    expect(smallTextElements(tab)).toHaveLength(0);
    expect(container).toBeTruthy();
  });
});
