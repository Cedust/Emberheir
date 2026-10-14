import { GAME_DATA } from "@emberheir/content";
import {
  DUMMY_PROFILES,
  type DummyProfile,
  type GameState,
  type Item,
  equipBlockReason,
  gearDelta,
  trainingDummy,
} from "@emberheir/sim";
import { useMemo, useState } from "react";
import { ItemTile, fmt } from "../../ui/items";
import type { GameApi } from "../useGame";

/**
 * Kaelen's practice ground (neuausrichtung-v1.md 9): the hero fights a straw man, the numbers
 * show what the build does. Items from the bag and the Supply Wagon can be put on right here; the
 * numbers jump at once, with an arrow against the item worn now. No respec here: that stays at
 * Kaelen's other tabs, for Acorns.
 */

const PROFILE_TEXT: Record<DummyProfile, { name: string; text: string }> = {
  plain: { name: "Straw Man", text: "No defenses: your raw damage." },
  boss: {
    name: "Boss Hide",
    text: "Armor and Resistances of the next act's boss. It does not hit back.",
  },
  striking: {
    name: "Striking",
    text: "The next act's boss, hitting back: damage taken against your healing.",
  },
};

const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %`;

export function TrainingDummyTab(props: { state: GameState; game: GameApi }) {
  const { state, game } = props;
  const [profile, setProfile] = useState<DummyProfile>("boss");
  const report = useMemo(() => trainingDummy(state, GAME_DATA, profile), [state, profile]);
  const items = [...state.inventory, ...state.stash].map((p) => p.item);
  const top = report.sources.slice(0, 6);
  return (
    <div className="dummy-tab">
      <div className="dummy-head">
        <h2 className="title-font">TRAINING DUMMY</h2>
        <div className="route-options" role="radiogroup" aria-label="Dummy">
          {DUMMY_PROFILES.map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={p === profile}
              className={`route-option title-font${p === profile ? " chosen" : ""}`}
              title={PROFILE_TEXT[p].text}
              onClick={() => setProfile(p)}
            >
              {PROFILE_TEXT[p].name}
            </button>
          ))}
        </div>
        <span className="sub">{PROFILE_TEXT[profile].text}</span>
      </div>
      <div className="dummy-body">
        <section className="panel-card dummy-numbers" aria-label="Dummy numbers">
          <div className="dummy-dps">
            <b className="mono" data-testid="dummy-dps">
              {fmt(report.dps)}
            </b>
            <span className="sub">damage per second</span>
          </div>
          <ul className="dummy-sources">
            {top.map((s) => (
              <li key={s.source}>
                <span>{s.source}</span>
                <span className="mono">{fmt(s.dps)}/s</span>
              </li>
            ))}
          </ul>
          <ul className="dummy-sources">
            <li>
              <span>Heat spent</span>
              <span className="mono">{report.heatPerSecond.toFixed(1)}/s</span>
            </li>
            <li>
              <span>Triggers</span>
              <span className="mono">{report.triggersPerMinute.toFixed(0)}/min</span>
            </li>
            <li>
              <span>Crits</span>
              <span className="mono">{Math.round(report.critRate * 100)} %</span>
            </li>
            <li>
              <span>Glancing Blows</span>
              <span className="mono">{Math.round(report.glancingRate * 100)} %</span>
            </li>
            <li>
              <span>Mighty Hits</span>
              <span className="mono">{Math.round(report.mightyRate * 100)} %</span>
            </li>
            {profile === "striking" && (
              <>
                <li>
                  <span>Damage taken</span>
                  <span className="mono">{fmt(report.takenPerSecond)}/s</span>
                </li>
                <li>
                  <span>Healing</span>
                  <span className="mono">{fmt(report.healedPerSecond)}/s</span>
                </li>
              </>
            )}
          </ul>
        </section>
        <section className="panel-card dummy-items" aria-label="Try on">
          <span className="eyebrow">Try on · from the bag and the Supply Wagon</span>
          {items.length === 0 && <span className="sub">Nothing to try on.</span>}
          <div className="dummy-item-list">
            {items.slice(0, 12).map((item) => (
              <DummyItem key={item.id} state={state} game={game} item={item} profile={profile} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DummyItem(props: { state: GameState; game: GameApi; item: Item; profile: DummyProfile }) {
  const { state, game, item, profile } = props;
  const delta = useMemo(() => gearDelta(state, GAME_DATA, item, profile), [state, item, profile]);
  const fromStash = state.stash.some((p) => p.item.id === item.id);
  const blocked = equipBlockReason(state, GAME_DATA, item, fromStash ? "stash" : "inventory");
  return (
    <div className="dummy-item">
      <ItemTile item={item} label="Item" size={52} equipped={false} />
      <div className="dummy-item-delta">
        <span className={`mono ${delta && delta.dps >= 0 ? "better" : "worse"}`}>
          {delta ? `${pct(delta.dps)} DPS` : "–"}
        </span>
        <span className={`mono small ${delta && delta.life >= 0 ? "better" : "worse"}`}>
          {delta ? `${pct(delta.life)} Life` : ""}
        </span>
      </div>
      <button
        type="button"
        className="btn"
        disabled={!!blocked}
        title={blocked ? `Cannot wear it: ${blocked}` : "Put it on: the numbers update at once"}
        onClick={() => game.dispatch({ type: "equip", itemId: item.id })}
      >
        Wear
      </button>
    </div>
  );
}
