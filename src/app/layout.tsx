import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AdminProvider } from "@/app/context/AdminContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import Script from "next/script"; // Pastikan ini di-import di atas
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Pindahkan themeColor ke Viewport sesuai standar Next.js 14+
export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "E-VOSTE",
  description:
    "Fragrance is more than a scent, it is a story, a memory, and a signature. Each creation is made to define you, to be remembered, and to leave an unforgettable trace.",
  icons: {
    icon: "/logo.jpeg",
    shortcut: "/logo.jpeg",
    apple: "/logo.jpeg",
  },
  other: {
    "font-preconnect": "https://fonts.googleapis.com",
    "font-preconnect-cross": "https://fonts.gstatic.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Hanya gunakan CSS FontAwesome untuk performa yang lebih baik, hapus versi <Script> */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased transition-colors duration-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AdminProvider>{children}</AdminProvider>
        </ThemeProvider>
        <Script
          src="https://app.sandbox.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
