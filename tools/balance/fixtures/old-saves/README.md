# Old save games

One file per save version since the Klassengerüst (`v9.json` … ): real saves the autopilot wrote
with the game of the **last commit of that version** (a Sword and a Staff hero, the 12th fight
and the rewards of the 40th). `src/old-saves.test.ts` loads each one in today's game.

When `SAVE_VERSION` goes up, add the file of the version that just ended: check out the last
commit before the bump in a worktree and run the autopilot there (`playGenerations` with seed 5 /
Sword and seed 7 / Staff, `upToAct: 2`, `generations: 2`; save fight 12 as it is and fight 40
after `resolveFight`), then write `{ "version": SAVE_VERSION, "saves": [{ "label", "save" }] }`.
