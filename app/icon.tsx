import { mark } from "@/lib/mark";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return mark(64, 14);
}
