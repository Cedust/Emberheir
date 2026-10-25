import ashenBruteUrl from "./enemies/ashen-brute.webp";
import ashenSkirmisherUrl from "./enemies/ashen-skirmisher.webp";
import barkhideUrl from "./enemies/barkhide.webp";
import blightSpitterUrl from "./enemies/blight-spitter.webp";
import cinderCasterUrl from "./enemies/cinder-caster.webp";
import cinderImpUrl from "./enemies/cinder-imp.webp";
import cinderTyrantUrl from "./enemies/cinder-tyrant.webp";
import emberThiefUrl from "./enemies/ember-thief.webp";
import flameCallerUrl from "./enemies/flame-caller.webp";
import frostWardenUrl from "./enemies/frost-warden.webp";
import frostWolfUrl from "./enemies/frost-wolf.webp";
import gorrakUrl from "./enemies/gorrak.webp";
import iceGolemUrl from "./enemies/ice-golem.webp";
import magmaBruteUrl from "./enemies/magma-brute.webp";
import mossboundWardenUrl from "./enemies/mossbound-warden.webp";
import motherOfRotUrl from "./enemies/mother-of-rot.webp";
import obsidianGuardUrl from "./enemies/obsidian-guard.webp";
import rimeWardenUrl from "./enemies/rime-warden.webp";
import rimeWitchUrl from "./enemies/rime-witch.webp";
import rotwoodStalkerUrl from "./enemies/rotwood-stalker.webp";
import staticGolemUrl from "./enemies/static-golem.webp";
import stormCallerUrl from "./enemies/storm-caller.webp";
import stormHeraldUrl from "./enemies/storm-herald.webp";
import stormSpriteUrl from "./enemies/storm-sprite.webp";
import thunderBruteUrl from "./enemies/thunder-brute.webp";

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
  "magma-brute": magmaBruteUrl,
  "cinder-imp": cinderImpUrl,
  "flame-caller": flameCallerUrl,
  "obsidian-guard": obsidianGuardUrl,
  "cinder-tyrant": cinderTyrantUrl,
  "frost-wolf": frostWolfUrl,
  "ice-golem": iceGolemUrl,
  "rime-witch": rimeWitchUrl,
  "frost-warden": frostWardenUrl,
  "rime-warden": rimeWardenUrl,
  "storm-sprite": stormSpriteUrl,
  "thunder-brute": thunderBruteUrl,
  "storm-caller": stormCallerUrl,
  "static-golem": staticGolemUrl,
  "storm-herald": stormHeraldUrl,
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
  "magma-brute": { x: 0.25, y: 0.19, zoom: 2.6 },
  "cinder-imp": { x: 0.27, y: 0.33, zoom: 2.4 },
  "flame-caller": { x: 0.35, y: 0.15, zoom: 2.8 },
  "obsidian-guard": { x: 0.43, y: 0.23, zoom: 2.8 },
  "cinder-tyrant": { x: 0.41, y: 0.23, zoom: 2.8 },
  "frost-wolf": { x: 0.2, y: 0.14, zoom: 2.6 },
  "ice-golem": { x: 0.13, y: 0.25, zoom: 2.6 },
  "rime-witch": { x: 0.32, y: 0.11, zoom: 2.8 },
  "frost-warden": { x: 0.31, y: 0.195, zoom: 2.6 },
  "rime-warden": { x: 0.27, y: 0.18, zoom: 2.6 },
  "storm-sprite": { x: 0.2, y: 0.17, zoom: 2.8 },
  "thunder-brute": { x: 0.17, y: 0.25, zoom: 2.6 },
  "storm-caller": { x: 0.44, y: 0.2, zoom: 2.8 },
  "static-golem": { x: 0.2, y: 0.42, zoom: 2.6 },
  "storm-herald": { x: 0.46, y: 0.13, zoom: 2.8 },
};

export const enemyFace = (id: string) =>
  (ENEMY_FACES as Record<string, { x: number; y: number; zoom: number }>)[id] ?? {
    x: 0.5,
    y: 0.2,
    zoom: 2.5,
  };
