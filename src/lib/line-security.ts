import crypto from "crypto";

interface VerificationEntry {
  userId: string;
  expiresAt: number;
}

// In-memory token store for single-use LINE verification tokens
const verificationTokens = new Map<string, VerificationEntry>();

/**
 * Periodically purge expired tokens to prevent memory leak
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, entry] of verificationTokens.entries()) {
    if (entry.expiresAt <= now) {
      verificationTokens.delete(token);
    }
  }
}

/**
 * Verifies LINE webhook request signature according to official LINE Messaging API guidelines:
 * Computes HMAC-SHA256 signature using channel secret and compares against `x-line-signature` header in Base64
 * Reference: https://developers.line.biz/en/docs/messaging-api/verify-webhook-signature/
 */
export function verifyLineSignature(
  rawBody: string,
  signatureHeader: string,
  channelSecret: string
): boolean {
  if (!rawBody || !signatureHeader || !channelSecret) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", channelSecret)
      .update(rawBody, "utf8")
      .digest("base64");

    const sigBuffer = Buffer.from(signatureHeader, "base64");
    const computedBuffer = Buffer.from(computedSignature, "base64");

    if (sigBuffer.length !== computedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure, random, single-use verification token mapped to a verified LINE user ID.
 * Defaults to 10 minutes (600 seconds) TTL.
 */
export function createLineVerificationToken(
  userId: string,
  ttlSeconds = 600
): string {
  cleanupExpiredTokens();
  const token = `lt_${crypto.randomBytes(24).toString("hex")}`;
  const expiresAt = Date.now() + ttlSeconds * 1000;
  verificationTokens.set(token, { userId, expiresAt });
  return token;
}

/**
 * Consumes a single-use verification token:
 * If valid and not expired, returns the verified LINE user ID and deletes the token immediately.
 */
export function consumeLineVerificationToken(
  token: string
): { valid: boolean; userId?: string; error?: string } {
  cleanupExpiredTokens();
  const trimmed = (token || "").trim();
  const entry = verificationTokens.get(trimmed);

  if (!entry) {
    return {
      valid: false,
      error: "ลิงก์หรือรหัสยืนยัน LINE หมดอายุหรือไม่ถูกต้อง กรุณากดปุ่มในแชท LINE OA ใหม่อีกครั้ง",
    };
  }

  verificationTokens.delete(trimmed);

  if (entry.expiresAt <= Date.now()) {
    return {
      valid: false,
      error: "ลิงก์ยืนยัน LINE หมดอายุแล้ว กรุณากดปุ่มในแชท LINE OA ใหม่อีกครั้ง",
    };
  }

  return {
    valid: true,
    userId: entry.userId,
  };
}
