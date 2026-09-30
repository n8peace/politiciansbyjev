import type { Metadata, Viewport } from "next";
import { Archivo_Black, Geist } from "next/font/google";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const logo = Archivo_Black({ variable: "--font-archivo-black", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jev! — politicians by Jev",
  description: "America's 100 most famous politicians. You ask. An AI picks. Blame Jev.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${logo.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
