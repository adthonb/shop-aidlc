# Raynue Morning (เรณู เช้านี้) ☀️

A **mobile-first self-pickup web application** designed specifically for a breakfast store. Customers can browse completed breakfast sets with simple quantity steppers, pay via **Dynamic Thai QR PromptPay** (with automatic order total calculation and payment slip upload) or pay at the counter upon pickup, and receive a daily queue ticket. Incoming orders are pushed immediately to the store's **LINE Official Account (LINE Messaging API)**, and store staff can manage availability and orders from a mobile-friendly `/admin` dashboard.

## ✨ Key Features

1. **Mobile-First Warm Morning Cafe UI (Thai Language + ฿ THB)**:
   - Displays completed breakfast sets where customers can increment or decrement quantities (`+` / `-`) directly on each menu card without complex modifier popups.
   - Real-time sticky bottom cart bar showing total items and total price.
2. **Checkout & Dynamic PromptPay QR (`thai-qr-payment`)**:
   - Generates an official EMVCo Thai QR Payment + PromptPay SVG card pre-filled with the exact order total using [`thai-qr-payment`](https://github.com/uunw/thai-qr-payment), complete with copyable bank/PromptPay details and payment slip photo upload.
   - Also supports a **"Pay at Counter upon Pickup"** option.
3. **Daily Sequential Queue Ticket & Downloadable Receipt**:
   - Automatically generates daily sequential queue numbers (`#A001`, `#A002`, ... resetting daily in `Asia/Bangkok` time).
   - Customers can download a crisp PNG digital receipt/queue card (rendered client-side via HTML5 Canvas) and open the store's LINE OA directly.
4. **LINE Messaging API Notification (Flex Message + Payment Slip)**:
   - Pushes a formatted **LINE Flex Message** containing the queue number, pickup time, customer contact info, itemized order list, total amount, and payment slip image (served via `/api/slips/[filename]`) directly to the store owner or store group chat.
5. **Mobile Store Admin Dashboard (`/admin`)**:
   - Protected by a store PIN (`ADMIN_PIN`, default `1234`).
   - One-tap switches to toggle **Store Open / Closed** and mark individual breakfast items as **Available / Sold Out Today**.
   - View today's order queue, update order statuses, inspect uploaded payment slips, track daily revenue, and add/edit menu items or store payment settings.

---

## 🚀 Getting Started (Self-Hosted / Linux / VPS / Cloud Run)

```bash
# 1. Copy the example environment configuration
cp .env.example .env.local

# 2. Configure LINE_CHANNEL_ACCESS_TOKEN, LINE_TARGET_ID, PROMPTPAY_ID, and ADMIN_PIN in .env.local

# 3. Start the development server
npm run dev

# 4. Type-check and build for production
npm run typecheck
npm run build
npm run start
```

## 📁 Data & Storage Structure

- [`data/menu.json`](file:///home/bom/my-project/raynue/data/menu.json) — Store configuration, pickup time slots, categories, and breakfast menu items.
- [`data/orders.json`](file:///home/bom/my-project/raynue/data/orders.json) — Local order log and daily queue history.
- `data/slips/` — Uploaded customer payment slip images (served at `/api/slips/[filename]`).
