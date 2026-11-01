import { GAME_DATA } from "@emberheir/content";
import {
  type CombatantSetup,
  DUMMY_SEED,
  type DummyProfile,
  type GameState,
  type Item,
  dummyReport,
  dummySetup,
  equipBlockReason,
  finaleOpen,
  heroSetup,
  nextAct,
  wearing,
  wornEcho,
} from "@emberheir/sim";
import { Suspense, useMemo, useState } from "react";
import { GameIcon, type GameIconId } from "../../ui/gameIcons";
import { type NoteHover, useNoteHover } from "../../ui/ItemTooltip";
import { ItemTile, fmt } from "../../ui/items";
import { useStageSize } from "../../ui/Stage";
import type { Settings } from "../../ui/settings";
import { useRollingNumber } from "../../ui/kit/juice";
import {
  Medallion,
  type TabItem,
  Tabs,
  Window,
  WindowHeader,
  WindowLayer,
} from "../../ui/kit/Window";
import { WEAPON_ICON } from "../battle/hud/BattleHud";
import { AttackIcon, SkillIcon } from "../battle/SkillIcon";
import { DUMMY_LOOK } from "../classPreview";
import { heroLookOf } from "../heroLook";
import { PreviewArena } from "../lazyViews";
import type { GameApi } from "../useGame";
import { heroWeaponLook } from "../weaponLook";
import dummyUrl from "../../assets/camp/personas/training-dummy.webp";
import kaelenFace from "../../assets/camp/personas/kaelen-portrait.webp";

/**
 * Kaelen's practice ground (training-dummy-v2-konzept.md): the hero fights the straw man, or
 * spars with Kaelen, live in a small arena. The numbers beside it are that very fight. Items
 * from the bag and the Supply Wagon can be put on right here: the arena starts over with the new
 * gear and the numbers roll. No respec here: that stays at Kaelen, for Acorns.
 */

/** Seconds the window measures; the arena plays the same fight from the same seed. */
const MEASURE_SECONDS = 24;
/** Seconds each try-on comparison plays. */
const TRY_SECONDS = 20;
/** Try-on tiles per page. */
const PAGE = 10;

const PROFILES: Record<DummyProfile, { name: string; text: string }> = {
  plain: { name: "Straw Man", text: "Stands still. Your raw damage." },
  sparring: { name: "Sparring", text: "Kaelen fights back. Can your healing keep up?" },
};

const NOTES = {
  dps: { name: "Damage per Second", kind: "", explain: "All your damage in this fight." },
  crit: { name: "Crits", kind: "", explain: "Share of your hits that crit." },
  glancing: {
    name: "Glancing Blows",
    kind: "",
    explain: "Share of your hits that only grazed: half damage.",
  },
  mighty: { name: "Mighty Hits", kind: "", explain: "Share of your hits that struck hardest." },
  heat: { name: "Heat spent", kind: "", explain: "Heat your skills burn each second." },
  trigger: { name: "Triggers", kind: "", explain: "How often your triggers fire each minute." },
  taken: { name: "Damage taken", kind: "", explain: "What Kaelen deals you each second." },
  healed: { name: "Healing", kind: "", explain: "What you heal each second." },
} satisfies Record<string, NoteHover>;

