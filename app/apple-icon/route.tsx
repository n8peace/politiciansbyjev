import { mark } from "@/lib/mark";

// iOS rounds the corners itself. A plain route for the same reason as /icon.
export function GET() {
  return mark(180, 0);
}
