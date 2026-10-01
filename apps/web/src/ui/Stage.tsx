import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

/**
 * Logical layout units. Every screen is laid out in "stage pixels": the stage is always 900
 * units tall (1080p = ×1.2, 1440p = ×1.6, 4K = ×2.4), so a 1080p and a 4K screen show exactly
 * the same picture. The width follows the window's aspect ratio (16:9 = 1600 units), never
 * below the mocks' 1440 (16:10); narrower windows get a taller stage instead.
 */
export const STAGE_H = 900;
export const MIN_W = 1440;
/** Controls stay inside a centered 16:9 area; on ultrawide only backgrounds extend. */
export const SAFE_W = 1600;

export interface StageSize {
  /** Logical width and height in stage pixels. */
  w: number;
  h: number;
  /** Screen pixels per stage pixel. */
  scale: number;
  /** Horizontal inset of the 16:9 safe area (0 up to 16:9). */
  safeX: number;
}

export function measureStage(width: number, height: number): StageSize {
  const aspect = width / height;
  const w = aspect >= MIN_W / STAGE_H ? Math.round(STAGE_H * aspect) : MIN_W;
  const h = aspect >= MIN_W / STAGE_H ? STAGE_H : Math.round(MIN_W / aspect);
  return { w, h, scale: height / h, safeX: Math.max(0, (w - SAFE_W) / 2) };
}

const measure = () => measureStage(window.innerWidth, window.innerHeight);

const StageContext = createContext<StageSize>(measureStage(1920, 1080));

/** The current stage size; changes when the window is resized. */
export function useStageSize(): StageSize {
  return useContext(StageContext);
}

/**
 * Fills the whole window with the game: lays every screen out in stage pixels and scales the
 * stage to the window height, like a game with resolution-independent UI.
 */
export function Stage(props: { children: ReactNode }) {
  const [size, setSize] = useState(measure);
  useEffect(() => {
    const onResize = () => setSize(measure());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <StageContext.Provider value={size}>
      <div className="stage-viewport">
        <div
          className="stage"
          style={
            {
              width: size.w,
              height: size.h,
              transform: `translate(-50%, -50%) scale(${size.scale})`,
              "--stage-w": `${size.w}px`,
              "--safe-x": `${size.safeX}px`,
            } as React.CSSProperties
          }
        >
          {props.children}
        </div>
      </div>
    </StageContext.Provider>
  );
}
