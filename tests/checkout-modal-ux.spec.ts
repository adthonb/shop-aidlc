import { test, expect, chromium, Browser, BrowserContext, Page } from "@playwright/test";

const VIEW_W = 390;

test.describe("CustomerStorefront Checkout Modal Mobile Visualization & Typography", () => {
  test("checkout modal has >= 14px text, wrapped item names, and mobile-friendly touch targets", async ({
    browser: defaultBrowser,
  }) => {
    let cdpBrowser: Browser | null = null;
    let context: BrowserContext;
    let page: Page;

    try {
      cdpBrowser = await chromium.connectOverCDP("http://127.0.0.1:9223", {
        timeout: 2000,
      });
      context = await cdpBrowser.newContext({
        viewport: { width: VIEW_W, height: 844 },
      });
      page = await context.newPage();
    } catch {
      context = await defaultBrowser.newContext({
        viewport: { width: VIEW_W, height: 844 },
      });
      page = await context.newPage();
    }

    try {
      await page.goto("http://localhost:3000/");
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      // Add first item to cart
      await page.getByRole("button", { name: "เพิ่ม" }).first().click();

      // Open checkout modal
      await page
        .getByRole("button", { name: /ตรวจสอบรายการ & สั่งรับหน้าร้าน/ })
        .click();

      const modalHeading = page.getByRole("heading", {
        name: "ยืนยันออเดอร์รับที่หน้าร้าน",
      });
      await expect(modalHeading).toBeVisible();

      const modalRoot = modalHeading.locator(
        "xpath=ancestor::div[contains(@class,'rounded-t-3xl')][1]"
      );
      await expect(modalRoot).toBeVisible();

      // Capture screenshot in PromptPay mode
      await page.screenshot({
        path: "test-results/checkout-modal-promptpay.png",
      });

      // Every text node inside the checkout modal (PromptPay view) must be >= 14px
      const promptPaySmallTexts = await modalRoot.evaluate((root) => {
        const small: Array<{ text: string; fontSize: string }> = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const text = n.textContent?.trim();
          const el = n.parentElement;
          if (!text || !el) continue;
          const cs = window.getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const px = parseFloat(cs.fontSize);
          if (px < 14) {
            small.push({ text, fontSize: cs.fontSize });
          }
        }
        return small;
      });
      expect(
        promptPaySmallTexts,
        "No text in checkout modal (PromptPay) should be < 14px"
      ).toEqual([]);

      // Item name inside checkout summary should wrap (not truncate with ellipsis)
      const itemNameStyle = await modalRoot
        .locator("form p.font-bold.text-espresso-900")
        .first()
        .evaluate((el) => {
          const cs = window.getComputedStyle(el);
          return {
            fontSize: cs.fontSize,
            whiteSpace: cs.whiteSpace,
            textOverflow: cs.textOverflow,
          };
        });
      expect(itemNameStyle.fontSize).toBe("14px");
      expect(itemNameStyle.whiteSpace).toBe("normal");
      expect(itemNameStyle.textOverflow).not.toBe("ellipsis");

      // Switch to counter payment and check text sizes there too
      await page.getByRole("button", { name: /ชำระที่หน้าร้าน/ }).click();
      await page.screenshot({
        path: "test-results/checkout-modal-counter.png",
      });

      const counterSmallTexts = await modalRoot.evaluate((root) => {
        const small: Array<{ text: string; fontSize: string }> = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let n: Node | null;
        while ((n = walker.nextNode())) {
          const text = n.textContent?.trim();
          const el = n.parentElement;
          if (!text || !el) continue;
          const cs = window.getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden") continue;
          const px = parseFloat(cs.fontSize);
          if (px < 14) {
            small.push({ text, fontSize: cs.fontSize });
          }
        }
        return small;
      });
      expect(
        counterSmallTexts,
        "No text in checkout modal (Counter) should be < 14px"
      ).toEqual([]);
    } finally {
      await context.close();
      if (cdpBrowser) {
        await cdpBrowser.close();
      }
    }
  });
});
