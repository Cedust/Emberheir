import { GAME_DATA } from "@emberheir/content";
import { type GameState, masteryPointsLeft, respecAcorns, spentInTree } from "@emberheir/sim";
import { Suspense, useState } from "react";
import {
  type TabItem,
  Medallion,
  Tabs,
  Window,
  WindowHeader,
  WindowLayer,
} from "../../ui/kit/Window";
import { HoldButton } from "../../ui/kit/Button";
import { CurrencyChip, Price } from "../../ui/kit/Currency";
import { useNoteHover } from "../../ui/ItemTooltip";
import type { GameApi } from "../useGame";
import { MasteryTab, SkillTreeTab } from "../lazyViews";
import { PersonaPortrait } from "./art/PersonaArt";
import { PaintDefs } from "./art/paint";
import { BattlePlanTab } from "./BattlePlanTab";

/**
 * Kaelen (Trainer mock): the Skill Tree with pending nodes (Confirm / Undo) and the Battle
 * Plan. During a run the T key opens the tree view only.
 */
export function KaelenView(props: {
  state: GameState;
  game: GameApi;
  /** The Skill Tree is view-only (during a run). */
  viewOnly: boolean;
  /** The Battle Plan can be changed (Camp and between stages, not mid-fight). */
  planEditable?: boolean;
  initialTab?: "tree" | "plan" | "mastery";
  onClose: () => void;
}) {
  const { state, game, viewOnly } = props;
  const planEditable = props.planEditable ?? !viewOnly;
  const [tab, setTab] = useState<"tree" | "plan" | "mastery">(props.initialTab ?? "tree");
  const spent = spentInTree(GAME_DATA, state.hero.learned, state.hero.classId);
  const respecPrice = respecAcorns(state.legacy.prestige);
  const tabs: TabItem<typeof tab>[] = [
    { id: "tree", name: "Skill Tree", icon: "tree" },
    { id: "mastery", name: "Weapon Mastery", icon: "sword" },
    ...(planEditable
      ? [{ id: "plan" as const, name: "Battle Plan", icon: "strike" as const }]
      : []),
  ];

  // On the road the tree is a window over the arena; at Kaelen it needs the whole stage.
  const mode = viewOnly ? "panel" : "full";
  return (
    <WindowLayer mode={mode}>
      <PaintDefs />
      <Window
        label="Kaelen"
        role="dialog"
        mode={mode}
        className="kaelen"
        header={
          <WindowHeader
            title="Kaelen"
            sub="Trainer"
            medallion={
              <Medallion tint="#6a2a20">
                <PersonaPortrait id="kaelen" />
              </Medallion>
            }
            tabs={<Tabs label="Trainer" items={tabs} active={tab} onChange={setTab} />}
            right={
              <>
                <div className="wallet-row small-wallet k-wallet">
                  <PointChip
                    testId="skill-points"
                    value={state.hero.unspentSkillPoints}
                    name="Skill Points"
                    explain="Learn nodes in the Skill Tree. You earn them at Waymarks on the road."
                  />
                  <PointChip
                    value={masteryPointsLeft(state, GAME_DATA)}
                    name="Mastery Points"
                    explain="Spend them in your weapon's Mastery tree. Weapon Ranks give more."
                  />
                  <CurrencyChip id="acorns" amount={state.wallet.acorns} />
                </div>
                {!viewOnly && (tab === "tree" || tab === "plan") && (
                  <HoldButton
                    icon="cycle"
                    blocked={
                      spent === 0
                        ? "Nothing learned yet"
                        : state.wallet.acorns < respecPrice
                          ? "Not enough Acorns"
                          : null
                    }
                    tip={{
                      name: "Respec",
                      kind: "Hold to confirm",
                      explain: "All Skill Points come back. The Battle Plan resets.",
                    }}
                    onConfirm={() => game.dispatch({ type: "respecTree" })}
                  >
                    Respec · <Price id="acorns" amount={respecPrice} />
                  </HoldButton>
                )}
              </>
            }
            onClose={props.onClose}
          />
        }
      >
        <Suspense fallback={null}>
          {tab === "mastery" ? (
            <MasteryTab state={state} game={game} viewOnly={viewOnly} />
          ) : tab === "tree" || !planEditable ? (
            <SkillTreeTab state={state} game={game} viewOnly={viewOnly} />
          ) : (
            <BattlePlanTab state={state} game={game} />
          )}
        </Suspense>
      </Window>
    </WindowLayer>
  );
}

/** Unspent points in the header, explained on hover. */
function PointChip(props: { value: number; name: string; explain: string; testId?: string }) {
  const hover = useNoteHover({
    name: props.name,
    kind: "Points",
    explain: props.explain,
    status: `${props.value} left to spend`,
  });
  return (
    <span className="k-currency" data-testid={props.testId} tabIndex={0} {...hover}>
      <b className="mono">{props.value}</b> <span className="sub">{props.name}</span>
    </span>
  );
}
