import { test, expect } from "@playwright/test";

test.describe("CustomerStorefront customerPhone E2E validation", () => {
  test("validates customerPhone (10 digits starting with 06, 08, or 09, no spaces/hyphens) before submitting order", async ({
    page,
  }) => {
    const orderPayloads: string[] = [];

    await page.route("**/api/orders", async (route) => {
      const req = route.request();
      orderPayloads.push(req.postData() || "submitted");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          order: {
            id: "2026-11-06-A001-0001",
            queueNumber: "#A001",
            dateKey: "2026-11-06",
            createdAt: new Date().toISOString(),
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
            lineSent: true,
          },
        }),
      });
    });

    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Add first menu item to cart
    await page.getByRole("button", { name: "เพิ่ม" }).first().click();

    // Open checkout modal
    await page
      .getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/ })
      .click();

    // Choose pay at counter
    await page.getByRole("button", { name: /ชำระที่หน้าร้าน/ }).click();

    // Fill customer name
    await page.getByPlaceholder(/เช่น คุณพลอย/).fill("คุณพลอย");

    const phoneInput = page.locator('input[type="tel"]');
    const submitButton = page.getByRole("button", {
      name: /ยืนยันการสั่งอาหารเช้า/,
    });
    const expectedErrorText =
      "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก ขึ้นต้นด้วย 06, 08 หรือ 09 โดยไม่เว้นวรรคหรือขีด";

    // Invalid cases: hyphens, spaces, wrong prefix, too short, too long
    for (const invalidPhone of [
      "081-234-5678",
      "081 234 5678",
      "0212345678",
      "081234567",
      "08123456789",
    ]) {
      await phoneInput.fill(invalidPhone);
      await submitButton.click();
      await expect(page.getByText(expectedErrorText)).toBeVisible();
      expect(orderPayloads).toHaveLength(0);
    }

    // Valid case: 10 digits starting with 08, no spaces/hyphens
    await phoneInput.fill("0812345678");
    await submitButton.click();

    await expect(page.getByText("#A001")).toBeVisible();
    expect(orderPayloads).toHaveLength(1);
  });
});
