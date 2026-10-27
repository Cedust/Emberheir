import { GAME_DATA } from "@emberheir/content";
import { getBase } from "@emberheir/sim";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import waymarkUrl from "../../assets/ui/stage-waymark.webp";
import { Icon } from "../../ui/Icon";
import { ItemArt } from "../../ui/ItemArt";
import { TrailMark } from "../../ui/TrailMark";
import { weaponIconUrl } from "../../ui/gameIcons";
import { playUiSound } from "../../ui/sound";
import { PersonaPortrait } from "../camp/art/PersonaArt";
import type { GameNotification, NotificationArt } from "./notifications";
import "./notifications.css";

/** How long a card stays (hover holds it), how many show at once, the gap between arrivals. */
const SHOW_MS = 4500;
const MAX_SHOWN = 3;
const STAGGER_MS = 350;
/** The card's slide out (screens.css `notice-out`). */
const LEAVE_MS = 260;

type Notify = (list: readonly GameNotification[]) => void;

const NotifyContext = createContext<Notify>(() => {});

/** Shows notifications from anywhere below `NotificationLayer`. */
export const useNotify = () => useContext(NotifyContext);

interface Shown {
  readonly n: GameNotification;
  readonly leaving: boolean;
}

/**
 * The notification cards top right, over every screen (notification-system-v1): they slide in
 * one after the other, stay a few seconds (longer while hovered), and a click sends one away.
 */
export function NotificationLayer(props: { children: ReactNode }) {
  const [shown, setShown] = useState<readonly Shown[]>([]);
  const live = useRef<readonly Shown[]>([]);
  const queue = useRef<GameNotification[]>([]);
  const seen = useRef(new Set<string>());
  const nextAt = useRef(0);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const all = timers.current;
    return () => all.forEach((id) => window.clearTimeout(id));
  }, []);

  // Plain functions behind one ref: they call each other through timers.
  const api = useRef({
    later(fn: () => void, ms: number) {
      const id = window.setTimeout(() => {
        timers.current.delete(id);
        fn();
      }, ms);
      timers.current.add(id);
    },
    commit(next: readonly Shown[]) {
      live.current = next;
      setShown(next);
    },
    pump() {
      const { later, commit, pump } = api.current;
      const showing = live.current.filter((s) => !s.leaving).length;
      if (showing >= MAX_SHOWN || !queue.current.length) return;
      const now = performance.now();
      if (now < nextAt.current) {
        later(pump, nextAt.current - now);
        return;
      }
      const n = queue.current.shift();
      if (!n) return;
      nextAt.current = now + STAGGER_MS;
      playUiSound("notice");
      commit([...live.current, { n, leaving: false }]);
      if (queue.current.length) later(pump, STAGGER_MS);
    },
    dismiss(key: string) {
      const { later, commit, pump } = api.current;
      commit(live.current.map((s) => (s.n.key === key ? { ...s, leaving: true } : s)));
      later(() => {
        commit(live.current.filter((s) => s.n.key !== key));
        pump();
      }, LEAVE_MS);
    },
  });

  const notify = useCallback<Notify>((list) => {
    const fresh = list.filter((n) => !seen.current.has(n.key));
    if (!fresh.length) return;
    fresh.forEach((n) => seen.current.add(n.key));
    queue.current.push(...fresh);
    api.current.pump();
  }, []);
  const dismiss = useCallback((key: string) => api.current.dismiss(key), []);

  return (
    <NotifyContext.Provider value={notify}>
      {props.children}
      <div className="notifications" aria-live="polite" aria-label="Notifications">
        {shown.map((s) => (
          <NotificationCard key={s.n.key} n={s.n} leaving={s.leaving} onDone={dismiss} />
        ))}
      </div>
    </NotifyContext.Provider>
  );
}

function NotificationCard(props: {
  n: GameNotification;
  leaving: boolean;
  onDone: (key: string) => void;
}) {
  const { n, leaving, onDone } = props;
  const [hover, setHover] = useState(false);
  // The time runs only while the pointer is away; hovering starts it over.
  useEffect(() => {
    if (hover || leaving) return;
    const timer = window.setTimeout(() => onDone(n.key), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [hover, leaving, onDone, n.key]);
  return (
    <button
      type="button"
      className={`notification notice-${n.kind}`}
      data-leaving={leaving ? "" : undefined}
      data-testid={`notification-${n.kind}`}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onClick={() => onDone(n.key)}
    >
      <span className="notification-art">
        <NotificationArtView art={n.art} />
      </span>
      <span className="notification-text">
        <strong className="title-font">{n.title}</strong>
        {n.sub && <span className="notification-sub">{n.sub}</span>}
      </span>
    </button>
  );
}

function NotificationArtView(props: { art: NotificationArt }) {
  const { art } = props;
  switch (art.kind) {
    case "persona":
      return (
        <span className="notification-face">
          <PersonaPortrait id={art.id} />
        </span>
      );
    case "weapon": {
      const url = weaponIconUrl(art.weaponId);
      return url ? <img src={url} alt="" draggable={false} /> : <Icon name="fire" size={30} />;
    }
    case "item":
      return (
        <ItemArt
          baseId={art.item.baseId}
          uniqueId={art.item.uniqueId}
          slot={getBase(GAME_DATA.items, art.item.baseId).slot}
        />
      );
    case "echo":
      return (
        <span
          className="notification-echo"
          style={{ background: art.color, boxShadow: `0 0 16px ${art.color}` }}
        />
      );
    case "trail":
      return <TrailMark tier={art.tier} size={48} />;
    case "waymark":
      return <img src={waymarkUrl} alt="" draggable={false} />;
    case "icon":
      return (
        <span className="notification-sigil">
          <Icon name={art.icon} size={26} />
        </span>
      );
  }
}

/** Shows what changed from one game state to the next (see `notificationsFor`). */
export function useStateNotifications<S>(
  state: S | null,
  diff: (prev: S | null, next: S) => readonly GameNotification[],
) {
  const notify = useNotify();
  const prev = useRef<S | null>(null);
  useEffect(() => {
    if (state) notify(diff(prev.current, state));
    prev.current = state;
  }, [state, diff, notify]);
}
