import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nexa Store",
  description: "AI-powered e-commerce customer support",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
