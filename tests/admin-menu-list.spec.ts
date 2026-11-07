import { test, expect } from "@playwright/test";

const LONG_NAME = "เซ็ตอาหารเช้าครบชุด ข้าวต้มหมูสับพร้อมไข่ลวกและปาท่องโก๋ทอดกรอบ";

const storeData = {
  store: {
    storeName: "เรณู เช้านี้",
    tagline: "t",
    isOpen: true,
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
    phone: "089-123-4567",
    address: "a",
    promptPayId: "0891234567",
    promptPayName: "n",
    bankName: "b",
    bankAccountName: "a",
    pickupTimeSlots: ["รับทันที"],
  },
  categories: [{ id: "sets", name: "เซ็ต", icon: "Sunrise" }],
  items: [
    {
      id: "item-1",
      categoryId: "sets",
      name: LONG_NAME,
      description: "d",
      price: 89,
      image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      soldOut: false,
      quantity: 12,
    },
    {
      id: "item-2",
      categoryId: "sets",
      name: "กาแฟร้อน",
      description: "d",
      price: 40,
      image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      soldOut: true,
      quantity: 0,
    },
  ],
};

test.describe("Admin menu tab list UX", () => {
  test("menu names wrap (not truncated) and all list text is 14px on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route("**/api/admin", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          storeData,
          orders: [],
          todayKey: "2026-11-07",
          lineConfigured: false,
        }),
      });
    });

    await page.goto("/admin");
    await page.getByPlaceholder("รหัส PIN ร้านค้า").fill("1234");
    await page.getByRole("button", { name: "เข้าสู่ระบบจัดการร้าน" }).click();
    await page.getByRole("button", { name: /จัดการเมนู/ }).click();

    const name = page.getByText(LONG_NAME, { exact: true });
    await expect(name).toBeVisible();

    const style = await name.evaluate((el) => {
      const cs = window.getComputedStyle(el);
      return {
        fontSize: cs.fontSize,
        whiteSpace: cs.whiteSpace,
        textOverflow: cs.textOverflow,
        lineHeight: parseFloat(cs.lineHeight),
        height: el.getBoundingClientRect().height,
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      };
    });
    expect(style.fontSize).toBe("14px");
    expect(style.whiteSpace).toBe("normal");
    expect(style.textOverflow).not.toBe("ellipsis");
    // wraps onto more than one line and nothing is clipped horizontally
    expect(style.height).toBeGreaterThan(style.lineHeight * 1.5);
    expect(style.scrollWidth).toBeLessThanOrEqual(style.clientWidth);

    // Every text-bearing element in the menu list is 14px
    const list = name.locator("xpath=ancestor::div[contains(@class,'space-y-2.5')][1]");
    const sizes = await list.evaluate((root) => {
      const out: Array<{ text: string; size: string }> = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = walker.nextNode())) {
        if (!n.textContent?.trim() || !n.parentElement) continue;
        out.push({
          text: n.textContent.trim(),
          size: window.getComputedStyle(n.parentElement).fontSize,
        });
      }
      for (const el of Array.from(root.querySelectorAll("input"))) {
        out.push({ text: "input", size: window.getComputedStyle(el).fontSize });
      }
      return out;
    });
    expect(sizes.length).toBeGreaterThan(0);
    for (const s of sizes) {
      expect(s, `${s.text} should be 14px`).toMatchObject({ size: "14px" });
    }

    await page.screenshot({
      path: "test-results/admin-menu-list.png",
      fullPage: true,
    });
  });
});
