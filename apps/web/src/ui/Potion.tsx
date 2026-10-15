/** The Ember Flask's potion, the same in the Battle HUD and between stages. */

/** A round-bellied health potion: cork, neck, glass bulb with red liquid and a highlight. */
export function Potion(props: { full: boolean; className?: string }) {
  return (
    <svg
      className={`${props.className ?? ""} ${props.full ? "full" : ""}`}
      viewBox="0 0 32 44"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="potion-liquid" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ff6a5a" />
          <stop offset="0.55" stopColor="#c4161c" />
          <stop offset="1" stopColor="#4a0308" />
        </radialGradient>
        <clipPath id="potion-bulb">
          <circle cx="16" cy="29" r="12" />
        </clipPath>
      </defs>
      <rect x="11.5" y="2" width="9" height="6" rx="1.5" fill="#8a5a26" stroke="#2a180a" />
      <path
        d="M12.5 8h7v7.4a12.5 12.5 0 1 1-7 0z"
        fill="rgb(20 12 8 / 0.65)"
        stroke="#d9a55a"
        strokeWidth="1.6"
      />
      {props.full && (
        <g clipPath="url(#potion-bulb)">
          <rect x="2" y="21" width="28" height="22" fill="url(#potion-liquid)" />
          <ellipse cx="16" cy="21" rx="12" ry="1.6" fill="#ff9a8a" opacity="0.8" />
        </g>
      )}
      <path
        d="M9 24a8 8 0 0 1 5-5"
        stroke="#fff"
        strokeWidth="1.6"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
      />
    </svg>
  );
}
