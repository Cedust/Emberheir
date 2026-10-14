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

---

## 7. Phase 3 und 4: Messung und Nachstellen (Stand nach Lauf G)

Timo (13.10.): **neues Ziel 3–5 Anläufe** pro neuestem Act, weil Runes zum Spiel gehören. Alle Läufe wie oben: 15 Builds
× 3 Läufe, Seeds 31–33, bis Act 7, mit Runes.

| Lauf | was | Anläufe | Tode normal / Elite / Gate / Boss | Kampf s normal / Elite / Gate / Boss | Clear |
| --- | --- | --- | --- | --- | --- |
| D | Phase 2 (Startwerte) | 3,15 | 9 / 12 / 29 / 50 % | 28 / 49 / 38 / 53 | 100 % |
| P3 | + Ailments v2, Class Traits | 2,89 | 9 / 11 / 21 / 58 % | 22 / 35 / 29 / 42 | 100 % |
| P4 | + Elites, Routen, Item-Picks | 2,02 | 1 / 42 / 11 / 47 % | 20 / 33 / 27 / 46 | 100 % |
| E | Elite-Pfad ohne Shrine, Wand ×1,2 | 3,25 | 3 / 23 / 18 / 56 % | 19 / 28 / 27 / 37 | 99 % |
| F | Ironhide, Blinking, Iron Blood weicher; mehr Gegner-Life | 3,02 | 2 / 24 / 18 / 56 % | 23 / 31 / 33 / 43 | 99 % |
| **G** | **Static Skin, Numbing Blow, Ice Shell weicher (jetzt im Code)** | **2,87** | **2 / 18 / 16 / 64 %** | **22 / 32 / 33 / 43** | **100 %** |
| Ziel | | 3–5 | 5–15 / 10–20 / 20–30 / 35–55 % | 20–30 / 35–50 / 45–70 / 60–100 | |

**Was die Phasen bewirkt haben:**

1. **Phase 3** (Ailments v2, Class Traits) macht die Builds im Schnitt etwas stärker (3,15 → 2,89 Anläufe). DoT-Builds
   gewinnen durch die Payoffs (Rot 4,3 → 2,4), der Warrior verliert durch Iron Blood seine +20 % Trefferschaden
   (Smasher 2,7 → 4,9).
2. **Phase 4** hat zuerst alles zu leicht gemacht (2,0): Der Elite-Pfad gab zwei Elites **und** zwei Shrines. Jetzt
   zahlen Elites des Elite-Pfads nur in Beute. Mit dem Elite-Pfad gibt es fast viermal so viele Elite-Kämpfe wie
   vorher, deshalb tragen Elites jetzt ihren Anteil an den Toden (18 %, im Ziel).
3. **Physical gegen Elemental:** Act-Modifier wie Ironhide (Armor), Blinking (Evasion) und Static Skin (Reflect)
   treffen Builds mit vielen kleinen physischen Treffern. Nach dem Nachstellen liegen alle Builds zwischen 1,9 und 4,7
   Anläufen, die Caster aber am unteren Rand (1,9–2,9), die Warrior und Bögen am oberen (3,6–4,7).

**Werte im Code (Lauf G):** Wand-Stärke 1,8 / 9 / 7 / 8 / 8 / 6,6 / 5,4; Gegner-Life normal ×1,4, Elite ×1,25,
Gatekeeper ×1,7, Boss ×1,5 (Schaden ×0,9); Iron Blood −35 % und +25 Heat; Ironhide +25 Armor, Blinking +12 % Evasion,
Static Skin jeder 5. Treffer (max 4 %), Numbing Blow jeder 8. Angriff 0,5 s, Ice Shell alle 12 s 6 %.

### 7.1 Offen für die nächste Runde

1. **Run 2 und 3 sind am Boss noch eine Klippe** (75–100 % der Tode am Boss). Vorschlag wie in 6.3: Sägezahn-Anteile
   und Kampflänge pro Run statt einer Tabelle für alle.
2. **Gatekeeper und Bosse sind zu kurz** (33 s und 43 s im Median, Ziel 45–70 und 60–100), späte Bosse dagegen lang
   (Act 4: 108 s). Auch das löst ein Faktor pro Run.
3. **Caster gegen Physical:** Caster brauchen 1,9–2,9 Anläufe, Warrior und Bögen 3,6–4,7. Kandidaten: Resistances der
   Act-Bosse gegen Elemental, oder Spark (+50 %) etwas kleiner.
