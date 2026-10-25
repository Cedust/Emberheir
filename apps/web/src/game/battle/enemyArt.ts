import { Assets, Container, Graphics, Sprite, type Texture } from "pixi.js";
import { INK } from "./arenaLayout";
import { ENEMY_PAINTINGS } from "./enemyPaintings";
import trainingDummyUrl from "../../assets/camp/personas/training-dummy.webp";

/** The enemy in the arena: archetype body in its act's colors, Elite and boss marks. */

export interface EnemyLook {
  /** Enemy id: a painted enemy (PAINTED_ENEMIES) shows its painting instead of the archetype body. */
  readonly id?: string;
  readonly archetype: string;
  readonly boss: boolean;
  readonly elite: boolean;
  /** Act number: every act dresses its enemies in its own colors. */
  readonly act: number;
  /** The Ember Thief carries a glowing sack of loot on its back. */
  readonly thief?: boolean;
  /** Ranged enemies shoot or cast across the arena instead of striking up close. */
  readonly ranged?: boolean;
  /** Enemy level minus hero level (level-v2.md): who has outgrown whom shows on the ground. */
  readonly levelGap?: number;
  /** A named Champion (run 3+): a violet-gold double aura. */
  readonly champion?: boolean;
  /** A Gatekeeper of the newest act: it fights in front of a burning stone gate. */
  readonly gate?: boolean;
  /** Wildfire tier of the trip: the ground burns, embers rise, flames lick at the edges. */
  readonly wildfire?: number;
}

type Palette = { body: number; trim: number; head: number };

const ENEMY_COLORS: Record<string, Palette> = {
  brute: { body: 0x6b5a3e, trim: 0x4a3c29, head: 0x9a8a70 },
  skirmisher: { body: 0x5a4a33, trim: 0x8a7552, head: 0xb3a288 },
  caster: { body: 0x7a2a20, trim: 0xff6a2b, head: 0x9a8a70 },
};

/** Rotwood: moss, bark and rot instead of ash. */
const ROTWOOD_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x3f4a2a, trim: 0x7a8a4a, head: 0x9aa078 },
  afflicter: { body: 0x4a5a26, trim: 0x9fe04a, head: 0x8a9a6a },
  thornback: { body: 0x5a4630, trim: 0x3a2c1e, head: 0x8a7a5a },
  warden: { body: 0x2f4a32, trim: 0x6a8a4a, head: 0x9aa480 },
};

/** Ember Wastes: obsidian, magma and glowing seams. */
const EMBER_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x5a2416, trim: 0xff8a3c, head: 0xc2603a },
  brute: { body: 0x2e2420, trim: 0xff6a2b, head: 0x6a4a3a },
  caster: { body: 0x7a1e12, trim: 0xffb13b, head: 0xb08a70 },
  warden: { body: 0x1f1a1e, trim: 0xff6a2b, head: 0x5a4a50 },
};

/** Frost Peaks: ice, fur and pale stone. */
const FROST_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x8a96a0, trim: 0xe8f2f8, head: 0xc0ccd4 },
  thornback: { body: 0x5a8aa8, trim: 0xbfe8ff, head: 0x8ab8d0 },
  caster: { body: 0x2a4a6a, trim: 0x6fd3ff, head: 0xc8d8e0 },
  warden: { body: 0x3a4a5a, trim: 0x9fe0ff, head: 0xa8b8c4 },
};

/** Storm Spires: slate, copper and violet sparks. */
const STORM_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x4a4a7a, trim: 0xffe14d, head: 0x9a9ac0 },
  brute: { body: 0x3a3a52, trim: 0xb87333, head: 0x7a7a90 },
  caster: { body: 0x2a2a5a, trim: 0xffe14d, head: 0xb0b0d0 },
  thornback: { body: 0x8a5a2a, trim: 0xffe14d, head: 0xb87333 },
};

/** Void Rift: near-black with violet glows. */
const VOID_COLORS: Record<string, Palette> = {
  skirmisher: { body: 0x2a1a3a, trim: 0xa35cff, head: 0x4a3a5a },
  brute: { body: 0x1e1828, trim: 0x6a3a9a, head: 0x3a3048 },
  caster: { body: 0x3a1a5a, trim: 0xc9a0ff, head: 0x6a5a7a },
  afflicter: { body: 0x2a1a40, trim: 0xa35cff, head: 0x5a4a6a },
};

