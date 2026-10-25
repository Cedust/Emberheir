import ashenBruteUrl from "./enemies/ashen-brute.webp";
import ashenSkirmisherUrl from "./enemies/ashen-skirmisher.webp";
import barkhideUrl from "./enemies/barkhide.webp";
import blightSpitterUrl from "./enemies/blight-spitter.webp";
import cinderCasterUrl from "./enemies/cinder-caster.webp";
import emberThiefUrl from "./enemies/ember-thief.webp";
import gorrakUrl from "./enemies/gorrak.webp";
import mossboundWardenUrl from "./enemies/mossbound-warden.webp";
import motherOfRotUrl from "./enemies/mother-of-rot.webp";
import rotwoodStalkerUrl from "./enemies/rotwood-stalker.webp";

/** Timo's painted enemies by id (tools/art/cut_enemies.py): the arena and the Bestiary use them. */
export const ENEMY_PAINTINGS = {
  "ashen-brute": ashenBruteUrl,
  "ashen-skirmisher": ashenSkirmisherUrl,
  "cinder-caster": cinderCasterUrl,
  gorrak: gorrakUrl,
  "ember-thief": emberThiefUrl,
  barkhide: barkhideUrl,
  "rotwood-stalker": rotwoodStalkerUrl,
  "blight-spitter": blightSpitterUrl,
  "mossbound-warden": mossboundWardenUrl,
  "mother-of-rot": motherOfRotUrl,
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
  barkhide: { x: 0.38, y: 0.27, zoom: 2.6 },
  "rotwood-stalker": { x: 0.29, y: 0.2, zoom: 2.6 },
  "blight-spitter": { x: 0.32, y: 0.15, zoom: 2.6 },
  "mossbound-warden": { x: 0.45, y: 0.23, zoom: 3 },
  "mother-of-rot": { x: 0.37, y: 0.15, zoom: 2.4 },
};

export const enemyFace = (id: string) =>
  (ENEMY_FACES as Record<string, { x: number; y: number; zoom: number }>)[id] ?? {
    x: 0.5,
    y: 0.2,
    zoom: 2.5,
  };
