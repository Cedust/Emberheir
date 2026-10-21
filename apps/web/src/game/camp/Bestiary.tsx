import { GAME_DATA } from "@emberheir/content";
import { type EnemyDefinition, type GameState } from "@emberheir/sim";
import { useState } from "react";
import { EnemyPortrait } from "../../ui/EnemyPortrait";
import { TrailMark } from "../../ui/TrailMark";
import {
  BOSS_TRAIL_TEXT,
  TRAIL_NAMES,
  TRAIL_NUMERALS,
  TRAIL_TEXT,
  bestiary,
  huntView,
  trailTitle,
} from "../hunts";
import { actVisible } from "../labels";

/**
 * The Bestiary at the Hearthfire (hunts-entwurf-v1.md): every enemy by act with its Trail. An
 * enemy not tracked yet is a shadow; acts beyond the road stay off the page.
 */
export function Bestiary(props: { state: GameState }) {
  const { state } = props;
  const rows = bestiary().filter(
    (r) =>
      r.number === 0 ||
      actVisible(state, GAME_DATA.acts.find((a) => a.number === r.number)?.id ?? ""),
  );
  const first = rows.flatMap((r) => r.enemies).find((e) => huntView(state, e.id).tier > 0);
  const [sel, setSel] = useState<string | undefined>(first?.id);
  const enemy = rows.flatMap((r) => r.enemies).find((e) => e.id === sel);
  return (
    <div className="trophy-layout bestiary" data-testid="bestiary">
      <div className="trophy-wall" aria-label="Bestiary">
        {rows.map((r) => (
          <div key={r.act} className="trophy-row">
            <span className="trophy-boss title-font">{r.act}</span>
            <div className="trophy-items">
              {r.enemies.map((e) => {
                const hunt = huntView(state, e.id);
                const known = hunt.tier > 0;
                return (
                  <button
                    key={e.id}
                    type="button"
                    className={`bestiary-face trail-${hunt.tier}${sel === e.id ? " on" : ""}`}
                    aria-label={known ? e.name : "Not tracked yet"}
                    title={known ? `${e.name} · ${trailTitle(hunt.tier)}` : "???"}
                    data-testid={`bestiary-${e.id}`}
                    onClick={() => setSel(e.id)}
                  >
                    <EnemyPortrait enemyId={e.id} size={58} hidden={!known} />
                    <TrailMark tier={hunt.tier} size={32} className="badge" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <aside className="trophy-side">{enemy && <BestiaryPage state={state} enemy={enemy} />}</aside>
    </div>
  );
}

function BestiaryPage(props: { state: GameState; enemy: EnemyDefinition }) {
  const { enemy } = props;
  const hunt = huntView(props.state, enemy.id);
  const known = hunt.tier > 0;
  const text = hunt.boss ? BOSS_TRAIL_TEXT : TRAIL_TEXT;
  return (
    <section className="panel-card trophy-detail bestiary-page">
      <span className="eyebrow">{trailTitle(hunt.tier).toUpperCase()}</span>
      <span className="bestiary-head">
        <EnemyPortrait enemyId={enemy.id} size={86} hidden={!known} />
        <span>
          <span className="title-font trophy-name">{known ? enemy.name : "???"}</span>
          <span className="sub small">
            {hunt.kills}
            {hunt.next !== undefined ? ` / ${hunt.next}` : ""} {hunt.boss ? "wins" : "kills"}
          </span>
        </span>
      </span>
      {known && <p className="sub small">{enemy.description}</p>}
      {hunt.affixes.length > 0 && (
        <p className="small">
          <b>Hunt Affixes:</b> {hunt.affixes.join(", ")}
        </p>
      )}
      <ol className="bestiary-trails">
        {[1, 2, 3, 4].map((t) => (
          <li key={t} className={t <= hunt.tier ? "on" : ""}>
            <TrailMark tier={t <= hunt.tier ? t : 0} size={28} />
            <span>
              <b>
                {TRAIL_NUMERALS[t]} · {TRAIL_NAMES[t]}
              </b>{" "}
              <span className="sub">({hunt.scale[t - 1]})</span> {text[t]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
