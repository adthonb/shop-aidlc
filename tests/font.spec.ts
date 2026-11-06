import { test, expect } from "@playwright/test";

test.describe("Web app font E2E", () => {
  test("applies Roboto,Arial,sans-serif font-family on body", async ({
    page,
  }) => {
    await page.goto("/");

    const bodyFontFamily = await page.evaluate(
      () => window.getComputedStyle(document.body).fontFamily
    );

    expect(bodyFontFamily).toMatch(/Roboto,\s*Arial,\s*sans-serif/i);
  });
});
