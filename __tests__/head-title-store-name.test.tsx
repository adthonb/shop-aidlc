import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import { generateMetadata } from "@/app/page";
import * as storage from "@/lib/storage";
import { StoreData } from "@/types/store";

const mockStoreData: StoreData = {
  store: {
    storeName: "เรณู อาหารเช้า (Raynue Morning)",
    tagline: "มื้อเช้าโฮมเมด อบอุ่น สดใหม่ทุกเช้า",
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
    phone: "081-234-5678",
    address: "สุขุมวิท 101",
    isOpen: true,
    pickupTimeSlots: ["รับทันที (15-20 นาที)"],
    promptPayId: "0812345678",
    promptPayName: "ร้านเรณู",
    bankName: "กสิกรไทย",
    bankAccountNo: "123-4-56789-0",
    bankAccountName: "ร้านเรณู",
    announcement: "สั่งล่วงหน้าแล้วมารับได้เลย",
  },
  categories: [
    { id: "all", name: "ทั้งหมด", icon: "Utensils" },
  ],
  items: [
    {
      id: "item-1",
      categoryId: "all",
      name: "ไข่กระทะ",
      description: "ไข่กระทะทรงเครื่อง",
      price: 60,
      image: "https://example.com/egg.jpg",
      popular: true,
      soldOut: false,
      quantity: 20,
    },
  ],
};

describe("TDD: head > title tag matches storeName", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    document.title = "";
    const existingTitle = document.querySelector("head > title");
    if (existingTitle) {
      existingTitle.remove();
    }
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("generateMetadata in src/app/page.tsx returns storeName as title", async () => {
    vi.spyOn(storage, "getStoreData").mockResolvedValue(mockStoreData);

    const metadata = await generateMetadata();
    expect(metadata.title).toBe(mockStoreData.store.storeName);
  });

  it("generateMetadata dynamically reflects updated storeName from storage", async () => {
    const customStoreData: StoreData = {
      ...mockStoreData,
      store: {
        ...mockStoreData.store,
        storeName: "ร้านป้าเรณู โฮมเมด",
      },
    };
    vi.spyOn(storage, "getStoreData").mockResolvedValue(customStoreData);

    const metadata = await generateMetadata();
    expect(metadata.title).toBe("ร้านป้าเรณู โฮมเมด");
  });

  it("CustomerStorefront renders head > title tag equal to store.storeName", async () => {
    render(<CustomerStorefront initialData={mockStoreData} />);

    await waitFor(() => {
      const headTitle = document.querySelector("head > title");
      const titleText = headTitle ? headTitle.textContent : document.title;
      expect(titleText).toBe(mockStoreData.store.storeName);
    });
  });

  it("CustomerStorefront head > title tag updates when storeName changes", async () => {
    const customStoreData: StoreData = {
      ...mockStoreData,
      store: {
        ...mockStoreData.store,
        storeName: "โกปี๊ & อาหารเช้า เรณู",
      },
    };

    render(<CustomerStorefront initialData={customStoreData} />);

    await waitFor(() => {
      const headTitle = document.querySelector("head > title");
      const titleText = headTitle ? headTitle.textContent : document.title;
      expect(titleText).toBe("โกปี๊ & อาหารเช้า เรณู");
    });
  });
});
