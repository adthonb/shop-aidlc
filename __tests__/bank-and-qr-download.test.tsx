import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import AdminPage from "@/app/admin/page";
import { StoreData } from "@/types/store";

const baseStoreData: StoreData = {
  store: {
    storeName: "เรณู เช้านี้ (Raynue Morning)",
    tagline: "อาหารเช้าโฮมเมด อบอุ่น สดใหม่ทุกวัน",
    isOpen: true,
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
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
    },
  ],
};

describe("Bank account visibility, Admin bankAccountName setting, and Download QR Payment button", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("hides bank account row on checkout modal when bankName and bankAccountNumber are empty", async () => {
    const emptyBankData: StoreData = {
      ...baseStoreData,
      store: {
        ...baseStoreData.store,
        bankName: "",
        bankAccountNumber: "",
        bankAccountName: "บจก. เรณู มอร์นิ่ง",
      },
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/promptpay")) {
          return {
            ok: true,
            json: async () => ({ qrDataUrl: "data:image/png;base64,MOCKQR" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => emptyBankData,
        } as Response;
      })
    );

    render(<CustomerStorefront initialData={emptyBankData} />);

    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    expect(await screen.findByAltText("Thai QR PromptPay Card")).toBeDefined();

    // Bank account name or empty bank row should not be rendered
    expect(screen.queryByText(/บจก\. เรณู มอร์นิ่ง/)).toBeNull();
    // Only 1 copy button (PromptPay ID), not 2
    const copyButtons = screen.getAllByRole("button", { name: /คัดลอก/i });
    expect(copyButtons).toHaveLength(1);
  });

  it("shows bank account row on checkout modal when bankName and bankAccountNumber are provided", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/promptpay")) {
          return {
            ok: true,
            json: async () => ({ qrDataUrl: "data:image/png;base64,MOCKQR" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => baseStoreData,
        } as Response;
      })
    );

    render(<CustomerStorefront initialData={baseStoreData} />);

    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    expect(await screen.findByAltText("Thai QR PromptPay Card")).toBeDefined();
    expect(
      screen.getByText(/ธนาคารกสิกรไทย \(บจก\. เรณู มอร์นิ่ง\)/)
    ).toBeDefined();
    expect(screen.getByText("123-4-56789-0")).toBeDefined();
    const copyButtons = screen.getAllByRole("button", { name: /คัดลอก/i });
    expect(copyButtons).toHaveLength(2);
  });

  it("allows editing and saving bankAccountName on AdminPage settings tab", async () => {
    sessionStorage.setItem("raynue_admin_pin", "1234");

    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "PATCH") {
          const parsed = JSON.parse(String(init.body));
          return {
            ok: true,
            json: async () => ({
              success: true,
              storeData: {
                ...baseStoreData,
                store: parsed.store || baseStoreData.store,
              },
            }),
          } as Response;
        }

        return {
          ok: true,
          json: async () => ({
            storeData: baseStoreData,
            orders: [],
            todayKey: "2026-11-08",
            lineConfigured: true,
          }),
        } as Response;
      }
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<AdminPage />);

    const settingsTab = await screen.findByRole("button", {
      name: /ตั้งค่าร้าน/,
    });
    fireEvent.click(settingsTab);

    const bankNameInput = screen.getByLabelText("ธนาคาร") as HTMLInputElement;
    const bankAccountNumberInput = screen.getByLabelText(
      "เลขที่บัญชีธนาคาร"
    ) as HTMLInputElement;
    const bankAccountNameInput = screen.getByLabelText(
      "ชื่อบัญชีธนาคาร"
    ) as HTMLInputElement;

    expect(bankNameInput.value).toBe("ธนาคารกสิกรไทย");
    expect(bankAccountNumberInput.value).toBe("123-4-56789-0");
    expect(bankAccountNameInput.value).toBe("บจก. เรณู มอร์นิ่ง");

    fireEvent.change(bankNameInput, {
      target: { value: "ธนาคารไทยพาณิชย์ (SCB)" },
    });
    fireEvent.change(bankAccountNumberInput, {
      target: { value: "987-6-54321-0" },
    });
    fireEvent.change(bankAccountNameInput, {
      target: { value: "นายเรณู อรุณรุ่ง" },
    });

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
      expect(payload.store.bankName).toBe("ธนาคารไทยพาณิชย์ (SCB)");
      expect(payload.store.bankAccountNumber).toBe("987-6-54321-0");
      expect(payload.store.bankAccountName).toBe("นายเรณู อรุณรุ่ง");
    });
  });

  it("renders a download QR payment button on checkout modal and downloads QR image when clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/promptpay")) {
          return {
            ok: true,
            json: async () => ({ qrDataUrl: "data:image/png;base64,MOCKQR" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => baseStoreData,
        } as Response;
      })
    );

    let clickedDownload = "";
    let clickedHref = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clickedDownload = this.download;
      clickedHref = this.href;
    });

    render(<CustomerStorefront initialData={baseStoreData} />);

    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    expect(await screen.findByAltText("Thai QR PromptPay Card")).toBeDefined();

    const downloadQrButton = screen.getByRole("button", {
      name: /ดาวน์โหลดรูป QR|บันทึกรูป QR/i,
    });
    expect(downloadQrButton).toBeDefined();

    fireEvent.click(downloadQrButton);

    await waitFor(() => {
      expect(clickedDownload).toBe("Raynue-PromptPay-119.png");
      expect(clickedHref).toContain("data:image/png;base64,MOCKQR");
    });
  });
});
