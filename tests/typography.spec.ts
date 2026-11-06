import { test, expect } from "@playwright/test";

test.describe("Typography hierarchy E2E", () => {
  test("renders H3 at 16px and other heading/text sizes in descending order (H1 24px > H2 20px > H3 16px > body 14px)", async ({
    page,
  }) => {
    await page.goto("/");

    const sizes = await page.evaluate(() => {
      const h1 = document.querySelector("h1");
      const h2 = document.querySelector("h2");
      const h3 = document.querySelector("h3");
      const desc = h3?.parentElement?.querySelector("p");

      return {
        h1: h1 ? window.getComputedStyle(h1).fontSize : null,
        h2: h2 ? window.getComputedStyle(h2).fontSize : null,
        h3: h3 ? window.getComputedStyle(h3).fontSize : null,
        desc: desc ? window.getComputedStyle(desc).fontSize : null,
      };
    });

    expect(sizes.h3).toBe("16px");
    expect(sizes.h2).toBe("20px");
    expect(sizes.h1).toBe("24px");
    expect(sizes.desc).toBe("14px");
  });
});
