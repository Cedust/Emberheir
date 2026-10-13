# Balance-Messung v1: Runes im Autopilot, Tode und Kampfdauer je Stage-Art

Stand 13.10.2026 · Phase 1 der Neuausrichtung (`neuausrichtung-v1.md` Abschnitt 10 und 11) · Game-Begriffe auf Englisch

Phase 1 baut das Messwerkzeug, ändert aber keine Balance. Dieses Dokument hält fest, was die Balance-CLI jetzt misst,
wie stark Runes die Zahlen verschieben und mit welchen Startwerten Phase 2 beginnt.

---

## 1. Was neu gebaut ist

### 1.1 Autopilot mit Runes (`tools/balance/src/runes.ts`)

| Schritt | Regel |
|---|---|
| **Basen behalten** | Bietet ein Kampf kein Upgrade, nimmt der Autopilot eine Normal-Karte mit, wenn ein Runeword-Rezept dafür bereitliegt (Runes im Beutel, notfalls durch Kombinieren) und die Basis neuer ist als die behaltene. Pro Slot bleibt die neueste Basis, Thoric salvaget den Rest. Erst wenn Nyssa mitreist. |
| **Runewords** | Im Camp probiert er jedes passende Rezept auf jeder Normal-Basis (Sockets bei Nyssa dazu, Runes rein) und schmiedet das, das den Helden am meisten verbessert, solange eins hilft. |
| **Einzelne Runes** | Ein getragenes Normal-Item mit freien Sockets bekommt die Rune, die dem Build am meisten bringt. |
| **Kombinieren** | Drei gleiche Runes werden zur nächsten, sobald mehr als zwei übrig sind (zwei bleiben für Rezepte). |
| **Maßstab** | „Besser" heißt dasselbe wie bei jedem Gear-Pick: Schaden am Training Dummy mal effektive Life gegen den kommenden Act (`gear-value.ts`). So nimmt jeder Build die Runes, von denen er lebt, ohne feste Build-Tags. |
| **Bleibt draußen** | Reforge, Temper, Kindle. Die Zahlen bleiben dadurch bewusst etwas pessimistisch. |

`--runes 0` misst ohne Runes (genau das alte Verhalten, mit gleichem Seed Tod für Tod identisch).

### 1.2 Messung je Stage-Art (`tools/balance/src/newest.ts`)

Jeder Kampf trägt seine Stage-Art: **normal**, **Elite**, **Gatekeeper** (Stage 5 und 10 im neuesten Act), **Boss**.
Für den neuesten Act jedes Runs zeigt die CLI Anläufe, Anteil der Tode und Median/p90 der Kampfdauer je Art, pro
Build und für alle Builds zusammen, mit den Zielen aus `neuausrichtung-v1.md` 5.3 und 5.5 (✓ im Ziel, ↑ zu niedrig,
↓ zu hoch). Dazu eine Zeile für die alten Acts jedes Runs.

```sh
npm run balance -- --act 7 --build all --runs 3 --seed 31 --newest 1             # mit Runes
npm run balance -- --act 7 --build all --runs 3 --seed 31 --newest 1 --runes 0   # ohne
npm run balance -- --act 7 --build all --runs 3 --seed 31 --json out.json        # Rohdaten
```

---

## 2. Messaufbau

15 Builds × 3 Läufe (Seeds 31–33), Run 1 bis Run 7 (bis Act 7, The Ashen Harvester), 30 Anläufe pro Act erlaubt.
**Anläufe** = Tode + 1 bis zum Boss-Sieg im neuesten Act. Code-Stand `main` nach PR #29.

---

## 3. Wirkung der Runes auf die Anläufe

### 3.1 Alle Builds zusammen, je neuestem Act

| Neuester Act | Anläufe ohne Runes | mit Runes | Änderung |
|---|---|---|---|
| Act 1 (Run 1) | 1,0 | 1,0 | – (Nyssa kommt erst in Act 2) |
| Act 2 (Run 2) | 5,9 | 4,3 | −27 % |
| Act 3 (Run 3) | 5,4 | 2,8 | −48 % |
| Act 4 (Run 4) | 5,0 | 2,6 | −48 % |
| Act 5 (Run 5) | 5,7 | 3,3 | −42 % |
| Act 6 (Run 6) | 5,7 | 3,8 | −33 % |
| Act 7 (Run 7) | 6,3 | 3,6 | −43 % |
| **Run 2–7** | **5,7** | **3,4** | **−40 %** |

Tode im neuesten Act gesamt: 1280 ohne, 645 mit Runes. Alle 45 Läufe schaffen den Harvester in beiden Fällen
(ohne Runes blieb ein Void-Lauf einmal in Act 6 hängen).