4. **Normale Stages töten kaum** (2 %, Ziel 5–15 %). Die Zermürbung greift mit Hearth Embers und dem Hearth-Pfad wenig;
   die Rampe der normalen Stages kann höher, wenn die Bosse in Run 2–3 sanfter werden.

---

## 8. Phase 5, Teil 1: Weapon Mastery v2 (14.10.)

Gleicher Aufbau (15 Builds × 3 Läufe, Seeds 31–33, bis Act 7, mit Runes). Vorher = `main` nach PR #30 (Lauf G).

| Lauf | was | Anläufe | Tode normal / Elite / Gate / Boss | Kampf s normal / Elite / Gate / Boss |
| --- | --- | --- | --- | --- |
| G | vorher | 3,3 | 1 / 22 / 22 / 55 % | 23 / 32 / 33 / 43 |
| M1 | Mastery v2, Autopilot wie geplant (Siege Engine +40 %, Ragged Cut) | 3,3 | 2 / 29 / 19 / 51 % | 22 / 31 / 31 / 43 |
| **M2** | **Siege Engine +80 %; Autopilot: Crossbow Repeater, Axe Bloodrush (im Code)** | **3,0** | **2 / 29 / 18 / 51 %** | **21 / 30 / 30 / 42** |

Anläufe pro Build (Run 2–7, vorher → M2):

| Build | vorher | M2 | | Build | vorher | M2 |
| --- | --- | --- | --- | --- | --- | --- |
| sword (unbroken) | 7,0 | 6,3 | | bow (venom) | 3,4 | **5,1** |
| sword (bleeder) | 7,4 | 4,4 | | bow (barbs) | 5,4 | 4,3 |
| mace (smasher) | 4,6 | 3,8 | | crossbow (marksman) | 3,2 | 3,5 |
| axe (bleed) | 3,8 | 3,9 | | wand (storm / frost / fire) | 2,8 / 1,7 / 2,2 | 2,1 / 1,9 / 1,8 |
| dagger (poison) | 3,4 | 3,1 | | staff (void / pyre / rot) | 2,1 / 2,9 / 2,1 | 2,6 / 2,2 / 2,6 |
| dagger (assassin) | 3,5 | 2,6 | | | | |

**Ergebnis:** Die Mastery v2 hält die Gesamtstärke (Ranges mit gleichem Durchschnitt), die Builds rücken enger zusammen
(1,7–7,4 → 1,8–6,3). Die Sword-Builds gewinnen am meisten (Parry, Clean Line, Read the Blow). Der neue Siege Engine war
mit +40 % pro Stack zu schwach (Marksman 5,6 Anläufe), Repeater und Harpoon liegen bei 3,2.

**Offen für die nächste Runde:** Venom-Bow (5,1, die Toxin-Gabeln tragen Poison weniger als die alten Minors) und der
Unbroken-Sword (6,3) bleiben am oberen Rand; das gehört zum Hoheitsgebiete-Schritt (Gear bekommt mehr Offense).

---

## 9. Phase 5, Teil 2: Skill Web v3, Hoheitsgebiete (14.10.)

Gleicher Aufbau. Vorher = M2 (Mastery v2, Abschnitt 8).

| Lauf | was | Anläufe | Tode normal / Elite / Gate / Boss | Clear |
| --- | --- | --- | --- | --- |
| M2 | vorher | 3,0 | 2 / 29 / 18 / 51 % | 100 % |
| W1 | Web v3 (Travel-Nodes nur Defense), Prestige-Minors Defense, +1 Affix auf Rare/Epic/Legendary | 2,3 | 4 / 28 / 21 / 47 % | 100 % |
| W2 | W1 ohne Extra-Affix | 2,8 | 5 / 37 / 20 / 39 % | 98 % (Mace 9,1) |
| W4 | W1 mit halber Travel-Defense | 2,7 | 8 / 30 / 21 / 41 % | 99 % |
| W5 | + Spark +30 % (statt 50), Lingering bis +25 % (statt 40), stärkere Physical-Notables | 2,4 | 1 / 20 / 21 / 57 % | 100 % |
| W6 | + Ailment-Notables schwächer | 2,5 | 1 / 21 / 24 / 54 % | 100 % |
| **W7** | **+ Wand-Stärke Run 3/4/6/7: 7 → 7,6, 8 → 9, 6,6 → 7,6, 5,4 → 6,6 (im Code)** | **2,9** | **4 / 31 / 20 / 45 %** | **99 %** |

