import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "เรณู เช้านี้ (Raynue Morning) | สั่งอาหารเช้าล่วงหน้า รับหน้าร้าน",
  description:
    "สั่งอาหารเช้าโฮมเมดล่วงหน้า รับที่หน้าร้านไม่ต้องรอคิว อร่อยครบเซ็ต พร้อมเริ่มวันใหม่อย่างอบอุ่น",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#FDFBF7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body
        style={{ fontFamily: "Roboto,Arial,sans-serif" }}
        className="font-sans antialiased bg-cream-50 text-espresso-900 min-h-screen selection:bg-sunrise-400/30"
      >
        {children}
      </body>
    </html>
  );
}
