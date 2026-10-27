import { ImageResponse } from "next/og";
import { Mark, markFont } from "@/lib/mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  return new ImageResponse(await Mark({ size: 180 }), { ...size, fonts: await markFont() });
}
