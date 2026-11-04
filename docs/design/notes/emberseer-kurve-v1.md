# Emberseer-Kurve v1 (2026-11-04)

Auftrag (Timo, über Thread „Boon-Auswahl verbessern“): Emberseer sind in Act 1–4 am leichtesten, in Act 7 (Emberfall)
am schwersten. Ursache finden, Barrier-Kurve umbauen (früh etwas schwächer, spät stärker), keine Symptom-Patches.
Timo 2026-11-04: andere Barrier-Systeme dürfen untersucht werden (pro Treffer, pro Skill, ganz andere), Muster aus
Diablo, PoE und Idle-Spielen ja, aber nicht 1:1: PoE-Energy-Shield lebt vom Aufladen zwischen Kämpfen und vom Kiten,
das gibt es hier nicht.

## 1. Messung vorher

`npm run balance -- --act 7 --generations 7 --build all --runs 1 --seed N --newest 1`, Seeds 31/41/51/61, alle 24
Builds, Anläufe pro neuestem Act (main 05ba98c):

| Klasse | A1 | A2 | A3 | A4 | A5 | A6 | A7 | alle |
|---|---|---|---|---|---|---|---|---|
| Cinderguard | 2,6 | 3,8 | 3,2 | 2,4 | 2,2 | 3,0 | 3,8 | 2,99 |
| Ashstrider | 2,8 | 3,7 | 4,8 | 3,1 | 3,4 | 1,6 | 5,0 | 3,50 |
| Emberseer | 2,0 | 1,5 | 1,6 | 2,6 | 3,6 | 3,0 | **11,6** | 3,65 |

3 Builds hängen fest (Emberseer am Harvester). Am Harvester sterben Emberseer in 84 % der Kämpfe, die anderen in 53–60 %.

## 2. Ursache

Probe über jeden Kampf im neuesten Act (Schaden genommen pro Sekunde, geteilt durch max Life; Heilung; Barrier):

- Der Schaden, den Gegner pro Sekunde relativ zum Life machen, steigt für **alle** Klassen von Act 1 bis Act 7 auf
  das 3- bis 4-fache (Bosse 0,03 → 0,10 Life/s).
- Cinderguard und Ashstrider wachsen mit: ihre Heilung ist Lifesteal, also ein Anteil ihres eigenen Schadens. Am
  Act-1-Boss holen sie 25 % zurück, am Harvester 75–80 %.
- Die Barrier lud **nach Zeit**: immer 3 % ihres Maximums pro Sekunde, nach 3 s ohne Treffer 10 %/s. Das wächst nicht
  mit dem Kampf. Am Act-1-Boss deckte sie etwa ein Drittel des Schadens, am Harvester ein Zehntel.
- Gegenprobe ohne jedes Aufladen: Emberseer Act 7 10,8 (statt 11,6, das Aufladen half spät fast nichts), Acts 2–4
  3,4 / 5,5 / 4,7 (statt 1,5 / 1,6 / 2,6, das Aufladen machte die frühen Acts leicht).

Dazu, kleiner: Emberseer haben keine eigene Schicht gegen Physical (kein Armor, keine Evasion). Gegen physische
Gegner nehmen sie in jedem Act 30–50 % mehr Rohschaden (Ash Revenant, Harrow Hound, Thunder Brute); gegen Elemente
gleich viel oder weniger. Das ist gewollt (Barrier wirkt gegen alles), muss dann aber mitwachsen.

## 3. Untersuchte Systeme (nur Emberseer, 4 Seeds)

