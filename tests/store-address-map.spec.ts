import { test, expect } from "@playwright/test";

test.describe("Store Address Google Maps Link E2E", () => {
  test("renders store address in header as a clickable Google Maps link", async ({
    page,
  }) => {
    await page.goto("/");

    const addressLink = page
      .locator("header a[href^='https://www.google.com/maps/search/?api=1&query=']")
      .first();
    await expect(addressLink).toBeVisible();
    await expect(addressLink).toHaveAttribute("target", "_blank");

    const addressText = await addressLink.textContent();
    expect(addressText?.trim().length).toBeGreaterThan(0);

    const href = await addressLink.getAttribute("href");
    expect(href).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        addressText!.trim()
      )}`
    );
  });
});