const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))} %`;

/** Skill names to skill ids, from everything the hero's setup can cast. */
function skillIds(setup: CombatantSetup): Map<string, string> {
  const ids = new Map<string, string>();
  const seen = new Set<object>();
  const walk = (v: unknown, depth: number) => {
    if (!v || typeof v !== "object" || depth > 6 || seen.has(v)) return;
    seen.add(v);
    const o = v as Record<string, unknown>;
    if (typeof o.id === "string" && typeof o.name === "string" && Array.isArray(o.hits)) {
      if (!ids.has(o.name)) ids.set(o.name, o.id);
    }
    for (const child of Object.values(o)) walk(child, depth + 1);
  };
  walk(setup.rotation, 0);
  walk(setup.reactions, 0);
  walk(setup.triggers, 0);
  return ids;
}

export function TrainingDummyTab(props: {
  state: GameState;
  game: GameApi;
  settings: Settings;
  profile: DummyProfile;
}) {
  const { state, game, settings, profile } = props;
  const stage = useStageSize();
  const hero = useMemo(() => heroSetup(state, GAME_DATA).setup, [state]);
  const foe = useMemo(() => dummySetup(state, GAME_DATA, profile), [state, profile]);
  const report = useMemo(() => dummyReport(hero, foe, MEASURE_SECONDS), [hero, foe]);
  const preview = useMemo(() => {
    const act = finaleOpen(state, GAME_DATA) ? 8 : nextAct(state, GAME_DATA).number;
    const mastery = GAME_DATA.skillTree.prestigeBranches?.find(
      (b) => b.id === state.legacy.branches[0],
    );
    return {
      hero,
      enemy: foe,
      heroLook: {
        ...heroLookOf(
          state.hero.classId,
          state.hero.weaponId,
          state.hero.equipment,
          wornEcho(state, GAME_DATA)?.def.color,
          heroWeaponLook(state),
        ),
        ...(mastery?.axis ? { mastery: mastery.axis } : {}),
      },
      enemyLook:
        profile === "sparring" ? { ...DUMMY_LOOK, id: "kaelen", act } : { ...DUMMY_LOOK, act },
    };
  }, [state, hero, foe, profile]);

  // The arena takes what the side column and the margins leave, at the battle's aspect.
  const safe = stage.safeX;
  const arenaW = Math.round(stage.w - 2 * safe - 64 - 400 - 20);
  const arenaH = Math.min(stage.h - 260, Math.round(arenaW * 0.62));
  return (
    <div className="dummy-tab">
      <div className="dummy-stage">
        <div className="dummy-arena" style={{ width: arenaW, height: arenaH }}>
          <Suspense fallback={<div className="preview-arena" />}>
            <PreviewArena
              key={`${profile}-${JSON.stringify(state.hero.equipment)}`}
              preview={preview}
              width={arenaW}
              height={arenaH}
              settings={settings}
              roundSeconds={MEASURE_SECONDS}
              seed={DUMMY_SEED}
            />
          </Suspense>
        </div>
        <DummyNumbers state={state} hero={hero} report={report} profile={profile} />
      </div>
      <TryOn state={state} game={game} hero={hero} />
    </div>
  );
}

function DummyNumbers(props: {
  state: GameState;
  hero: CombatantSetup;
  report: ReturnType<typeof dummyReport>;
  profile: DummyProfile;
}) {
  const { hero, report, profile } = props;
  const dps = useRollingNumber(Math.round(report.dps));
  const dpsHover = useNoteHover(NOTES.dps);
  const ids = useMemo(() => skillIds(hero), [hero]);
  const top = report.sources.slice(0, 5);
  const best = top[0]?.dps ?? 1;
  return (
    <section className="dummy-side" aria-label="Dummy numbers">
      <div className={`dummy-dps${dps.trend ? ` ${dps.trend}` : ""}`} tabIndex={0} {...dpsHover}>
        <b className="mono" data-testid="dummy-dps">
          {fmt(dps.value)}
        </b>
        <span className="dummy-unit">per Second</span>
      </div>
      <div className="dummy-chips">
        <Chip icon="crit" note={NOTES.crit} value={`${Math.round(report.critRate * 100)}%`} />
        <Chip
          icon="armor"
          note={NOTES.glancing}
          value={`${Math.round(report.glancingRate * 100)}%`}
        />
        <Chip
          icon="heat-per-hit"
          note={NOTES.mighty}
          value={`${Math.round(report.mightyRate * 100)}%`}
        />
        <Chip icon="heat" note={NOTES.heat} value={`${report.heatPerSecond.toFixed(1)}/s`} />
        <Chip
          icon="trigger"
          note={NOTES.trigger}
          value={`${report.triggersPerMinute.toFixed(0)}/min`}
        />
      </div>
      <ul className="dummy-sources" aria-label="Damage sources">
        {top.map((s) => (
          <li key={s.source}>
            <span className="dummy-source-icon">
              <SourceIcon source={s.source} hero={hero} ids={ids} />
            </span>
            <span className="dummy-source-main">
              <span className="dummy-source-name">{s.source}</span>
              <span className="dummy-source-track">
                <span
                  className="dummy-source-fill"
                  style={{ width: `${Math.max(3, (s.dps / best) * 100)}%` }}
                />
              </span>
            </span>
            <span className="mono dummy-source-dps">{fmt(s.dps)}</span>
          </li>
        ))}
      </ul>
      {profile === "sparring" && (
        <div className="dummy-duel" aria-label="Damage taken against healing">
          <DuelBar
            icon="life"
            tone="taken"
            note={NOTES.taken}
            value={report.takenPerSecond}
            max={Math.max(report.takenPerSecond, report.healedPerSecond, 1)}
            label="Damage taken"
          />
          <DuelBar
            icon="lifesteal"
            tone="healed"
            note={NOTES.healed}
            value={report.healedPerSecond}
            max={Math.max(report.takenPerSecond, report.healedPerSecond, 1)}
            label="Healing"
          />
        </div>
      )}
    </section>
  );
}

function SourceIcon(props: { source: string; hero: CombatantSetup; ids: Map<string, string> }) {
  const { source, hero, ids } = props;
  if (source === hero.weapon.defaultAttack) {
    return (
      <AttackIcon
        weaponId={hero.weapon.id}
        fallback={WEAPON_ICON[hero.weapon.id] ?? "strike"}
        size={26}
      />
    );
  }
  const id = ids.get(source);
  if (id) return <SkillIcon skillId={id} size={26} />;
  return <GameIcon id={source === "Ailments" ? "ailment-effect" : "trigger"} size={32} />;
}

function Chip(props: { icon: GameIconId; note: NoteHover; value: string }) {
  const hover = useNoteHover(props.note);
  return (
    <span className="dummy-chip" tabIndex={0} aria-label={props.note.name} {...hover}>
      <GameIcon id={props.icon} size={30} />
      <b className="mono">{props.value}</b>
    </span>
  );
}

function DuelBar(props: {
  icon: GameIconId;
  tone: "taken" | "healed";
  note: NoteHover;
  value: number;
  max: number;
  label: string;
}) {
  const hover = useNoteHover(props.note);
  return (
    <span
      className={`dummy-duel-row ${props.tone}`}
      tabIndex={0}
      aria-label={props.label}
      {...hover}
    >
      <GameIcon id={props.icon} size={26} />
      <span className="dummy-duel-track">
        <span
          className="dummy-duel-fill"
          style={{ width: `${(props.value / props.max) * 100}%` }}
        />
      </span>
      <b className="mono">{fmt(props.value)}/s</b>
    </span>
  );
}

/**
 * Bag and Supply Wagon items the hero can wear, best gain first; a click puts one on. Always
 * measured on the straw man: Kaelen's blows would only add noise to the comparison.
 */
function TryOn(props: { state: GameState; game: GameApi; hero: CombatantSetup }) {
  const { state, game, hero } = props;
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const foe = dummySetup(state, GAME_DATA, "plain");
    const now = dummyReport(hero, foe, TRY_SECONDS);
    const { dps, life } = now;
    const out: { item: Item; dps: number; life: number }[] = [];
    for (const p of state.inventory) consider(p.item, "inventory");
    for (const p of state.stash) consider(p.item, "stash");
    return out.sort((a, b) => b.dps - a.dps || b.life - a.life);
    function consider(item: Item, from: "inventory" | "stash") {
      if (equipBlockReason(state, GAME_DATA, item, from)) return;
      const tried = wearing(state, GAME_DATA, item);
      if (!tried) return;
      const after = dummyReport(heroSetup(tried, GAME_DATA).setup, foe, TRY_SECONDS);
      out.push({
        item,
        dps: dps > 0 ? after.dps / dps - 1 : 0,
        life: life > 0 ? after.life / life - 1 : 0,
      });
    }
  }, [state, hero]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const at = Math.min(page, pages - 1);
  const shown = rows.slice(at * PAGE, at * PAGE + PAGE);
  return (
    <section className="dummy-tryon" aria-label="Try on">
      <span className="dummy-tryon-label title-font">Try on</span>
      {rows.length === 0 && <span className="sub">Nothing to try on.</span>}
      <div className="dummy-tryon-row">
        {shown.map((r) => (
          <span key={r.item.id} className="dummy-try">
            <ItemTile
              item={r.item}
              label="Wear"
              size={64}
              equipped={false}
              onSelect={() => game.dispatch({ type: "equip", itemId: r.item.id })}
              context={{
                action: "Wear",
                run: () => game.dispatch({ type: "equip", itemId: r.item.id }),
              }}
            />
            <Delta value={r.dps} what="DPS" />
            <Delta value={r.life} what="Life" />
          </span>
        ))}
      </div>
      {pages > 1 && (
        <span className="dummy-tryon-pages">
          <button
            type="button"
            className="btn small"
            aria-label="Previous items"
            disabled={at === 0}
            onClick={() => setPage(at - 1)}
          >
            ◀
          </button>
          <span className="mono small">
            {at + 1}/{pages}
          </span>
          <button
            type="button"
            className="btn small"
            aria-label="Next items"
            disabled={at >= pages - 1}
            onClick={() => setPage(at + 1)}
          >
            ▶
          </button>
        </span>
      )}
    </section>
  );
}

function Delta(props: { value: number; what: string }) {
  const round = Math.round(props.value * 100);
  const tone = round > 0 ? "better" : round < 0 ? "worse" : "same";
  return (
    <span className={`dummy-delta ${tone}`} aria-label={`${pct(props.value)} ${props.what}`}>
      {round === 0 ? "–" : `${round > 0 ? "▲" : "▼"}${Math.abs(round)}%`}
      <span className="dummy-delta-what">{props.what}</span>
    </span>
  );
}

const PROFILE_ART: Record<DummyProfile, { url: string; size: string; pos: string }> = {
  plain: { url: dummyUrl, size: "235% auto", pos: "62% 0%" },
  sparring: { url: kaelenFace, size: "250% auto", pos: "78% 0%" },
};

function ProfileFace(props: { profile: DummyProfile; size: number }) {
  const art = PROFILE_ART[props.profile];
  return (
    <span
      className="painted-portrait dummy-face"
      style={{
        width: props.size,
        height: props.size,
        backgroundImage: `url(${art.url})`,
        backgroundSize: art.size,
        backgroundPosition: art.pos,
      }}
      aria-hidden="true"
    />
  );
}

/** Kaelen's Training Dummy, its own spot in the Camp: a window over the whole stage. */
export function TrainingDummyView(props: {
  state: GameState;
  game: GameApi;
  settings: Settings;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<DummyProfile>("plain");
  const tabs: TabItem<DummyProfile>[] = (["plain", "sparring"] as const).map((id) => ({
    id,
    name: PROFILES[id].name,
    art: <ProfileFace profile={id} size={30} />,
  }));
  return (
    <WindowLayer mode="full">
      <Window
        label="Training Dummy"
        role="dialog"
        mode="full"
        className="kaelen"
        header={
          <WindowHeader
            title="Training Dummy"
            sub={PROFILES[profile].text}
            medallion={
              <Medallion tint="#6a2a20">
                <span
                  className="painted-portrait"
                  style={{
                    backgroundImage: `url(${dummyUrl})`,
                    backgroundSize: PROFILE_ART.plain.size,
                    backgroundPosition: PROFILE_ART.plain.pos,
                  }}
                  aria-hidden="true"
                />
              </Medallion>
            }
            tabs={<Tabs label="Dummy" items={tabs} active={profile} onChange={setProfile} />}
            onClose={props.onClose}
          />
        }
      >
        <TrainingDummyTab
          state={props.state}
          game={props.game}
          settings={props.settings}
          profile={profile}
        />
      </Window>
    </WindowLayer>
  );
}
