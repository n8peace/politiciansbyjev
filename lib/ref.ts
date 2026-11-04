// Campaign tags: a link like /?ref=x-post marks where a visitor came from.
// The tag is kept for the tab (not across visits), then dropped from the
// address so links the visitor shares don't carry someone else's tag.

const KEY = "jev-ref";

// Returns the tag when this page load brought a new one, else null.
export function captureRef(): string | null {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("ref");
  if (raw === null) return null;
  url.searchParams.delete("ref");
  window.history.replaceState(window.history.state, "", url);
  const ref = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 32);
  if (!ref) return null;
  try {
    if (sessionStorage.getItem(KEY) === ref) return null;
    sessionStorage.setItem(KEY, ref);
  } catch {}
  return ref;
}

export function currentRef(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