### 3.2 Je Build (Anläufe pro neuestem Act, Run 2–7)

| Build | ohne | mit | Änderung | schwerster Act ohne | mit |
|---|---|---|---|---|---|
| sword (unbroken) | 6,8 | 2,6 | −62 % | 10,7 | 4,7 |
| fire-wand (storm) | 6,3 | 2,6 | −60 % | 14,0 | 3,7 |
| mace (smasher) | 6,4 | 2,7 | −57 % | 12,7 | 4,3 |
| staff (void) | 7,4 | 3,3 | −55 % | 14,0 | 7,7 |
| fire-wand (fire) | 7,6 | 3,7 | −51 % | 12,0 | 6,7 |
| staff (pyre) | 5,4 | 2,9 | −46 % | 12,0 | 4,0 |
| sword (bleeder) | 6,9 | 3,8 | −46 % | 10,3 | 6,3 |
| fire-wand (frost) | 4,4 | 2,6 | −42 % | 7,0 | 5,3 |
| dagger (assassin) | 4,8 | 3,1 | −36 % | 10,0 | 6,0 |
| bow (venom) | 5,2 | 3,7 | −29 % | 10,0 | 6,3 |
| bow (barbs) | 5,3 | 3,7 | −29 % | 9,0 | 8,0 |
| staff (rot) | 5,5 | 4,3 | −22 % | 10,7 | 10,3 |
| crossbow (marksman) | 4,8 | 3,8 | −21 % | 7,7 | 6,0 |
| axe (bleed) | 5,4 | 4,4 | −19 % | 8,0 | 6,3 |
| dagger (poison) | 4,1 | 3,6 | −12 % | 6,3 | 6,7 |

Am Ende von Run 7 getragen (45 Läufe): Kindling 47×, Hearth 28×, Rotheart 26×, Bramble 13×, Splinter 10×,
Embersight 5×. Fast jeder Held trägt zwei bis drei Runewords.

**Befunde:**

1. **Runes sind ein großer Hebel, kein kleiner.** Sie senken die Anläufe um 40 %, bei Builds mit schwachen Wänden
   (Storm, Unbroken, Smasher, Void) um mehr als die Hälfte. Die alten Zahlen (Ziel 6–8 Anläufe) unterschätzten echte
   Spieler deutlich, genau wie in `neuausrichtung-v1.md` 10 vermutet.
2. **Runewords auf Normal-Basen schlagen Rare und Epic.** Kindling (Ash + Moss, die häufigsten Runes) ist auf fast
   jedem Helden, auch auf Castern (Life und Lifesteal). Weil Runewords mit dem Tier der Basis wachsen, bleiben sie bis
   Run 7 vorn. Das ist für Phase 4/5 (Gear bekommt mehr Gewicht) ein Punkt: Runewords sollten ein Ziel sein, aber
   nicht das Gear-Spiel ersetzen.
3. **Die Spreizung sinkt:** Ohne Runes reichen die Builds von 4,1 bis 7,6 Anläufen, mit Runes von 2,6 bis 4,4.
   Runes gleichen schwache Builds stärker aus als starke.
4. Mit Runes liegt der Durchschnitt bei **3,4 Anläufen** pro neuestem Act, also klar unter dem alten Ziel 6–8.
   Die neue Basis für alle weiteren Phasen ist deshalb **„mit Runes"**.

---

## 4. Wo die Tode heute passieren (neuester Act, mit Runes)

| Neuester Act | Tode | normal | Elite | Gatekeeper | Boss |
| ------------ | ---- | ------ | ----- | ---------- | ---- |
| Act 2 | 148 | 1 % | 0 % | 9 % | 89 % |
| Act 3 | 82 | 0 % | 0 % | 1 % | 99 % |
| Act 4 | 70 | 1 % | 7 % | 33 % | 59 % |
| Act 5 | 104 | 0 % | 1 % | 53 % | 46 % |
| Act 6 | 125 | 2 % | 5 % | 62 % | 31 % |
| Act 7 | 115 | 1 % | 1 % | 37 % | 62 % |
| **alle** | **645** | **1 %** | **2 %** | **33 %** | **64 %** |
| **Ziel (5.3)** | | 5–15 % | 10–20 % | 20–30 % | 35–55 % |

Ohne Runes fast gleich: normal 1 %, Elite 3 %, Gatekeeper 30 %, Boss 66 %. In den alten Acts eines Runs stirbt
niemand (0 Tode in 45 × 21 alten Acts).

