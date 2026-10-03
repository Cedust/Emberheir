# Legendary Items, Runes and Runewords (M8, v1)

Status: implemented on PR #10 (2026-10-02). Claude defaults, Timo has not decided these yet.
Numbers are Tier 1 starting values; the source of truth is `packages/content/src/legendary.ts`
and `PROGRESSION` / `CRAFTING` in `packages/sim/src/progression/constants.ts`.

## Sockets (D2 style)

- Every base has `maxSockets` (weapons 2-3, body armor 3-4, helms 2-3, shields 3).
- Normal drops get 1..max sockets with 60 % chance. Magic and better have none.
- Thoric adds a socket to a Normal item without runes (25 Gold + 15 Dust).
- Socketed runes are permanent. Reforge keeps sockets and runes.

## Runes

- Eight runes, ranked: Ash 1, Moss 2, Thorn 3, Venom 4, Ember 5, Rime 6, Volt 7, Dusk 8.
- Each rune has a weapon bonus (Main Hand) and an armor bonus (Off Hand, Helm, Body).
- Drops: normal enemies 6 %, Elites 50 %, bosses 1.5 runes on average. Highest rank =
  1 + 2 × Act Tier (Act 1 up to Thorn, Act 2 up to Ember); each rank is half as likely as the
  one below.
- Eldrin (Runesmith) joins after the first trip into the Rotwood and stays through Prestige.
  He sockets runes (8 Gold per rank) and combines three of a kind into the next rank
  (15 Gold per rank).
- Runes are lost on Prestige like gold; what was found stays in the Codex.

## Runewords

- A Normal item whose sockets are exactly filled with a recipe, in order, becomes a Runeword:
  gold name, the recipe's bonuses, triggers and rules on top of the rune bonuses.
- Ten words: Kindling, Splinter, Rotheart, Hearthfire, Warden, Bulwark, Bramble, Hearth,
  Embersight, Stormward (the last needs high runes and is a later goal).
- Codex at Eldrin: a word is revealed once all its runes were found, and marked "Forged" once
  made. Permanent through Prestige.

## Legendary Items and Uniques

- Legendary = Epic-like affixes plus one Legendary Power. Powers are rules that change how the
  fight plays (echo an ailment into another, execute low-Life enemies, DoT lifesteal, a trigger
  on the item, ...). 13 powers, each limited to fitting slots.
- Uniques: fixed name, base, affixes (rolled within a range), often a power and a flavor line.
  Eight for Acts 1-2. They cannot be reforged, tempered or imbued.
- Drops: bosses turn one loot card Legendary with 25 % chance, Elites with 4 %. Of those,
  35 % become a Unique when one fits the slot and item level.

## Marisha (Merchant)

- Open from the start of the game.
- Base Items: six Normal bases with full sockets, new stock after each trip
  (20 Gold + 15 per socket).
- Gamble: a random item for a chosen slot at the next act's boss level
  (60 + 12 × item level Gold). Rarity weights: Magic 55, Rare 30, Epic 12, Legendary 3.

## Balance

The autopilot does not use runes or gamble, so they are pure upside for the player. With the
new drops the first run stays easy: 0.2-1.3 deaths per act, 100 % clear
(`npm run balance -- --act 2 --runs 100`).