| System | A1 | A2 | A3 | A4 | A5 | A6 | A7 | Ø |
|---|---|---|---|---|---|---|---|---|
| alt: 3 %/s + schnell nach 3 s | 2,0 | 1,5 | 1,6 | 2,6 | 3,6 | 3,0 | 11,6 | 3,65 |
| kein Aufladen | 2,3 | 3,4 | 5,5 | 4,7 | 3,5 | 2,9 | 10,8 | 4,71 |
| pro Treffer (4 % des Trefferschadens) | 2,0 | 1,6 | 2,1 | 2,3 | 2,2 | 2,2 | 7,5 | 2,85 |
| pro Treffer + Ailment-Tick (4 %) | 2,0 | 1,2 | 1,6 | 1,3 | 1,3 | 1,4 | 3,6 | 1,77 |
| pro ausgegebener Heat (0,2 % max/Heat, wie Last-Epoch-Ward) | 1,9 | 1,2 | 1,5 | 1,3 | 1,8 | 1,6 | 7,3 | 2,36 |
| leer starten, aus Schaden (6 %) | 2,0 | 1,1 | 1,0 | 1,5 | 1,2 | 1,2 | 4,5 | 1,80 |
| kleinere Barrier (×0,7) + aus Schaden (5 %) | 2,0 | 1,2 | 1,2 | 1,3 | 1,5 | 2,6 | 4,7 | 2,05 |

- **Pro Heat/Skill** ist wieder Zeit (Heat fließt immer etwa gleich schnell): spät zu schwach.
- **Nur Treffer** reicht nicht: Emberseer machen viel Schaden über Ailments.
- **Treffer + Ailments** wächst richtig mit: Act 7 fällt am stärksten. Die Größe der Barrier (oder leer starten)
  ändert fast nichts, das Nachfüllen entscheidet.
- Ein fester Anteil für alle (3 %) füllte auch die winzige Barrier von Cinderguard und Ashstrider (aus Nodes oder
  Charms) nach jedem Treffer: sie wurden spürbar leichter (3,0 → 2,5). Deshalb hängt der Siphon an **Intelligence**,
  dem Barrier-Attribut.

## 4. Gebaut: Barrier Siphon

- Barrier ist voll bei Kampfbeginn und **lädt nicht mehr nach Zeit**.
- **Barrier Siphon:** pro Punkt Intelligence füllen **0,25 %** von allem Schaden, den du machst (Treffer, Ailment-
  Ticks, Bursts, Thorns), die Barrier wieder auf, nie über ihr Maximum (Barrier aus Skills darüber bleibt). INT 10 =
  2,5 %. Emberseer starten mit INT 8 und haben spät 10–12. Monster haben keinen Siphon.
- Lifesteal-Regel bleibt unberührt (Life heilt weiter nur aus Treffern); der Siphon füllt nur die Barrier.
- Was vorher „lädt schneller“ war, verstärkt jetzt den Siphon: Ward Draught ×1,5, Ever-Ward ×1,3, Ashborn „Barrier
  Siphon“ +4 %/Punkt, Unyielding (Keystone): Siphon 0.
- Code: `COMBAT.heir.barrierSiphonPerIntelligence`, `siphonBarrier` in `dealDamage` (`combat/hits.ts`), Stat
  `barrierSiphon`, Regel `rules.barrierSiphon` (vorher `barrierRecharge`). Kein Save-Format geändert.

## 5. Messung nachher (alle 24 Builds, Seeds 31/41/51/61)

| Klasse | A1 | A2 | A3 | A4 | A5 | A6 | A7 | alle |
|---|---|---|---|---|---|---|---|---|
| Cinderguard | 2,8 | 3,9 | 3,1 | 2,6 | 2,1 | 3,6 | 4,1 | 3,15 |
| Ashstrider | 3,0 | 3,9 | 4,9 | 3,6 | 3,5 | 1,9 | 5,4 | 3,73 |
| Emberseer | 2,0 | 1,7 | 2,0 | 2,8 | 2,0 | 1,7 | **5,6** | 2,52 |
| alle | 2,7 | 3,4 | 3,5 | 3,0 | 2,6 | 2,5 | 4,9 | 3,21 |

Kein Build hängt mehr fest (vorher 3). Emberseer Act 7: 11,6 → 5,6, jetzt neben Ashstrider (5,4). Cinderguard und
Ashstrider ändern sich nur im Rauschen (±1 pro Zelle bei 4 Seeds); ihr kleines Zeit-Aufladen fällt weg.

