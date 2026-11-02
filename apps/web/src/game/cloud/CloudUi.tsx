import { GAME_DATA } from "@emberheir/content";
import { type GameState, deserializeGame, heroTitle } from "@emberheir/sim";
import { useState, useSyncExternalStore } from "react";
import { Icon } from "../../ui/Icon";
import { Button, HoldButton } from "../../ui/kit/Button";
import { whereText } from "../heirLine";
import { LegalLinks } from "../LegalLinks";
import { AUTH_ERROR_TEXT, PROVIDERS, PROVIDER_LABELS, type Provider, toAuthError } from "./auth";
import {
  type CloudStart,
  chooseSaves,
  cloudAvailable,
  deleteAccount,
  signIn,
  signOut,
  signedIn,
  startCloud,
  useSyncState,
} from "./cloud";
import { ProviderMark } from "./ProviderMark";
import type { SaveSide, SyncState } from "./sync";

// The start: a signed-in device syncs before the title reads the slots; once per page.

type Start = CloudStart | { kind: "waiting" };
let start: Start = cloudAvailable && signedIn() ? { kind: "waiting" } : { kind: "guest" };
const startListeners = new Set<() => void>();
function setStart(next: Start) {
  start = next;
  for (const listener of startListeners) listener();
}
if (start.kind === "waiting") {
  void startCloud().then(setStart, () => setStart({ kind: "ready", state: "offline" }));
}

export function useCloudStart(): Start {
  return useSyncExternalStore(
    (listener) => {
      startListeners.add(listener);
      return () => startListeners.delete(listener);
    },
    () => start,
  );
}

function heirs(side: SaveSide): GameState[] {
  return Object.entries(side.saves)
    .filter(([name]) => name.startsWith("slot."))
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, json]) => {
      try {
        return [deserializeGame(json, GAME_DATA)];
      } catch {
        return [];
      }
    });
}

function HeirList(props: { side: SaveSide }) {
  const list = heirs(props.side);
  return (
    <ul className="cloud-heirs">
      {list.length === 0 && <li className="sub">No Heirs</li>}
      {list.map((h, i) => (
        <li key={i}>
          <strong className="title-font">{heroTitle(h, GAME_DATA)}</strong>
          <span className="sub small">{whereText(h)}</span>
        </li>
      ))}
    </ul>
  );
}

/** While the saves sync, and when this device and the cloud both moved on. */
export function CloudChoice(props: { start: Start }) {
  const s = props.start;
  if (s.kind === "waiting") {
    return (
      <p className="cloud-waiting title-font" role="status">
        Fetching your Heirs…
      </p>
    );
  }
  if (s.kind === "newer") {
    return (
      <div className="cloud-choice k-window" role="alertdialog" aria-label="Newer save">
        <p>A newer version of Emberheir saved your Heirs.</p>
        <Button variant="primary" icon="cycle" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }
  if (s.kind !== "choose") return null;
  const pick = (choice: "local" | "cloud") => {
    chooseSaves(s, choice);
    setStart({ kind: "ready", state: choice === "cloud" ? "synced" : "pending" });
  };
  const here = s.local.source === "guest" ? "Played here before signing in" : "On this device";
  return (
    <div className="cloud-choice k-window" role="alertdialog" aria-label="Choose your Heirs">
      <p className="title-font">Which Heirs play on?</p>
      <div className="cloud-sides">
        <section aria-label={here}>
          <h2 className="title-font">{here}</h2>
          <HeirList side={s.local} />
          <HoldButton icon="user" onConfirm={() => pick("local")}>
            Keep these
          </HoldButton>
        </section>
        <section aria-label="In the cloud">
          <h2 className="title-font">In the cloud</h2>
          <HeirList side={s.cloud} />
          <HoldButton icon="cycle" onConfirm={() => pick("cloud")}>
            Keep these
          </HoldButton>
        </section>
      </div>
      <p className="sub small">The other set is replaced.</p>
    </div>
  );
}

const SYNC_TEXT: Record<SyncState, string> = {
  synced: "Saved in the cloud",
  pending: "Saving soon",
  offline: "Offline · saved here",
  conflict: "Another device saved later. Reload to choose.",
  error: "The cloud refused the save",
};

type Panel = null | "sign-in" | "account";

/** Top right of the title: sign in for cloud saves, or the signed-in account. */
export function CloudPlate() {
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const sync = useSyncState();
  if (!cloudAvailable) return null;
  const account = signedIn();

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setProblem(null);
    try {
      await action();
    } catch (error) {
      setProblem(AUTH_ERROR_TEXT[toAuthError(error).code] || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cloud-plate">
      {account ? (
        <button
          type="button"
          className="cloud-account panel-card"
          aria-expanded={panel === "account"}
          onClick={() => setPanel(panel ? null : "account")}
        >
          <Icon name="user" size={22} />
          <span className="cloud-account-text">
            <strong className="title-font">{account.name ?? "Signed in"}</strong>
            {sync && <span className="sub small">{SYNC_TEXT[sync]}</span>}
          </span>
        </button>
      ) : (
        <Button icon="cycle" onClick={() => setPanel(panel ? null : "sign-in")}>
          Cloud Save
        </Button>
      )}
      {panel === "sign-in" && !account && (
        <div className="cloud-panel k-window" role="dialog" aria-label="Cloud Save">
          <p>Sign in to keep your Heirs on every device.</p>
          <div className="cloud-providers">
            {PROVIDERS.map((p: Provider) => (
              <Button
                key={p}
                art={<ProviderMark provider={p} />}
                blocked={busy ? "Signing in…" : null}
                onClick={() => void run(() => signIn(p))}
              >
                {PROVIDER_LABELS[p]}
              </Button>
            ))}
          </div>
          {problem && (
            <p className="cloud-problem" role="alert">
              {problem}
            </p>
          )}
          <LegalLinks />
        </div>
      )}
      {panel === "account" && account && (
        <div className="cloud-panel k-window" role="dialog" aria-label="Account">
          {sync === "conflict" && (
            <Button variant="primary" icon="cycle" onClick={() => window.location.reload()}>
              Reload
            </Button>
          )}
          <Button
            icon="prev"
            blocked={busy ? "One moment…" : null}
            onClick={() => void run(signOut)}
          >
            Sign out
          </Button>
          <HoldButton icon="trash" onConfirm={() => void run(deleteAccount)}>
            Delete account
          </HoldButton>
          <p className="sub small">Deleting removes your Heirs from the cloud and this device.</p>
          {problem && (
            <p className="cloud-problem" role="alert">
              {problem}
            </p>
          )}
          <LegalLinks />
        </div>
      )}
    </div>
  );
}
