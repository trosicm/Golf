import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Logo } from "./components/Logo";
import { GlobalExitButton } from "./components/GlobalExitButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Golf Rivals",
  description: "Every Hole Has a Price.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-screen font-sans" style={{ background: "var(--background)", color: "var(--foreground)" }}>
        <GlobalExitButton />
        <main className="mx-auto w-full min-h-screen flex flex-col px-2 sm:px-4 max-w-6xl">
          <Logo variant="icon" size="md" className="brand-logo mx-auto my-6" />
          {children}
        </main>
      </body>
    </html>
  );
}
