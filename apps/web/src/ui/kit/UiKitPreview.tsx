import { GAME_DATA } from "@emberheir/content";
import { type GameState, newGame } from "@emberheir/sim";
import { useState } from "react";
import campUrl from "../../assets/camp/camp-ashen-fields.webp";
import { PersonaPortrait } from "../../game/camp/art/PersonaArt";
import { PaintDefs } from "../../game/camp/art/paint";
import { ItemHoverLayer } from "../ItemTooltip";
import { ItemTile } from "../items";
import { Paperdoll, dollBox } from "../Paperdoll";
import { Stage } from "../Stage";
import { useSettings } from "../settings";
import { Button, HoldButton, IconButton, KeyHint } from "./Button";
import { Cost, Wallet } from "./Currency";
import { Dialog } from "./Dialog";
import { HOTKEYS } from "./hotkeys";
import { EmptyState, Marker } from "./Marker";
import { Medallion, type TabItem, Tabs, Window, WindowHeader } from "./Window";

/**
 * `?uikit`: every UI kit piece on one page, for Timo to judge the look before the screens move
 * over (ui-ux-plan-v1.md step 1). Not part of the game.
 */
export function UiKitPreview() {
  const settings = useSettings();
  const [state] = useState(demoState);
  const [page, setPage] = useState<Page>("window");
  const theme = settings.settings.theme;
  return (
    <Stage>
      <PaintDefs />
      <ItemHoverLayer state={state}>
        <div className="kit-preview">
          <Window
            label="UI Kit"
            mode="full"
            header={
              <WindowHeader
                title="UI Kit"
                sub="Preview · ui-ux-plan-v1"
                medallion={<Medallion icon="fire" />}
                tabs={<Tabs label="Kit pages" items={PAGES} active={page} onChange={setPage} />}
                right={
                  <Button
                    variant="ghost"
                    onClick={() => settings.update({ theme: theme === "dark" ? "light" : "dark" })}
                    tip={{
                      name: "Theme",
                      kind: "",
                      explain: "Aged Parchment or Scorched Parchment.",
                    }}
                  >
                    {theme === "dark" ? "Scorched" : "Parchment"}
                  </Button>
                }
              />
            }
          >
            <div className="kit-page">
              {page === "window" && <WindowPage state={state} />}
              {page === "buttons" && <ButtonsPage state={state} />}
              {page === "dialog" && <DialogPage />}
              {page === "keys" && <KeysPage />}
            </div>
          </Window>
        </div>
      </ItemHoverLayer>
    </Stage>
  );
}

/** The Camp stays visible, dimmed, behind every window (ui-ux-plan-v1.md 3.2). */
const DIM = "linear-gradient(rgb(14 10 6 / 0.6), rgb(14 10 6 / 0.6))";

type Page = "window" | "buttons" | "dialog" | "keys";

const PAGES: readonly TabItem<Page>[] = [
  { id: "window", name: "Window", icon: "box" },
  { id: "buttons", name: "Buttons", icon: "strike", marker: 3 },
  { id: "dialog", name: "Dialog", icon: "nan", marker: "!" },
  { id: "keys", name: "Keys", icon: "menu" },
];

function demoState(): GameState {
  const base = newGame(GAME_DATA, { seed: 1, classId: "warrior" });
  return {
    ...base,
    wallet: {
      ...base.wallet,
      acorns: 1456,
      ash: 380,
      emberCoal: 6,
      phoenixFeathers: 1,
      runes: { ash: 3 },
      cinderglass: 2,
    },
  };
}

/** A persona window over the dimmed Camp: persona left, workbench, bag right. */
function WindowPage(props: { state: GameState }) {
  const [tab, setTab] = useState<"upgrade" | "reforge" | "salvage">("upgrade");
  const short = props.state.wallet.phoenixFeathers < 2;
  return (
    <div className="kit-dim" style={{ backgroundImage: `${DIM}, url(${campUrl})` }}>
      <Window
        label="Thoric, Blacksmith"
        className="kit-demo-window"
        header={
          <WindowHeader
            title="Thoric"
            sub="Blacksmith"
            medallion={
              <span className="k-medallion" style={{ background: "#4a4a4e" }}>
                <PersonaPortrait id="thoric" />
              </span>
            }
            tabs={
              <Tabs
                label="Forge"
                keys={false}
                items={[
                  { id: "upgrade", name: "Upgrade", icon: "hammer" },
                  { id: "reforge", name: "Reforge", icon: "fire" },
                  { id: "salvage", name: "Salvage", icon: "box" },
                ]}
                active={tab}
                onChange={setTab}
              />
            }
            right={<Wallet state={props.state} only={["acorns", "ash", "coal", "feathers"]} />}
            onClose={() => undefined}
          />
        }
      >
        <div className="kit-row-body">
          <aside className="kit-col kit-left">
            <p className="kit-quote">
              &ldquo;Bring it here. If it&rsquo;s bent, I straighten it. If it&rsquo;s broken, I
              charge extra.&rdquo;
            </p>
          </aside>
          <main className="kit-col kit-center">
            <EmptyState icon="hammer">Right-click an item to lay it on the anvil.</EmptyState>
            <div className="kit-cost-bar">
              <Cost
                parts={[
                  { id: "acorns", amount: 60, have: props.state.wallet.acorns },
                  { id: "feathers", amount: 2, have: props.state.wallet.phoenixFeathers },
                ]}
              />
              <div className="k-grow" />
              <Button variant="secondary">Undo</Button>
              <Button variant="primary" big blocked={short ? "Needs 2 Phoenix Feathers" : null}>
                Upgrade
              </Button>
            </div>
          </main>
          <aside className="kit-col kit-right">
            <Paperdoll scale={0.62}>
              {(
                [
                  "charm",
                  "helm",
                  "amulet",
                  "body",
                  "offHand",
                  "gloves",
                  "ring1",
                  "belt",
                  "ring2",
                  "boots",
                ] as const
              ).map((slot) => {
                const b = dollBox(slot, 0.62);
                return (
                  <div key={slot} className="doll-slot" style={{ left: b.x, top: b.y }}>
                    <ItemTile item={undefined} label={SLOT_LABEL[slot]} width={b.w} height={b.h} />
                  </div>
                );
              })}
            </Paperdoll>
            <EmptyState icon="box">Your bag is empty.</EmptyState>
          </aside>
        </div>
      </Window>
    </div>
  );
}

