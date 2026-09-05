import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AdPixels } from "@/components/AdPixels";
import { RegisterSW } from "@/components/RegisterSW";

export const metadata: Metadata = {
  title: "Adopta un gatito",
  description: "Sistema de adopción de gatos: captación de adoptantes, seguimiento y mejora continua.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Adopta Gatos",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5b301",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AdPixels />
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
