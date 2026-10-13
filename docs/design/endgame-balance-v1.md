# Endgame-Balance v1: Wildfire, The Last Ember und Poison

Stand 13.10. · Offene Punkte aus `balance-grundlagen-v1.md` (Abschnitt 7) · Analyse für Timo, noch nichts umgesetzt · Game-Begriffe auf Englisch

PR #26 (Balance-Grundlagen) ist gemerged. Alles hier baut auf `main` auf, ein neuer PR reicht.

## 0. Kurzfassung

1. **Wildfire hat keine Kurve, sondern eine Klippe.** I–VII schafft jeder Build fast ohne Tod
   (Ø 0–2 Tode pro Stufe), VIII stoppt 2 von 3 Läufen, X schafft niemand. Ursache: Die
   Wildfire-Bosse benutzen die Stärke des Finales, und die ist seit PR #26 viel kleiner als die der
   letzten Wand in Run 7. Dazu ist VII der Harvester mit Rabatt, also gratis.
2. **The Last Ember ist der leichteste Kampf seit Run 2.** Ø 0,7 Tode (1,7 Anläufe) gegen 6–8
   Anläufe an jedem neuesten Akt. Und der Höhepunkt, der Harvester's Core, ist der harmloseste Kampf
   des Finales: **0 % aller Finale-Tode** passieren dort.
3. **Poison stirbt an Wänden, weil es sich nicht heilen kann.** Der Schaden ist so hoch wie bei den
   anderen Builds. Aber Poison heilt sich am Rime Warden nur ein Drittel so schnell, wie es Schaden
   nimmt. Andere DoT-Builds haben eigenes Sustain (Rend, Soul Harvest, Barrier). Poison hat nur
   2 %, und sein Keystone-Platz geht an Toxic Bloom, das gar nicht heilt.

## 1. Was ich gemessen habe

Autopilot, alle 15 Builds, 3 Läufe je Build (Seeds 31–33), Run 1–7, Finale, Wildfire bis X,
höchstens 40 Anläufe pro Stufe. 42 von 45 Läufen erreichen Wildfire.

### Wildfire

| Stufe | Akt (Boss) | Monster Level | geschafft | Ø Tode bis Sieg |
|---|---|---|---|---|
| I | 1 Gorrak | 92 | 100 % | 0,1 |
| II | 2 Mother of Rot | 94 | 100 % | 1,9 |
| III | 3 Cinder Tyrant | 96 | 100 % | 0,2 |
| IV | 4 Rime Warden | 98 | 100 % | 0,0 |
| V | 5 Storm Herald | 100 | 100 % | 0,3 |
| VI | 6 Voidborn Maw | 102 | 100 % | 0,1 |
| VII | 7 Ashen Harvester | 104 | 100 % | 0,1 |
| VIII | 1 Gorrak | 106 | **31 %** (8 von 15 Builds mindestens einmal) | 9,7 |
| IX | 2 Mother of Rot | 108 | 15 % (13 Läufe kamen hin) | – |
| X | 3 Cinder Tyrant | 110 | 0 % | – |

Alle Wildfire-Tode passieren am Boss, keiner auf den normalen Stages.

### The Last Ember

| Messung | Wert |
|---|---|
| Tode bis zum Sieg | Ø 0,7 (12 von 15 Builds 0–0,3; Barbs 4,7, Bleed 2,7, Rot 1,0) |
| davon am Harvester's Core | 0 % |
| Heldenlevel beim Finale | 84–93 (Level Cap 100) |
| Zum Vergleich: neuester Akt Run 2–7 | Ø 6–8 Anläufe |

### Poison am Rime Warden (Akt 4, Run 4)

Erster Bossversuch, Held mit voller Life, je 30 Kämpfe:

| Build, Seed | Schaden/s | Schaden genommen/s | Heilung/s | Sieg |
|---|---|---|---|---|
| Poison, 31 | 1.491 | 94 | 34 | 0 % |
| Poison, 32 | 1.277 | 103 | 32 | 0 % |
| Poison, 33 | 1.315 | 90 | 76 | 13 % |
| Assassin, 31 | 1.696 | 80 | 74 | 100 % |
| Venom (Hunter), 32 | 1.643 | 70 | 62 | 83 % |

