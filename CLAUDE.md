# Emberheir – rules for agents

Emberheir is a browser auto-battler with rogue-lite and prestige systems. All code is written
by Claude agents; the project owner (Timo) does not program. Talk to Timo in German, but use
**English** for all game terms (stats, items, skills, enemies) in code, data and UI.

## Where things are

| Path               | What                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------- |
| `docs/design/`     | Game design. Start with `game-design-document-v1.md`; finished plans live in `archiv/`. |
| `packages/sim`     | Pure game logic: combat, items, progression. Deterministic, seeded RNG.                 |
| `packages/content` | Declarative content: items, affixes, skills, enemies, acts.                             |
| `apps/web`         | React + Vite UI (PixiJS combat scene from M4 on).                                       |
| `tools/balance`    | CLI that simulates many fights and reports win rates / durations.                       |

The design docs in `docs/design/` are a snapshot. The live versions are in the project's shared
folder (`/mnt/project-files/design/`); copy changes over when a milestone depends on them.

## Architecture rules

- `sim` and `content` know nothing about React, the DOM or the browser. ESLint enforces this.
- The UI only reads state from `sim` and sends actions to it.
- All randomness goes through `Rng` from `@emberheir/sim` (`Math.random` and `Date.now` are
  banned in `sim`/`content`). Same seed + same input = same fight.
- New affixes, skills and enemies are **data** in `content`. New building blocks (conditions,
  effects, mechanics) in `sim` always get unit tests.
- Packages are consumed as TypeScript source (`exports` points to `src/index.ts`); there is no
  separate package build step.

## Every change

Run before pushing:

```sh
npm run check      # typecheck + lint + format check + unit tests
npm run test:e2e   # Playwright smoke tests (builds the web app)
```

- CI must be green. UI changes include a screenshot in the PR.
- Commit messages and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/):
  `<type>(<scope>): <summary>`, e.g. `feat(sim): add Heat bar`, `fix(web): ...`, `chore(ci): ...`.
  Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`, `style`.
  Scopes: `sim`, `content`, `web`, `balance`, `docs`, `ci`, or omit for repo-wide changes.
- Resolution independence (Timo): base is 1080p at 16:9. Screens are laid out in stage pixels
  (always 900 tall, width from the aspect ratio, see `apps/web/src/ui/Stage.tsx`), so 1080p and
  4K look identical. The game fills the window, no main view scrolls, and on ultrawide the
  controls stay in the centered 16:9 area (`var(--safe-x)`). `e2e/resolution.spec.ts` checks it.
- Use the UI tokens from `docs/design/ui-look-v1.md` (already defined in
  `apps/web/src/theme.css`). Light mode = Aged Parchment, dark mode = Scorched Parchment.
- Use PixiJS to the full (Timo): anything that happens in a fight should be visible in the
  arena, not only in numbers or the log. Every new skill, ailment, mechanic, enemy ability or
  act gets its own look via the effect toolkit in `apps/web/src/game/battle/` (`fx.ts`
  particles and shapes, `weather.ts` per-act air, `SKILL_FX`/`AILMENT_FX` in
  `ArenaScene.ts`). Prefer Pixi features (particles, filters, blend modes, meshes, camera)
  over plain shapes when they make it feel better. Effects stay visual only, never change the
  sim, respect the Screen shake setting and `prefers-reduced-motion`, and keep the arena smooth
  (particle cap, no effects for a Skip).

## Commands

```sh
npm install
npm run dev                          # web app at http://localhost:5173 (add ?dev for fight speed + Skip)
npm test                             # unit tests (Vitest)
npm run balance -- --runs 1000 --seed 42   # all PoC weapons vs. all Act 1 enemies
npm run balance -- --weapon sword --skills power-strike,flurry --enemy ashen-brute --level 3
npm run balance -- --gear all --level 3     # compare no gear vs. Normal/Magic/Rare/Epic gear
npm run balance -- --act 1 --runs 200      # autopilot plays run 1 (Act 1): deaths, level at boss, fight length
npm run balance -- --act 2 --runs 200      # ...then prestiges and plays run 2 (Act 1 + Rotwood)
npm run balance -- --act 2 --generations 3 # ...and a third run (acts open one per prestige)
npm run balance -- --act 7 --generations 7 --runs 12 --weapon staff  # all seven runs up to the Harvester
npm run format                       # Prettier
```

In the Claude Code cloud container Chromium is preinstalled; `@playwright/test` is pinned to
the matching version, do not run `playwright install` there.

## Preview

Every push to `main` deploys `apps/web` to GitHub Pages:
https://cedust.github.io/Emberheir/

Every PR gets its own preview at `https://cedust.github.io/Emberheir/pr-preview/pr-<n>/`
(`.github/workflows/pr-preview.yml`); a bot comment on the PR links it, and it is removed when
the PR is closed. Both are published to the `gh-pages` branch, which GitHub Pages serves. PR
previews keep their own save game and settings (`apps/web/src/storage.ts`), so they never touch
the main save.