**Offen:** Emberseer bleiben in Act 2–6 die leichteste Klasse (1,7–2,8 gegen etwa 3–4). Die Barrier ist dafür nicht
mehr die Ursache (Größe und Start ändern fast nichts); Kandidaten für einen nächsten Schritt: dass Emberseer Normal-
Kämpfe fast ohne Life-Verlust überstehen (Barrier voll bei jedem Kampfbeginn) und ihr Schaden in den mittleren Acts.
Finale und Wildfire sind noch nicht neu gemessen.

## 6. Nachmessung (Timo 2026-11-04: Ursache von Act 2–6 und Wildfire)

### Wildfire und Finale (`--wildfire 10 --build all --runs 1`, Seeds 31/41/51/61)

Anläufe der Builds, die die Stufe erreichen (in Klammern: wie viele sie schaffen, wenn nicht alle):

| | Finale | W I | W II | W III | W IV | W V | W VI | W VII | W VIII | W IX | W X |
|---|---|---|---|---|---|---|---|---|---|---|---|
| alt (main) Cinderguard | 3,5 | 1,6 | 2,6 | 1,9 | 2,2 | 3,3 | 2,8 | 1,6 | 12,9 (22 %) | 6,5 (50 %) | 14 (50 %) |
| alt Ashstrider | 2,7 | 1,4 | 1,2 | 2,5 | 1,8 | 3,8 | 2,5 | 1,8 | 13,1 (61 %) | 10,9 (77 %) | 4,5 (24 %) |
| alt Emberseer | 4,4 | 2,1 | 2,4 | 1,6 | 2,1 | 3,6 | 2,2 | 1,9 | 14,5 (10 %) | 2,5 | – (0 %) |
| neu Cinderguard | 3,0 | 1,5 | 3,6 | 1,9 | 2,6 | 3,4 | 2,7 | 1,7 | 14,1 (57 %) | 14,9 (45 %) | 7,5 (44 %) |
| neu Ashstrider | 2,9 | 1,2 | 1,4 | 2,3 | 1,6 | 4,0 | 2,1 | 1,7 | 11,7 (72 %) | 12,0 (46 %) | 9,4 (42 %) |
| neu Emberseer | 4,6 | 2,6 | 1,4 | 1,6 | 2,0 | 2,9 | 2,1 | 1,9 | 18,4 (29 %) | 11,7 (43 %) | – (0 %) |

Wildfire I–VII bleibt für alle Klassen gleich (1,2–4 Anläufe). In VIII schaffen es jetzt 29 % der Emberseer
(vorher 10 %), Cinderguard 57 %, Ashstrider 72 %. Das Finale ist für Emberseer weiter das schwerste (4,6 gegen 3,0 /
2,9). Wildfire X schafft kein Emberseer. Gemessen **vor** der Resistenz-Änderung unten.

### Ursache von Act 2–6

| Test (nur Emberseer) | A2 | A3 | A4 | A5 | A6 | A7 |
|---|---|---|---|---|---|---|
| Barrier Siphon (Stand PR) | 1,7 | 2,0 | 2,8 | 2,0 | 1,7 | 5,6 |
| Barrier fest 50 % vom Life | 2,0 | 1,5 | 2,0 | 2,8 | 1,5 | 7,0 |
| Barrier fest 35 % vom Life | 1,8 | 1,6 | 1,9 | 3,0 | 1,5 | 5,3 |
| Barrier leer bei Kampfbeginn | 2,1 | 1,9 | 1,8 | 2,1 | 1,3 | 4,7 |
| Schaden −15 % | 2,3 | 2,8 | 2,4 | 2,4 | 2,2 | 9,2 |

- **Die Barrier ist es nicht mehr:** Größe, festes Verhältnis zum Life und leer starten ändern Act 2–6 nicht.
- **Der Schaden ist es:** Emberseer töten Bosse in Act 1–6 15–25 % schneller als die beste andere Klasse
  (Gegner-Life pro Sekunde), am Harvester 8 % langsamer. Sie nehmen in jedem Act 50–70 % mehr Rohschaden (kein Armor,
  keine Evasion) und gleichen das mit Barrier und schnellerem Töten aus.
