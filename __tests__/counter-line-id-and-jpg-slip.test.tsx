import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";
import { POST as POST_ORDER } from "@/app/api/orders/route";
import { POST as POST_LINE_WEBHOOK } from "@/app/api/line/webhook/route";

const VALID_LINE_USER_ID = "U8189cf6745fc0d808977bdb0b9f22995";

const mockStoreData: StoreData = {
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
    bankName: "",
    bankAccountNumber: "",
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
      quantity: 20,
    },
  ],
};

describe("Counter payment LINE ID requirement, Add LINE OA return flow, and .jpg-only slip upload", () => {
  const originalEnv = process.env;
  const originalHref = window.location.href;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    process.env = { ...originalEnv };
    delete process.env.LINE_CHANNEL_ID;
    delete process.env.LINE_CHANNEL_SECRET;
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    process.env = originalEnv;
    window.history.replaceState({}, "", originalHref);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the Add LINE OA div directly under the LINE ID input field and blocks empty or invalid LINE User ID for counter payment", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => mockStoreData,
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchMock);

    render(<CustomerStorefront initialData={mockStoreData} />);

    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    // Select counter payment
    fireEvent.click(screen.getByRole("button", { name: /ชำระที่หน้าร้าน/i }));

    const lineIdInput = screen.getByPlaceholderText(/LINE ID/i) as HTMLInputElement;
    const nextSiblingDiv = lineIdInput.nextElementSibling as HTMLElement | null;
    expect(nextSiblingDiv).not.toBeNull();
    expect(nextSiblingDiv?.tagName).toBe("DIV");

    const addLineLink = nextSiblingDiv?.querySelector("a");
    expect(addLineLink).not.toBeNull();
    expect(addLineLink?.getAttribute("href")).toBe(
      "https://line.me/R/ti/p/@raynue"
    );

    // Fill name and valid phone, leave LINE ID empty
    fireEvent.change(screen.getByPlaceholderText(/เช่น คุณพลอย/i), {
      target: { value: "คุณพลอย" },
    });
    fireEvent.change(screen.getByPlaceholderText(/เช่น 081/i), {
      target: { value: "0812345678" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /ยืนยันการสั่งอาหารเช้า/i })
    );

    expect(
      await screen.findByText(/กรุณาระบุ LINE ID สำหรับการชำระที่หน้าร้าน/i)
    ).toBeDefined();

    // Entering a non-U[0-9a-f]{32} string should also be rejected per LINE User ID format spec
    fireEvent.change(lineIdInput, {
      target: { value: "@custom_search_id" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /ยืนยันการสั่งอาหารเช้า/i })
    );

    expect(
      await screen.findByText(/U\[0-9a-f\]\{32\}|รูปแบบ LINE.*ไม่ถูกต้อง/i)
    ).toBeDefined();
  });

  it("automatically populates LINE ID field on storefront when returning from LINE OA with ?lineId=U[0-9a-f]{32}", async () => {
    window.history.replaceState({}, "", `/?lineId=${VALID_LINE_USER_ID}`);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => mockStoreData,
      }))
    );

    render(<CustomerStorefront initialData={mockStoreData} />);

    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    const lineIdInput = screen.getByPlaceholderText(/LINE ID/i) as HTMLInputElement;
    await waitFor(() => {
      expect(lineIdInput.value).toBe(VALID_LINE_USER_ID);
    });
  });

  it("LINE OA webhook replies with a button back to storefront containing ?lineId=<userId> on active user follow/message and ignores standby or group events", async () => {
    process.env.LINE_CHANNEL_ID = "1234567890";
    process.env.LINE_CHANNEL_SECRET = "test-secret";
    process.env.PUBLIC_BASE_URL = "http://localhost:3000";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://api.line.me/oauth2/v3/token") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "token-abc" }),
        } as Response;
      }
      if (url === "https://api.line.me/v2/bot/message/reply") {
        return {
          ok: true,
          status: 200,
          text: async () => "{}",
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const webhookReq = new NextRequest("http://localhost:3000/api/line/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        destination: "xxxxxxxxxx",
        events: [
          {
            type: "follow",
            timestamp: 1462629479859,
            source: {
              type: "user",
              userId: VALID_LINE_USER_ID,
            },
            replyToken: "nHuyWiB7yP5Zw52FIkcQobQuGDXCTA",
            mode: "active",
            webhookEventId: "01FZ74A0TDDPYRVKNK77XKC3ZR",
            deliveryContext: {
              isRedelivery: false,
            },
          },
          {
            type: "message",
            timestamp: 1462629479860,
            source: {
              type: "group",
              groupId: "Cb498c20c4d475378a77822754ead8320",
              userId: VALID_LINE_USER_ID,
            },
            replyToken: "group-reply-token",
            mode: "active",
          },
          {
            type: "follow",
            timestamp: 1462629479861,
            source: {
              type: "user",
              userId: VALID_LINE_USER_ID,
            },
            replyToken: "standby-reply-token",
            mode: "standby",
          },
        ],
      }),
    });

    const res = await POST_LINE_WEBHOOK(webhookReq);
    expect(res.status).toBe(200);

    const replyCalls = fetchMock.mock.calls.filter(
      ([url]) => String(url) === "https://api.line.me/v2/bot/message/reply"
    );
    expect(replyCalls).toHaveLength(1);

    const [, replyInit] = replyCalls[0] as unknown as [string, RequestInit];
    const replyBody = JSON.parse(String(replyInit.body));
    expect(replyBody.replyToken).toBe("nHuyWiB7yP5Zw52FIkcQobQuGDXCTA");
    expect(JSON.stringify(replyBody.messages)).toContain(
      `http://localhost:3000/?lineId=${VALID_LINE_USER_ID}`
    );
  });

  it("POST /api/orders validates LINE user ID format U[0-9a-f]{32} and verifies via LINE Get profile endpoint (GET /v2/bot/profile/{userId})", async () => {
    // 1. Missing customerContact
    const emptyFd = new FormData();
    emptyFd.set("customerName", "คุณพลอย");
    emptyFd.set("customerPhone", "0812345678");
    emptyFd.set("customerContact", "");
    emptyFd.set("pickupTime", "รับทันที");
    emptyFd.set("paymentMethod", "counter");
    emptyFd.set("items", JSON.stringify([{ id: "set-raynue-signature", quantity: 1 }]));

    const resEmpty = await POST_ORDER(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: emptyFd,
      })
    );
    expect(resEmpty.status).toBe(400);

    // 2. Invalid format (not matching U[0-9a-f]{32})
    const invalidFormatFd = new FormData();
    invalidFormatFd.set("customerName", "คุณพลอย");
    invalidFormatFd.set("customerPhone", "0812345678");
    invalidFormatFd.set("customerContact", "U12345");
    invalidFormatFd.set("pickupTime", "รับทันที");
    invalidFormatFd.set("paymentMethod", "counter");
    invalidFormatFd.set(
      "items",
      JSON.stringify([{ id: "set-raynue-signature", quantity: 1 }])
    );

    const resInvalidFormat = await POST_ORDER(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: invalidFormatFd,
      })
    );
    expect(resInvalidFormat.status).toBe(400);

    // 3. Valid format, but LINE Get profile endpoint returns 404 (unverified/fake user ID)
    process.env.LINE_CHANNEL_ID = "1234567890";
    process.env.LINE_CHANNEL_SECRET = "test-secret";

    const fetchMock404 = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://api.line.me/oauth2/v3/token") {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "token-abc" }),
        } as Response;
      }
      if (url === `https://api.line.me/v2/bot/profile/${VALID_LINE_USER_ID}`) {
        return {
          ok: false,
          status: 404,
          text: async () => '{"message":"Not found"}',
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock404);

    const fakeUserFd = new FormData();
    fakeUserFd.set("customerName", "คุณพลอย");
    fakeUserFd.set("customerPhone", "0812345678");
    fakeUserFd.set("customerContact", VALID_LINE_USER_ID);
    fakeUserFd.set("pickupTime", "รับทันที");
    fakeUserFd.set("paymentMethod", "counter");
    fakeUserFd.set(
      "items",
      JSON.stringify([{ id: "set-raynue-signature", quantity: 1 }])
    );

    const resFakeUser = await POST_ORDER(
      new NextRequest("http://localhost/api/orders", {
        method: "POST",
        body: fakeUserFd,
      })
    );
    expect(resFakeUser.status).toBe(400);
    expect(
      fetchMock404.mock.calls.some(
        ([url]) =>
          String(url) ===
          `https://api.line.me/v2/bot/profile/${VALID_LINE_USER_ID}`
      )
    ).toBe(true);
  });

  it("rejects non-.jpg slip files on CustomerStorefront and only accepts .jpg", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("/api/promptpay")) {
          return {
            ok: true,
            json: async () => ({ qrDataUrl: "data:image/png;base64,MOCK" }),
          } as Response;
        }
        return {
          ok: true,
          json: async () => mockStoreData,
        } as Response;
      })
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-jpg");

    const { container } = render(
      <CustomerStorefront initialData={mockStoreData} />
    );

    fireEvent.click(screen.getAllByRole("button", { name: /เพิ่ม/i })[0]);
    fireEvent.click(
      screen.getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/i })
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput.getAttribute("accept")).toBe(".jpg,image/jpeg");

    // 1. Selecting a .png file should be rejected with an error message
    const pngFile = new File(["png"], "slip.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [pngFile] } });

    expect(await screen.findByText(/\.jpg/i)).toBeDefined();
    expect(screen.queryByText("แนบสลิปเรียบร้อยแล้ว")).toBeNull();

    // 2. Selecting a valid .jpg file should be accepted
    const jpgFile = new File(["jpg"], "slip.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [jpgFile] } });

    expect(await screen.findByText("แนบสลิปเรียบร้อยแล้ว")).toBeDefined();
    expect(screen.getByText("slip.jpg")).toBeDefined();
  });
});
