/**
 * Credits (Release 1.0): who made the game, and the fonts and libraries it is built with
 * (their licenses ask to be named). Shown on the title and in the Menu.
 */
const FONTS: readonly { name: string; by: string }[] = [
  { name: "Cinzel", by: "Natanael Gama" },
  { name: "Alegreya Sans", by: "Juan Pablo del Peral, Huerta Tipográfica" },
  { name: "JetBrains Mono", by: "JetBrains" },
];

const LIBRARIES = ["React", "PixiJS", "Zod", "Vite"];

export const CREATOR_URL = "https://github.com/Cedust";

export function CreditsPanel() {
  return (
    <div className="credits">
      <p className="credits-kindled">
        <span className="credits-kicker title-font">Kindled by</span>
        <a className="credits-name title-font" href={CREATOR_URL} target="_blank" rel="noreferrer">
          Cedust
        </a>
        <span className="credits-role">Idea, game design and art</span>
      </p>
      <dl className="credits-list">
        <dt className="title-font">Code</dt>
        <dd>Written by Claude (Anthropic)</dd>
        <dt className="title-font">Art</dt>
        <dd>Painted with AI image tools, chosen and cut by Cedust</dd>
        <dt className="title-font">Fonts</dt>
        <dd>
          {FONTS.map((f) => (
            <span key={f.name} className="credits-line">
              {f.name} by {f.by}
            </span>
          ))}
          <span className="credits-note">SIL Open Font License</span>
        </dd>
        <dt className="title-font">Built with</dt>
        <dd>
          {LIBRARIES.join(", ")}
          <span className="credits-note">MIT License</span>
        </dd>
      </dl>
      <p className="credits-thanks">Thank you for keeping the Ember alive.</p>
      <p className="credits-version mono">Version {__APP_VERSION__}</p>
    </div>
  );
}
