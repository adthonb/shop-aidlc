import fs from "fs";
import path from "path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminPage from "@/app/admin/page";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";

const baseStoreData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้",
    tagline: "tagline",
    isOpen: true,
    openTime: "08:00:00+07:00",
    closeTime: "10:00:00+07:00",
    prepTimeMinutes: 15,
    phone: "089-123-4567",
    address: "addr",
    promptPayId: "0891234567",
    promptPayName: "ร้านเรณู",
    bankName: "กสิกรไทย",
    bankAccountName: "บจก. เรณู",
    pickupTimeSlots: ["รับทันที (เตรียมอาหาร 15-20 นาที)", "06:30 - 06:45 น."],
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
      quantity: 10,
    },
  ],
};

describe("pickupTimeSlots reflect openTime and closeTime", () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("data/menu.json pickupTimeSlots reflect its openTime and closeTime", () => {
    const data = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "data/menu.json"), "utf-8")
    ) as StoreData;

    const openHHMM = (data.store.openTime || "06:00").slice(0, 5);
    const closeHHMM = (data.store.closeTime || "11:30").slice(0, 5);
    const slots = data.store.pickupTimeSlots;

    expect(slots[0]).toMatch(/^รับทันที/);
    expect(slots.length).toBeGreaterThan(1);

    // First scheduled slot starts at openTime
    expect(slots[1].startsWith(`${openHHMM} -`)).toBe(true);
    // Last scheduled slot ends at closeTime
    expect(slots[slots.length - 1].endsWith(`- ${closeHHMM} น.`)).toBe(true);

    // Every scheduled slot is within [openTime, closeTime]
    for (const slot of slots.slice(1)) {
      const m = slot.match(/^(\d{2}:\d{2}) - (\d{2}:\d{2}) น\.$/);
      expect(m, `valid slot format: ${slot}`).not.toBeNull();
      expect(m![1] >= openHHMM).toBe(true);
      expect(m![2] <= closeHHMM).toBe(true);
    }
  });

  it("CustomerStorefront renders pickup time options derived from openTime and closeTime", () => {
    render(<CustomerStorefront initialData={baseStoreData} />);

    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    const options = Array.from(
      document.querySelectorAll("select option")
    ).map((el) => el.textContent);

    expect(options[0]).toBe("รับทันที (เตรียมอาหาร 15-20 นาที)");
    expect(options).toContain("08:00 - 08:15 น.");
    expect(options).toContain("08:30 - 08:45 น.");
    expect(options).toContain("09:00 - 09:15 น.");
    expect(options).toContain("09:30 - 10:00 น.");
    // Stale slot outside 08:00 - 10:00 must not be shown
    expect(options).not.toContain("06:30 - 06:45 น.");
  });

  describe("AdminPage updates pickupTimeSlots when openTime/closeTime change", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      sessionStorage.setItem("raynue_admin_pin", "1234");
      fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          const parsed = JSON.parse(String(init.body));
          return {
            ok: true,
            json: async () => ({
              success: true,
              storeData: { ...baseStoreData, store: parsed.store },
            }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => ({
            storeData: baseStoreData,
            orders: [],
            todayKey: "2026-11-07",
            lineConfigured: true,
          }),
        } as Response;
      });
      vi.stubGlobal("fetch", fetchMock);
    });

    it("saves updated pickupTimeSlots matching the selected openTime and closeTime", async () => {
      render(<AdminPage />);

      fireEvent.click(
        await screen.findByRole("button", { name: /ตั้งค่าร้าน/ })
      );

      fireEvent.change(screen.getByLabelText("เวลาเปิดร้าน"), {
        target: { value: "07:00" },
      });
      fireEvent.change(screen.getByLabelText("เวลาปิดร้าน"), {
        target: { value: "09:00" },
      });
      fireEvent.click(
        screen.getByRole("button", { name: /บันทึกการตั้งค่าร้าน/ })
      );

      await waitFor(() => {
        const patchCalls = fetchMock.mock.calls.filter(
          ([, init]) => (init as RequestInit | undefined)?.method === "PATCH"
        );
        expect(patchCalls).toHaveLength(1);
        const payload = JSON.parse(
          String((patchCalls[0][1] as RequestInit).body)
        );
        expect(payload.store.pickupTimeSlots).toEqual([
          "รับทันที (เตรียมอาหาร 15-20 นาที)",
          "07:00 - 07:15 น.",
          "07:30 - 07:45 น.",
          "08:00 - 08:15 น.",
          "08:30 - 09:00 น.",
        ]);
      });
    });
  });
});
