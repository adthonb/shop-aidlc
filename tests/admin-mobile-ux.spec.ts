import { test, expect, Page } from "@playwright/test";

const VIEW_W = 390;
const MIN_TOUCH = 44;

const img = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

const storeData = {
  store: {
    storeName: "เรณู เช้านี้ (Raynue Morning)",
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
      name: "เซ็ตอาหารเช้าครบชุด ข้าวต้มหมูสับพร้อมไข่ลวกและปาท่องโก๋ทอดกรอบ",
      description: "d",
      price: 89,
      image: img,
      soldOut: false,
      quantity: 12,
    },
  ],
};

function order(id: string, q: string, status: string) {
  return {
    id,
    queueNumber: q,
    dateKey: "2026-11-07",
    createdAt: "2026-11-07T01:00:00.000Z",
    customerName: "สมชาย ใจดีมากมายเหลือเกินนามสกุลยาว",
    customerPhone: "081-234-5678",
    customerContact: "",
    pickupTime: "รับทันที (เตรียมอาหาร 15-20 นาที)",
    paymentMethod: "promptpay",
    slipUrl: "/api/slips/x.jpg",
    items: [
      {
        id: "item-1",
        name: "เซ็ตอาหารเช้าครบชุด ข้าวต้มหมูสับพร้อมไข่ลวกและปาท่องโก๋ทอดกรอบ",
        price: 89,
        quantity: 2,
      },
    ],
    totalQuantity: 2,
    totalAmount: 178,
    status,
    lineSent: false,
  };
}

const orders = [
  order("o1", "#A001", "pending"),
  order("o2", "#A002", "preparing"),
  order("o3", "#A003", "ready"),
  order("o4", "#A004", "completed"),
];

async function openAdmin(page: Page, patches: Array<Record<string, unknown>> = []) {
  await page.setViewportSize({ width: VIEW_W, height: 844 });
  await page.route("**/api/admin", async (route) => {
    const req = route.request();
    if (req.method() === "PATCH") {
      patches.push(JSON.parse(req.postData() || "{}"));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, storeData, orders }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        storeData,
        orders,
        todayKey: "2026-11-07",
        lineConfigured: true,
      }),
    });
  });
  await page.goto("/admin");
  await page.getByPlaceholder("รหัส PIN ร้านค้า").fill("1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบจัดการร้าน" }).click();
  await expect(page.getByText("#A001").first()).toBeVisible();
}

async function expectTouchFriendly(
  locator: ReturnType<Page["locator"]>,
  label: string
) {
  await expect(locator, `${label} visible`).toBeVisible();
  const box = await locator.boundingBox();
  expect(box, `${label} has a box`).not.toBeNull();
  expect(box!.height, `${label} height >= 44`).toBeGreaterThanOrEqual(MIN_TOUCH);
  expect(box!.width, `${label} width >= 44`).toBeGreaterThanOrEqual(MIN_TOUCH);
  expect(box!.x, `${label} inside left edge`).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width, `${label} inside right edge`).toBeLessThanOrEqual(VIEW_W);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("Admin mobile UX", () => {
  test("header buttons are large labelled touch targets", async ({ page }) => {
    await openAdmin(page);
    await expectTouchFriendly(page.getByRole("button", { name: /รีเฟรช/ }), "refresh");
    await expectTouchFriendly(page.getByRole("link", { name: /หน้าร้าน/ }), "shop page");
    await expectTouchFriendly(page.getByRole("button", { name: /ออกจากระบบ/ }), "logout");
    await expectTouchFriendly(
      page.getByRole("button", { name: /กดเพื่อปิดรับออเดอร์/ }),
      "store status toggle"
    );
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/admin-mobile-header.png" });
  });

  test("edit menu name/price is a real, large button", async ({ page }) => {
    await openAdmin(page);
    await page.getByRole("button", { name: /จัดการเมนู/ }).click();
    const edit = page.getByRole("button", { name: /แก้ไขชื่อ\/ราคา/ });
    await expectTouchFriendly(edit, "edit name/price");
    const cs = await edit.evaluate((el) => {
      const s = getComputedStyle(el);
      return { border: s.borderTopWidth, bg: s.backgroundColor, text: s.textDecorationLine };
    });
    expect(cs.border).not.toBe("0px");
    expect(cs.text).not.toContain("underline");
    await expectTouchFriendly(page.getByLabel(/จำนวนคงเหลือ/), "quantity input");
    await expectTouchFriendly(page.getByRole("button", { name: /บันทึกจำนวน/ }), "save qty");
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/admin-mobile-menu.png", fullPage: true });
  });

  test("order status control stays on screen and is large", async ({ page }) => {
    await openAdmin(page);
    const statuses = page.getByRole("combobox", { name: /สถานะออเดอร์/ });
    await expect(statuses).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expectTouchFriendly(statuses.nth(i), `status select #${i}`);
    }
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: "test-results/admin-mobile-orders.png", fullPage: true });
  });

  test("order list has status filter chips with counts", async ({ page }) => {
    await openAdmin(page);
    const all = page.getByRole("button", { name: /^ทั้งหมด \(4\)/ });
    await expectTouchFriendly(all, "filter all");
    const preparing = page.getByRole("button", { name: /^กำลังปรุง \(1\)/ });
    await expectTouchFriendly(preparing, "filter preparing");
    await preparing.click();
    await expect(page.getByText("#A002")).toBeVisible();
    await expect(page.getByText("#A001")).toHaveCount(0);
    await all.click();
    await expect(page.getByText("#A001")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("order card has a one-tap next-step button that updates status", async ({ page }) => {
    const patches: Array<Record<string, unknown>> = [];
    await openAdmin(page, patches);
    const next = page.getByRole("button", { name: /เริ่มปรุง/ });
    await expectTouchFriendly(next, "start preparing");
    await next.click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toMatchObject({
      action: "update_order_status",
      orderId: "o1",
      status: "preparing",
    });
    await expectTouchFriendly(page.getByRole("button", { name: /พร้อมรับหน้าร้าน/ }), "mark ready");
    await expectTouchFriendly(page.getByRole("button", { name: /ลูกค้ารับแล้ว/ }), "mark completed");
    await expectTouchFriendly(page.getByRole("link", { name: /โทร/ }).first(), "call");
    await expectTouchFriendly(page.getByRole("link", { name: /ดูรูปสลิป/ }).first(), "slip link");
  });
});
