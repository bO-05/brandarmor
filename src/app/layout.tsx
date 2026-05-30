import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "BrandArmor v4 - Evidence Review",
  description: "Evidence-backed suspicious listing review app",
  applicationName: "BrandArmor",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brandarmor-icons/icon-color-light.svg", type: "image/svg+xml" },
      { url: "/brandarmor-icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brandarmor-icons/favicon-128.png", sizes: "128x128", type: "image/png" },
    ],
    apple: [
      { url: "/brandarmor-icons/app-icon-light-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen md:flex md:h-screen md:overflow-hidden">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 md:overflow-y-auto md:p-6">{children}</main>
        </div>
        <Toaster position="bottom-right" />
        {process.env.VERCEL_ENV === "production" ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
