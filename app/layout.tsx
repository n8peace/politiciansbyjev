import type { Metadata, Viewport } from "next";
import { Archivo_Black, Geist } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const logo = Archivo_Black({ variable: "--font-archivo-black", weight: "400", subsets: ["latin"] });

const site =
  process.env.VERCEL_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3217";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "Jev! · Politicians by Jev",
  description: "America’s 100 most famous politicians. You ask. Jev picks. Blame Jev.",
  openGraph: { siteName: "Jev!", type: "website" },
};

export const viewport: Viewport = { themeColor: "#fcfbf8", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${logo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
