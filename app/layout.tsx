import type { Metadata, Viewport } from "next";
import { Archivo_Black, Geist } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const logo = Archivo_Black({ variable: "--font-archivo-black", weight: "400", subsets: ["latin"] });

// Production gets the real domain; previews point share images at themselves.
const site =
  process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

const description = "America's 100 most famous politicians. You ask. An AI picks. Blame Jev.";
const image = { url: "/og", width: 1200, height: 630, alt: "Jev! and a pile of politicians" };

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Jev! Politicians by Jev",
  description,
  openGraph: { title: "Jev!", description, siteName: "Jev!", type: "website", images: [image] },
  twitter: { card: "summary_large_image", title: "Jev!", description, images: [image] },
};

export const viewport: Viewport = { themeColor: "#ffffff", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${logo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
