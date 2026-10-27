import { ImageResponse } from "next/og";
import { Mark, markFont } from "@/lib/mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(await Mark({ size: 32 }), { ...size, fonts: await markFont() });
}
