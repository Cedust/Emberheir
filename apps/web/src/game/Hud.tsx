import { POC_GAME_DATA } from "@emberheir/content";
import { type GameState, PROGRESSION, xpToNextLevel } from "@emberheir/sim";

/** Top bar: level and XP, wallet, Ember Flask. */
export function Hud(props: { state: GameState; children?: React.ReactNode }) {
  const { hero, wallet } = props.state;
  const next = xpToNextLevel(hero.level);
  const essences = POC_GAME_DATA.acts.map((a) => ({
    name: a.essence.name,
    count: wallet.essences[a.essence.id] ?? 0,
  }));
  return (
    <header className="hud panel" aria-label="Hero status">
      <div className="hud-level">
        <strong>Level {hero.level}</strong>
        <div
          className="xp-bar"
          role="meter"
          aria-label="XP"
          aria-valuenow={hero.xp}
          aria-valuemin={0}
          aria-valuemax={Number.isFinite(next) ? next : hero.xp}
        >
          <div
            className="xp-fill"
            style={{ width: Number.isFinite(next) ? `${(hero.xp / next) * 100}%` : "100%" }}
          />
          <span>{Number.isFinite(next) ? `${hero.xp} / ${next} XP` : "Level Cap"}</span>
        </div>
      </div>
      <ul className="wallet" aria-label="Wallet">
        <li title="Gold">
          <span className="coin gold" /> {wallet.gold} Gold
        </li>
        <li title="Salvage Dust">
          <span className="coin dust" /> {wallet.dust} Dust
        </li>
        <li title="Reforge Stones">
          <span className="coin stone" /> {wallet.reforgeStones} Reforge
        </li>
        {essences.map((e) => (
          <li key={e.name} title={e.name}>
            <span className="coin essence" /> {e.count} {e.name}
          </li>
        ))}
        <li title={`Ember Flask: heals ${PROGRESSION.flaskHeal * 100} % Life between stages`}>
          <span className="coin flask" /> {props.state.flaskCharges} Flask
        </li>
      </ul>
      <div className="hud-actions">{props.children}</div>
    </header>
  );
}
