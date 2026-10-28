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
import { PointChip } from "../../ui/kit/Points";
import { ActionIcon } from "../../ui/actionIcons";
import battlePlanUrl from "../../assets/harvest/battle-plan.webp";
import type { GameApi } from "../useGame";
import { MasteryTab, SkillTreeTab } from "../lazyViews";
import { PersonaPortrait } from "./art/PersonaArt";
import { PaintDefs } from "./art/paint";
import { BattlePlanTab } from "./BattlePlanTab";

/**
 * Kaelen (Trainer mock): the Ash Tree with pending nodes (Confirm / Undo) and the Battle
 * Plan. During a run the T key opens the tree view only.
 */
export function KaelenView(props: {
  state: GameState;
  game: GameApi;
  /** The Ash Tree is view-only (during a run). */
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
    { id: "tree", name: "Ash Tree", art: <ActionIcon id="ash-tree" /> },
    { id: "mastery", name: "Heirloom", art: <ActionIcon id="heirloom" /> },
    ...(planEditable
      ? [
          {
            id: "plan" as const,
            name: "Battle Plan",
            art: <img src={battlePlanUrl} width={40} alt="" draggable={false} />,
          },
        ]
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
                    id="skill"
                    testId="skill-points"
                    value={state.hero.unspentSkillPoints}
                    glow
                  />
                  <PointChip id="heirloom" value={masteryPointsLeft(state, GAME_DATA)} glow />
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
