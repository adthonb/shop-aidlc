import { test, expect } from "@playwright/test";

test.describe("AdminPage Open and Close hours E2E", () => {
  test("allows selecting Open and Close hours via 2 dropdowns and saves ISO8601 time without date in store configuration", async ({
    page,
  }) => {
    const patchPayloads: Array<Record<string, unknown>> = [];

    await page.route("**/api/admin", async (route) => {
      const req = route.request();
      if (req.method() === "PATCH") {
        const body = JSON.parse(req.postData() || "{}");
        patchPayloads.push(body);
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            storeData: {
              store: body.store,
              categories: [],
              items: [],
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    await page.goto("/admin");

    // Log in with default PIN 1234
    await page.getByPlaceholder("รหัส PIN ร้านค้า").fill("1234");
    await page.getByRole("button", { name: "เข้าสู่ระบบจัดการร้าน" }).click();

    // Open Store Settings tab
    await page.getByRole("button", { name: /ตั้งค่าร้าน/ }).click();

    const openSelect = page.getByLabel("เวลาเปิดร้าน");
    const closeSelect = page.getByLabel("เวลาปิดร้าน");

    await expect(openSelect).toBeVisible();
    await expect(closeSelect).toBeVisible();

    await openSelect.selectOption("05:30");
    await closeSelect.selectOption("12:00");

    await page.getByRole("button", { name: /บันทึกการตั้งค่าร้าน/ }).click();

    await expect.poll(() => patchPayloads.length).toBe(1);
    const savedStore = patchPayloads[0].store as Record<string, string>;
    expect(savedStore.openTime).toBe("05:30:00+07:00");
    expect(savedStore.closeTime).toBe("12:00:00+07:00");
  });
});