Hinweis zur Messung: Ein entkommener Ember Thief ist kein Tod. Ein erster Probelauf hatte ihn mitgezählt und so
normale Stages mit 17 % viel zu gefährlich aussehen lassen.

**Befunde:**

1. Die Aussage „90–100 % der Tode am Boss" (`neuausrichtung-v1.md` 1.1) gilt für **Run 2 und 3** (89–99 %). Ab Run 4
   töten die **Gatekeeper** ein Drittel bis fast zwei Drittel, weil die Wand dort mit 50 % schon sehr stark ist.
2. **Normale Stages und Elites sind keine Gefahr** (1 % und 2 %). Die Zermürbung aus 5.4 greift heute nicht: Wer bis
   zum Gatekeeper kommt, kommt dort mit fast voller Life an.
3. Die Spannung sitzt also auf **zwei** Kämpfen pro Act (Gatekeeper, Boss), nicht auf einem. Der Sägezahn muss vor
   allem die normalen Stages und Elites anheben, die Gatekeeper ab Run 4 eher senken.

---

## 5. Wie lange die Kämpfe dauern (Sekunden, Median / p90, mit Runes)

| Wo | normal | Elite | Gatekeeper | Boss |
|---|---|---|---|---|
| neuester Act 2 | 12 / 20 | 17 / 28 | 16 / 25 | 25 / 40 |
| neuester Act 3 | 17 / 30 | 25 / 43 | 25 / 41 | 44 / 68 |
| neuester Act 4 | 27 / 48 | 42 / 97 | 40 / 67 | 103 / 170 |
| neuester Act 5 | 29 / 52 | 46 / 76 | 40 / 71 | 65 / 137 |
| neuester Act 6 | 31 / 56 | 47 / 82 | 38 / 72 | 98 / 168 |
| neuester Act 7 | 32 / 57 | 52 / 100 | 42 / 90 | 60 / 105 |
| **neueste Acts gesamt** | **20 / 45** | **35 / 78** | **29 / 64** | **42 / 125** |
| alte Acts eines Runs | 13 / 27 | 21 / 41 | – | 33 / 70 |
| **Ziel (5.5)** | 20–30 | 35–50 | 45–70 | 60–100 |

**Befunde:**

1. **Alte Acts sind zu kurz** (normal 13 s, Elite 21 s, Boss 33 s). Das ist der Leerlauf aus 1.1: Die Monster liegen
   weit unter dem Helden. Das Welt-Band (5.1) behebt das zum größten Teil schon ohne mehr Gegner-Life.
2. **Die neuesten Acts streuen stark:** Run 2 und 3 sind kurz (normal 12–17 s, Boss 25–44 s), ab Run 4 liegen normale
   Kämpfe schon im Ziel und Bosse teils darüber (Act 4 und 6: ~100 s Median, p90 170 s).
3. **Gatekeeper sind zu kurz** (29 s statt 45–70 s): Sie haben heute nur die halbe Wand.
4. Ein einziger Faktor pro Stage-Art passt deshalb nicht für alle Runs. Die frühen Runs brauchen mehr Länge als die
   späten.

---

## 6. Phase 2: Startwerte und erste Messung

Phase 2 ist begonnen. Alle vier Hebel sind gebaut und mit Konstanten in `PROGRESSION` einstellbar
(`worldBelowCap`, `wall.gates`, `wall.ramps`, `fightLength`, `hearthEmbers`):

| Hebel | gebaut | Startwert |
| --- | --- | --- |
| **Welt-Band** (5.1) | `levelBand`: Act 1 startet 5 unter dem Level Cap des vorigen Runs | Band 15→20, 25→30, 35→45, 50→60, 65→75, 80→90 |
| **Sägezahn** (5.3) | `stageWall` / `sawtoothShare`: Rampe je Strecke, Gatekeeper als Spitze | normal 15→30 %, 25→35 %, 30→40 %; Gatekeeper 40 % / 45 %; Boss 100 % |
| **Kampfdauer** (5.5) | `fightLength`: mehr Gegner-Life je Stage-Art (alle Acts eines Runs, nicht Finale/Wildfire) | Life normal ×1,2, Elite ×1,3, Gatekeeper ×1,4, Boss ×1,3; Boss-Schaden ×0,9 |
| **Hearth Embers** (5.4) | gewonnener Waymark vor dem Boss heilt, Anzeige in der Intermission | +25 % Life |

### 6.1 Warum nicht die Zahlen aus 5.3?

