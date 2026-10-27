# Economy-Audit v1 (26.10.2026)

Frage (Timo): Müssen wir die Economy noch balancen? Stand `main` 43204fd (nach Längere Runs Phase 1–5,
Hunts, Act-Beute, Balancing-Neustart).

## Kurzurteil

**Ja.** Ash, Acorns und Ember Coal sind ab Run 1–2 im Überfluss, Phoenix Feathers und Runes passen.
Die Ursache ist eine einzige: **Die Runs sind seit Längere Runs etwa 4–5× so lang (XP ×2, ×1,5, ×1,5,
Farm-Trips), aber jeder Kill zahlt noch so viel wie vorher, und die meisten Preise sind fest.**
Der Code-Kommentar an `CRAFTING` rechnet noch mit „100–150 Acorns pro Act 1“; gemessen sind es ~1.300.

## Messung

Autopilot, 6 Builds (sword-edge, axe-butcher, bow-toxin, dagger-cutthroat, wand-starfall, staff-smolder)
× Seeds 31/32, alle 7 Runs + The Last Ember. Der Autopilot craftet nicht (kein Temper, Reforge, Upgrade,
Gamble), also ist sein Wallet ≈ die Einnahmen. Probe und Rohdaten im Projektordner (`design/notes/economy/`).
Die Klassen liegen fast gleich, unten das Mittel.

Einnahmen im **neuesten Act** jedes Runs (Wand-Act, inkl. Tode und Farm-Trips) und Wallet am Ende des Runs:

| Run (neuester Act) | Acorns | Ash | Ember Coal | Feathers | Wallet am Ende: Acorns / Ash / Coal / Feathers |
|---|---|---|---|---|---|
| 1 (Act 1) | 1.350 | 1.590 | 84 | 4 | 1.340 / 1.590 / 84 / 4 |
| 2 (Act 2) | 4.700 | 5.000 | 100 | 7 | 6.400 / 7.200 / 200 / 13 |
| 3 (Act 3) | 8.600 | 9.900 | 130 | 8 | 17.000 / 19.500 / 360 / 24 |
| 4 (Act 4) | 15.000 | 19.000 | 200 | 11 | 37.000 / 44.000 / 620 / 39 |
| 5 (Act 5) | 26.000 | 34.000 | 180 | 14 | 72.000 / 93.000 / 870 / 58 |
| 6 (Act 6) | 37.000 | 52.000 | 200 | 14 | 123.000 / 164.000 / 1.160 / 79 |
| 7 (Act 7) | 50.000 | 67.000 | 230 | 14 | 198.000 / 262.000 / 1.500 / 100 |

Die alten Acts eines Runs bringen je nur ~2–4k Acorns/Ash und ~15–20 Coal; das Geld kommt aus dem
neuesten Act, wo man stirbt, farmt und lange bleibt.

## Was die Senken verlangen

Ein **eifriger Spieler** im neuesten Act von Run 7: 3 neue Items, je 20× Temper und 20× Reforge, 2 Sockets,
5 Gambles, alle Feathers als Upgrade.

| Währung | Einnahme im Act | eifriger Verbrauch | Verhältnis |
|---|---|---|---|
| Ash | 67.000 | ~700 (Temper 10, Socket 15×n) | **~90× zu viel** |
| Acorns | 50.000 | ~14.000 (Upgrades 60×Tier, 5 Gambles à 1.140, Temper 15) | **~3,5× zu viel**, oder ~44 Gambles |
| Ember Coal | 230 | ~60 (Reforge 1) | **~4× zu viel** |
| Phoenix Feathers | 14 | ~14 Upgrades; Tier-Lücke der getragenen Items 10–16 Tiers | passt |
| Runes | Pouch bleibt bei ~20–30 | Autopilot sockelt/kombiniert sie | passt |

Schon in **Run 1** reichen 1.590 Ash für ~150 Temper und 84 Coal für 84 Reforges. Weil alle Währungen das
Prestige überleben, sammelt sich der Überfluss über sieben Runs an (Ende: ~200k Acorns, ~260k Ash).

## Was daran schadet

1. **Min-Maxing ist ein Klick, kein Ziel.** Timos Regel: Wände fallen durch Level-Farmen und Gear-Min-Maxing.
   Wenn Temper und Reforge praktisch nichts kosten, ist jedes Item nach einem Camp-Besuch perfekt gerollt. Der
   langsame Gear-Hebel wird zum Sofort-Hebel, und Ash wird bedeutungslos (jede Ash-Zahl im UI ist Rauschen).
2. **Marisha schlägt das Item-Pick.** Gamble ist unbegrenzt, wählt den Slot selbst und hat bessere Odds als die
   Drops (55/30/12/3 % gegen 40/35/20/5 %, eine Stufe über dem Drop-Fenster, Uniques möglich). Mit ~44 Gambles pro
   Act ist der Camp-Shop später die beste Loot-Quelle, nicht der Kampf, die Hunts oder die Act-Beute.
3. **Feste Preise sind ab Run 3 egal:** Mastery-Respec 50, Capstone-Wechsel 200, Ashborn-Reset 2.000, Socket 25,
   Crucible 300 Ash. Nur der Tree-Respec (`respecAcorns`, „8 Kills auf Boss-Level“) und die Event-Preise wachsen mit.

## Vorschlag (Ursache statt Symptom)

Die Lösung steckt schon im Code: `respecAcorns` und `eventPrice` rechnen in **„Kämpfen wert“ auf dem aktuellen
Level**. Diese eine Regel für **alle** Preise, dann treibt das Level Einnahme und Preis gleich, egal wie lang ein
Run wird.