- **Der Schaden ist nicht das Problem.** Poison macht so viel Schaden wie Assassin, auch am Anfang
  (970 Schaden/s in den ersten 5 s, kein langsames Aufbauen).
- **Wandkämpfe sind ein Sustain-Rennen.** Wer sich so schnell heilt, wie er Schaden nimmt, gewinnt
  fast sicher. Wer darunter liegt, stirbt nach 20–60 s. Schon +5 % Heilung aus Ailments dreht Venom
  von 0 % auf 100 %.
- **Poison hat das schwächste Sustain:** ~85 % seines Schadens ist DoT, und Lifesteal wirkt nur auf
  Treffer (deine Regel vom 29.09.). Die einzige DoT-Heilung ist Venomancer mit 2 %. Bleed hat Rend
  (heilt 15 % seines Bursts), Void/Rot haben Soul Harvest (25 %) und Void Lord, Casters laden
  Barrier nach.
- **Keystone-Falle:** Der Poison-Build legt seinen einen Keystone auf Toxic Bloom (reiner Schaden).
  Plaguebearer (+30 % DoT, heilt 5 %) ist damit gesperrt. Ein Spieler steht vor derselben Wahl und
  greift mit Toxic Bloom daneben.
- Dasselbe Muster an anderen Wänden: Poison stirbt an Akt 4 Ø 19,5-mal, Akt 7 23-mal; Venom an
  Akt 7 19-mal (Median aller Builds: 5–7).

## 2. Ursachen

### 2.1 Wildfire

1. **Wildfire-Bosse hängen am Finale.** `wildfirePressure` nimmt für den Boss `PROGRESSION.finale`
   (Life ×3, Schaden ×6). PR #26 hat das Finale von 6,5/3,6 auf 3/6 gestellt und die Wände
   umgedreht. Ein Wand-Boss in Run 2–6 trifft jetzt mit ×13–16 (Run Pressure × Wand), im Wildfire
   derselbe Boss mit ×6–7. Beispiel Voidborn Maw: an der Wand in Run 6 (ML 75) trifft er einen
   Helden um Level 80, in Wildfire VI (ML 102) einen Helden mit Level 100 und T10-Gear. Der Schaden
   steigt dabei nur ×1,9, die Life des Helden allein durch Level schon ×2,2. Wildfire VI ist also
   leichter als die Wand, die der Held vor zwei Runs geschafft hat.
2. **Der Harvester-Rabatt gilt auch im Wildfire.** `harvesterPressure` (Life 70 %, Schaden 20 % des
   Drucks) macht VII zur Gratis-Stufe: Schaden ×2,4 statt ×8,2. VIII ist der nächste Boss mit vollem
   Druck, ML 106 und 3 Boss Abilities: rund **4× so viel Schaden** wie VII. Das ist die Klippe.
3. **Über V wächst nur noch der Gegner.** Der Held endet bei Level 100, Monster gewinnen pro Stufe
   ~10 % Schaden aus dem Level plus +12 % aus `steep`. Das ist gewollt (ab V nur noch über Gear),
   verschärft aber die Klippe.

### 2.2 The Last Ember

1. Auch hier: Die Echos treffen mit ×4,5–5,8, dieselben Bosse an ihren Wänden mit ×13–16, und
   nach jedem Echo sammeln sich Boons an.
2. **Der Core bekommt den Harvester-Rabatt.** Echo 6 trifft mit ×5,8, der Core nur mit ×2,0. Er hat
   viel Life (Basis 1.500), aber kaum Druck: ein Schwamm statt eines Höhepunkts.

### 2.3 Poison

Siehe Tabelle: kein eigenes Sustain, und der Keystone, der Sustain bringen würde, konkurriert mit
dem Mastery-Keystone Toxic Bloom.

## 3. Vorschläge

### A. Wildfire bekommt eine echte Kurve

1. **Eigener Druck für Wildfire**, verankert an den Wänden der Runs statt am Finale. Wildfire I
   fühlt sich wie eine späte Wand an, die der Held mit Level 100 und T10-Gear gut schafft.
2. **Kein Harvester-Rabatt im Wildfire.** Der Harvester wird wie jeder andere Boss auf seine Stufe
   eingestellt (gemessen, nicht geschätzt).
