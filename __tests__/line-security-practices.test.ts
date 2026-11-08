import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import { NextRequest } from "next/server";
import {
  createLineVerificationToken,
  consumeLineVerificationToken,
  verifyLineSignature,
} from "@/lib/line-security";
import { POST as POST_LINE_WEBHOOK } from "@/app/api/line/webhook/route";
import { POST as POST_ORDER } from "@/app/api/orders/route";

const TEST_SECRET = "test-channel-secret-12345";
const VALID_LINE_USER_ID = "U8189cf6745fc0d808977bdb0b9f22995";

function calculateSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

describe("LINE Security Practices: Webhook Signature Verification & Single-Use Verification Tokens", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.LINE_CHANNEL_SECRET = TEST_SECRET;
    process.env.LINE_CHANNEL_ID = "test-channel-id";
    process.env.PUBLIC_BASE_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("verifyLineSignature utility", () => {
    it("returns true for matching HMAC-SHA256 signature in Base64", () => {
      const body = JSON.stringify({ destination: "123", events: [] });
      const signature = calculateSignature(body, TEST_SECRET);
      expect(verifyLineSignature(body, signature, TEST_SECRET)).toBe(true);
    });

    it("returns false for invalid signature or altered body", () => {
      const body = JSON.stringify({ destination: "123", events: [] });
      const signature = calculateSignature(body, TEST_SECRET);
      const tamperedBody = JSON.stringify({ destination: "tampered", events: [] });
      expect(verifyLineSignature(tamperedBody, signature, TEST_SECRET)).toBe(false);
      expect(verifyLineSignature(body, "invalid-signature", TEST_SECRET)).toBe(false);
      expect(verifyLineSignature(body, "", TEST_SECRET)).toBe(false);
    });
  });

  describe("Single-use secure token lifecycle", () => {
    it("creates, consumes, and invalidates single-use token (cannot be replayed)", () => {
      const token = createLineVerificationToken(VALID_LINE_USER_ID, 600); // 10 minutes
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(16);

      // First consumption succeeds
      const result1 = consumeLineVerificationToken(token);
      expect(result1.valid).toBe(true);
      expect(result1.userId).toBe(VALID_LINE_USER_ID);

      // Replay fails
      const result2 = consumeLineVerificationToken(token);
      expect(result2.valid).toBe(false);
      expect(result2.error).toMatch(/หมดอายุหรือไม่ถูกต้อง|invalid or expired/i);
    });

    it("rejects expired tokens", () => {
      // 0 seconds expiry or negative
      const token = createLineVerificationToken(VALID_LINE_USER_ID, -1);
      const result = consumeLineVerificationToken(token);
      expect(result.valid).toBe(false);
    });
  });

  describe("POST /api/line/webhook signature enforcement", () => {
    it("rejects requests missing x-line-signature or with invalid signature with 401 Unauthorized", async () => {
      const bodyStr = JSON.stringify({ destination: "123", events: [] });

      // No signature
      const reqNoSig = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        body: bodyStr,
      });
      const resNoSig = await POST_LINE_WEBHOOK(reqNoSig);
      expect(resNoSig.status).toBe(401);

      // Invalid signature
      const reqBadSig = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: {
          "x-line-signature": "bad-sig",
          "content-type": "application/json",
        },
        body: bodyStr,
      });
      const resBadSig = await POST_LINE_WEBHOOK(reqBadSig);
      expect(resBadSig.status).toBe(401);
    });

    it("accepts valid signature and returns short-lived single-use token in storefront URL", async () => {
      const bodyObj = {
        destination: "123",
        events: [
          {
            type: "follow",
            replyToken: "reply-tok-123",
            source: {
              type: "user",
              userId: VALID_LINE_USER_ID,
            },
            mode: "active",
          },
        ],
      };
      const bodyStr = JSON.stringify(bodyObj);
      const signature = calculateSignature(bodyStr, TEST_SECRET);

      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "https://api.line.me/oauth2/v3/token") {
          return {
            ok: true,
            status: 200,
            json: async () => ({ access_token: "mock-access-token" }),
          } as Response;
        }
        if (url === "https://api.line.me/v2/bot/message/reply") {
          return {
            ok: true,
            status: 200,
            text: async () => "{}",
          } as Response;
        }
        throw new Error(`Unexpected url ${url}`);
      });
      vi.stubGlobal("fetch", fetchMock);

      const reqValid = new NextRequest("http://localhost:3000/api/line/webhook", {
        method: "POST",
        headers: {
          "x-line-signature": signature,
          "content-type": "application/json",
        },
        body: bodyStr,
      });

      const resValid = await POST_LINE_WEBHOOK(reqValid);
      expect(resValid.status).toBe(200);

      const replyCalls = fetchMock.mock.calls.filter(
        ([url]) => String(url) === "https://api.line.me/v2/bot/message/reply"
      );
      expect(replyCalls).toHaveLength(1);
      const [, reqInit] = replyCalls[0] as unknown as [string, RequestInit];
      const parsedBody = JSON.parse(String(reqInit.body));
      const messageContent = JSON.stringify(parsedBody.messages);

      // Verify that the link contains single-use verification token param (e.g. lineToken= or lt=)
      expect(messageContent).toMatch(/lineToken=|lt=/);
    });
  });

  describe("POST /api/orders verification token exchange", () => {
    it("accepts valid single-use token in lineToken/customerContact and sets verified customerContact to real userId", async () => {
      const validToken = createLineVerificationToken(VALID_LINE_USER_ID, 600);

      const fd = new FormData();
      fd.set("customerName", "คุณสมชาย");
      fd.set("customerPhone", "0812345678");
      // Customer submits the token received via URL
      fd.set("lineToken", validToken);
      fd.set("customerContact", validToken);
      fd.set("pickupTime", "รับทันที");
      fd.set("paymentMethod", "counter");
      fd.set("items", JSON.stringify([{ id: "set-raynue-signature", quantity: 1 }]));

      const res = await POST_ORDER(
        new NextRequest("http://localhost/api/orders", {
          method: "POST",
          body: fd,
        })
      );

      // Orders API must resolve the token to user ID and accept the order
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.order.customerContact).toBe(VALID_LINE_USER_ID);
    });
  });
});
