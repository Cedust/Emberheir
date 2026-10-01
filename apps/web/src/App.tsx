import { GAME_TITLE } from "@emberheir/content";
import { SIM_VERSION } from "@emberheir/sim";
import { GameApp } from "./game/GameApp";

export function App() {
  const buildDate = new Date(__BUILD_TIME__).toLocaleString();

  return (
    <main className="shell">
      <header className="page-header">
        <p className="eyebrow">Dev Preview · M3 Progression & Act 1</p>
        <h1>{GAME_TITLE}</h1>
      </header>

      <GameApp />

      <dl className="build">
        <dt>Build</dt>
        <dd>{__BUILD_COMMIT__}</dd>
        <dt>Date</dt>
        <dd>{buildDate}</dd>
        <dt>Sim</dt>
        <dd>{SIM_VERSION}</dd>
      </dl>
    </main>
  );
}
