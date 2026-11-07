import fs from "fs";
import path from "path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import { StoreData } from "@/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้",
    tagline: "tagline",
    isOpen: true,
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
    phone: "089-123-4567",
    address: "addr",
    promptPayId: "0891234567",
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

describe("Menu quantity management in data/menu.json", () => {
  it("every item in menu.json has a non-negative integer quantity", () => {
    const data = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "data/menu.json"), "utf-8")
    ) as StoreData;
    expect(data.items.length).toBeGreaterThan(0);
    for (const item of data.items) {
      expect(Number.isInteger(item.quantity)).toBe(true);
      expect(item.quantity).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Menu quantity management on Admin page", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("raynue_admin_pin", "1234");
    fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return {
          ok: true,
          json: async () => ({ success: true, storeData: mockStoreData }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          storeData: mockStoreData,
          orders: [],
          todayKey: "2026-11-07",
          lineConfigured: false,
        }),
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("shows current quantity and saves an updated quantity via update_item_quantity", async () => {
    render(<AdminPage />);
    fireEvent.click(await screen.findByRole("button", { name: /จัดการเมนู/ }));

    const input = screen.getByLabelText("จำนวนคงเหลือ ข้าวต้ม") as HTMLInputElement;
    expect(input.type).toBe("number");
    expect(input.value).toBe("12");

    fireEvent.change(input, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกจำนวน ข้าวต้ม" }));

    await waitFor(() => {
      const patchCalls = fetchMock.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === "PATCH"
      );
      expect(patchCalls).toHaveLength(1);
      const payload = JSON.parse(String((patchCalls[0][1] as RequestInit).body));
      expect(payload).toMatchObject({
        action: "update_item_quantity",
        itemId: "item-1",
        quantity: 30,
      });
    });
  });
});
