import type { Metadata, Viewport } from "next";
import { Archivo_Black, Geist } from "next/font/google";
import { DESCRIPTION, JEV_URL, KEYWORDS, REPO_URL, SITE_NAME, SITE_URL, TITLE } from "@/lib/site";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const logo = Archivo_Black({ variable: "--font-archivo-black", weight: "400", subsets: ["latin"] });

// Absolute URLs (share images, canonicals) resolve against production, so a
// preview never advertises itself as the real site.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_ENV ? SITE_URL : "http://localhost:3217"),
  title: { default: TITLE, template: "%s · Jev!" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: "Banana Intelligence", url: "https://bananaintelligence.ai" }],
  creator: "Banana Intelligence",
  category: "entertainment",
  alternates: { canonical: "/" },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og", width: 1200, height: 630, alt: "Jev! America’s 100 most famous politicians. You ask. Jev picks." }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og", alt: "Jev! America’s 100 most famous politicians. You ask. Jev picks." }],
  },
  robots: { index: true, follow: true, "max-image-preview": "large" } as Metadata["robots"],
};

export const viewport: Viewport = { themeColor: "#fcfbf8", colorScheme: "light" };

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  alternateName: "Politicians by Jev",
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "EntertainmentApplication",
  operatingSystem: "Any",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  isAccessibleForFree: true,
  creator: { "@type": "Organization", name: "Banana Intelligence", url: "https://bananaintelligence.ai" },
  sameAs: [REPO_URL],
  about: { "@type": "SoftwareApplication", name: "Jev", applicationCategory: "AI model", url: JEV_URL },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${logo.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        {children}
      </body>
    </html>
  );
}
