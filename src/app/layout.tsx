import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { OfflineBanner } from "@/components/pwa/offline-banner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Zdravotní dokumentace",
    template: "%s · Zdravotní dokumentace",
  },
  description:
    "Osobní zdravotní záznamník — lokální evidence, ne zdravotnický prostředek.",
  applicationName: "Zdravotní dokumentace",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Zdravotní dokumentace",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F3F6F9" },
    { media: "(prefers-color-scheme: dark)", color: "#101923" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="cs"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <ServiceWorkerRegister />
            {/* Single top inset for iOS standalone notch / Dynamic Island. */}
            <div
              aria-hidden
              className="pointer-events-none shrink-0 bg-background"
              style={{ height: "env(safe-area-inset-top)" }}
            />
            <OfflineBanner />
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
