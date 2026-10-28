import { type ReactNode, useLayoutEffect, useRef, useState } from "react";

/**
 * Gives its content the space that is left and shrinks it as a whole when it needs more (never
 * grows it): a Boss Hoard with long Uniques stays on the screen instead of running under the
 * footer. The content keeps its own layout, only a scale is applied.
 */
export function FitBox(props: { children: ReactNode; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    // Layout sizes ignore transforms, so scaling never feeds back into the measurement.
    const fit = () => {
      const s = Math.min(
        1,
        box.clientHeight / Math.max(1, content.offsetHeight),
        box.clientWidth / Math.max(1, content.offsetWidth),
      );
      setScale(Math.floor(s * 1000) / 1000);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={outer} className={`fit-box${props.className ? ` ${props.className}` : ""}`}>
      <div
        ref={inner}
        className="fit-inner"
        style={scale < 1 ? { transform: `scale(${scale})` } : undefined}
      >
        {props.children}
      </div>
    </div>
  );
}
