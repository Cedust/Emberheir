import { ACTS, GAME_TITLE } from "@emberheir/content";
import { SIM_VERSION } from "@emberheir/sim";

export function App() {
  const buildDate = new Date(__BUILD_TIME__).toLocaleString();

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Dev Preview · M0</p>
        <h1>{GAME_TITLE}</h1>
        <p className="lead">The embers are being gathered. Nothing to play yet.</p>

        <ul className="acts" aria-label="Acts">
          {ACTS.map((act) => (
            <li
              key={act.id}
              className={act.playableInPoc ? "act" : "act locked"}
              style={{
                background: `linear-gradient(${act.arenaGradient[0]}, ${act.arenaGradient[1]})`,
              }}
              title={act.playableInPoc ? act.name : `${act.name} (locked in PoC)`}
            >
              <span>{act.number}</span>
            </li>
          ))}
        </ul>

        <dl className="build">
          <dt>Build</dt>
          <dd>{__BUILD_COMMIT__}</dd>
          <dt>Date</dt>
          <dd>{buildDate}</dd>
          <dt>Sim</dt>
          <dd>{SIM_VERSION}</dd>
        </dl>
      </section>
    </main>
  );
}
