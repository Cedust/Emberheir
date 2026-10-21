import ashenBruteUrl from "./enemies/ashen-brute.webp";
import ashenSkirmisherUrl from "./enemies/ashen-skirmisher.webp";
import cinderCasterUrl from "./enemies/cinder-caster.webp";
import emberThiefUrl from "./enemies/ember-thief.webp";
import gorrakUrl from "./enemies/gorrak.webp";

/** Timo's painted enemies by id (tools/art/cut_enemies.py): the arena and the Bestiary use them. */
export const ENEMY_PAINTINGS = {
  "ashen-brute": ashenBruteUrl,
  "ashen-skirmisher": ashenSkirmisherUrl,
  "cinder-caster": cinderCasterUrl,
  gorrak: gorrakUrl,
  "ember-thief": emberThiefUrl,
} as const satisfies Record<string, string>;

export const enemyPainting = (id: string): string | undefined =>
  (ENEMY_PAINTINGS as Record<string, string>)[id];

/**
 * Where the face sits in each painting (fractions of its width and height) and how far the
 * round portraits zoom in (painting height per portrait size): Bestiary, path cards, Eldrin.
 */
export const ENEMY_FACES: Record<
  keyof typeof ENEMY_PAINTINGS,
  { x: number; y: number; zoom: number }
> = {
  "ashen-brute": { x: 0.44, y: 0.18, zoom: 2.5 },
  "ashen-skirmisher": { x: 0.25, y: 0.21, zoom: 2.7 },
  "cinder-caster": { x: 0.35, y: 0.2, zoom: 2.8 },
  gorrak: { x: 0.3, y: 0.24, zoom: 2.6 },
  "ember-thief": { x: 0.25, y: 0.17, zoom: 2.7 },
};

export const enemyFace = (id: string) =>
  (ENEMY_FACES as Record<string, { x: number; y: number; zoom: number }>)[id] ?? {
    x: 0.5,
    y: 0.2,
    zoom: 2.5,
  };
