import { mark } from "@/lib/mark";

// The favicon, a plain route rather than an icon.tsx file: Next.js links
// icon files from the root ("/icon"), which on natepeace.com is that site's
// own address. layout.tsx links this one through the game's path.
export function GET() {
  return mark(64, 14);
}
