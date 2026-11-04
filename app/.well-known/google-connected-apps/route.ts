// Google Connected Apps checks this address to confirm we own the domain.
// Paste the token from the console's "Download token" file here. Until then
// the address answers 404, which is what it should do for everyone else.
const TOKENS: string[] = [];

export function GET() {
  if (!TOKENS.length) return new Response("Not found", { status: 404 });
  return Response.json({ verification_tokens: TOKENS });
}
