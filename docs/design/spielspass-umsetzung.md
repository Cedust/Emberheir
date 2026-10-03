# Spielspaß-Plan: Umsetzung (PR #10)

Grundlage ist der Plan „Emberheir: Boons, Battle Plan, Drop-Momente (Design v1)“, den Timo am
2026-10-03 freigegeben hat („passt so“, „Spielspaß first“). Reihenfolge wie angekündigt:
Teil 2 → Teil 3 → Teil 1 → Ember Thief. Danach kommt M11 „The Last Ember“.

## Defaults (Empfehlungen aus dem Plan, Timo genannt)

- Boons aus dem aktuellen Act verbrennen bei Tod und Retreat; Boons aus geschafften Acts bleiben.
  Revisit Act gibt keine Boons, Prestige verbrennt alle.
- Kaelen (Skill Tree, Battle Plan) ist ab dem ersten Camp offen.
- Alle Loot-Karten liegen verdeckt. Normal und Magic drehen sich schnell, ab Rare mit Glow und
  Pause, Legendary und Unique mit Lichtsäule.
- Namen bleiben: Stolen Fire, Ember Shrine, Trophy Wall, Boss Hoard, Ember Thief.

## Teil 2: Battle Plan schneller ausbauen

| Wann | Freischaltung |
| --- | --- |
| Run 1 | Rotation Slot 1 (Tutorial) |
| Prestige 1 | Rotation Slot 2, Reaction Slot 1 (Fight Start, Life below X %, Enemy Telegraph) |
| Prestige 2 | Rotation Slot 3, Trigger Threshold |
| Prestige 3 | Slot Modifiers |
| Prestige 4 | Reaction Slot 2, neue Reactions (Enemy below 30 %, Ailment, Enemy heals, Barrier breaks, 5+ Stacks) |
| Prestige 5 | Rotation Slot 4 |
| Prestige 6 | Rotation Conditions |
| Prestige 7 | 2. Slot Modifier |
| Prestige 8 | Opening Move (Skill feuert gratis zu Kampfbeginn) |
| Prestige 9 | Seltene Modifier (Reverb) |
| Prestige 10 | Capstone |

- Der Battle Plan lässt sich zwischen Stages ändern („Edit Battle Plan“ im Intermission-Screen),
  nicht im Kampf. Der Skill Tree bleibt im Camp.
- Nach jedem Kampf zeigt der Plan pro Slot den Schadensanteil und wie oft Reactions feuerten
  (`fightReport` in `packages/sim/src/combat/report.ts`).
- Alte Spielstände (v6) bekommen die Slots der neuen Leiter.

## Teil 3: Drop-Momente

- **Boss-Trophäen:** 13 neue Uniques mit festem Boss (`bossOf`), dazu Gorrak's Knuckles und Rotfang.
  10 % pro Boss-Kill, die Trophäen-Powers gibt es nur auf Uniques (`uniqueOnly`).
- **Trophy Wall** im Hearthfire (Legacy → Trophy Wall): eine Reihe pro Warden plus „Wanderers“.
- **Boss Hoard:** 6 verdeckte Karten, 2 nehmen, der Rest wird Dust.
- **Hohe Runes:** die oberen zwei Ranks nur von Elites und Bossen, zusätzlich × 0,3.
- **Inszenierung:** verdeckte Karten, Aufdecken nach Rarity, 6 Sounds per Web Audio (Flip, Rare,
  Legendary, Unique, Rune, hohe Rune; im Menü abschaltbar), Boss-Slow-Motion unter 8 % Life.

## Teil 1: Stolen Fire Boons

- **Ember Shrine** nach den Spoils von Stage 5 und 10, nach Elites und nach dem Act-Boss (nicht
  beim Harvester-Boss, der direkt zum Prestige führt): 1 aus 3 Boons.
- **Familien:** Hearth (immer), Ash (Act 1), Rot (Act 2), Cinder (Act 3), Rime (Act 4), Storm
  (Act 5), Void (Act 6). Je 8 Boons, dazu 7 Fusion Boons (`packages/content/src/boons.ts`).
- **Slots:** Strike, Skill, Reaction, Heat halten je eine Boon (neue ersetzt alte); Trigger und
  Passive stapeln. Reaction-Boons erst ab Prestige 1.
- **Rang und Grade:** dieselbe Boon erneut erhöht den Rang (I–III, je +50 %). Grade Spark/Flame/
  Blaze (80/17/3) wirken × 1 / 1,3 / 1,6; bei Ailment- und Extra-Attack-Boons steigt die Chance.
- **Angebot:** Familien, die zum Damage Type der Waffe passen (und Hearth), sind × 2,3 wahrscheinlicher.
- **UI:** Shrine-Karten in Familienfarbe mit Rang-Pips, Blaze leuchtet; Boon-Leiste unter dem Helden
  im Kampf (leuchtet beim Auslösen) und in der Helden-Karte zwischen den Stages.

## Ember Thief

- Ab Act 2 auf normalen Stages mit 3 % statt des normalen Gegners. Flieht nach 15 s
  (`fleeAfter` im Sim, Kampf endet mit `fled`).
- Gefangen: kleiner Hoard, 4 Karten, 2 nehmen, eine Karte mindestens Rare.
- Entkommen: Die Stage zählt trotzdem, mit den normalen 3 Karten.
- Im Kampf ein Countdown „Flees in Xs“, der Dieb trägt einen leuchtenden Beutesack.

## Balance

Änderungen: Act-Bosse haben × 1,5 Life (`PROGRESSION.bossLife`, nicht der Harvester), die Run
Pressure steigt auf + 80 % Life und + 35 % Damage pro Act nach dem ersten, der Harvester nimmt nur
die Hälfte der Damage-Pressure (`harvesterPressure`).

`npm run balance -- --act 7 --generations 7 --runs 12` (alle Runs werden geschafft), jeweils der
neueste Act des Runs:

| Run | neuester Act | Tode Sword | Tode Wand | normaler Kampf | Boss-Kampf |
| --- | --- | --- | --- | --- | --- |
| 1 | Ashen Fields | 0,4 | 0,8 | 25–29 s | 41–47 s |
| 2 | Rotwood | 0,2 | 0,5 | 21–25 s | 33–37 s |
| 3 | Ember Wastes | 0,0 | 0,0 | 21 s | 40–45 s |
| 4 | Frost Peaks | 0,0 | 0,0 | 21–22 s | 53–60 s |
| 5 | Storm Spires | 0,0 | 0,0 | 18–30 s | 36–58 s |
| 6 | Void Rift | 0,0 | 0,0 | 19–26 s | 39–57 s |
| 7 | Emberfall (Harvester) | 0,8 | 7,3 | 24–33 s | 38–49 s |

- Boss-Kämpfe dauern jetzt 1,5- bis 2,8-mal so lang wie normale Kämpfe (Ziel ≥ 1,5).
- Die Tode in Run 2 bis 7 passieren fast nur in Act 1, also im Regear-Fenster zu Beginn eines
  Runs (0,1–0,8 pro Run). Die neuesten Acts der mittleren Runs schafft der Autopilot ohne Tod;
  der Autopilot wählt immer das beste Item und passende Boons, Spieler eher nicht. Das ist der
  wichtigste Punkt für den Playtest.
- Der Harvester bleibt die Hürde für die Wand (vorher 5,9 Tode, jetzt 7,3), die Sword schafft
  ihn mit 0,8.
- Ember Thief: 3 % der normalen Stages ab Act 2, der Autopilot fängt ihn in 20–100 % der Fälle
  (je nach Waffe und Act).
