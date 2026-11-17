import { CONTACT_EMAIL } from "@/lib/site";

export default function FooterLink() {
  return (
    <>
      <a
        href="https://bananaintelligence.ai/?ct=jev"
        className="inline-flex min-h-11 items-center text-sm text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
      >
        A Banana Intelligence app. See the others.
      </a>
      <span className="block text-sm text-ink-soft">
        Contact:{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex min-h-11 items-center text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-ink"
        >
          {CONTACT_EMAIL}
        </a>
      </span>
    </>
  );
}