/** Emberfall: ash grey and the last embers. */
const EMBERFALL_COLORS: Record<string, Palette> = {
  brute: { body: 0x4a4440, trim: 0xff8a1f, head: 0x8a8078 },
  caster: { body: 0x3a3634, trim: 0xa35cff, head: 0x9a9088 },
  skirmisher: { body: 0x2e2a28, trim: 0xe0314b, head: 0x6a625c },
  warden: { body: 0x3a3430, trim: 0xff6a2b, head: 0x7a7068 },
  harvester: { body: 0x1a1614, trim: 0xff8a1f, head: 0xe8e2d6 },
};

const ACT_COLORS: Record<number, Record<string, Palette>> = {
  2: ROTWOOD_COLORS,
  3: EMBER_COLORS,
  4: FROST_COLORS,
  5: STORM_COLORS,
  6: VOID_COLORS,
  7: EMBERFALL_COLORS,
};

/** Which body an archetype uses: robed casters, broad brutes or lean fighters. */
const BODY: Record<string, "robe" | "broad" | "lean"> = {
  caster: "robe",
  afflicter: "robe",
  harvester: "robe",
  brute: "broad",
  thornback: "broad",
  warden: "broad",
  skirmisher: "lean",
};

/**
 * Timo's painted enemies (tools/art/cut_enemies.py), facing left toward the hero. `height` is the
 * figure's height in stage px (the painted Heir stands ~390 tall), `footX` where its feet are
 * between left (0) and right (1) edge of the painting.
 */
const PAINTED_ENEMIES: Record<string, { url: string; height: number; footX: number }> = {
  "ashen-brute": { url: ENEMY_PAINTINGS["ashen-brute"], height: 400, footX: 0.55 },
  "ashen-skirmisher": { url: ENEMY_PAINTINGS["ashen-skirmisher"], height: 300, footX: 0.55 },
  "cinder-caster": { url: ENEMY_PAINTINGS["cinder-caster"], height: 370, footX: 0.5 },
  gorrak: { url: ENEMY_PAINTINGS.gorrak, height: 470, footX: 0.5 },
  "ember-thief": { url: ENEMY_PAINTINGS["ember-thief"], height: 290, footX: 0.45 },
  barkhide: { url: ENEMY_PAINTINGS.barkhide, height: 400, footX: 0.62 },
  "rotwood-stalker": { url: ENEMY_PAINTINGS["rotwood-stalker"], height: 320, footX: 0.59 },
  "blight-spitter": { url: ENEMY_PAINTINGS["blight-spitter"], height: 350, footX: 0.6 },
  "mossbound-warden": { url: ENEMY_PAINTINGS["mossbound-warden"], height: 440, footX: 0.62 },
  "mother-of-rot": { url: ENEMY_PAINTINGS["mother-of-rot"], height: 470, footX: 0.53 },
  "magma-brute": { url: ENEMY_PAINTINGS["magma-brute"], height: 410, footX: 0.42 },
  "cinder-imp": { url: ENEMY_PAINTINGS["cinder-imp"], height: 300, footX: 0.5 },
  "flame-caller": { url: ENEMY_PAINTINGS["flame-caller"], height: 390, footX: 0.48 },
  "obsidian-guard": { url: ENEMY_PAINTINGS["obsidian-guard"], height: 430, footX: 0.6 },
  "cinder-tyrant": { url: ENEMY_PAINTINGS["cinder-tyrant"], height: 540, footX: 0.5 },
  "frost-wolf": { url: ENEMY_PAINTINGS["frost-wolf"], height: 310, footX: 0.34 },
  "ice-golem": { url: ENEMY_PAINTINGS["ice-golem"], height: 420, footX: 0.5 },
  "rime-witch": { url: ENEMY_PAINTINGS["rime-witch"], height: 380, footX: 0.38 },
  "frost-warden": { url: ENEMY_PAINTINGS["frost-warden"], height: 440, footX: 0.5 },
  "rime-warden": { url: ENEMY_PAINTINGS["rime-warden"], height: 540, footX: 0.46 },
  "storm-sprite": { url: ENEMY_PAINTINGS["storm-sprite"], height: 320, footX: 0.45 },
  "thunder-brute": { url: ENEMY_PAINTINGS["thunder-brute"], height: 440, footX: 0.5 },
  "storm-caller": { url: ENEMY_PAINTINGS["storm-caller"], height: 390, footX: 0.56 },
  "static-golem": { url: ENEMY_PAINTINGS["static-golem"], height: 400, footX: 0.42 },
  "storm-herald": { url: ENEMY_PAINTINGS["storm-herald"], height: 540, footX: 0.5 },
  // Kaelen's straw man from the Camp: the class select's sparring partner.
  "training-dummy": { url: trainingDummyUrl, height: 360, footX: 0.53 },
};

