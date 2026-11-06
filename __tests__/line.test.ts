import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendOrderToLineOA } from "@/lib/line";
import { OrderRecord } from "@/types/store";

const sampleOrder: OrderRecord = {
  id: "2026-11-06-A001-0001",
  queueNumber: "#A001",
  dateKey: "2026-11-06",
  createdAt: "2026-11-06T01:00:00.000Z",
  customerName: "คุณพลอย",
  customerPhone: "0812345678",
  customerContact: "",
  pickupTime: "รับทันที (เตรียมอาหาร 15-20 นาที)",
  paymentMethod: "counter",
  items: [
    {
      id: "set-raynue-signature",
      name: "เซ็ตอรุณสวัสดิ์เรณู (Signature Breakfast Set)",
      price: 119,
      quantity: 1,
    },
  ],
  totalQuantity: 1,
  totalAmount: 119,
  status: "pending",
  lineSent: false,
};

describe("sendOrderToLineOA with Stateless Channel Access Token", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
    delete process.env.LINE_CHANNEL_ID;
    delete process.env.LINE_CHANNEL_SECRET;
    delete process.env.LINE_TARGET_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("returns error without calling fetch when LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, or LINE_TARGET_ID is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendOrderToLineOA(sampleOrder, "https://example.com");

    expect(result.sent).toBe(false);
    expect(result.error).toMatch(
      /LINE_CHANNEL_ID.*LINE_CHANNEL_SECRET.*LINE_TARGET_ID/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests a stateless channel access token from /oauth2/v3/token and pushes the Flex Message using that token", async () => {
    process.env.LINE_CHANNEL_ID = "1234567890";
    process.env.LINE_CHANNEL_SECRET = "test-channel-secret";
    process.env.LINE_TARGET_ID = "Ca56f94637c1234567890";

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://api.line.me/oauth2/v3/token") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            token_type: "Bearer",
            access_token: "stateless-token-xyz",
            expires_in: 900,
          }),
        } as Response;
      }
      if (url === "https://api.line.me/v2/bot/message/push") {
        return {
          ok: true,
          status: 200,
          text: async () => "{}",
        } as Response;
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendOrderToLineOA(sampleOrder, "https://example.com");

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // 1st call: Stateless token endpoint
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(tokenUrl).toBe("https://api.line.me/oauth2/v3/token");
    expect(tokenInit.method).toBe("POST");
    expect(tokenInit.headers).toEqual({
      "Content-Type": "application/x-www-form-urlencoded",
    });
    const bodyParams = new URLSearchParams(String(tokenInit.body));
    expect(bodyParams.get("grant_type")).toBe("client_credentials");
    expect(bodyParams.get("client_id")).toBe("1234567890");
    expect(bodyParams.get("client_secret")).toBe("test-channel-secret");

    // 2nd call: Push message endpoint
    const [pushUrl, pushInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(pushUrl).toBe("https://api.line.me/v2/bot/message/push");
    expect(pushInit.method).toBe("POST");
    expect(pushInit.headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer stateless-token-xyz",
    });
    const pushPayload = JSON.parse(String(pushInit.body));
    expect(pushPayload.to).toBe("Ca56f94637c1234567890");
    expect(pushPayload.messages).toHaveLength(1);
    expect(pushPayload.messages[0].type).toBe("flex");
  });

  it("returns LINE Token Error and does not push if /oauth2/v3/token fails", async () => {
    process.env.LINE_CHANNEL_ID = "1234567890";
    process.env.LINE_CHANNEL_SECRET = "invalid-secret";
    process.env.LINE_TARGET_ID = "Ca56f94637c1234567890";

    const fetchMock = vi.fn(async () => {
      return {
        ok: false,
        status: 400,
        text: async () =>
          '{"error":"invalid_client","error_description":"invalid client"}',
      } as Response;
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendOrderToLineOA(sampleOrder, "https://example.com");

    expect(result.sent).toBe(false);
    expect(result.error).toContain("LINE Token Error (400)");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
