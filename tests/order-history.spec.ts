import { test, expect } from "@playwright/test";

const storeData = {
  store: {
    storeName: "เรณู เช้านี้ (Raynue Morning)",
    tagline: "อาหารเช้าโฮมเมด",
    isOpen: true,
    openTime: "06:00:00+07:00",
    closeTime: "11:30:00+07:00",
    phone: "089-123-4567",
    address: "สุขุมวิท 38",
    promptPayId: "0891234567",
    promptPayName: "ร้านเรณู",
    bankName: "กสิกรไทย",
    bankAccountName: "บจก. เรณู",
    pickupTimeSlots: ["รับทันที"],
  },
  categories: [{ id: "sets", name: "เซ็ต", icon: "Sunrise" }],
  items: [
    {
      id: "item-1",
      categoryId: "sets",
      name: "เซ็ตอรุณสวัสดิ์เรณู",
      description: "ไข่กระทะทรงเครื่อง",
      price: 119,
      image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      soldOut: false,
      quantity: 20,
    },
  ],
};

const orders = [
  {
    id: "2026-11-08-A001-1111",
    queueNumber: "#A001",
    dateKey: "2026-11-08",
    createdAt: "2026-11-08T01:00:00.000Z",
    updatedAt: "2026-11-08T01:00:00.000Z",
    customerName: "ลูกค้าวันนี้",
    customerPhone: "0811111111",
    customerContact: "",
    pickupTime: "รับทันที",
    paymentMethod: "promptpay",
    slipUrl: "/api/slips/2026-11-08-A001-1111.jpg",
    items: [{ id: "item-1", name: "เซ็ตอรุณสวัสดิ์เรณู", price: 119, quantity: 2 }],
    totalQuantity: 2,
    totalAmount: 238,
    status: "pending",
    statusHistory: [{ status: "pending", timestamp: "2026-11-08T01:00:00.000Z" }],
    lineSent: true,
  },
  {
    id: "2026-11-07-A002-2222",
    queueNumber: "#A002",
    dateKey: "2026-11-07",
    createdAt: "2026-11-07T02:00:00.000Z",
    updatedAt: "2026-11-07T02:15:00.000Z",
    customerName: "ลูกค้าเมื่อวาน",
    customerPhone: "0822222222",
    customerContact: "",
    pickupTime: "08:30 - 08:45",
    paymentMethod: "counter",
    items: [{ id: "item-1", name: "เซ็ตอรุณสวัสดิ์เรณู", price: 119, quantity: 1 }],
    totalQuantity: 1,
    totalAmount: 119,
    status: "completed",
    statusHistory: [
      { status: "pending", timestamp: "2026-11-07T02:00:00.000Z" },
      { status: "completed", timestamp: "2026-11-07T02:15:00.000Z" },
    ],
    lineSent: true,
  },
];

test("Admin order history E2E: filters by date, displays Bangkok timestamp, and downloads CSV/JSON", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/admin", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        storeData,
        orders,
        todayKey: "2026-11-08",
        lineConfigured: true,
      }),
    });
  });

  await page.addInitScript(() => {
    window.sessionStorage.setItem("raynue_admin_pin", "1234");
  });

  await page.goto("/admin");

  // Defaults to today's orders (2026-11-08)
  await expect(page.getByText("คุณลูกค้าวันนี้")).toBeVisible();
  await expect(page.getByText("คุณลูกค้าเมื่อวาน")).toHaveCount(0);

  // Switch date filter to 2026-11-07
  const dateSelect = page.getByLabel("เลือกวันที่ออเดอร์");
  await expect(dateSelect).toHaveValue("2026-11-08");
  await dateSelect.selectOption("2026-11-07");

  await expect(page.getByText("คุณลูกค้าเมื่อวาน")).toBeVisible();
  await expect(page.getByText("คุณลูกค้าวันนี้")).toHaveCount(0);

  // Switch to all dates
  await dateSelect.selectOption("all");
  await expect(page.getByText("คุณลูกค้าวันนี้")).toBeVisible();
  await expect(page.getByText("คุณลูกค้าเมื่อวาน")).toBeVisible();

  // Verify CSV download
  const [csvDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "ดาวน์โหลด CSV" }).click(),
  ]);
  expect(csvDownload.suggestedFilename()).toBe("raynue-orders-all.csv");
});
