import { test, expect } from "@playwright/test";

test.describe("Storefront Header Self-Pickup and Store Status E2E", () => {
  test("displays 'สั่งล่วงหน้า • รับที่หน้าร้าน (Self-Pickup)' at 14px and store status on a separate single line", async ({
    page,
  }) => {
    await page.goto("/");

    const selfPickup = page.getByText(
      "สั่งล่วงหน้า • รับที่หน้าร้าน (Self-Pickup)"
    );
    await expect(selfPickup).toBeVisible();

    const fontSize = await selfPickup.evaluate(
      (el) => window.getComputedStyle(el).fontSize
    );
    expect(fontSize).toBe("14px");

    const statusBadge = page.getByText(/เปิดรับออเดอร์|ปิดรับออเดอร์ชั่วคราว/).first();
    await expect(statusBadge).toBeVisible();

    const whiteSpace = await statusBadge.evaluate(
      (el) => window.getComputedStyle(el).whiteSpace
    );
    expect(whiteSpace).toBe("nowrap");

    const pickupBox = await selfPickup.boundingBox();
    const statusBox = await statusBadge.boundingBox();
    expect(pickupBox).not.toBeNull();
    expect(statusBox).not.toBeNull();
    // Ensure store status is on its own line (different vertical row)
    expect(Math.abs(statusBox!.y - pickupBox!.y)).toBeGreaterThan(10);
  });
});