3. **Zielkurve (Akzeptanztest mit dem Autopilot):**

   | Stufen | Ziel |
   |---|---|
   | I–III | 1–2 Anläufe, Aufwärmen mit T10-Loot |
   | IV–V | 2–4 Anläufe, **alle 15 Builds schaffen V** (deine Regel) |
   | VI–VII | 4–8 Anläufe, mit Gear-Farmen |
   | VIII–X | Min-Maxing: der Autopilot (craftet nicht) schafft nur wenige Läufe |

   Keine Stufe soll mehr als etwa doppelt so viele Anläufe kosten wie die davor.

### B. The Last Ember wird der Höhepunkt

1. **Der Core ist der härteste Kampf des Finales**, die Echos sind der Aufbau. Kein Harvester-Rabatt
   im Finale, Echos steigen von etwa 60 % auf 90 % der Finale-Stärke, der Core hat 100 %.
2. **Stärke nach deiner Antwort** (Frage 1). Meine Empfehlung: etwa 3–5 Anläufe für einen typischen
   Build, also etwas weniger als eine Wand, weil jeder Anlauf sieben Bosskämpfe lang ist. Der Held
   kommt mit Level 84–93 an und kann bis 100 farmen, damit gilt auch hier „Wände über Level und Gear
   schaffbar“.
3. Wildfire wird danach getrennt eingestellt (A1), damit Finale und Wildfire sich nicht mehr
   gegenseitig verschieben.

### C. Poison bekommt eigenes Sustain (Ursache, nicht Symptom)

1. **Toxic Bloom heilt:** Der Burst heilt 15 % seines Schadens, wie Rend bei Bleed. So bleibt
   Lifesteal bei Treffern (deine Regel), das Sustain liegt im DoT-Knoten (wie entschieden), und der
   Keystone ist keine Falle mehr.
2. Für Venom (Hunter, Bogen) dasselbe prüfen: Der Toxin-Pfad der Bow Mastery bekommt einen
   vergleichbaren Heilknoten, falls die Messung dasselbe zeigt.
3. Ziel: Poison und Venom liegen an Akt 4, 5 und 7 im Bereich der anderen Builds, ohne dass sich
   andere Builds ändern.

### D. Werkzeug

1. Die Balance-CLI bekommt eine Wand-Ansicht (`--walls`): pro Build und Wand Schaden/s, Schaden
   genommen/s, Heilung/s und Marge. Damit sehen wir Sustain-Lücken wie bei Poison sofort, statt sie
   über Tode zu erraten.

### Was ich bewusst nicht anfasse

- **Autopilot-Crafting:** Bleibt draußen. Die Zahlen für VIII–X sind dadurch pessimistisch, das passt
  zu „X nur über Min-Maxing“.
- **Vierter Mastery-Pfad für Wand/Staff:** Bleibt entschieden (nein).

## 4. Reihenfolge

Ein PR auf `main`:

1. C (Poison), weil es die Wandzahlen verschiebt.
2. B (Finale), dann A (Wildfire), weil Wildfire bisher am Finale hängt.
3. D (Wand-Ansicht) nebenbei, als Messwerkzeug für 1–2.
4. Volle Messung (15 Builds × 3 Läufe, Wildfire bis X) mit Vorher/Nachher-Tabelle.

## 5. Fragen an Timo

1. **Wie hart soll The Last Ember sein?** Siegesrunde (1–2 Anläufe, wie jetzt) · Höhepunkt (3–5,
   empfohlen) · härteste Stelle des Spiels (6–10).
2. Zielkurve für Wildfire wie in A3, einverstanden?
3. Poison-Sustain über Toxic Bloom (empfohlen) oder lieber mehr Heilung im Venomancer-Knoten?

## 6. Umsetzung (Stand 13.10., PR „Endgame-Balance“)

Timo hat Frage 1 mit **Höhepunkt** beantwortet (3–5 Anläufe). Frage 2 und 3 liefen auf meinen
Empfehlungen.

### Was gebaut ist

