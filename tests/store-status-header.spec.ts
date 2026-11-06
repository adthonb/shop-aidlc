import { test, expect } from "@playwright/test";

test.describe("Storefront Header Self-Pickup and Store Status E2E", () => {
  test("displays 'สั่งล่วงหน้า • รับที่หน้าร้าน (Self-Pickup)' at 14px and store status under store name at 14px", async ({
    page,
  }) => {
    await page.goto("/");

    const selfPickup = page.getByText(
      "สั่งล่วงหน้า • รับที่หน้าร้าน (Self-Pickup)"
    );
    await expect(selfPickup).toBeVisible();

    const pickupFontSize = await selfPickup.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(pickupFontSize).toBe("14px");

    const storeName = page.locator("header h1");
    await expect(storeName).toBeVisible();

    const statusBadge = page
      .locator("header")
      .getByText(/เปิดรับออเดอร์|ปิดรับออเดอร์ชั่วคราว/)
      .first();
    await expect(statusBadge).toBeVisible();

    const statusFontSize = await statusBadge.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(statusFontSize).toBe("14px");

    const whiteSpace = await statusBadge.evaluate(
      (el) => window.getComputedStyle(el).whiteSpace
    );
    expect(whiteSpace).toBe("nowrap");

    const nameBox = await storeName.boundingBox();
    const statusBox = await statusBadge.boundingBox();
    expect(nameBox).not.toBeNull();
    expect(statusBox).not.toBeNull();
    // Ensure store status is positioned under the store name heading
    expect(statusBox!.y).toBeGreaterThan(nameBox!.y);
  });
});
