# M11 „The Last Ember“: Umsetzung (PR #10)

Grundlage: GDD-Abschnitt „Finale: The Last Ember“, gegner-bosse-v1.md, story-texte-v1.md (Ende).
Offene Punkte aus dem GDD habe ich mit diesen Defaults entschieden:

## Defaults

- **10. Prestige:** keine Seal-Auswahl, alle 10 Slots sind gesiegelt, nichts verbrennt (Gear,
  Inventar, Stash, Währungen bleiben). Es gibt Seal 10, Ember, den letzten Ast und den Capstone,
  aber kein höheres Level Cap (GDD: „kein höheres Level Cap“, `levelCap` bleibt bei 200).
- Danach gibt es keine Ernte mehr: Der Harvester kann weiter gefarmt werden, ohne Prestige.
- **Eingang:** im Camp ein eigener Button „THE LAST EMBER“ über „Set Out“. Das Camp ist der
  Eingang, Respec, Skill Tree und Battle Plan gehen dort wie immer.
- **Ablauf:** 7 Stages. Stage 1–6 sind die Warden-Echos der Acts 1–6 in Reihenfolge, Stage 7 ist
  der Kern des Harvesters (`HARVESTER_CORE`): eine Phase, die heißer wird (Last Flame, Rekindle
  einmal, Last Harvest unter 50 %).
- **Echos:** Echo n hat n Boss-Abilities aus seiner Liste (höchstens 5), das Finale steigert sich
  also. Mit allen Abilities war Gorraks Echo als erster Kampf eine Wand.
- **Stärke:** feste Werte statt Run Pressure: Monster Level des letzten Harvesters (200),
  × 2 Life, × 1,4 Damage (`PROGRESSION.finale`).
- **Stolen Fire:** nach jedem Echo 1 aus 3 Boons, alle Familien offen, Fusion Boons deutlich
  häufiger (Gewicht 1 statt 0,35). Kein Loot, kein XP, kein Gold.
- **Tod und Retreat:** zurück ins Camp, die Boons verbrennen, beliebig viele Versuche
  (`legacy.finaleAttempts`). Heirlooms sind nie in Gefahr.
- **Ende:** Screen „THE FIRE IS HOME“ mit Prestiges, Versuchen, Kämpfen, Toden, Trophäen, Old Nans
  Satz aus story-texte-v1.md und einer Credit-Zeile. Danach zurück ins Camp, das Finale bleibt
  offen (`legacy.finaleWon`).

## Harvester in den Ascension-Runs

Der Harvester bekommt keine Boss-Abilities mehr, seine drei Phasen wachsen schon mit dem Run.
Mit ihnen war er in Run 8–10 eine Wand für die Wand (7–12 Tode, 50–83 % Clear). Er nimmt jetzt
70 % der Life- und 20 % der Damage-Pressure (`harvesterPressure`).

## Balance

`npm run balance -- --finale 1 --runs 6 --weapon <w>` (10 Runs, dann das Finale), Tode bis zum Sieg:

| | Sword | Wand |
| --- | --- | --- |
| Harvester Run 7 | 0,0 | 0,3 |
| Harvester Run 8 | 0,0 | 0,3 |
| Harvester Run 9 | 0,3 | 3,5 |
| Harvester Run 10 | 1,5 | 2,5 |
| The Last Ember | 0,8 (100 % Clear) | 2,8 (100 % Clear) |

- Ein Echo-Kampf dauert 27–28 s, der Kern 37–47 s (1,4- bis 1,7-mal so lang).
- Die meisten Tode im Finale passieren bei Gorraks Echo: der erste Kampf, noch ohne Boons.
- Der Autopilot spielt optimal, echte Spieler werden öfter sterben. Die Acts 1–6 der Runs 8–10
  schafft er fast ohne Tod; das ist der wichtigste Punkt für den Playtest.

## Screenshots

`docs/screenshots/m11-*.png`: Camp mit Eingang, Gauntlet zwischen den Stages, Echo-Kampf, Kern,
Inheritance nach dem 10. Prestige, Ende.
