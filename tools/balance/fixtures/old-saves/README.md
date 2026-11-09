# Old save games

One file per ended save version (`v1.json` … ): real saves the autopilot wrote with the game of
the **last commit of that version** (a Sword and a Staff hero, the 12th fight and the rewards of
the 40th). `src/old-saves.test.ts` loads each one in today's game.

The save format started over at version 1 with Release 1.0 (Timo 2026-11-09): the saves of the
test builds before it (versions 9 to 21) no longer load, so their files are gone.

When `SAVE_VERSION` goes up, add the file of the version that just ended: check out the last
commit before the bump in a worktree and run the autopilot there (`playGenerations` with seed 5 /
Sword and seed 7 / Staff, `upToAct: 2`, `generations: 2`; save fight 12 as it is and fight 40
after `resolveFight`), then write `{ "version": SAVE_VERSION, "saves": [{ "label", "save" }] }`.
