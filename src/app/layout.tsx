import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { FacebookPixel } from "@/components/fb-pixel";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "OControle — Pointage & Présence pour l'Afrique",
    template: "%s | OControle",
  },
  description:
    "Plateforme SaaS de pointage et gestion de présence pour les entreprises africaines. Simple, rapide, fiable.",
  keywords: [
    "pointage",
    "présence",
    "employés",
    "RH",
    "SaaS",
    "Afrique",
    "gestion du temps",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OControle",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <meta name="theme-color" content="#d6a21c" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="dns-prefetch" href="https://ubvtaviufrhajndwcmdm.supabase.co" />
        <link rel="preconnect" href="https://ubvtaviufrhajndwcmdm.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh antialiased">
        <FacebookPixel />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
