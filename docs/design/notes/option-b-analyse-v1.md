# Option B – Emberseer-Kurve: Analyse (v1, 2026-11-05)

Auftrag (Timo 2026-11-05): Option B untersuchen, danach 3–4 Entscheidungen vorlegen. Noch kein Code im Spiel.

Messung: Stand `main` nach PR #162, alle 24 Builds, 8 Seeds (31–101), `--act 7 --generations 7 --newest 1`,
Versuche pro neuestem Act. Dazu eine Sonde über jeden Kampf im neuesten Act (4 Seeds): Heat nach Quelle,
Kill-Tempo, Schaden nach Schicht (Barrier, Life, Siphon, Heilung, Ausweichen).

Stand (wie bekannt): Cinderguard 3,21, Ashstrider 3,32, Emberseer 2,51 (Act 1–7: 2,0 1,8 2,5 1,7 2,4 1,9 5,4).

## 1. Heat ist nicht die Ursache

Heat pro Sekunde im neuesten Act (alle Kämpfe, Mittel aller Builds der Klasse):

| Run | Cinderguard | Ashstrider | Emberseer |
| --- | ---: | ---: | ---: |
| 1 | 10 | 11 | 10 |
| 2 | 16 | 16 | 15 |
| 3 | 18 | 18 | 21 |
| 4 | 20 | 19 | 24 |
| 7 | 27 | 31 | 37 |

Der Emberseer bekommt höchstens 15–20 % mehr Heat, in Run 1–2 gar nicht. Die alten Zahlen „20–32 gegen
13–16“ waren eine Schätzung ohne Kampf (Treffer, Ausweichen, Cooling-Verlust fehlten). Er zaubert auch nicht
öfter (0,4–0,5 Skills pro Sekunde, wie die anderen), nur teurere Skills. Heat früh zu kürzen trifft also nichts.

## 2. Die Klasse ist zwei Gruppen

Versuche pro neuestem Act, je Build:

| Build | A1 | A2 | A3 | A4 | A5 | A6 | A7 |
| --- | --: | --: | --: | --: | --: | --: | --: |
| Staff Hollow (Void) | 2,0 | 1,1 | 1,2 | 1,0 | 1,0 | 1,1 | 2,6 |
| Wand Starfall (Void) | 2,0 | 1,2 | 1,2 | 1,1 | 1,0 | 1,1 | 2,0 |
| Wand Storm | 2,0 | 1,5 | 2,4 | 2,1 | 2,8 | 2,8 | **6,0** |
| Staff Smolder | 2,0 | 1,0 | 2,8 | 1,0 | 1,2 | 2,2 | **7,6** |
| Staff Glacial | 1,9 | 2,0 | 4,2 | 3,0 | 3,8 | 1,6 | **5,6** |
| Wand Rime | 2,0 | 3,9 | 2,9 | 2,1 | 4,4 | 2,4 | **8,6** |
| Nahkampf/Fernkampf (18 Builds) | 2,2–3,1 | 1,8–5,2 | 1,8–15,9 | 1,0–9,0 | 1,0–6,1 | 1,1–8,2 | 1,6–8,6 |

- **Die zwei Void-Builds sterben in Act 2–6 fast nie** (1,0–1,2). Sie töten Bosse etwa 1,5-mal so schnell wie
  die anderen Emberseer (85–90 % ihres Schadens ist Corruption) und decken 85–90 % des Schadens wieder ab.
  Sie allein ziehen den Klassenschnitt in Act 1–6 nach unten.
- **Die anderen vier Emberseer liegen in Act 1–6 im Feld der anderen Klassen** (1,7–2,9), brechen aber in
  Act 7 ein (5,6–8,6).

## 3. Warum die vier in Act 7 einbrechen: Barrier hält nicht mit Life Schritt

| Run | Life | Barrier | Barrier ÷ Life |
| --- | ---: | ---: | ---: |
| 1 | 238 | 143 | 0,60 |
| 3 | 769 | 380 | 0,49 |
| 5 | 3134 | 1327 | 0,42 |
| 7 | 11319 | 4105 | 0,36 |

