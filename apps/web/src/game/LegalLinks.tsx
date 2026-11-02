/** The legal pages next to the game (public/legal/, filled in at build time: docs/cloud-setup.md). */
export const LEGAL_LINKS = [
  { label: "Legal Notice", href: `${import.meta.env.BASE_URL}legal/imprint.html` },
  { label: "Privacy", href: `${import.meta.env.BASE_URL}legal/privacy.html` },
] as const;

export function LegalLinks() {
  return (
    <span className="legal-links">
      {LEGAL_LINKS.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
          {l.label}
        </a>
      ))}
    </span>
  );
}