Die Tabelle in 5.3 war als Anteil der Wand gedacht. Die Wand ist aber 5- bis 8-mal so stark wie ein normaler Gegner
(Run 2: ×8,3). Normale Stages auf 35–75 % davon heben ihren Schaden auf das 3,5- bis 6,5-Fache. Probelauf A mit genau
diesen Werten: Clear-Rate in Act 4 und 7 unter 100 %, Kämpfe im späten Run doppelt so lang wie das Ziel (normal
50 s, Boss 150–180 s), und der Boss trägt fast keine Tode mehr, weil die Helden vorher fallen. Die Form (Zähne)
bleibt, die Höhe ist gedämpft.

### 6.2 Probeläufe (15 Builds × 3 Läufe, Seeds 31–33, mit Runes, neueste Acts gesamt)

| Lauf | Sägezahn normal / Gatekeeper | Life normal/Elite/Gate/Boss | Anläufe | Tode normal / Elite / Gate / Boss | Kampf s (Median) normal / Elite / Gate / Boss |
| --- | --- | --- | --- | --- | --- |
| heute | 0→30 % / 50 % | 1 / 1 / 1 / 1 | 3,05 | 1 / 2 / 33 / 64 % | 20 / 35 / 29 / 42 |
| C | 0→30 % / 50, 55 % | 1,2 / 1,3 / 1,4 / 1,3 | 3,05 | 1 / 3 / 44 / 52 % | 23 / 44 / 38 / 51 |
| **D (Startwert)** | **15→40 % / 40, 45 %** | **1,2 / 1,3 / 1,4 / 1,3** | **3,15** | **9 / 12 / 29 / 50 %** ✓ | **28 ✓ / 49 ✓ / 38 / 53** |
| Ziel | | | | 5–15 / 10–20 / 20–30 / 35–55 % | 20–30 / 35–50 / 45–70 / 60–100 |

(Probeläufe A und B liefen noch mit dem Zählfehler beim Ember Thief und sind nur als Richtung brauchbar: A wie 6.1,
B mit Gatekeepern auf 60/70 % war an den Gatekeepern zu tödlich.)

**Lauf D je neuestem Act:**

| Act | Anläufe | Tode normal / Elite / Gate / Boss | Kampf s normal / Elite / Gate / Boss |
| --- | --- | --- | --- |
| 2 | 4,4 | 5 / 0 / 12 / 84 % | 16 / 28 / 21 / 27 |
| 3 | 2,4 | 0 / 0 / 0 / 100 % | 23 / 36 / 32 / 54 |
| 4 | 2,3 | 4 / 19 / 32 / 46 % | 41 / 67 / 54 / 137 |
| 5 | 4,0 | 7 / 11 / 47 / 34 % | 38 / 54 / 48 / 85 |
| 6 | 3,6 | 15 / 26 / 37 / 22 % | 41 / 62 / 49 / 114 |
| 7 | 4,3 | 18 / 16 / 34 / 32 % | 41 / 58 / 54 / 73 |

Alte Acts eines Runs: normale Kämpfe 13 → 17 s, Boss 33 → 46 s, weiterhin 0 Tode. Anläufe je Build (Run 2–7):
2,4 (frost) bis 4,6 (unbroken), schwerster einzelner Act 13 (rot, Act 6).

### 6.3 Was als Nächstes in Phase 2 kommt

1. **Run 2 und 3 sind noch eine Klippe** (Boss 84–100 % der Tode, Kämpfe kurz). Die Wand-Stärke 8,3 / 6,3 sitzt fast
   ganz am Boss. Vorschlag: Sägezahn-Anteile pro Run (in Run 2–3 Gatekeeper höher, ab Run 5 niedriger) statt einer
   Tabelle für alle.
2. **Boss-Länge je Run:** früh 27–54 s, spät 85–137 s. Statt eines festen Faktors ×1,3 ein Faktor, der zu Run 2–3
   steigt (~×1,8) und in Run 4–6 bei ×1,0 liegt.
3. **Gatekeeper** sind mit 38 s noch kürzer als das Ziel (45–70 s): Life ×1,6, dafür Anteil 35 %.
4. **Alte Acts** bleiben mit 17 s unter dem Ziel 20–30 s. Wenn sie länger werden sollen, gilt für sie ein eigener
   Life-Faktor (~×1,4). Das kostet Spielzeit, darum erst nach Timos Gefühl beim Spielen.
5. **Frage an Timo:** Mit Runes braucht ein Build im Schnitt **3 Anläufe** pro neuestem Act statt der alten 6–8. Soll
   das neue Ziel 3–5 sein (Runes gehören zum Spiel), oder sollen die Wände wieder auf 6–8 steigen (Wand-Stärke etwa
   ×1,3)? Bis zur Antwort bleibt die Wand-Stärke unverändert.
