import type { GameState } from "@emberheir/sim";
import { Icon, type IconName } from "../../ui/Icon";

const RING: { slot: string; icon: IconName }[] = [
  { slot: "Helm", icon: "helm" },
  { slot: "Amulet", icon: "amulet" },
  { slot: "Body Armor", icon: "armor" },
  { slot: "Gloves", icon: "gloves" },
  { slot: "Belt", icon: "belt" },
  { slot: "Boots", icon: "boots" },
  { slot: "Ring", icon: "ring" },
  { slot: "Ring", icon: "ring" },
  { slot: "Off Hand", icon: "shield" },
  { slot: "Main Hand", icon: "sword" },
];

/** The Hearthfire (Legacy mock, PoC state): Generation 1, no Heirlooms yet, the chronicle. */
export function LegacyView(props: { state: GameState; onClose: () => void }) {
  const { state } = props;
  const s = state.stats;
  return (
    <section className="screen legacy" aria-label="Legacy">
      <header className="persona-header bar-top">
        <div className="run-title">
          <span className="title-font">LEGACY</span>
          <span className="sub">Everything that survives the fire</span>
        </div>
        <span className="gen-tag title-font">Generation 1</span>
        <div className="grow" />
        <button
          type="button"
          className="icon-button"
          aria-label="Back to Camp"
          title="Back to Camp (Esc)"
          onClick={props.onClose}
        >
          <Icon name="close" size={20} />
        </button>
      </header>
      <div className="legacy-body">
        <div className="legacy-ring">
          <div className="ring-line" />
          {RING.map((r, i) => {
            const a = ((-90 + i * 36) * Math.PI) / 180;
            return (
              <div
                key={i}
                className="ring-slot"
                style={{ left: 360 + Math.cos(a) * 270 - 52, top: 400 + Math.sin(a) * 270 - 52 }}
                title={`${r.slot}: no Heirloom yet`}
              >
                <Icon name={r.icon} size={30} strokeWidth={1.6} />
                <span className="sub small">{r.slot}</span>
                <span className="seal">◆</span>
              </div>
            );
          })}
          <div className="ring-center">
            <Icon name="fire" size={64} color="var(--accent)" />
            <span className="title-font big">0 / 10 Heirlooms</span>
            <span className="sub">The first harvest has not come yet.</span>
          </div>
        </div>
        <aside className="legacy-side">
          <section className="panel-card">
            <span className="eyebrow">THIS GENERATION</span>
            <dl className="stat-rows">
              <div className="stat-row">
                <dt>Level</dt>
                <dd className="mono">{state.hero.level}</dd>
              </div>
              <div className="stat-row">
                <dt>Harvester&apos;s Ember</dt>
                <dd className="mono">{state.wallet.harvesterEmber}</dd>
              </div>
              <div className="stat-row">
                <dt>Fights won</dt>
                <dd className="mono">
                  {s.wins} / {s.fights}
                </dd>
              </div>
              <div className="stat-row">
                <dt>Deaths · Retreats</dt>
                <dd className="mono">
                  {s.deaths} · {s.retreats}
                </dd>
              </div>
              <div className="stat-row">
                <dt>Boss kills</dt>
                <dd className="mono">{s.bossKills}</dd>
              </div>
            </dl>
          </section>
          <section className="panel-card chronicle">
            <span className="title-font section-title">Chronicle</span>
            <div className="chronicle-row">
              <span className="mono accent">Gen 1</span>
              <span>Now · the first Heir walks the Ashen Fields.</span>
            </div>
          </section>
          <p className="sub small">
            Seals are placed when the harvest begins, right after the Harvester falls. Prestige
            comes with the next milestone; here you only look.
          </p>
        </aside>
      </div>
    </section>
  );
}
