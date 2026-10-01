# Emberheir – rules for agents

Emberheir is a browser auto-battler with rogue-lite and prestige systems. All code is written
by Claude agents; the project owner (Timo) does not program. Talk to Timo in German, but use
**English** for all game terms (stats, items, skills, enemies) in code, data and UI.

## Where things are

| Path               | What                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------ |
| `docs/design/`     | Game design. Start with `game-design-document-v1.md` and `poc-umsetzungsplan-v1.md`. |
| `packages/sim`     | Pure game logic: combat, items, progression. Deterministic, seeded RNG.              |
| `packages/content` | Declarative content: items, affixes, skills, enemies, acts.                          |
| `apps/web`         | React + Vite UI (PixiJS combat scene from M4 on).                                    |
| `tools/balance`    | CLI that simulates many fights and reports win rates / durations.                    |

The design docs in `docs/design/` are a snapshot. The live versions are in the project's shared
folder (`/mnt/project-files/design/`); copy changes over when a milestone depends on them.
When `stat-liste-v1.md` and `stat-liste-v2.md` disagree, v2 wins.

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
- Use the UI tokens from `docs/design/ui-look-v1.md` (already defined in
  `apps/web/src/theme.css`). Light mode = Aged Parchment, dark mode = Scorched Parchment.

## Commands

```sh
npm install
npm run dev                          # web app at http://localhost:5173
npm test                             # unit tests (Vitest)
npm run balance -- --runs 1000 --seed 42   # all PoC weapons vs. all Act 1 enemies
npm run balance -- --weapon sword --skills power-strike,flurry --enemy ashen-brute --level 3
npm run format                       # Prettier
```

In the Claude Code cloud container Chromium is preinstalled; `@playwright/test` is pinned to
the matching version, do not run `playwright install` there.

## Preview

Every push to `main` deploys `apps/web` to GitHub Pages:
https://cedust.github.io/Emberheir/
