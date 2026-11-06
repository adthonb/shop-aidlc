import fs from "fs";
import path from "path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import CustomerStorefront from "@/components/CustomerStorefront";
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
    address: "214/1 ถ.ป่าไม้ ต.เวียงเหนือ",
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

describe("Open and Close hours ISO8601 time-only without date and storefront display", () => {
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

  it("renders 2 dropdown fields for Open and Close hours and saves them as ISO8601 time without date (HH:mm:00+07:00)", async () => {
    render(<AdminPage />);

    const settingsTab = await screen.findByRole("button", {
      name: /ตั้งค่าร้าน/,
    });
    fireEvent.click(settingsTab);

    const openSelect = screen.getByLabelText("เวลาเปิดร้าน") as HTMLSelectElement;
    const closeSelect = screen.getByLabelText("เวลาปิดร้าน") as HTMLSelectElement;

    expect(openSelect.tagName).toBe("SELECT");
    expect(closeSelect.tagName).toBe("SELECT");
    expect(openSelect.value).toBe("06:00");
    expect(closeSelect.value).toBe("11:30");

    fireEvent.change(openSelect, { target: { value: "05:30" } });
    fireEvent.change(closeSelect, { target: { value: "12:00" } });

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
      expect(payload.store.openTime).toBe("05:30:00+07:00");
      expect(payload.store.closeTime).toBe("12:00:00+07:00");
    });
  });

  it("displays openTime and closeTime directly on CustomerStorefront when edited in menu.json", () => {
    const editedStoreData: StoreData = {
      ...mockStoreData,
      store: {
        ...mockStoreData.store,
        openTime: "07:30:00+07:00",
        closeTime: "14:00:00+07:00",
      },
    };

    render(<CustomerStorefront initialData={editedStoreData} />);

    expect(screen.getByText("เปิด 07:30 - 14:00 น.")).toBeDefined();
  });

  it("does not reference legacy openHours in src/ or data/menu.json", () => {
    const filesToCheck = [
      "src/types/store.ts",
      "src/components/CustomerStorefront.tsx",
      "src/app/admin/page.tsx",
      "src/app/api/admin/route.ts",
      "data/menu.json",
    ];
    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(
        path.resolve(process.cwd(), relPath),
        "utf-8"
      );
      expect(content).not.toContain("openHours");
    }
  });
});