| Teil | Umsetzung |
|---|---|
| C Poison | Der Burst von Toxic Bloom heilt 15 % seines Schadens (wie Rend). |
| B Finale | Der Harvester-Rabatt gilt nur noch am Ende eines Runs. Die Echos steigen von 60 % auf 90 % der Finale-Stärke, der Core hat 100 %. Finale-Schaden ×6 → ×8,5. Der Autopilot zieht nach einem verlorenen Finale einmal durch Emberfall (Level und Gear), wie ein Spieler. |
| A Wildfire | Eigener Boss-Druck (`wildfire.boss`) statt der Finale-Werte. Jeder Akt-Boss bekommt einen Faktor (`endgameBoss`: Gorrak 0,88, Mother of Rot 0,72, Cinder Tyrant 0,94, Rime Warden 1,45, Storm Herald 1,0, Voidborn Maw 1,55, Harvester 0,85), gemessen über alle 15 Builds und 10 Stufen, damit jeder Akt auf derselben Stufe etwa gleich hart ist. Der Faktor gilt auch für die Echos im Finale. Boss-Druck Life ×3,6 / Schaden ×8,4, pro Stufe bis V +8 % Life / +6 % Schaden; über V nur noch +20 % Life pro Stufe, weil der Held bei Level 100 endet und das Monster Level weiter steigt. |

### Abweichung: Akt-Faktoren

Im Plan stand „kein Harvester-Rabatt im Wildfire“. Gemessen war der Harvester mit vollem Druck der
härteste Boss, Voidborn Maw und Rime Warden die leichtesten, Gorrak und Mother of Rot die schwersten.
Weil man im Wildfire den Akt frei wählt, hätte jeder Spieler immer Void Rift genommen. Deshalb
bekommt jeder Akt einen eigenen Faktor statt nur der Harvester.

### Zahlen (Autopilot, 15 Builds × 3 Läufe, Seeds 31–33)

| Messung | vorher | nachher |
|---|---|---|
| Tode im neuesten Akt (Ø Akt 2–7) | 6,1 / 5,1 / 5,9 / 6,0 / 6,9 / 8,3 | 6,1 / 5,1 / 5,0 / 5,3 / 6,2 / 6,9 |
| Poison: Tode an Akt 4 / 5 / 6 / 7 | 19,5 / 13 / 10 / 23 | 8,7 / 2,3 / 2,3 / 1,3 |
| The Last Ember: Tode | Ø 0,7, keiner am Core | Ø 3,1 (≈ 4 Anläufe), Core ist der häufigste Todesort |
| Wildfire I–V: Tode pro Stufe | 0,1 / 1,9 / 0,2 / 0,0 / 0,3 | 0,5 / 1,4 / 1,1 / 1,0 / 1,2 |
| Wildfire VI / VII | 0,1 / 0,1 | 8,6 / 6,2 (VI: 95 %, VII: 86 % geschafft) |
| Wildfire VIII / IX / X geschafft | 31 % / 15 % / 0 % | 42 % / 67 % / 10 % der Läufe, die hinkamen |
| Läufe, die X schaffen | 0 von 42 | 1 von 44 |

Nachtrag 13.10. (Timo: „I–V klingt sehr leicht“): I–V angehoben, erste Messung hatte 0,1–1,0 Tode.
Die Wildfire-Zahlen stammen aus Wiederholungen ab den gespeicherten Spielständen vor dem Finale.

### Was offen bleibt

- **Finale je Klasse:** Warrior Ø 1,2 Tode, Warlock 2,3, Sorcerer 2,9, Hunter 4,3, Reaver 4,7.
  3 Läufe pro Build streuen stark; vor einer Korrektur mit mehr Seeds messen.
- **Venom (Hunter, Bogen)**, siehe Abschnitt 7.
- Wand-Ansicht in der Balance-CLI (D) ist noch nicht gebaut; die Messungen liefen über Skripte.

## 7. Venom (Hunter, Bogen)

Vorher: Akt 2 Ø 15 Tode, Akt 7 Ø 19 (Median aller Builds 5–7).

1. **Autopilot-Fehler (behoben):** Beide Bogen-Builds teilten einen Mastery-Plan. Venom nahm das
   Bleed-Innate Hooked Arrow und den Barbs-Pfad (Bleed) zuerst. Jetzt: Toxic Arrow und der
   Toxin-Pfad. Ergebnis: Akt 2 15 → 8,3, Akt 7 19 → 13,3 Tode.
