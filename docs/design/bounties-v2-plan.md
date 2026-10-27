# Bounties v2: Plan (27.10.2026)

Auftrag (Timo, 27.10.2026): Spielweise und Farming haben sich durch Längere Runs, Balancing-Neustart und
Economy-Audit stark verändert. Die Bounties passen teils nicht mehr, die Rewards wurden lange nicht angeschaut. Ziel:
ein Plan, der Bounties wieder relevant macht.

**Stand:** Timo 27.10.2026: E1–E3 ja wie empfohlen, E4 erst nach der Messung, E5 nein (stattdessen eine
Notification aus dem eigenen Thread „Notification System bauen“; Hook `run.rewards.bountyDone`). Gebaut auf Branch
`claude/project-thread-9e6gt4`, Ergebnis der Messung siehe Abschnitt 8.

Leitlinien aus früheren Entscheidungen: keine Belohnung für Tode, ganzheitlich statt Zahlen-Flicken, genre-typisch
(Diablo/PoE), keine angeflanschten Systeme, Mauern über Farmen und Gear schaffbar, wenig UI-Text, jede neue Kampf-Sache
sichtbar in der Arena. Bounties werden weiter **bei Eldrin im Camp eingereicht** (Timo 10.10.2026).

---

## 1. Ist-Stand im Code

Quelle: `packages/content/src/bounties.ts`, `packages/sim/src/progression/bounties.ts`,
`packages/sim/src/progression/game/bounty.ts`, `PROGRESSION.bounty` in `constants.ts`.

- Beim **Set Out** würfelt Eldrin **eine** Bounty für den Zug (keine Wahl; die Vorschau im Road-Fenster ist der echte
  Wurf). Nicht im Wildfire, nicht im Finale. Solange eine erfüllte Bounty nicht eingereicht ist, gibt es keine neue.
- Die Bounty bleibt über **Wander** hinweg bestehen (ein Zug kann also mehrere Karten lang sein). Erfüllt bleibt sie
  erfüllt, auch nach Tod oder Retreat. Gescheitert: einfach weg.

