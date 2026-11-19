import type { Metadata, Viewport } from "next";
import { Archivo_Black, Geist } from "next/font/google";
import { BASE, DESCRIPTION, FULL_NAME, HOME_URL, JEV_URL, KEYWORDS, REPO_URL, SITE_NAME, TITLE, at } from "@/lib/site";
import SiteAnalytics from "@/app/components/SiteAnalytics";
import "./globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const logo = Archivo_Black({ variable: "--font-archivo-black", weight: "400", subsets: ["latin"] });

// Absolute URLs (share images, canonicals) resolve against the public address
// on natepeace.com, so a preview never advertises itself as the real site.
// The base has a path, so "/og" becomes .../games/politicians-by-jev/og. The
// home page is spelled out: joining "/" onto it would add a trailing slash.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_ENV ? HOME_URL : `http://localhost:3217${BASE}`),
  title: { default: TITLE, template: "%s · Jev!" },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: KEYWORDS,
  authors: [{ name: "Banana Intelligence", url: "https://bananaintelligence.ai" }],
  creator: "Banana Intelligence",
  category: "entertainment",
  alternates: { canonical: HOME_URL },
  icons: { icon: { url: at("/icon"), type: "image/png", sizes: "64x64" }, apple: { url: at("/apple-icon"), sizes: "180x180" } },
  openGraph: {
    siteName: FULL_NAME,
    type: "website",
    locale: "en_US",
    url: HOME_URL,
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

// WebSite is what Google reads for the site name shown above results.
const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: FULL_NAME,
  alternateName: [SITE_NAME, "politiciansbyjev"],
  url: HOME_URL,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["WebApplication", "VideoGame"],
  name: FULL_NAME,
  alternateName: SITE_NAME,
  url: HOME_URL,
  description: DESCRIPTION,
  applicationCategory: "GameApplication",
  genre: ["Party game", "Trivia", "Humor"],
  gamePlatform: "Web browser",
  playMode: ["SinglePlayer", "MultiPlayer"],
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([website, jsonLd]) }} />
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
