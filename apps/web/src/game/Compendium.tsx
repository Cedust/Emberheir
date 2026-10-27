import type { GameState } from "@emberheir/sim";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "../ui/Icon";
import { isTypingTarget } from "../ui/kit/hotkeys";
import { Medallion, Window, WindowHeader, WindowLayer } from "../ui/kit/Window";
import { playUiSound } from "../ui/sound";
import { PersonaPortrait } from "./camp/art/PersonaArt";
import { CHAPTERS, type CompendiumChapter } from "./compendium/chapters";

/** The page open when the Compendium closed: it opens there again. */
let lastPage: string | undefined;

/**
 * The chapters and the pages this Heir may read. What the game has not shown yet stays locked: its
 * place shows, its name does not (no spoilers).
 */
function readableChapters(state: GameState): CompendiumChapter[] {
  return CHAPTERS.map((c) => ({
    ...c,
    pages: c.pages.filter((p) => !p.when || p.when(state)),
  }));
}

const LOCKED = "Not found yet.";

/**
 * Old Nan's Compendium: chapters on the left (a chapter unfolds its pages when picked), the page
 * on the right, written with the painted icons. Arrow keys turn the pages.
 */
export function Compendium(props: { state: GameState; onClose: () => void }) {
  const chapters = useMemo(() => readableChapters(props.state), [props.state]);
  const pages = chapters.flatMap((c) => c.pages.map((p) => ({ chapter: c, page: p })));
  const [pageId, setPageId] = useState(
    () => pages.find((p) => p.page.id === lastPage)?.page.id ?? pages[0]?.page.id,
  );
  const index = Math.max(
    0,
    pages.findIndex((p) => p.page.id === pageId),
  );
  const current = pages[index];
  const [openChapter, setOpenChapter] = useState(current?.chapter.id);
  const art =
    typeof current?.page.art === "function" ? current.page.art(props.state) : current?.page.art;

  const show = (id: string | undefined) => {
    const target = pages.find((p) => p.page.id === id);
    if (!target || target.page.id === pageId) return;
    lastPage = target.page.id;
    setPageId(target.page.id);
    setOpenChapter(target.chapter.id);
    playUiSound("tab");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target)) return;
      const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      show(pages[Math.min(pages.length - 1, Math.max(0, index + step))]?.page.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <WindowLayer>
      <Window
        label="Compendium"
        role="dialog"
        className="compendium-window"
        header={
          <WindowHeader
            title="Compendium"
            sub="Old Nan's notes on how the ash works"
            medallion={
              <Medallion tint="#4a3a52">
                <PersonaPortrait id="nan" />
              </Medallion>
            }
            onClose={props.onClose}
          />
        }
      >
        <div className="cp-body">
          <nav className="cp-nav" aria-label="Chapters">
            {chapters.map((c, ci) => {
              if (c.pages.length === 0)
                return (
                  <div key={c.id} className="cp-chapter locked" title={LOCKED}>
                    <button type="button" className="cp-chapter-head" disabled>
                      <span className="cp-chapter-icon">
                        <Icon name="lock" size={22} />
                      </span>
                      <span className="cp-chapter-title">Locked</span>
                    </button>
                  </div>
                );
              const open = c.id === openChapter;
              const all = CHAPTERS[ci]?.pages ?? [];
              return (
                <div key={c.id} className={`cp-chapter${open ? " open" : ""}`}>
                  <button
                    type="button"
                    className="cp-chapter-head"
                    aria-expanded={open}
                    onClick={() => {
                      if (open) {
                        setOpenChapter(undefined);
                        return;
                      }
                      setOpenChapter(c.id);
                      if (current?.chapter.id !== c.id) show(c.pages[0]?.id);
                    }}
                  >
                    <span className="cp-chapter-icon">
                      {typeof c.icon === "function" ? c.icon(props.state) : c.icon}
                    </span>
                    <span className="cp-chapter-title">{c.title}</span>
                    <span className="cp-chevron" aria-hidden="true" />
                  </button>
                  <div className="cp-pages">
                    <ul>
                      {all.map((p) =>
                        c.pages.includes(p) ? (
                          <li key={p.id}>
                            <button
                              type="button"
                              tabIndex={open ? 0 : -1}
                              className={`cp-page-link${p.id === current?.page.id ? " on" : ""}`}
                              onClick={() => show(p.id)}
                            >
                              {p.title}
                            </button>
                          </li>
                        ) : (
                          <li key={p.id} title={LOCKED}>
                            <span className="cp-page-link locked">
                              <Icon name="lock" size={13} />
                              Locked
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
          </nav>
          {current && (
            <article className="cp-page" key={current.page.id}>
              <header className="cp-page-head">
                <span className="cp-page-chapter">{current.chapter.title}</span>
                <h2 className="title-font">{current.page.title}</h2>
              </header>
              {art && <div className="cp-page-art">{art}</div>}
              <div className="cp-page-text">{current.page.body(props.state)}</div>
            </article>
          )}
        </div>
      </Window>
    </WindowLayer>
  );
}
