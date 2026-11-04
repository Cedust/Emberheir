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