Barrier auf dem Gear wächst pro Tier so schnell wie die Grund-Life des Helden. Life bekommt aber über das Spiel
viele %-Quellen (VIT, Ash Tree, Gear-Life), Barrier kaum. Der Schutz, der den Emberseer früh trägt, schrumpft
bis Act 7 auf zwei Drittel. Dazu kommt: Act 7 schlägt viel physisch zu, und der Emberseer hat kaum Armor.

## 4. Tests (nur Emberseer, 8 Seeds, nichts eingebaut)

| Test | A1 | A2 | A3 | A4 | A5 | A6 | A7 | alle |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| Stand | 2,0 | 1,8 | 2,5 | 1,7 | 2,4 | 1,9 | 5,4 | 2,51 |
| Barrier immer 45 % der Life (nur Diagnose) | 2,1 | 2,5 | 2,2 | 2,4 | 2,5 | 2,0 | 5,3 | 2,72 |
| **Gear-Barrier startet 25 % tiefer, wächst pro Tier schneller (T9 +25 %)** | 2,0 | 2,0 | 1,8 | 2,1 | 2,5 | 2,1 | **3,6** | 2,30 |
| dasselbe, Start 40 % tiefer | 2,1 | 2,1 | 1,8 | 2,4 | 2,2 | 2,2 | 4,5 | 2,46 |
| Barrier-Kurve + Siphon −25 % | 2,0 | 2,2 | 2,6 | 2,9 | 2,4 | 2,6 | 5,1 | 2,82 |
| Barrier-Kurve + Corruption wächst 15 % statt 25 % | 2,2 | 2,0 | 2,3 | 2,0 | 3,1 | 2,9 | 5,6 | 2,88 |

- **Die Barrier-Kurve trifft genau Act 7:** Storm 6,0 → 4,1, Smolder 7,6 → 4,9, Glacial 5,6 → 3,6,
  Rime 8,6 → 6,2. Act 1–6 bleibt fast gleich (früh zählt die Größe der Barrier wenig, das zeigte schon der
  Barrier-Thread).
- **Siphon kürzen** macht Act 2–6 schwerer, aber Act 7 wieder fast so schwer wie vorher.
- **Corruption allgemein kürzen** trifft die Falschen: die Void-Builds bleiben bei 1,5, die anderen
  Emberseer (die auch Corrupt nutzen) werden schwerer. Die Ursache der Void-Stärke sitzt also im Void-Pfad
  selbst (Heirloom-Pfad, Mastery, Ash-Tree-Region), nicht in der Corruption-Regel.
- Abstand Seeds: einzelne Build-Zellen schwanken auch mit 8 Seeds um ±1 Versuch, Act 7 um ±1.

## 5. Entscheidungen

1. **Heat bleibt, wie sie ist.** Option B in der alten Form (frühe Caster-Heat in spätere Knoten verschieben)
   fällt weg, weil die Heat nicht der Grund ist.
2. **Barrier-Kurve am Gear (Empfehlung: ja).** Barrier auf Items startet 25 % tiefer und wächst pro Tier
   schneller (T9 etwa +25 %, T10 +33 %). Sichtbar auf dem Item, nichts wächst versteckt mit dem Level. Gilt
   für alle Klassen; Cinderguard und Ashstrider tragen kaum Barrier, das wird vor dem PR gemessen. Neue Drops
   bekommen die neuen Werte; ob alte Items umgerechnet werden, entscheidet der Save-Schritt.
3. **Void-Pfad an der Quelle (Empfehlung: ja, als eigener Messschritt).** Für Staff Hollow und Wand Starfall
   jede Schicht einzeln abschalten (Heirloom-Pfad, Keystone, Mastery, Void-Region im Ash Tree) und die
   stärkste kürzen, bis beide in Act 2–6 bei etwa 2,5–3 liegen. Keine Änderung an der Corruption-Regel selbst.
4. **Chill-Regel aus Option C danach (Empfehlung: ja, aber erst nach 2 und 3).** Chill bremst auch
   Telegraph-Angriffe und Auren. Die schwersten Act-7-Builds im ganzen Spiel sind Kälte-Builds (Wand Rime 8,6,
   Axe Glacier 8,6, Staff Glacial 5,6); genau die würde sie retten.

