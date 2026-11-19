import type { MetadataRoute } from "next";
import { HOME_URL } from "@/lib/site";

// Preview deployments stay out of search; only production is indexed.
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    // The pages live on natepeace.com now; this domain keeps the agent addresses.
    sitemap: `${HOME_URL}/sitemap.xml`,
  };
}
