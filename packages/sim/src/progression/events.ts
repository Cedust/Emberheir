/**
 * Events of the act map (act-karte-entwurf-v1.md): a small choice with a price and a reward, like
 * the Omens. No price takes more than half of a layer (Life, the Flask), and every Event can be
 * left for free. Prices and rewards in Acorns, Ash and XP count in normal fights of the stage.
 */
export interface EventCost {
  /** Share of max Life (never the last of it). */
  readonly life?: number;
  /** Ember Flask charges. */
  readonly flask?: number;
  /** Acorns, as many as this many normal fights of the stage drop. */
  readonly acornFights?: number;
  /** Ash, as much as this many normal fights of the stage drop. */
  readonly ashFights?: number;
}

export interface EventGain {
  /** Share of max Life healed. */
  readonly life?: number;
  /** Ember Flask charges, up to the Flask's capacity. */
  readonly flask?: number;
  /** One Rune, this many ranks above what the act drops. */
  readonly rune?: number;
  /** An item pick (1 of 3), like a fight's. */
  readonly items?: boolean;
  /** XP of this many normal fights of the stage. */
  readonly xpFights?: number;
  readonly emberCoal?: number;
  /** A Shrine's offer: 1 of 3 Boons. */
  readonly boons?: boolean;
  /** The next fight on the map is a sure Elite with one more pick. */
  readonly challenge?: boolean;
  /** The next item pick holds one card of at least Rare. */
  readonly lucky?: boolean;
}

export interface EventOption {
  readonly id: string;
  /** The button, e.g. "Sacrifice". */
  readonly label: string;
  /** What happens, in one sentence. */
  readonly text: string;
  readonly cost?: EventCost;
  readonly gain?: EventGain;
  /** A chance to lose this share of max Life on top (never the last of it). */
  readonly risk?: { readonly chance: number; readonly life: number };
  /** Enemies deal this much more damage until the next Waymark. */
  readonly curse?: { readonly damage: number };
}

export interface EventDefinition {
  readonly id: string;
  readonly name: string;
  /** The scene in one or two sentences. */
  readonly text: string;
  readonly options: readonly EventOption[];
  /** Gives Boons: only where Shrines burn (not on walks past the Gate, not in cleared acts). */
  readonly shrine?: boolean;
}