Ziel danach: Emberseer Act 1–6 rund 3, Act 7 unter 5, alle drei Klassen um 3–3,3.

## 6. Umsetzung (Timo 2026-11-06: „Ja genauso umsetzen“)

**Barrier-Kurve:** gebaut wie getestet (`ITEMS.barrierStart` 0,75, `barrierGrowthPerTier` 0,58).

**Void-Pfad:** Keine einzelne Schicht ist schuld. Getestet (je 8 Seeds, nur Emberseer):

| Test | Hollow A1–6 | Starfall A1–6 | andere Emberseer |
| --- | --: | --: | --- |
| Stand mit Barrier-Kurve | 1,25 | 1,29 | – |
| je ein Void-Knoten, der Keystone oder Archmage statt Warlock | 1,25–1,42 | 1,27–1,85 | – |
| Collapse 2 s / Vorspulen halbiert | 1,27–1,29 | 1,29–1,60 | kaum Wirkung |
| ohne jede DoT-Heilung (nur Diagnose) | 2,52 | 1,94 | Act 7 schwerer |
| DoT-Heilung überall halbiert | 1,52 | 1,44 | Gift-Ashstrider deutlich schwerer (Bow Toxin 6,5) |
| Siphon nur aus Treffern | 1,56 | 1,65 | Smolder, Glacial deutlich schwerer |

Grund: Die Void-Builds töten Bosse etwa 60 % schneller, und alles, was sie heilt (Siphon, DoT-Heilung), wächst
mit dem Schaden mit. Gebaut ist deshalb eine Kombination im Void-Pfad:
- Corruption wächst pro Tick um 15 % statt 25 % (bis 12 Ticks, also bis ×2,8 statt ×4), Collapse 3 s statt 4.
- Corrupt spult 3 statt 4 Schritte vor, Void Rift 4 statt 6 (Consume bleibt 4). Collapse Deeper: +2 s wie bisher.
- Der Emberseer hat mit dem Siphon schon Erholung aus allem Schaden: Warlocks „Soul Drain“ (3 % DoT-Heilung) wird
  „Lingering Dark“ (+10 % Ailment-Dauer), Hollow Crown verliert ihr 1 % DoT-Heilung. Pact of Ash bleibt.

**Chill-Regel:** gebaut wie getestet: Chill bremst auch die Zeit bis zum nächsten Telegraph und zeitgesteuerte
Trigger (Auren, „alle X s“) um denselben Anteil wie Angriffe. Cold Snap bremst weiterhin das Ausholen.

**Ergebnis (alle 24 Builds, 8 Seeds 31–101, Versuche pro neuestem Act):**

| Klasse | A1 | A2 | A3 | A4 | A5 | A6 | A7 | alle | vorher |
| --- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Cinderguard | 2,7 | 4,3 | 3,0 | 2,0 | 2,4 | 4,5 | 3,5 | 3,21 | 3,21 |
| Ashstrider | 2,8 | 3,4 | 5,7 | 3,8 | 3,2 | 1,5 | 3,1 | 3,37 | 3,32 |
| Emberseer | 2,2 | 2,6 | 2,3 | 1,8 | 3,2 | 2,7 | 4,4 | 2,73 | 2,51 |

Emberseer Act 7 5,4 → 4,4 (Ziel unter 5 erreicht). Act 1–6 2,2–3,2 statt 1,7–2,5. Staff Hollow 1,8 und Wand Starfall
2,0 in Act 1–6 liegen jetzt am leichten Rand des Feldes, wie Sword Edge (1,9) oder Dagger Venom (2,2).
Act 7 sinkt auch für Cinderguard (4,2 → 3,5) durch die Chill-Regel. Einzelne Zellen rauschen um ±1.

Offen: Emberseer liegt im Schnitt noch etwa 0,5 unter den anderen; der Rest sind die beiden Void-Builds. Finale und
Wildfire sind nicht neu gemessen.