- **E1 Preise in Kämpfen wert.** Temper, Socket, Kindle, Crucible, Mastery-/Capstone-/Ashborn-Reset: Preis = N
  normale Kills auf dem Item Level (bei Items) oder Boss-Level des Runs (bei Resets). Startwerte so, dass ein
  eifriger Spieler im neuesten Act ~60–80 % seiner Ash und Acorns ausgibt.
- **E2 Ember Coal an die Run-Länge anpassen.** Der Drop pro Kill stammt aus der Zeit vor Längere Runs. Normale
  Gegner seltener (15 % → ~5 %), Elites/Bosse bleiben. Ziel: ~1–2 Reforges pro Slot und Act, also bleibt der
  Reforge eine Entscheidung.
- **E3 Marisha bekommt eine Grenze** (Timos Wahl):
  - a) **Preis steigt pro Gamble im selben Camp-Besuch** (z. B. +25 % je Gamble, zurück beim Aufbruch). Freiheit
    bleibt, aber 40 Gambles am Stück werden teuer. *Empfehlung.*
  - b) **Fester Vorrat** wie Marisha auf der Straße (z. B. 6 Angebote, neu bei jedem Aufbruch), D2-Stil.
  - c) Odds auf Drop-Niveau senken (keine Stufe darüber).
- **E4 Feathers und Runes bleiben**, sie sind die knappen Währungen, wie gewollt.
- **E5 Messbar machen:** `npm run balance -- --economy` zeigt Einnahmen und „eifrigen Verbrauch“ pro Act, damit jede
  spätere Änderung (XP, Run-Länge) die Economy mitprüft. Optional: der Autopilot craftet wie ein Spieler (Temper und
  Reforge mit Budget), dann zeigt die Messung auch, wie stark Min-Maxing die Tode senkt.

Wichtig: Wenn Temper/Reforge knapper werden, wird der Gear-Hebel langsamer. Die Act-Balance (3,25 Versuche)
misst der Autopilot **ohne** Crafting, sie bleibt also gleich; für Spieler wird das Spiel eher etwas schwerer, weil
„alles perfekt rollen“ wegfällt. Das passt zur Regel „Wände durch Min-Maxing“, nur dass Min-Maxing wieder Zeit kostet.

Nicht gemessen: Cinderglass (nur Wildfire), Bounties (der Autopilot nimmt keine), echte Spieler-Crafting-Gewohnheiten.

## Umsetzung (26.10.2026, Timo: E3 = Odds auf Drop-Niveau)

- **E1** `killPrice(level, kills)` in `leveling.ts`; alle Acorn-/Ash-Preise in Kills auf dem Item Level (Resets auf dem
  Boss-Level des Runs): Temper 1 Kill Acorns + 6 Kills Ash, Add Socket 2 + 3 × Socket-Zahl, Upgrade 1 Kill × Tier,
  Socket Rune ¼ × Rang, Combine ½ × Rang, Kindle 6 Kills Ash + 2 Coal, Heirloom-Respec wie Tree-Respec (8 Kills),
  Capstone 2 Kills, Crucible 20 Kills Ash + 3 Coal. Gamble war schon ≈ 6 Kills, Ashborn-Reset bleibt 2.000 (nur L100).
- **E2** Ember Coal: normale Gegner 15 % → 5 %, Elites 2–3 → 1–2, Bosse bleiben 4–6.
- **E3** Marisha würfelt wie die Karte eines normalen Gegners im Run (ohne Pity), Legendary/Unique so oft wie bei einem
  Elite (ab Run 5: 4 %). Vorher 55/30/12/3 % und eine Stufe über den Drops.
- **E5** Die Balance-CLI druckt im Act-Modus eine Economy-Tabelle (Einnahmen des neuesten Acts, Anteil des eifrigen
  Crafters).

## Nachmessung (gleiche 6 Builds × Seeds 31/32)

Einnahmen im neuesten Act und was der eifrige Crafter (3 Items × 20 Temper/20 Reforge, 2 Sockets, 5 Gambles, alle
Feathers als Upgrade) davon ausgibt:

| Run | Acorns | eifrig | Ash | eifrig | Coal | eifrig | Feathers |
|---|---|---|---|---|---|---|---|
| 1 | 1.520 | 160 % | 1.660 | 224 % | 54 | 112 % | 5 |
| 2 | 4.770 | 107 % | 4.960 | 158 % | 71 | 90 % | 7 |
| 3 | 9.100 | 96 % | 10.000 | 131 % | 88 | 74 % | 8 |
| 4 | 15.700 | 90 % | 19.200 | 89 % | 142 | 44 % | 11 |
| 5 | 27.100 | 81 % | 34.700 | 63 % | 128 | 47 % | 14 |
| 6 | 38.300 | 81 % | 51.900 | 53 % | 140 | 43 % | 13 |
| 7 | 50.700 | 84 % | 66.700 | 54 % | 153 | 41 % | 14 |

Vorher: Ash ~1 %, Acorns ~25 %, Coal ~25 % (Run 7). Jetzt kostet Min-Maxing wieder Zeit: In Run 1–3 reicht es nicht
für alles (genretypisch, früh zählt jede Münze), ab Run 4 bleibt etwas übrig, weil der neueste Act dann mehr Kämpfe hat.
Ember Coal bleibt am Ende der lockerste Rohstoff (~40 %), weil Elites in späten Acts häufiger sind.

**Act-Balance unverändert:** Versuche pro neuestem Act und Spielzeit sind identisch zu `main` (2,0 / 5,4 / 3,3 / 3,4 /
2,6 / 2,4 je Build), weil der Autopilot nicht craftet. Für Spieler wird das Spiel eher etwas schwerer, da „alles perfekt
rollen“ nicht mehr gratis ist.

Offen: Bounties und Cinderglass nicht gemessen; echte Crafting-Gewohnheiten beim Playtest beobachten.