- **Warum der Harvester anders ist: Element-Resistenzen.** In Act 3–6 widersteht jeder Gegner nur dem Element seines
  Acts. Ein Emberseer trifft sonst auf 10 % (die Grundresistenz jedes Monsters), Physical auf etwa 10 % Armor
  (Brutes mehr). In Emberfall hatte **jeder** Gegner +10 % auf jedes Element (20 %), der Harvester +15 % (25 %, gegen
  Physical nur 14 %; der Code-Kommentar wollte „15 % each“ und hatte die Grundresistenz vergessen).

**Gebaut:** Act-7-Gegner ohne All Resistance obendrauf, Harvester +5 % (15 %, gleich wie gegen Physical).

| Klasse | A1–A6 | A7 vorher | A7 neu | alle |
|---|---|---|---|---|
| Cinderguard | unverändert | 4,1 | 3,9 | 3,14 |
| Ashstrider | unverändert | 5,4 | 4,7 | 3,63 |
| Emberseer | unverändert | 5,6 | 4,7 | 2,39 |

Mit zusätzlich −12 % Emberseer-Schaden: Act 2–6 2,4 / 1,8 / 1,9 / 2,7 / 2,5 (Ø 2,3 statt 1,9), Act 7 wieder 5,5.
Weniger Schaden allein macht Act 2–6 kaum schwerer, Act 7 aber deutlich.

**Offen:** Emberseer bleiben in Act 2–6 die leichteste Klasse (Ø 1,9 gegen etwa 3,3). Finale und Wildfire mit der
Resistenz-Änderung nicht neu gemessen (Harvester und Act-7-Gegner kommen dort vor, Element-Builds werden dort etwas
leichter).

## 7. Siphon −20 % (Timo 2026-11-04)

Timo wählte Siphon −20 %: 0,2 % pro INT-Punkt (INT 10 = 2 %). „Barrier wächst mit dem Level“ abgelehnt: nichts darf
versteckt am Level hängen, die Barrier bleibt an Gear und Tier gebunden.

Messung mit 8 Seeds (31–101, `--build all --newest 1`), weil 4 Seeds pro Zelle etwa ±1 Versuch rauschen:

| Klasse | A1 | A2 | A3 | A4 | A5 | A6 | A7 | alle |
|---|---|---|---|---|---|---|---|---|
| Cinderguard main | 2,5 | 3,7 | 3,2 | 2,3 | 2,8 | 3,6 | 3,9 | 3,14 |
| Cinderguard neu | 2,7 | 4,2 | 3,4 | 3,1 | 2,3 | 4,4 | 3,3 | 3,34 |
| Ashstrider main | 2,9 | 3,7 | 5,9 | 3,3 | 3,6 | 1,5 | 4,2 | 3,59 |
| Ashstrider neu | 3,1 | 3,9 | 5,3 | 3,4 | 3,4 | 1,7 | 3,6 | 3,47 |
| Emberseer main | 1,9 | 1,4 | 2,2 | 2,5 | 3,3 | 3,3 | 10,0 | 3,50 |
| Emberseer neu | 2,0 | 1,6 | 1,8 | 1,8 | 2,7 | 2,4 | 4,8 | 2,43 |

Alle Klassen 3,40 → 3,16; nicht geschafft 8 → 2 (beide Axe Glacier). Act-7-Tode der Emberseer: Harvester 1,8,
Ash Revenant 1,2 pro Durchlauf (Cinderguard 0,4 / 0,9, Ashstrider 1,1 / 0,7).

**Offen:** Emberseer sind in Act 2–4 weiter die leichteste Klasse (1,6–1,8 gegen 3,1–5,3; vor allem die Act-Bosse
Mother of Rot, Cinder Tyrant, Rime Warden), in Act 7 leicht die schwerste (4,8 gegen 3,3–3,6). Der Act-7-Rest sind
physische Gegner (Ash Revenant).