| Bounty | Ziel | Ab |
|---|---|---|
| Elite Hunt | 1 Elite (Act 1–3), 2 Elites (ab Act 4) | 1 |
| Culling | 3 × ein zufälliger Gegner des Acts | 1 |
| Thief Chase | den Ember Thief fangen (Thief ×5 häufiger, Thief's Trail auf der Karte) | 2 |
| Dry Throat | Boss ohne Flask auf diesem Zug | 1 |
| Hale and Whole | Boss mit ≥ 50 % Life | 1 |

**Lohn beim Einreichen:** Acorns von 10 normalen Kills auf Boss-Level, **2 Ember Coal**, **ein zufälliges Item ab Rare**
(zufällige Basis und Slot, Rarity im Elite-Fenster des Runs) direkt ins Inventar.

---

## 2. Was seit PR #24 passiert ist und warum es nicht mehr passt

### 2.1 Die Ziele sind durch die Act-Karte zu leicht oder doppelt

- **Elite Hunt:** Die Act-Karte hat eigene **Elite-Knoten** (Gewicht 15 von 93 zwischen den Waymarks, grob geschätzt
  3–5 pro Karte), und **Gatekeeper zählen als Elite** (`encounterRank` = Elite, sobald Modifier da sind). Im neuesten
  Act ist „1 Elite“ damit schon an Stage 5 erledigt, ohne dass man etwas anders macht.
- **Thief Chase:** Mit offener Bounty legt die Karte einen **Thief's Trail** in die ersten zwei Abschnitte, dort steht
  der Thief sicher. Übrig bleibt nur die Frage, ob man ihn in 15 s tötet. Das ist die einzige Bounty mit echter
  Spannung, sie zahlt aber nicht mehr als die anderen.
- **Culling:** Die Weg-Karten zeigen seit Phase 4 jeden Gegner, und **Hunt-Knoten** (×2 Trail) machen genau das
  Gleiche besser: Kills auf einen bestimmten Gegner. Culling ist eine schwächere Kopie von Hunts, ohne Bezug zum Trail.
- **Dry Throat / Hale and Whole** prüfen nur den letzten Kampf. Im neuesten Act fallen sie mit der Wand zusammen (dort
  will niemand zusätzlich auf die Flask verzichten), in alten Acts sind sie meist leicht. Hale and Whole ist ein reiner
  Gear-Check am Ende und belohnt Spieler, die eh schon überlegen sind; mit Barrier, Deflect und Block ist „50 % Life“
  außerdem für die drei Klassen unterschiedlich schwer.

### 2.2 Der Lohn ist klein und trifft nicht, was man heute farmt

Zahlen nach PR #108 (Preise in „Kills“, `killPrice`):

- **Acorns:** 10 Kills. Ein Respec kostet 8 Kills, ein Temper 1 Acorn-Kill + 6 Ash-Kills. Laut Economy-Audit bringt
  allein der neueste Act von Run 7 rund 50 000 Acorns; die Bounty zahlt dort etwa 1 200 (Monster-Level ~60:
  4 + 2 × 59 = 122 pro Kill). Das ist **Rauschen** (~2 %).
- **2 Ember Coal:** Seit dem Audit droppen normale Gegner nur noch 5 % auf 1, Elites 1–2. Ein **Cache-Knoten** zahlt
  1–2 Coal **plus** eine Rune. Die Bounty ist also etwa so viel wert wie ein Cache-Knoten, den man im Vorbeigehen nimmt.
- **Item ab Rare, zufällig, ins Inventar:** Kein 1-aus-3, keine Slot-Wahl, keine Home Unique, kein Hunt Affix.
  Ein Elite-Pick ist besser. Meist wird das Item zu **Ash**, und Ash ist nach dem Audit immer noch im Überfluss.
- Nichts davon zahlt in dem, was man **heute gezielt farmt**: **Home Rune** und **Home Uniques** des Acts (Phase 3),
  **Trail-Kills** und **Hunt Affixes** (Phase 4), **Ember Coal** (seit #108 knapp), Boss Trophies.

### 2.3 Struktur

- **Keine Wahl:** Eine Zufalls-Bounty pro Zug. Omens bieten 1 aus 2, Bounties nicht. Wer die Bounty nicht mag,
  ignoriert sie einfach, genau das passiert.
- **Nicht gemessen:** Der Autopilot reicht nie ein. Nach der ersten erfüllten Bounty bekommt er keine neue mehr, die
  Balance-CLI sieht Bounties gar nicht (das Economy-Audit nennt sie ausdrücklich „nicht gemessen“).
- **Kein Endgame:** Im Wildfire gibt es keine Bounties, obwohl dort am längsten gespielt wird. (In Diablo 3 sind
  Bounties gerade das Endgame-Farming.)

---

## 3. Leitidee

> **Eldrin zeigt, wo sich das Farmen gerade lohnt.** Eine Bounty ist ein Auftrag, der auf der Act-Karte eine
> **Wegentscheidung** verlangt, und zahlt in der **Beute dieses Acts**, die man heute gezielt sucht.

Vorbilder: Diablo 3 **Horadric Cache** (Bounty-Lohn mit act-eigener Beute), Diablo 4 **Whispers** (man sieht vorher,
wofür ein Auftrag zahlt), Slay the Spire (die Karte zeigt, wo das Ziel liegt). Keine neue Währung, kein neues
Menü: Bounties nutzen nur, was es schon gibt (Act-Karte, Elite-Knoten, Hunts/Trails, Home Rune, Item-Pick, Coal).

---

## 4. Vorschlag

### B1 Wahl: 1 aus 2 bei Eldrin

Eldrin bietet für den gewählten Act **zwei** Bounties an, wie bei den Omens. Man wählt eine (oder keine). Das
Angebot steht pro Act fest, bis man eine Bounty einreicht oder das nächste Prestige kommt (kein Neu-Würfeln durch
Act-Hopping). Jede Karte zeigt **Ziel und Lohn** mit Icons, damit man nach Bedarf wählt („ich brauche Coal“, „ich
will den Trail von X“).

Bleibt: eine Bounty pro Zug, Wander behält sie, Einreichen bei Eldrin, keine neue Bounty bis zum Einreichen, eine
erfüllte Bounty bleibt erfüllt (auch nach Tod; sie war vorher verdient, das ist kein Lohn für den Tod).

### B2 Neuer Katalog (4 statt 5, jede mit eigenem Zweck)

| Bounty | Ziel | Was sie auf der Karte verlangt | Ab |
|---|---|---|---|
| **Elite Hunt** | 2 Elites (Act 1–3), 3 Elites (ab Act 4); **Gatekeeper zählen nicht** | Elite-Knoten statt Shrine/Hearth nehmen (Elites haben keinen Shrine danach): echter Tausch | Act 1 |
| **Trail Hunt** (ersetzt Culling) | # Kills auf den Gegner des Acts, dessen **nächste Trail-Stufe am nächsten** ist (# = Kills bis zur nächsten Stufe, mindestens 4, höchstens 8) | Weg über seine Fight-/Hunt-Knoten; die Karte bekommt **einen Hunt-Knoten mehr** für ihn | Act 1 |
| **Thief Chase** (bleibt) | den Ember Thief fangen, **bevor er flieht** | Thief's Trail nehmen und genug Schaden in 15 s haben | Act 2 |
| **Dry Throat** (bleibt) | den Boss schlagen, ohne auf diesem Zug aus der Flask zu trinken | Hearth-Knoten (Rast) statt Flask, Draught-Wahl | Act 1 |

**Hale and Whole fällt weg** (reiner Gear-Check am Ende, für die Klassen ungleich schwer, doppelt mit Dry Throat).

### B3 Lohn: Eldrin's Cache

Beim Einreichen öffnet Eldrin einen **Cache**. Basis für jede Bounty:

1. **Die Home Rune des Acts** (eine, Rang wie bei einem Cache-Knoten dieses Acts). Damit lohnt sich die Wahl des Acts.
2. **Ein Item-Pick 1 aus 3** in Elite-Qualität, Home Uniques mit ihrem Heimvorteil (×3), im Eldrin-Fenster
   gezeigt, statt eines zufälligen Rares ins Inventar.

Dazu der **Typ-Bonus**, der die Wahl in B1 ausmacht:

| Bounty | Typ-Bonus |
|---|---|
| Elite Hunt | **Ember Coal 4–6** (wie ein Boss) |
| Trail Hunt | **+5 Trail-Kills** auf den Gegner, und eine Karte des Picks trägt **sicher sein Hunt Affix** |
| Thief Chase | **2 Picks** aus dem Cache statt 1 (wie der Hoard des Thiefs) |
| Dry Throat | der Pick ist **eine Rarity-Stufe höher** (im Fenster des Runs, also kein Epic vor Run 3) |

**Acorns fallen weg** (10 Kills sind Rauschen, eine Zeile weniger). Größenordnung: ein Cache ist etwa so viel wert
wie ein Elite-Kill plus ein Cache-Knoten, bei einer Bounty pro Zug also spürbar, aber unter einem Boss-Hoard.
Die Zahlen werden in Phase 1 gemessen (siehe B5) und erst dann festgezurrt.

### B4 Sichtbar machen

- **Act-Karte:** Die Knoten, die zur Bounty zählen, tragen Eldrins **Bounty-Marke** (das Ziel-Icon der Bounty) (Elite-Knoten bei Elite Hunt,
  Knoten des Gegners bei Trail Hunt, Thief's Trail). Fortschritt steht im „Up next“-Kasten (z. B. Feder + 1/3).
- ~~**Arena (PixiJS):** Rabe mit Feder, wenn die Bounty erfüllt ist.~~ Gestrichen (E5 nein); der Moment kommt als
  Notification aus dem Notification-System. Im Camp bleibt Eldrins „!“ (auch solange sein Cache wartet).
- **Eldrin-Fenster:** zwei Bounty-Karten (Ziel + Lohn-Icons, Währungen nur Icon + Zahl), beim Einreichen der Cache mit
  Home Rune, Typ-Bonus und den Item-Karten. Tooltip für jede Bounty in einfachen Worten; Compendium-Seite anpassen.

### B5 Messen

- Der **Autopilot** nimmt und reicht Bounties ein (einfache Regel: Trail Hunt, wenn eine Trail-Stufe nah ist, sonst
  Elite Hunt; nimmt Feder-Knoten, wenn der Weg es erlaubt).
- Die **Balance-CLI** zeigt pro Bounty-Typ: angeboten, genommen, erfüllt, und was die Bounties am Coal-, Home-Rune- und
  Trail-Einkommen ausmachen.
- **Ziele:** Erfüllungsquote 60–90 %, wenn man sie verfolgt (Thief Chase und Dry Throat dürfen darunter liegen);
  Bounties machen etwa **15–25 % des Coal** und **ein Drittel der Home Runes** eines Zugs aus; Anläufe im neuesten Act
  bleiben innerhalb ±0,2 zum heutigen Stand (Bounties sollen helfen, aber keine Wand ersetzen).

### B6 Save

Neues Feld für das feste Angebot pro Act (wie beim Omen-Angebot). `SAVE_VERSION` +1, Migration: offene Bounties der
gestrichenen Typen (Culling, Hale and Whole) fallen weg; eine schon **erfüllte** wird noch normal bezahlt.

---

## 5. Was der Plan bewusst nicht macht

- Keine Bounty-Währung, kein Ruf-System, keine Timer, keine Reroll-Kosten.
- Kein Lohn für Tode oder Scheitern (gescheitert = einfach weg, wie heute).
- Keine Bounty, die im Kampf etwas anderes verlangt als heute (kein „nur mit Skill X“).
- Wildfire bleibt erst einmal ohne Bounties (siehe Entscheidung E4).

---

## 6. Umsetzung

Ein PR, in dieser Reihenfolge: sim + content (Katalog, Angebot, Cache, Karte), Autopilot + CLI messen und Werte
einstellen, dann Web (Eldrin-Fenster, Feder auf der Karte, Arena-Effekt, Compendium), GDD-Abschnitt 2.7 und die
Knoten-Tabelle aktualisieren. Unit-Tests für Angebot, Fortschritt, Cache und Migration; E2E für das Einreichen.

---

## 7. Entscheidungen für Timo

| | Frage | Empfehlung |
|---|---|---|
| **E1** | Eldrin bietet 2 Bounties zur Wahl statt einer zufälligen? | **Ja** |
| **E2** | Katalog: Culling → Trail Hunt, Hale and Whole streichen, Elite Hunt ohne Gatekeeper und mit mehr Elites, Thief Chase und Dry Throat bleiben? | **Ja** |
| **E3** | Lohn: Home Rune + Item-Pick 1 aus 3 + Typ-Bonus statt Acorns + 2 Coal + zufälliges Rare ins Inventar? | **Ja** |
| **E4** | Bounties im Wildfire? a) nein, b) später nach Messung, c) gleich mit (ohne Trail Hunt, Lohn mit Cinderglass statt Home Rune) | **b** |
| **E5** | Arena-Moment: Rabe mit Feder, wenn die Bounty erfüllt ist? | **Ja** |
