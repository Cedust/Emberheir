import { GAME_TITLE } from "@emberheir/content";
import { SIM_VERSION } from "@emberheir/sim";
import { CombatDebug } from "./combat/CombatDebug";

export function App() {
  const buildDate = new Date(__BUILD_TIME__).toLocaleString();

  return (
    <main className="shell">
      <header className="page-header">
        <p className="eyebrow">Dev Preview · M1 Combat Core</p>
        <h1>{GAME_TITLE}</h1>
      </header>

      <CombatDebug />

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
