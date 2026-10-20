import { Suspense, lazy } from "react";
import { GameApp } from "./game/GameApp";
import { CrashGuard } from "./ui/CrashGuard";

/** `?uikit` shows the UI kit preview (ui-ux-plan-v1.md step 1) instead of the game. */
const UiKitPreview = lazy(() =>
  import("./ui/kit/UiKitPreview").then((m) => ({ default: m.UiKitPreview })),
);
/** `?effects` shows every battle effect on its own (performance-kampfeffekte-v1.md). */
const EffectGallery = lazy(() =>
  import("./game/effects/EffectGallery").then((m) => ({ default: m.EffectGallery })),
);
const PARAMS = new URLSearchParams(window.location.search);
const SHOW_KIT = PARAMS.has("uikit");
const SHOW_EFFECTS = PARAMS.has("effects");
/** `?crashtest` breaks the game on purpose, to see (and test) the crash screen. */
const CRASH_TEST = PARAMS.has("crashtest");

function CrashTest(): never {
  throw new Error("Crash test (?crashtest)");
}

export function App() {
  if (SHOW_KIT) {
    return (
      <Suspense fallback={null}>
        <UiKitPreview />
      </Suspense>
    );
  }
  if (SHOW_EFFECTS) {
    return (
      <Suspense fallback={null}>
        <EffectGallery />
      </Suspense>
    );
  }
  return <CrashGuard>{CRASH_TEST ? <CrashTest /> : <GameApp />}</CrashGuard>;
}
