# Balance-Grundlagen v1: Warum die Wände frustrieren und wie wir sie fair machen

Stand 12.10. · Analyse für Timo (Thread „Spielzeit“, PR #25), umgesetzt im Thread „Balance-Grundlagen“ (Abschnitt 7) · Game-Begriffe auf Englisch

## 0. Kurzfassung

Die Wände sind nicht zu schwer oder zu leicht. Sie sind **falsch gebaut**, und unsere Defense-Systeme
weichen an fünf Stellen von dem ab, was Diablo 2 und Path of Exile über Jahre bewährt haben:

1. **Die Wand vervielfacht den Schaden des Bosses.** Ein Telegraph-Treffer nimmt einem voll
   ausgerüsteten Helden an der Wand 30–85 % Life (ohne passende Resistance: One-Shot). In einem
   Auto-Battler kann niemand ausweichen. Der Kampf wird zur Lotterie.
2. **Leveln hilft zu wenig und zu langsam.** +10 Level drehen einen normalen Build oft von 3 % auf
   80 % Siegchance, aber schwache Matchups brauchen +20, und das Level Cap erlaubt nur +10. Die
   letzten 5 Level dauern 80 % der Farm-Zeit (XP-Malus ohne Schonzone).
3. **Resistance ist viel zu leicht.** Eine T10-Resistance rollt bis 31 %, All Resistance auf 9 Slots.
   Es gibt keinen Malus wie in D2 (Hell −100) oder PoE (−60). Ab Run 3–5 ist jeder Build am Cap,
   ohne dass es eine Entscheidung war.
4. **Casters haben keine dauerhafte Defense.** Barrier ist ein einmaliger Puffer (30 % Life), der im
   Bosskampf nie nachlädt, weil der Boss alle 1–1,5 s trifft. Es gibt keine Barrier-Basen und
   keine Barrier-Affixe. Gegen Physical (die Hälfte des Boss-Schadens) haben Casters nur 15–26 %
   Armor-Reduktion, Warriors 40–50 %.
5. **Flache Werte veralten.** Life-Affixe geben bei Level 100 nur noch 4 % der Basis-Life, Block
   Value stoppt einen späten Treffer kaum, flache Armor-Nodes verpuffen. In D2/PoE skaliert Life
   über %-Werte oder wächst mit dem Item-Level.

**Empfehlung:** Erst die Fundamente reparieren (Defense, Resistance, flache Werte, zwei Bugs), dann
die Wand umformen (mehr Life, kaum mehr Schaden, Telegraphs gedeckelt), dann das Farmen
beschleunigen, dann die Flask-Draughts. Erst ganz am Ende die Wand-Stärke neu einstellen, mit
einem Akzeptanztest: ein schwacher Build schafft jede Wand, wenn er bis zum Level Cap farmt.

## 1. Was ich gemessen habe

- Jeden Boss- und Gatekeeper-Kampf im neuesten Akt, alle 15 Autopilot-Builds, 12 Läufe
  (Schaden ausgeteilt und eingesteckt nach Typ, Life, Barrier, Armor, Resistance).
- Woher Resistance, Armor und Life kommen (mit und ohne Ausrüstung).
- Wie die Siegchance gegen denselben Wand-Boss steigt, wenn der Held 5, 10 oder 20 Level höher ist.
- Drei Code-Audits: Item-Affixe, Skill-Web und Weapon Mastery, Gegner-Skalierung.

### Siegchance gegen den Wand-Boss bei mehr Level (150 Kämpfe je Zelle)

| Build, Run | Boss-ML | Held | +0 | +5 | +10 | +20 |
|---|---|---|---|---|---|---|
| Fire, Run 3 | 30 | 32 | 0 % | 0 % | 6 % | 98 % |
| Fire, Run 6 | 75 | 77 | 3 % | 34 % | 83 % | 100 % |
| Smasher, Run 4 | 45 | 48 | 0 % | 0 % | 0 % | 95 % |
| Smasher, Run 6 | 75 | 76 | 83 % | 95 % | 100 % | 100 % |
| Rot, Run 6 | 75 | 75 | 0 % | 0 % | 2 % | 99 % |
| Marksman, Run 5 | 60 | 61 | 3 % | 35 % | 85 % | 100 % |

Leveln wirkt also, sobald ein Build nahe dran ist. Aber dieselbe Klasse liegt je nach Akt
zwischen 0 % und 83 % auf gleichem Level. Das ist kein Level-Problem, das sind Matchup-Ausreißer,
die das Level Cap (+10) nicht mehr auffangen kann.

### Woher die Resistance kommt (Fire Sorcerer, Beispiel)

| Run | Resistance (Fire/Cold/Lightning/Void) | ohne Gear | Resistance-Affixe |
|---|---|---|---|
| 2 | 35/48/35/49 % | 5 % | 6 von 29 |
| 3 | 75/47/47/61 % | 17 % | 6 von 31 |
| 5 | 75/75/75/75 % | 31 % | 8 von 34 |
| 7 | 75/75/75/75 % | 31 % | 8 von 40 |

Der Smasher ist schon in Run 3 fast überall am Cap. Ein Viertel der Affixe reicht. Theoretisch
geben 10 T10-Items über 400 % pro Element.

## 2. Unser Genre und was daraus folgt

Emberheir ist ein Auto-Battler, 1 gegen 1, ohne Distanz, ohne Kiten, ohne Gear- oder Skill-Wechsel
zwischen den Kämpfen. Der Spieler gewinnt **vor** dem Kampf: Gear, Skill Web, Weapon Mastery,
Battle Plan. Daraus folgen vier Regeln, gegen die wir heute verstoßen:

1. **Keine One-Shots.** In D2/PoE weicht man einem großen Treffer aus. Bei uns kann man das nicht.
   Ein Treffer, der mehr als ~35 % der effektiven Life nimmt, ist reines Glück.
2. **Jede Klasse braucht eine Defense, die den ganzen Kampf hält.** Da Casters genauso getroffen
   werden wie Melee, muss ihr Layer (Barrier) so viel wert sein wie Armor oder Evasion.
3. **Wände sind Stat-Checks, in die man hineinwächst.** Durch Level, bessere Rolls, Resistance
   für den Akt, einen besseren Battle Plan. Lange Kämpfe mit vielen kleinen Treffern machen das
   Ergebnis berechenbar (Glück mittelt sich heraus), kurze Kämpfe mit Riesen-Treffern nicht.
4. **Defense muss eine Entscheidung sein.** Wenn Resistance von selbst am Cap ist, gibt es beim
   Gear-Min-Maxing nichts abzuwägen.

## 3. Befunde zu deinen Punkten

### 3.1 Level (dein Punkt 1)

- Pro Level: Life ×1,04, Weapon Damage ×1,03, zusammen etwa +7 % Kampfkraft. +10 Level = ×2.
  Das ist ähnlich wie in D2/PoE und an sich gut.
- Das Level Cap liegt 10 über dem Boss. Die Messung zeigt: +10 reicht für die meisten Builds,
  aber nicht für die Ausreißer (Smasher Run 4, Rot Run 6, Fire Run 3 brauchen +20).
- **Der XP-Malus hat keine Schonzone:** −10 % XP pro Level über dem Gegner. Für +10 Level braucht
  man 190–390 Kills, die letzten 5 Level kosten 80 % davon (1–4 Stunden). PoE hat eine Schonzone
  von etwa 3–8 Level ohne Malus.
- Die Kurve selbst muss ich nicht steiler machen. Es reicht, wenn die Ausreißer verschwinden und
  Farmen schneller geht. Eine steilere Kurve würde auch die normalen Kämpfe trivial machen.

### 3.2 Armor und Barrier (dein Punkt 2)

- Armor = Armor / (Armor + 20 × Gegner-Level). Mit voller Armor-Ausrüstung bleibt das über das
  ganze Spiel bei 40–50 %. Gut und PoE-nah.
- **Barrier** = 3 % max Life pro INT (30 % bei INT 10), voll zu Kampfbeginn, lädt erst nach 1,5 s
  ohne Treffer nach. Bosse treffen alle 1–1,5 s, also lädt sie im Bosskampf praktisch nie nach.
  Gegen einen 80-Sekunden-Bosskampf ist ein einmaliger Puffer von 30 % viel weniger wert als
  40 % Reduktion auf jeden Treffer.
- In PoE ist Energy Shield bei Caster-Builds **so groß wie oder größer als die Life**, weil die
  Caster-Basen (Robes, Circlets) viel Energy Shield haben. Bei uns gibt es weder Barrier-Basen
  noch Barrier-Affixe noch Barrier-Nodes. Die Caster-Basen (Silk Robe, Circlet, Silk Wraps,
  Slippers) haben einfach weniger Armor.
- Ergebnis: Casters halten an jeder Wand nur 60–75 % so lange durch wie der Median.
- **Block** zieht nur einen flachen Block Value ab (Schild 2 × Tier = 20 bei T10). Ein später
  Boss-Treffer liegt bei Tausenden. Block ist ab der Mitte des Spiels fast wirkungslos.
  In D2 stoppt Block den ganzen Treffer. Duelist- und Warden-Block-Nodes tun für Reaver und
  Hunter gar nichts, weil sie keinen Schild tragen können.

### 3.3 Resistance (dein Punkt 3)

- Siehe Tabelle oben. Kein Malus, sehr hohe Rolls, 8–9 Slots pro Element.
- Diablo 4 hat es mit Diminishing Returns versucht und das später wieder vereinfacht. D2 und PoE
  nutzen einen **Malus**, der mit dem Fortschritt wächst. Den versteht jeder Spieler sofort
  („Akt 6 frisst 50 % meiner Resistance“), und er macht Resistance zu einem echten Gear-Ziel.
- Gegner haben fixe 25–40 % Resistance gegen ihr eigenes Element. Das ist okay, macht aber
  Ein-Element-Builds in einem Akt (Fire in Akt 3, Void/Rot in Akt 6) deutlich langsamer.

### 3.4 Trotz (dein Punkt 4)

Du hast recht, ich verwerfe es. Es belohnt Sterben und lädt zum Ausnutzen ein.

### 3.5 Item-Affixe

- **Life-Affix ist flach** (8–20 × Tier). Bei Level 10 sind das 14 % der Basis-Life, bei Level 100
  nur noch 4 %. Ab Run 5 bringt Gear-Life kaum noch etwas. Es gibt kein %-Life-Affix.
  Dasselbe gilt für flache Rune-/Runeword-Life, Garnet Ring, Sash, Thorns, Block Value.
- **Kein Barrier-Affix und keine Barrier-Basis** (siehe 3.2).
- **Rare und Epic haben keine Prefix/Suffix-Grenze.** Defense und Offense konkurrieren kaum,
  weil Offense fast nur auf Gloves, Jewelry und Off Hand rollt. Helm, Body, Boots und Belt sind
  reine Defense-Slots. Das ist okay, aber Resistance + Life + Armor füllen sie so leicht, dass
  es keine Abwägung gibt.
- Gegner haben fixe Armor (15–24), die mit dem Level nicht wächst. Physical Penetration ist
  deshalb spät wertlos. Klein, aber unsauber.

### 3.6 Skill-Web und Weapon Mastery

- Das Web hat 23 Defense-Nodes gegen 58 Offense-, 42 Ailment- und 12 Heat-Nodes. **Kein %-Life,
  keine Evasion, kein Block, keine Barrier im ganzen Web.** Life skaliert nur über VIT (+6 % pro
  Punkt) und zwei Keystones.
- Flache Armor-Nodes (141 Armor gesamt) sind bei Level 90 nur noch 7 % Reduktion wert.
- Wand- und Staff-Mastery haben keinen Defense-Pfad. Bow, Crossbow und der Marksman-Zweig auch nicht.
- **Zwei Fehler im Ailment-System:**
  - „Damage taken“ (Shock +20 %, Glass Focus, Duelist- und Pyromancer-Keystones, Warden −25 %)
    zählt doppelt: einmal im Treffer und noch einmal in jedem DoT-Tick. Ein Shock wirkt auf DoTs
    also mit ×1,44 statt ×1,2.
  - Drei DoT-Keystones (Void-lord I, Venomancer I, Black Flame) senken die Default Attack um 30 %.
    Weil Ailments aus dem Treffer berechnet werden, senkt das auch die eigenen Ailments.
    Void-lord I ist so unterm Strich ×0,84, eine Falle.
- Ailment Duration ist überbewertet (196 % im Web), bringt aber nur bei Poison mehr Schaden.
- Warrior (Iron Blood) und Sorcerer (Spark) haben denselben Trait (Treffer +20 %).

### 3.7 Gegner

| Run | Wand | Boss-Life (ohne Wand) | Telegraph ÷ Basis-Life des Helden |
|---|---|---|---|
| 1 | 1,6 | 1.401 (624) | 0,18 |
| 3 | 4,4 | 74.416 (4.403) | 0,84 |
| 4 | 5,4 | 313.650 (11.456) | 3,4 |
| 6 | 4,4 | 2,05 Mio. (62.199) | 6,8 |
| 7 | 4,4 | 2,94 Mio. (153.304) | 6,1 |

- Die Wand multipliziert **Life und Schaden**, also wird der Kampf quadratisch schwerer
  (5,4 → 29× im Schaden-Rennen). Avalanche 700 %, Rift Snap 700 % bekommen die volle Wand.
- Die Reihenfolge ist schief: Run 1 hat 1,6, Run 2 sofort 5,4, Runs 6–7 nur 4,4.
- Gatekeeper bekommen Elite-Bonus obendrauf: Life ×4,5, Schaden ×3,7, fast ein Boss.

### 3.8 Der Autopilot

Er nimmt fast keine Defense-Nodes und legt Defense-Pfade der Mastery zuletzt. Ein echter Spieler,
der an einer Wand stirbt, würde umskillen. Ein Teil der Tode sind also Autopilot-Schwächen. Bevor
wir die Wände final einstellen, soll der Autopilot Defense wie ein Spieler wählen.

## 4. Vorschläge

Alle Zahlen sind Startwerte, die ich mit dem Balance-Tool einstelle. Reihenfolge = Empfehlung.

### A. Fundamente reparieren (kein neues System, nur Fehler und veraltete Werte)

1. **DoT-Doppelzählung entfernen:** „Damage taken“ wirkt nur im Treffer, nicht noch einmal im Tick.
2. **DoT-Keystone-Fallen:** Die −30 % Default Attack gelten nicht für die Ailments, die sie
   auslöst (oder der Malus wird kleiner).
3. **Flache Werte wachsen mit dem Item-Level** wie die Basis-Life: Life-Affix, Life-Implicits,
   Block Value, Thorns. Ziel: Gear-Life ist im ganzen Spiel etwa 30–40 % der Gesamt-Life.
4. **Block stoppt einen festen Anteil** des Treffers (z. B. 50 %, Stoneguard mehr) statt flachen
   Block Value. Block-Nodes ohne Schild werden zu etwas, das Reaver und Hunter nutzen können
   (Evasion oder Life).
5. **Gegner-Armor wächst mit dem Monster Level**, damit Physical Penetration spät etwas wert ist.

### B. Defense pro Klasse gleichwertig machen

1. **Barrier wie Energy Shield:**
   - Caster-Basen bekommen ein Barrier-Implicit, das mit dem Tier wächst wie Armor
     (Silk Robe, Circlet, Silk Wraps, Silk Slippers, Ember Focus, Grimoire).
   - INT gibt nicht mehr Barrier aus Life, sondern **+X % Barrier** (wie Armor ×STR). Die
     Basis kommt aus Gear.
   - **Recharge im Kampf:** Barrier lädt immer mit z. B. 3 % pro Sekunde nach, nach 1,5 s ohne
     Treffer schneller. So hält sie den ganzen Bosskampf, wie Armor.
   - Ein paar Barrier-Nodes im Web (Arcana/Affliction) und ein Defense-Pfad in Wand- und
     Staff-Mastery.
   - Ziel: Ein Caster mit Caster-Gear hält an einer Wand genauso lange durch wie ein Warrior
     mit Armor-Gear (gemessen wie in Abschnitt 1).
2. **%-Life ins Web:** ein paar kleine „+5 % max Life“-Nodes in jeder Region, damit Defense eine
   echte Wahl im Baum ist.

### C. Resistance zur Entscheidung machen (D2/PoE-Regel)

1. **Resistance-Malus pro Run:** Run 1 ±0, dann −10 % pro Run bis −60 % in Run 7, Wildfire −60 %.
   Gilt für alle Elemente. Im Character Sheet sichtbar („Ember Penalty −40 %“).
2. **Rolls etwas kleiner:** Element-Resistance pro Tier +5 % statt +8 %, All Resistance nur auf
   Jewelry, Off Hand und Body (nicht auf 9 Slots).
3. Ziel: Am Cap zu sein kostet in Run 5–7 etwa ein Drittel bis die Hälfte der Defense-Affixe, und
   das Element des neuen Akts braucht gezieltes Gear (dafür gibt es schon die „favored“ Affixe
   pro Akt). Das ist genau die Min-Max-Entscheidung, die das Spiel tragen soll.

### D. Die Wand umformen

1. **Mehr Life, kaum mehr Schaden:** Life ×s, Schaden nur ×√s oder fest ×1,5. Die Wand wird ein
   DPS- und Ausdauer-Check, kein One-Shot-Check.
2. **Telegraph-Deckel:** Ein einzelner Treffer darf einen passend ausgerüsteten Helden auf
   Wand-Level höchstens etwa 35 % effektive Life kosten. Das wird ein Unit-Test über alle Bosse.
3. **Gleichmäßige Kurve:** Run 2 bis 7 mit ähnlicher Härte, Run 1 sanft.
4. Gatekeeper ohne zusätzlichen Elite-Bonus (sie sind schon die halbe Wand).

### E. Farmen lohnt sich schneller

1. **XP-Schonzone:** kein Malus bis 5 Level über dem Gegner, danach −10 % pro Level.
2. Level Cap bleibt Boss + 10.
3. Ziel: +10 Level farmen dauert 20–40 Minuten statt 1–4 Stunden, und +10 dreht jede Wand für
   jeden Build (Akzeptanztest).

### F. Flask-Draughts (dein Punkt 5)

Vor dem Aufbruch im Camp tauscht man **eine Flask-Ladung gegen einen Draught**, der bis zur
Rückkehr ins Camp wirkt. Einer pro Run (später zwei über Flask-Upgrades).

| Draught | Wirkung (Startwert) | Für wen |
|---|---|---|
| Iron Draught | +25 % Armor | Melee gegen Physical-Bosse |
| Ward Draught | +25 % Barrier, schnellere Recharge | Casters |
| Fire / Cold / Lightning / Void Draught | +5 % max Resistance und +20 % Resistance für ein Element | gezielt gegen den Akt-Boss |
| Vigor Draught | +10 % max Life | alle |

Mit dem Resistance-Malus aus C werden die Element-Draughts eine echte Entscheidung. Im Arena-Look
bekommt der Held eine passende Aura (Pixi). Draughts wirken nur defensiv, nie auf Schaden.

### G. Autopilot und Akzeptanztest

1. Der Autopilot nimmt Defense-Nodes, wenn er an einer Wand stirbt, und nutzt Draughts.
2. Ein zusätzlicher **schwacher Build** (zufällige Rolls, keine Optimierung) als Testfall.
3. Akzeptanz:
   - Typischer Build: etwa 4–5 Tode pro neuem Akt (Richtwert).
   - Jede Klasse ähnlich viel Life-Verlust pro Akt.
   - Kein Lauf bleibt hängen.
   - Der schwache Build schafft jede Wand, wenn er bis zum Level Cap farmt.

## 5. Reihenfolge und Aufwand

| Schritt | Inhalt | Aufwand |
|---|---|---|
| 1 | A: Fehler und flache Werte | klein |
| 2 | B: Barrier wie Energy Shield, %-Life-Nodes | mittel (Items, Web, Mastery, Arena-Look) |
| 3 | C: Resistance-Malus, kleinere Rolls | klein (+ UI-Anzeige) |
| 4 | D + E: Wand umformen, Telegraph-Deckel, XP-Schonzone | mittel |
| 5 | G: Autopilot, Akzeptanztest, Wand-Stärke einstellen | mittel |
| 6 | F: Flask-Draughts (Camp-UI, Aura) | mittel |

Schritte 1–5 gehören zusammen, weil jeder die Zahlen der anderen verschiebt. Ich würde sie als
einen eigenen PR nach #25 bauen, damit #25 (Wände, Wildfire, Lineage) nicht noch größer wird.

## 6. Offene Fragen an Timo

1. Resistance-Malus (D2/PoE) statt Diminishing Returns, einverstanden?
2. Barrier aus Gear-Basen wie Energy Shield, und INT als Prozent-Bonus darauf?
3. Block: fester Anteil des Treffers statt flachem Block Value?
4. Draughts: einer pro Run aus einer Flask-Ladung, rein defensiv?
5. Eigener PR nach #25?

## 7. Umsetzung (Stand 12.10., PR „Balance-Grundlagen“)

Timo hat alle fünf Fragen mit Ja beantwortet. Dazu kamen drei Regeln von ihm:

- **Keine allgemeine XP-Schonzone.** Bis +5 Level über dem Gegner gibt es nur einen kleinen Malus,
  danach −10 % pro Level bis +10.
- **Kein extra schwacher Zufalls-Build als Test.** Ein Build aus unserem Ranking, der gut ist, aber
  schwächer als die anderen, muss jede Wand mit bis zu +10 Level schaffen. Wer sich keine Mühe
  gibt, kommt nicht weiter.
- **Skill Web erweitern statt Nodes ersetzen.**

Seine Kernfrage war die Spielzeit: Sind 4–5 Tode pro neuem Akt zu wenig, um die Systeme (Currency,
Gear, gute Drops) wirklich zu nutzen? Er will einen Mix aus Level und Gear.

### Was gebaut ist

| Teil | Umsetzung |
|---|---|
| A | „Damage taken“ zählt bei DoTs nur einmal. Eine schwächere Default Attack (Keystone) lässt ihre Ailments voll. Life, Barrier und Thorns auf Items wachsen mit dem Item Tier (+48 % pro Tier). Block stoppt 50 % des Treffers (Stoneguard +15 %). Gegner-Armor wächst mit dem Monster Level. |
| B | Barrier kommt aus Caster-Basen (Silk Robe, Circlet, Silk Wraps, Silk Slippers, Ember Focus, Grimoire) und dem neuen Prefix „Warded“. INT gibt +8 % Barrier pro Punkt. Barrier lädt im Kampf immer 3 % pro Sekunde nach, nach 1,5 s ohne Treffer 20 % pro Sekunde. Flache Armor-Nodes sind jetzt % Armor, Block-Nodes geben % Life dazu. |
| C | **Ember Penalty:** −10 % auf alle Resistances pro Prestige, bis −60 % (Run 7, Finale, Wildfire). Im Character Sheet mit Tooltip. Element-Resistance pro Tier +5 % statt +8 %, All Resistance nur noch auf Off Hand, Body und Jewelry. |
| D | Die Wand ist jetzt **vor allem Schaden mit etwas mehr Life** (Life = √Stärke), siehe unten. **Heavy-Attack-Deckel:** Ein Treffer einer angekündigten Heavy Attack nimmt höchstens 35 % von Life + Barrier. Im Arena flammt dann ein Glut-Schild mit „Held“ auf. Gatekeeper haben keinen Elite-Bonus mehr obendrauf. |
| E | XP-Malus: −2 % pro Level bis +5, danach −10 % pro Level (mindestens 10 %). Leveln braucht doppelt so viele Kills wie vorher (×3 statt ×1,5 pro Level). |
| F | **Draughts:** Ab dem ersten Prestige wählt man im Camp einen Draught. Er kostet eine Flask-Ladung und wirkt bis zur Rückkehr ins Camp: Iron (+25 % Armor), Ward (+25 % Barrier, schnellere Recharge), Vigor (+10 % max Life), Fire/Frost/Storm/Void (+20 % Resistance, +5 % max Resistance). Im Arena hat der Held einen farbigen Ring mit aufsteigenden Bläschen. |
| G | Der Autopilot liest das Schadensprofil des Akts, wählt danach Draught und Gear (Resistance für das Element des Akts) und nimmt bei freien Punkten zuerst Defense-Nodes. |
| Web | 8 neue Defense-Knospen zwischen den Regionen, je 2 Nodes + 1 Notable (z. B. Thick Hide, Ironbark, Oakheart; Ward Weave, Quick Ward, Ever-Ward). Keine bestehenden Nodes ersetzt. |

### Abweichung von D1: warum nicht „mehr Life, kaum mehr Schaden“

Ich habe D1 zuerst so gebaut (Life ×s, Schaden ×√s). Gemessen: Bosskämpfe an der Wand dauerten
**3–5 Minuten**, Warlock- und Poison-Builds liefen in das 300-s-Zeitlimit. In einem Auto-Battler,
in dem man zuschaut, ist das zäh. Das eigentliche Problem von D1 waren One-Shots durch Telegraphs.
Die löst jetzt der Heavy-Attack-Deckel direkt. Deshalb ist die Wand umgedreht: Schaden ×s, Life
×√s. Ergebnis: Bosskämpfe an der Wand im Median 40–130 s statt 65–210 s, kein Treffer nimmt einem
Helden an der Wand mehr als 35 %.

### Zahlen (Autopilot, alle 15 Builds, 3 Läufe je Build, Seeds 31–33)

Gleiche Seeds für main und den neuen Stand. „Anläufe“ = Versuche am neuesten Akt eines Runs,
bis der Boss fällt (Schnitt / Median / schlechtester Lauf).

| Akt (neuester im Run) | main | neu |
|---|---|---|
| 2 Rotwood | 5,2 / 4 / 16 | 7,1 / 6 / 21 |
| 3 Ember Wastes | 5,0 / 4 / 17 | 6,1 / 4 / 19 |
| 4 Frost Peaks | 7,5 / 4 / 40+ | 7,3 / 4 / 40+ |
| 5 Storm Spires | 6,1 / 4 / 40+ | 7,5 / 7 / 40+ |
| 6 Void Rift | 6,9 / 5 / 27 | 8,5 / 6 / 40+ |
| 7 Emberfall | 5,5 / 4 / 15 | 8,7 / 8 / 28 |
| The Last Ember | 1,0 | 1,7 |

| Messung | main | neu |
|---|---|---|
| Anläufe pro neuem Akt (Schnitt Akt 2–7) | 6,0 | 7,5 (+25 %) |
| Kämpfe für Run 1–7 + Finale | 787 | 854 (+9 %) |
| Reine Kampfzeit | 5,3 h | 5,7 h (+8 %) |
| Bosskampf an der Wand (Median, Akt 4) | 208 s | 126 s |
| Läufe, die nach 40 Anläufen noch stecken | 3 von 270 | 4 von 270 |

- **Hängen bleibt keiner, wenn man weiterfarmt:** Die vier „40+“ sind Poison (Reaver) an Akt 4
  und 5 und Rot (Warlock) an Akt 6. Ohne Anlauf-Limit schafft Poison jede Wand mit +10 Level
  (schlechtester Fall: 54 Anläufe an Akt 4). Das ist der „gute, aber schwächere Build“ aus
  Timos Regel. main hatte an derselben Stelle Smasher (Warrior) zweimal stecken.
- **Klassen (Schnitt Anläufe Akt 2 bis Finale):** Sorcerer 5,8 · Warlock 6,3 · Warrior 6,6 ·
  Hunter 7,0 · Reaver 7,9. Auf main lagen sie weiter auseinander (Hunter 3,7 bis Warrior 7,6).
- **Spielzeit ehrlich:** Es gibt 25 % mehr Anläufe, also mehr Camp-Besuche, Gear-Entscheidungen
  und Drops. Die reine Kampfzeit wächst nur um 8 %, weil die Bosskämpfe deutlich kürzer sind.
  Mehr geht über die XP-Kurve (Kills pro Level) oder die Wandstärke. Beides erhöht aber auch den
  Anteil der Läufe, die lange an einer Wand hängen.

### Was offen bleibt

- Wildfire I–VII ist für alle Builds leicht, VIII ist die Wand (gemessen vor dem letzten
  Feinschliff). X bleibt Min-Maxing vorbehalten; I–VII sollten wir beim nächsten Mal etwas anziehen.
- Poison (Reaver) gegen den Rime Warden ist das härteste Matchup und der nächste Kandidat für
  eine Ursachen-Analyse.
- Der Autopilot craftet nicht. Ein Spieler mit Crafting und Runewords braucht weniger Anläufe.
- Kein vierter Weapon-Mastery-Pfad für Wand/Staff: die Bäume haben fest drei Pfade. Caster-Defense
  kommt aus den Web-Knospen und Barrier-Gear.
