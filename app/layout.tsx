import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ConditionalTopNav from "@/components/nav/ConditionalTopNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bill Tracker - Understand Congress. Make Your Voice Heard.",
  description: "Track U.S. bills, get AI summaries, and contact your representatives",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConditionalTopNav />
        <main style={{ backgroundColor: "#1a1a1a", minHeight: "100vh" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

