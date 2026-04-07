import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";

import { QueryProvider } from "@/components/providers/query-provider";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kelola SDM Gapura Angkasa",
  description: "Sistem Manajemen Data SDM PT Gapura Angkasa",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${figtree.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
