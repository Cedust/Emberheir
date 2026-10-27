import type { StoryBlip as BlipId } from "@emberheir/sim";
import { Dialog } from "../ui/kit/Dialog";
import { WindowLayer } from "../ui/kit/Window";
import { PersonaPortrait } from "./camp/art/PersonaArt";

/**
 * Story Blips (camp-personas-freischalten-v1.md): a persona met on the road, in one short scene.
 * Light humor, one line, one answer; then they are gone (or in the Camp).
 */
const BLIPS: Readonly<
  Record<
    BlipId,
    { persona: string; name: string; role: string; line: string; answer: string; fx: string }
  >
> = {
  kaelen: {
    persona: "kaelen",
    name: "Kaelen",
    role: "Trainer",
    line: "“I was on my way. The battle was just faster. That stance is sloppy. Good. Sloppy can be trained.”",
    answer: "See you at the fire.",
    fx: "dust",
  },
  "marisha-1": {
    persona: "marisha",
    name: "Marisha",
    role: "Black Market",
    line: "“A customer! A living one! Don’t mind the chest, it doesn’t close anymore. Acorns only.”",
    answer: "Show me.",
    fx: "coins",
  },
  "marisha-2": {
    persona: "marisha",
    name: "Marisha",
    role: "Black Market",
    line: "“You again. Either you’re lucky or you’re following me. Don’t touch the lid. It bites.”",
    answer: "Show me.",
    fx: "coins",
  },
  "marisha-3": {
    persona: "marisha",
    name: "Marisha",
    role: "Black Market",
    line: "“Fine. Your fire is warm and my feet are cold. I’m coming along. My prices stay. Mostly.”",
    answer: "Welcome to the caravan.",
    fx: "coins",
  },
  liora: {
    persona: "liora",
    name: "Liora",
    role: "Mystic",
    line: "“I foresaw this. I also foresaw you needing me. And paying me.”",
    answer: "Welcome to the caravan.",
    fx: "moon",
  },
  nyssa: {
    persona: "nyssa",
    name: "Nyssa",
    role: "Runesmith",
    line: "“These runes are older than the Harvester. Want to know more? No? I’m coming anyway.”",
    answer: "Welcome to the caravan.",
    fx: "runes",
  },
  "liora-draughts": {
    persona: "liora",
    name: "Liora",
    role: "Mystic",
    line: "“I foresaw a thirsty Heir. I brew Iron, Ward and Vigor now. Your Flask pays a charge, your purse pays Acorns.”",
    answer: "Pour me one.",
    fx: "moon",
  },
};

export function StoryBlipDialog(props: { blip: BlipId; onDone: () => void }) {
  const blip = BLIPS[props.blip];
  return (
    <WindowLayer>
      <div className={`blip-stage blip-${blip.fx}`} key={props.blip}>
        <span className="blip-fx" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </span>
        <Dialog
          name={blip.name}
          role={blip.role}
          label={`${blip.name}, ${blip.role}`}
          portrait={<PersonaPortrait id={blip.persona} />}
          answers={[{ label: blip.answer, onPick: props.onDone }]}
        >
          {blip.line}
        </Dialog>
      </div>
    </WindowLayer>
  );
}