const SLOT_LABEL = {
  charm: "Charm",
  helm: "Helm",
  amulet: "Amulet",
  body: "Body Armor",
  offHand: "Off Hand",
  gloves: "Gloves",
  ring1: "Ring",
  belt: "Belt",
  ring2: "Ring",
  boots: "Boots",
} as const;

function ButtonsPage(props: { state: GameState }) {
  const [held, setHeld] = useState(0);
  return (
    <div className="kit-sheet">
      <section className="kit-row">
        <span className="kit-label">Primary · one per screen</span>
        <Button variant="primary" big hotkey="Space">
          Set Out
        </Button>
        <Button variant="primary">Confirm</Button>
        <Button variant="primary" blocked="Not enough Ash">
          Upgrade
        </Button>
      </section>
      <section className="kit-row">
        <span className="kit-label">Secondary</span>
        <Button icon="user" hotkey={HOTKEYS.character}>
          Character
        </Button>
        <Button icon="tree" hotkey={HOTKEYS.tree}>
          Skill Tree
        </Button>
        <Button>Undo</Button>
        <Button variant="ghost">Sort</Button>
      </section>
      <section className="kit-row">
        <span className="kit-label">Hold to confirm</span>
        <HoldButton
          onConfirm={() => setHeld((n) => n + 1)}
          tip={{ name: "Salvage", kind: "Hold to confirm", explain: "Breaks the item into Ash." }}
        >
          Salvage
        </HoldButton>
        <HoldButton onConfirm={() => undefined} blocked="Nothing learned yet">
          Respec
        </HoldButton>
        <span className="sub">Confirmed {held}×</span>
      </section>
      <section className="kit-row">
        <span className="kit-label">Icon buttons</span>
        <div className="kit-wood">
          <IconButton icon="menu" label="Menu" hotkey={HOTKEYS.close} onClick={() => undefined} />
          <IconButton icon="close" label="Close" hotkey={HOTKEYS.close} onClick={() => undefined} />
        </div>
      </section>
      <section className="kit-row">
        <span className="kit-label">Wallet · hover a coin</span>
        <Wallet state={props.state} extra={[{ id: "flask", amount: "3/3" }]} />
      </section>
      <section className="kit-row">
        <span className="kit-label">Price</span>
        <Cost
          parts={[
            { id: "acorns", amount: 25, have: 1456 },
            { id: "ash", amount: 400, have: 380 },
          ]}
        />
      </section>
      <section className="kit-row">
        <span className="kit-label">Markers</span>
        <Marker value={3} />
        <Marker value="!" />
      </section>
      <section className="kit-row">
        <span className="kit-label">Empty slots</span>
        {(["Helm", "Body Armor", "Gloves", "Ring", "Charm", "Boots"] as const).map((l) => (
          <ItemTile key={l} item={undefined} label={l} size={64} />
        ))}
      </section>
    </div>
  );
}

function DialogPage() {
  const [said, setSaid] = useState("Sit, child. The fire remembers every one of you.");
  return (
    <div className="kit-dim kit-dialog-page" style={{ backgroundImage: `${DIM}, url(${campUrl})` }}>
      <Dialog
        name="Old Nan"
        role="Hearthkeeper"
        portrait={<PersonaPortrait id="nan" />}
        answers={[
          { label: "Compendium", onPick: () => setSaid("Read slowly. The fire is patient.") },
          {
            label: "Trigger Codex",
            onPick: () => setSaid("Every trigger you learned is in here."),
          },
          {
            label: "Ember Flask",
            note: "3/3",
            onPick: () => setSaid("Full. Drink when it hurts."),
          },
          { label: "Reset", note: "Acorns", onPick: () => setSaid("Forget, then choose again.") },
        ]}
      >
        {said}
      </Dialog>
    </div>
  );
}

const KEY_ROWS: readonly [string, string][] = [
  [HOTKEYS.close, "Close the window on top · Menu"],
  [HOTKEYS.character, "Character"],
  [HOTKEYS.inventory, "Character (bag)"],
  [HOTKEYS.tree, "Skill Tree (Kaelen)"],
  [HOTKEYS.plan, "Battle Plan"],
  [HOTKEYS.legacy, "Legacy (Camp)"],
  [`${HOTKEYS.prevTab} / ${HOTKEYS.nextTab}`, "Previous / next tab"],
  ["1–4", "Answer in a dialogue"],
];

function KeysPage() {
  return (
    <div className="kit-sheet">
      <section className="kit-keys">
        {KEY_ROWS.map(([k, what]) => (
          <div key={k} className="kit-key-row">
            <KeyHint k={k} />
            <span>{what}</span>
          </div>
        ))}
      </section>
      <p className="sub">Try Q and E: they flip the tabs of this page.</p>
    </div>
  );
}
