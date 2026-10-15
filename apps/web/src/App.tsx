import { Suspense, lazy } from "react";
import { GameApp } from "./game/GameApp";

/** `?uikit` shows the UI kit preview (ui-ux-plan-v1.md step 1) instead of the game. */
const UiKitPreview = lazy(() =>
  import("./ui/kit/UiKitPreview").then((m) => ({ default: m.UiKitPreview })),
);
const SHOW_KIT = new URLSearchParams(window.location.search).has("uikit");

export function App() {
  if (SHOW_KIT) {
    return (
      <Suspense fallback={null}>
        <UiKitPreview />
      </Suspense>
    );
  }
  return <GameApp />;
}
