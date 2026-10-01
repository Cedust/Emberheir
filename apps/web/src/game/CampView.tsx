import { POC_GAME_DATA } from "@emberheir/content";
import { type GameState, type Notice, getAct } from "@emberheir/sim";
import type { GameApi } from "./useGame";

const NOTICE_TEXT: Record<Notice["kind"], { title: string; line: string }> = {
  death: {
    title: "Ashbound",
    line: 'Old Nan: "The ash took you back, child. It always gives you up again."',
  },
  retreat: {
    title: "Retreat",
    line: 'Old Nan: "Wise. The fields will still be burning tomorrow."',
  },
  actCleared: {
    title: "Act Cleared",
    line: 'Old Nan: "Gorrak is down. Kaelen has seen enough to train you now."',
  },
};

function NoticeCard(props: { notice: Notice; onDismiss: () => void }) {
  const { notice } = props;
  const text = NOTICE_TEXT[notice.kind];
  const act = getAct(POC_GAME_DATA, notice.actId);
  return (
    <section className={`notice notice-${notice.kind}`} aria-label={text.title} role="status">
      <h3>{text.title}</h3>
      <p>
        {act.name}, Stage {notice.stage}
        {notice.enemyName ? ` · ${notice.enemyName}` : ""}
      </p>
      <p className="quote">{text.line}</p>
      {notice.kind !== "actCleared" && (
        <p className="hint">Gear, levels and currencies stay. The act starts over at Stage 1.</p>
      )}
      <button type="button" onClick={props.onDismiss}>
        Wake at the Hearthfire
      </button>
    </section>
  );
}

export function CampView(props: {
  state: GameState;
  game: GameApi;
  onCharacter: () => void;
  onKaelen: () => void;
}) {
  const { state, game } = props;
  const act = POC_GAME_DATA.acts[0];
  if (state.notice) {
    return (
      <NoticeCard
        notice={state.notice}
        onDismiss={() => game.dispatch({ type: "dismissNotice" })}
      />
    );
  }
  const cleared = act ? state.progress.actsCleared.includes(act.id) : false;
  return (
    <section className="camp panel" aria-label="Camp">
      <h2>The Camp</h2>
      <p className="hint">
        The caravan rests at the Hearthfire. Your Ember Flask is refilled and your wounds are
        healed.
      </p>
      <div className="camp-grid">
        <button type="button" className="camp-target" onClick={props.onCharacter}>
          <strong>Your Heir</strong>
          <span>
            Equipment, attributes, inventory
            {state.hero.unspentAttributePoints > 0
              ? ` · ${state.hero.unspentAttributePoints} points to spend`
              : ""}
          </span>
        </button>
        <button
          type="button"
          className="camp-target"
          onClick={props.onKaelen}
          disabled={!state.progress.trainerUnlocked}
        >
          <strong>Kaelen, the Trainer</strong>
          <span>
            {state.progress.trainerUnlocked
              ? `Skill Tree and Battle Plan · ${state.hero.unspentSkillPoints} Skill Points`
              : `Joins after Gorrak falls · ${state.hero.unspentSkillPoints} Skill Points saved`}
          </span>
        </button>
        <div className="camp-target static">
          <strong>Thoric and Liora</strong>
          <span>Crafting comes with the next milestone.</span>
        </div>
      </div>
      {act && (
        <div className="set-out">
          <button
            type="button"
            className="primary big"
            onClick={() => game.dispatch({ type: "setOut", actId: act.id })}
          >
            Set Out
          </button>
          <span>
            Act {act.number}: {act.name} · {act.monsterLevels.length} stages · Boss {act.boss.name}
            {cleared ? " · cleared" : ""}
            {state.progress.deathsInAct > 0
              ? ` · Pity ${state.progress.deathsInAct} (better loot after deaths)`
              : ""}
          </span>
        </div>
      )}
      <p className="stats-line">
        Fights {state.stats.fights} · Wins {state.stats.wins} · Deaths {state.stats.deaths} ·
        Retreats {state.stats.retreats} · Boss kills {state.stats.bossKills}
      </p>
    </section>
  );
}