/** The painting for this enemy, or null: it is drawn as its archetype body then. */
export function loadEnemyTexture(look: EnemyLook): Promise<Texture | null> {
  const id = look.thief ? "ember-thief" : look.id;
  const painted = id ? PAINTED_ENEMIES[id] : undefined;
  if (!painted) return Promise.resolve(null);
  return Assets.load<Texture>(painted.url).catch(() => null);
}

export function drawEnemy(look: EnemyLook, painting?: Texture | null): Container {
  const id = look.thief ? "ember-thief" : look.id;
  const painted = id ? PAINTED_ENEMIES[id] : undefined;
  if (painted && painting) {
    const c = new Container();
    const sprite = new Sprite(painting);
    sprite.anchor.set(painted.footX, 1);
    sprite.scale.set(painted.height / painting.height);
    c.addChild(sprite);
    return c;
  }
  const c = new Container();
  const line = { color: INK, width: 3, join: "round" as const, cap: "round" as const };
  const fallback = { body: 0, trim: 0, head: 0 };
  const col =
    ACT_COLORS[look.act]?.[look.archetype] ??
    ENEMY_COLORS[look.archetype] ??
    ROTWOOD_COLORS[look.archetype] ??
    fallback;
  const body = BODY[look.archetype] ?? "broad";
  const scale = look.boss ? 1.1 : body === "broad" ? 1 : 0.86;
  if (body === "robe") {
    c.addChild(
      new Graphics()
        .moveTo(-80, -150)
        .lineTo(-40, -330)
        .lineTo(40, -330)
        .lineTo(80, -150)
        .closePath()
        .fill(col.body)
        .stroke(line),
      new Graphics().circle(0, -368, 40).fill(col.head).stroke(line),
      new Graphics()
        .moveTo(-44, -380)
        .lineTo(0, -450)
        .lineTo(44, -380)
        .closePath()
        .fill(col.body)
        .stroke(line),
      new Graphics()
        .moveTo(-90, -200)
        .lineTo(-140, -340)
        .stroke({ color: 0x5e4a36, width: 7, cap: "round" }),
      new Graphics().circle(-142, -346, 13).fill(col.trim).stroke(line),
    );
    if (look.archetype === "harvester") {
      // A scythe instead of a staff, and two ember eyes in the hood.
      c.addChild(
        new Graphics()
          .moveTo(-150, -120)
          .lineTo(-150, -500)
          .stroke({ color: 0x3a2a1e, width: 10, cap: "round" }),
        new Graphics()
          .moveTo(-150, -500)
          .quadraticCurveTo(-60, -540, 10, -470)
          .quadraticCurveTo(-70, -500, -150, -470)
          .closePath()
          .fill(0xd8d4cc)
          .stroke(line),
        new Graphics().circle(-14, -372, 6).fill(col.trim),
        new Graphics().circle(14, -372, 6).fill(col.trim),
      );
      if (look.act > 7) {
        // The Core (The Last Ember): the last flame burns in its chest.
        c.addChild(
          new Graphics().circle(0, -245, 62).fill({ color: 0xff8a1f, alpha: 0.22 }),
          new Graphics().circle(0, -245, 38).fill({ color: 0xffb13b, alpha: 0.45 }),
          new Graphics()
            .moveTo(0, -300)
            .quadraticCurveTo(26, -258, 18, -228)
            .quadraticCurveTo(0, -210, -18, -228)
            .quadraticCurveTo(-26, -258, 0, -300)
            .closePath()
            .fill(0xffd27a)
            .stroke({ color: 0xff8a1f, width: 3 }),
        );
      }
    }
    if (look.archetype === "afflicter") {
      for (const [x, y] of [
        [-30, -300],
        [24, -260],
        [-6, -210],
      ] as const) {
        c.addChild(new Graphics().ellipse(x, y, 9, 13).fill({ color: col.trim, alpha: 0.85 }));
      }
    }
  } else {
    const wide = body === "broad" ? 140 : 100;
    c.addChild(
      new Graphics()
        .moveTo(-wide, -150)
        .bezierCurveTo(-wide - 20, -280, -wide + 30, -360, 0, -360)
        .bezierCurveTo(wide - 30, -360, wide + 20, -280, wide, -150)
        .closePath()
        .fill(col.body)
        .stroke(line),
      new Graphics()
        .moveTo(-wide + 50, -150)
        .lineTo(-wide + 65, -240)
        .lineTo(wide - 65, -240)
        .lineTo(wide - 50, -150)
        .fill(col.trim)
        .stroke(line),
      new Graphics().circle(0, -390, 44).fill(col.head).stroke(line),
      new Graphics()
        .moveTo(-36, -410)
        .lineTo(-18, -400)
        .moveTo(36, -410)
        .lineTo(18, -400)
        .stroke({ color: INK, width: 4 }),
      new Graphics()
        .moveTo(-24, -374)
        .quadraticCurveTo(0, -384, 24, -374)
        .stroke({ color: INK, width: 4 }),
    );
    if (look.archetype === "thornback") {
      // Thorns along the back and the shoulders.
      for (const [x, y, r] of [
        [-120, -300, -0.9],
        [-80, -350, -0.5],
        [-20, -372, -0.1],
        [40, -366, 0.3],
        [100, -330, 0.7],
        [136, -270, 1.1],
      ] as const) {
        const tip = { x: x + Math.sin(r) * 46, y: y - Math.cos(r) * 46 };
        c.addChild(
          new Graphics()
            .poly([x - 12, y + 6, tip.x, tip.y, x + 12, y + 6])
            .fill(col.trim)
            .stroke(line),
        );
      }
    }
    if (look.archetype === "warden") {
      c.addChild(
        new Graphics()
          .moveTo(-wide - 30, -120)
          .lineTo(-wide - 30, -470)
          .stroke({ color: 0x5e4a36, width: 10, cap: "round" }),
        new Graphics()
          .circle(-wide - 30, -480, 18)
          .fill(col.trim)
          .stroke(line),
        new Graphics()
          .ellipse(-wide + 10, -230, 46, 58)
          .fill(0x4a3c29)
          .stroke(line),
        new Graphics()
          .ellipse(-wide + 10, -230, 22, 30)
          .fill(col.trim)
          .stroke(line),
      );
    } else if (look.archetype === "brute" || look.archetype === "thornback") {
      c.addChild(
        new Graphics().ellipse(-wide, -260, 42, 34).fill(col.head).stroke(line),
        new Graphics()
          .moveTo(-wide, -260)
          .lineTo(-wide - 60, -310)
          .stroke({ color: INK, width: 16, cap: "round" }),
        new Graphics()
          .moveTo(-wide, -260)
          .lineTo(-wide - 60, -310)
          .stroke({ color: 0x7a5a24, width: 10, cap: "round" }),
        new Graphics()
          .roundRect(-wide - 120, -360, 80, 60, 8)
          .fill(0x4a4a4e)
          .stroke(line),
      );
    } else {
      for (const dy of [0, 40]) {
        c.addChild(
          new Graphics()
            .moveTo(-wide + 10, -250 + dy)
            .lineTo(-wide - 70, -320 + dy)
            .stroke({ color: INK, width: 8, cap: "round" }),
          new Graphics()
            .moveTo(-wide + 10, -250 + dy)
            .lineTo(-wide - 70, -320 + dy)
            .stroke({ color: 0xd8d4cc, width: 4, cap: "round" }),
        );
      }
    }
  }
  if (look.thief) {
    const sack = new Container();
    sack.addChild(
      new Graphics().circle(84, -330, 70).fill({ color: 0xffb13b, alpha: 0.3 }),
      new Graphics().ellipse(84, -320, 54, 60).fill(0xc9954a).stroke(line),
      new Graphics()
        .moveTo(64, -380)
        .lineTo(104, -380)
        .stroke({ color: INK, width: 5, cap: "round" }),
      new Graphics().circle(70, -392, 10).fill(0xffd84a).stroke(line),
      new Graphics().circle(96, -396, 9).fill(0xffd84a).stroke(line),
    );
    c.addChildAt(sack, 0);
  }
  if (look.boss && look.archetype !== "harvester") {
    c.addChild(
      new Graphics()
        .poly([-40, -430, -30, -470, -12, -446, 0, -480, 12, -446, 30, -470, 40, -430])
        .fill(0xff8a1f)
        .stroke(line),
    );
  }
  c.scale.set(scale);
  c.y = 150 * scale;
  return c;
}
