import { test, expect } from "@playwright/test";

test.describe("Store Address Text and Google Maps URL E2E", () => {
  test("sets store address text and Google Maps URL in Admin and renders them on Storefront", async ({
    page,
  }) => {
    await page.goto("/admin");

    const pinInput = page.getByPlaceholder("รหัส PIN ร้านค้า");
    if (await pinInput.isVisible()) {
      await pinInput.fill("1234");
      await page.getByRole("button", { name: "เข้าสู่ระบบจัดการร้าน" }).click();
    }

    await page.getByRole("button", { name: /ตั้งค่าร้าน/ }).click();

    const addressInput = page.getByLabel("ที่อยู่ร้าน");
    const mapUrlInput = page.getByLabel("ลิงก์ Google Maps");

    await expect(addressInput).toBeVisible();
    await expect(mapUrlInput).toBeVisible();

    const customText =
      "ซอยสุขุมวิท 38 (ใกล้ BTS ทองหล่อ จอดรถหน้าร้านรับของได้ทันที)";
    const customUrl = "https://maps.app.goo.gl/RaynueMorningBtsThongLo";

    await addressInput.fill(customText);
    await mapUrlInput.fill(customUrl);

    const patchPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/admin") && res.request().method() === "PATCH"
    );
    await page.getByRole("button", { name: /บันทึกการตั้งค่าร้าน/ }).click();
    const patchRes = await patchPromise;
    expect(patchRes.ok()).toBe(true);

    await page.goto("/");

    const addressLink = page.getByRole("link", { name: customText });
    await expect(addressLink).toBeVisible();
    await expect(addressLink).toHaveAttribute("href", customUrl);
    await expect(addressLink).toHaveAttribute("target", "_blank");
  });
});