2. **Eigentliche Ursache: Poison stößt an die Stack-Grenze und kann sie nicht einlösen.** In Akt 7
   liegt Venom im Schnitt bei 19,4 von 20 Stacks. Mehr Poison Chance (Toxin-Pfad, Dipped Arrows)
   bringt dann nichts mehr, und Toxic Burst („verdoppelt die Stacks“) ist am Cap wirkungslos. Der
   Reaver löst seine Stacks mit Toxic Bloom ein (85 % seines Schadens), Barbs mit Rend. Der
   Bogen hat keinen Einlöser. Am Harvester: Venom 10,6k Schaden/s, Barbs 22,8k, Poison 18–28k.
3. Nebenbefund: Toxic Burst kappt immer auf 20 Stacks, auch wenn der Held mehr erlaubt (Reaver
   +3). Kleiner Fehler.

Timo hat am 13.10. „Überlauf platzt“ gewählt. Gebaut:

- **Toxic Burst:** Stacks, die beim Verdoppeln über die Grenze gehen, platzen sofort für ihren
  Restschaden. Die Grenze ist jetzt die des Helden (behebt den Nebenbefund). Venom macht am Harvester
  jetzt 20k statt 10,6k Schaden/s, so viel wie die anderen Builds.
- **Festering (Toxin-Pfad des Bogens):** heilt zusätzlich um 3 % des Ailment-Schadens. Venom heilte
  sich zu langsam (Sieg gegen den Ash Revenant in Akt 7: 0 %, mit +4 % Heilung 47 %). Lifesteal
  bleibt nur für Treffer, DoT-Heilung kommt wie vereinbart aus DoT-Knoten.
- Toxic Bloom und der Überlauf heilen wie ein DoT-Tick über die eigene DoT-Heilung.

| Venom, 8 Läufe, Tode im neuesten Akt | Akt 4 | Akt 5 | Akt 6 | Akt 7 |
| ------------------------------------ | ----- | ----- | ----- | ----- |
| nur Überlauf                         | 5,9   | 9,8   | 4,8   | 10,4  |
| + Festering 3 % (gewählt)            | 1,8   | 7,9   | 0,6   | 6,5   |
| + Festering 5 %                      | 0,9   | 5,1   | 0,6   | 8,6   |

Noch offen: Venom in Akt 2 (Ø 12 Tode an der Mother of Rot), weil der Bogen dort Festering noch
nicht hat.

## 8. Bosse, gegen die eine Verteidigung nutzlos ist

Venom starb in Akt 2 im Schnitt 12-mal, aber das galt für alle Hunter (Barbs, Marksman 9–12) und
den Assassin. Ursache: Etwa 75 % des Schadens der Mother of Rot kann Evasion nicht abwehren (Rot
Spray ist ein Spell, dazu Poison als DoT). Caster (Barrier) starben dort nur 1–3-mal. In Akt 5/6
war es umgekehrt.

Timo (13.10.) wählte beides:

- **Boss-Mix:** Rot Spray ist jetzt ein Angriff mit Void-Schaden (4 × 60 % Weapon Damage, je
  Poison). Er bleibt magisch, kann aber ausgewichen werden.
- **Deflect:** Evasion weicht weiter keinem Spell aus, lenkt Spells aber mit derselben Chance ab:
  halber Schaden (wie Spell Suppression in PoE). Nur der Held lenkt ab; Monster mit Evasion
  lenkten sonst die Spells der Caster ab (Akt 5 wurde für Caster deutlich schwerer). In der Arena:
  halbes Ausweichen, heller Ring, „↺“ an der Zahl; Tooltip an Evasion.

| 15 Builds × 3 Läufe, Tode im neuesten Akt | Akt 2 | 3   | 4   | 5   | 6   | 7   | Summe pro Build |
| ----------------------------------------- | ----- | --- | --- | --- | --- | --- | --------------- |
| vorher (vor PR #27)                       | 6,1   | 5,1 | 5,0 | 5,3 | 6,2 | 6,9 | 22–56           |
| jetzt                                     | 4,9   | 4,4 | 4,0 | 4,7 | 4,7 | 5,3 | 19–40           |

Hunter in Akt 2: 6–8 Tode (vorher 10–15). Offen: Fire Wand (Akt 3 und 6 je 10–11 Tode); das Spiel
ist insgesamt etwas leichter (Ziel waren 6–8 Anläufe pro neuestem Akt).
