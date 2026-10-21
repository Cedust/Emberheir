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