Anläufe pro Build (Run 2–7, M2 → W7): unbroken 6,3 → 5,5 · smasher 3,8 → 2,9 · bleeder 4,4 → 5,0 · axe 3,9 → 5,0 ·
dagger poison 3,1 → 2,4 · assassin 2,6 → 2,3 · marksman 3,5 → 3,3 · bow venom 5,1 → 6,0 · barbs 4,3 → 4,7 ·
wand storm / frost / fire 2,1 / 1,9 / 1,8 → 2,1 / 1,3 / 2,3 · staff void / pyre / rot 2,6 / 2,2 / 2,6 → 1,8 / 1,7 / 1,5.

**Was die Messung zeigt:**

1. **Defense schlägt rohen Schaden.** Travel-Nodes mit Defense statt Offense machen das Spiel leichter, nicht schwerer
   (W1). Wandkämpfe sind ein Sustain-Rennen (`endgame-balance-v1.md`). Die Werte sind deshalb halbiert: +1,5 % Life,
   +3 % Armor, +4 % Barrier, +1 % Evasion, +2 % Tenacity pro Web-Travel-Node.
2. **Bedingte DoT-Boni sind fast immer an.** „Gegen Corrupted“ oder „ab 50 Heat“ gilt für einen DoT-Build den ganzen
   Kampf. Ohne die bedingten Boni brauchte der Void-Staff 2,4 Anläufe statt 1,4. Die Ailment-Notables sind deshalb kleiner
   (10–15 %) als die Treffer-Notables (20–35 %).
3. **Der Extra-Affix gehört aufs Gear:** Ohne ihn verlieren die Physical-Builds am meisten (Mace 3,8 → 9,1).

**Offen für die nächste Runde:**

- **Physical-Nahkampf gegen Armor:** Ein Mace-Lauf (Act 4) und ein Axe-Lauf (Act 5) schaffen den Boss nicht in 30
  Anläufen. Kandidaten: Elite-Modifier Ironhide, Penetration auf Gear-Affixen.
- **Caster und Staff** liegen mit 1,3–2,3 Anläufen am unteren Rand, Venom-Bow (6,0) und Unbroken-Sword (5,5) am oberen.
- **Elites** tragen 31 % der Tode (Ziel 10–20 %).

---

## 10. Phase 5, Teil 3: Physical gegen Armor, Elites, Wände (14.10.)

| Lauf | was | Anläufe | Tode normal / Elite / Gate / Boss | Clear |
| --- | --- | --- | --- | --- |
| W7 | vorher (Abschnitt 9) | 2,9 | 4 / 31 / 20 / 45 % | 99 % |
| B1 | Physical Penetration als Affix stärker (6–14 %) und auch auf Ringen; Elite-Schaden ×1,05 statt ×1,15 | 2,7 | 6 / 23 / 18 / 53 % | 99 % |
| B2 | + alle Gegner 10 % All Resistance, Armor pro Monster Level 0,30 statt 0,34 | 2,7 | 9 / 21 / 17 / 53 % | 99 % |
| **B3** | **+ Wand-Stärke Run 5/6/7: 8 → 8,8, 7,6 → 8,6, 6,6 → 7,6 (im Code)** | **2,9** | **10 / 23 / 20 / 47 %** | **99 %** |

Anläufe pro neuestem Act (B3): Run 2: 4,5 · 3: 3,2 · 4: 3,3 · 5: 3,1 · 6: 3,4 · 7: 2,2. Run 2–6 liegen im Ziel 3–5.

Pro Build (Run 2–7): unbroken 6,6 · smasher 5,5 · bleeder 4,9 · axe 5,5 · dagger poison 1,9 · assassin 3,1 · marksman
3,0 · venom 5,2 · barbs 4,0 · wand storm / frost / fire 2,2 / 1,8 / 1,7 · staff void / pyre / rot 1,7 / 1,9 / 1,7.

**Warum die Penetration aufs Gear musste:** Mit den Web- und Ast-Minors ist auch die Physical Penetration weggefallen
(Cold Blood, Steel Nerves, Keen Edge). Gegen gepanzerte Gegner fehlte sie den Physical-Builds.

**Offen:** Caster und Staff (1,7–2,2) gegen Nahkampf (4,9–6,6). Die 10 % Resistenz hilft kaum: DoTs rechnen mit dem
schon gemilderten Treffer (Resistenz zählt also einmal, wie in PoE), aber der Perk Attuned (+10 % Elemental Penetration)
und Penetration vom Gear heben 10 % Resistenz ganz auf. Idee für die nächste Runde: 20–25 % Grundresistenz, eventuell
mit dem Monster Level wachsend wie die Armor. Run 7 (2,2) könnte noch eine höhere Wand vertragen.
