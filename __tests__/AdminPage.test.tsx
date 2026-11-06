import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
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
    pickupTimeSlots: ["รับทันที (เตรียมอาหาร 15-20 นาที)", "07:00 - 07:15 น."],
    announcement: "สั่งล่วงหน้าและรับหน้าร้านได้ทันที",
  },
  categories: [
    { id: "all", name: "ทั้งหมด", icon: "Utensils" },
    { id: "sets", name: "เซ็ตอาหารเช้าครบชุด", icon: "Sunrise" },
  ],
  items: [],
};

describe("AdminPage Open and Close hours dropdowns with ISO8601 store configuration", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem("raynue_admin_pin", "1234");

    fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
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
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("renders 2 dropdown fields for Open and Close hours and saves them as ISO8601 in store configuration", async () => {
    render(<AdminPage />);

    // Switch to Store Settings tab
    const settingsTab = await screen.findByRole("button", {
      name: /ตั้งค่าร้าน/,
    });
    fireEvent.click(settingsTab);

    // Expect 2 dropdown (<select>) elements for Open and Close hours
    const openSelect = screen.getByLabelText("เวลาเปิดร้าน") as HTMLSelectElement;
    const closeSelect = screen.getByLabelText("เวลาปิดร้าน") as HTMLSelectElement;

    expect(openSelect.tagName).toBe("SELECT");
    expect(closeSelect.tagName).toBe("SELECT");
    expect(openSelect.value).toBe("06:00");
    expect(closeSelect.value).toBe("11:30");

    // Select new Open and Close hours
    fireEvent.change(openSelect, { target: { value: "05:30" } });
    fireEvent.change(closeSelect, { target: { value: "12:00" } });

    // Click Save Store Settings
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
      expect(payload.store.openTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T05:30:00\+07:00$/
      );
      expect(payload.store.closeTime).toMatch(
        /^\d{4}-\d{2}-\d{2}T12:00:00\+07:00$/
      );
      expect(payload.store.openHours).toBe("05:30 - 12:00 น.");
    });
  });
});
