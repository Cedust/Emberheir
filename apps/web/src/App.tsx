import { Suspense, lazy } from "react";
import { GameApp } from "./game/GameApp";
import { devParam } from "./devTools";
import { CrashGuard } from "./ui/CrashGuard";

// The developer pages (devTools.ts): `__DEV_TOOLS__` is `false` in the release build, so these
// imports and their chunks are left out of it.
/** `?uikit` shows the UI kit preview (ui-ux-plan-v1.md step 1) instead of the game. */
const UiKitPreview = __DEV_TOOLS__
  ? lazy(() => import("./ui/kit/UiKitPreview").then((m) => ({ default: m.UiKitPreview })))
  : null;
/** `?effects` shows every battle effect on its own (performance-kampfeffekte-v1.md). */
const EffectGallery = __DEV_TOOLS__
  ? lazy(() => import("./game/effects/EffectGallery").then((m) => ({ default: m.EffectGallery })))
  : null;
/** `?sfx` plays every battle sound with its arena moment. */
const SfxGallery = __DEV_TOOLS__
  ? lazy(() => import("./game/effects/SfxGallery").then((m) => ({ default: m.SfxGallery })))
  : null;
const PARAMS = new URLSearchParams(window.location.search);
/** `?crashtest` breaks the game on purpose, to see (and test) the crash screen. */
const CRASH_TEST = PARAMS.has("crashtest");

function CrashTest(): never {
  throw new Error("Crash test (?crashtest)");
}

export function App() {
  if (UiKitPreview && devParam("uikit")) {
    return (
      <Suspense fallback={null}>
        <UiKitPreview />
      </Suspense>
    );
  }
  if (SfxGallery && devParam("sfx")) {
    return (
      <Suspense fallback={null}>
        <SfxGallery />
      </Suspense>
    );
  }
  if (EffectGallery && devParam("effects")) {
    return (
      <Suspense fallback={null}>
        <EffectGallery />
      </Suspense>
    );
  }
  return <CrashGuard>{CRASH_TEST ? <CrashTest /> : <GameApp />}</CrashGuard>;
}
