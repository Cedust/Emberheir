import { type ReactNode, useEffect, useState } from "react";

/** Design size of every game screen (the mocks are 1440 × 900). */
export const STAGE_W = 1440;
export const STAGE_H = 900;

function fit(): number {
  return Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
}

/**
 * Lays the game out on a fixed 1440 × 900 canvas and scales it to the window, like a game
 * would. Layouts stay pixel-exact to the mocks on every PC screen.
 */
export function Stage(props: { children: ReactNode }) {
  const [scale, setScale] = useState(fit);
  useEffect(() => {
    const onResize = () => setScale(fit());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <div className="stage-viewport">
      <div
        className="stage"
        style={{
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {props.children}
      </div>
    </div>
  );
}
