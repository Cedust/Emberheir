/**
 * The story intro of a new game (docs/design/notes/story-intro-v1.md): the world told over the
 * Ashen Fields at dusk, then Old Nan finds the Heir in the ash and asks who they were. The answer
 * picks the class the class select opens on. Light humor, no game rules in the lines.
 */

/** Where a line is spoken: told over the fields (no one in sight), or by Old Nan at the Heir's side. */
export type IntroScene = "world" | "found";

export interface IntroLine {
  scene: IntroScene;
  text: string;
  /** A moment in the sky behind the line: the star falls, the land burns. */
  sky?: "fall" | "burn";
}

export const INTRO_LINES: readonly IntroLine[] = [
  { scene: "world", text: "Every world has seasons. This one has harvests." },
  {
    scene: "world",
    sky: "fall",
    text: "Long ago, the Ashen Harvester fell from the sky and liked what it saw: rich soil, busy folk, and plenty to burn.",
  },
  {
    scene: "world",
    sky: "burn",
    text: "So it lets the land grow. And when the land is ripe, it burns it all and feasts on the flames.",
  },
  {
    scene: "world",
    text: "The ash settles. The world grows back, a little stronger every time. The Harvester has never once skipped a harvest.",
  },
  { scene: "world", text: "But the fire always leaves something behind…" },
  {
    scene: "found",
    text: "Oh! This one’s still breathing. Good. The last one I poked just crumbled.",
  },
  {
    scene: "found",
    text: "Easy, dear. You were lying in the ash like a burnt sausage. You can call me Old Nan. Nobody remembers my real name anyway. Not even me.",
  },
  {
    scene: "found",
    text: "My caravan carries the Hearthfire, the last true flame. And after every harvest, the fire leaves an Heir in the ash. Too stubborn to stay dead.",
  },
  { scene: "found", text: "That’s you, dear. So tell me: do you remember who you were?" },
];

/** The Heir's answers to “who were you?”: a memory per class, and one for a blank head. */
export const MEMORIES: readonly { classId: string | null; answer: string; reply: string }[] = [
  {
    classId: "cinderguard",
    answer: "I held the line. Steel in hand.",
    reply: "A Cinderguard! I knew it. Nobody else falls over that loudly.",
  },
  {
    classId: "ashstrider",
    answer: "I never missed. Not once.",
    reply: "An Ashstrider. Sharp eyes, quick feet. You’ll need both out there.",
  },
  {
    classId: "emberseer",
    answer: "The fire spoke to me.",
    reply: "An Emberseer. Well, don’t let it talk you into anything silly.",
  },
  {
    classId: null,
    answer: "I… don’t remember.",
    reply: "Nobody does, the first morning. It’ll come back to you by the fire.",
  },
];

/** Old Nan's last line, whatever the Heir remembered. */
export const LAST_LINE = "Come on, then. The Harvester is waiting, and the soup won’t cook itself.";
