# Neuausrichtung v1: Jeder Kampf eine Frage, jedes System eine Aufgabe

Stand 13.10.2026 · Konzept für Timo, noch nichts umgesetzt · Basis: `main` nach PR #28 · Game-Begriffe auf Englisch
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen. Zahlen sind Startwerte für die Balance-CLI.

Timo hat ausdrücklich erlaubt, jedes System grundlegend zu hinterfragen. Dieses Dokument nutzt das. Es ist aus der Sicht
eines verantwortlichen Game Designers und Produktmanagers geschrieben: Was ändere ich, in welcher Reihenfolge, und warum.

---

## 0. Kurzfassung

Emberheir hat starke Bausteine (Heat, Battle Plan, Trigger-Affixe, Weapon Mastery, Attribute mit Breakpoints, D2/PoE-Defense).
Was fehlt, ist **Struktur über den Bausteinen**: Viele Systeme geben dieselben Zahlen, und die Spannung eines Runs sitzt fast
nur am Boss des neuesten Acts. Mein Plan in sieben Punkten:

1. **Jedes System bekommt ein Hoheitsgebiet** (Abschnitt 2). Gear liefert die **Zahlen** (auch Offense!), die Bäume liefern
   **Mechanik**, der Battle Plan das **Timing**. Generische „+X %“-Minors verschwinden aus Web und Mastery.
2. **Weapon Mastery v2** (Abschnitt 3): Pfade mit **Gabelungen** und einem **Pfad-Meister** statt einer Kette aus zwei
   wiederholten Minors. Waffeneigene Werte (Precision, Glancing, Damage Range, Riposte …) statt Crit/Evasion/Trigger Chance.
3. **Skill Web v3** (Abschnitt 4): weniger, aber bedingte Notables („vs. Bleeding“, „bei Heat ≥ 50“), **Conversion**,
   Rune Sockets im Web, Keystones ohne Schablone. Travel-Nodes werden Defense, wie die Attribut-Nodes im PoE-Tree.
4. **Die ganze Welt wird im neuen Run hart** (Abschnitt 5): Jeder Act passt sich der neuen Schwierigkeit an, dazu
   ein **Sägezahn** im Act (Elites, Gatekeeper, Boss) und **Omens**, die jeden Act pro Run anders machen.
5. **Elites werden Mini-Bosse mit Beute-Thema** (Abschnitt 6), und **Item-Picks** werden seltener, aber schwerer.
6. **Endgame** (Abschnitt 7): Wildfire bekommt **Omens als Map-Mods**, VIII–X werden Pinnacles. Nach Level 100 kommt
   **Ashborn** (Paragon): langsam zu farmen, gezielt gegen die Schwächen des Builds, mit einer festen Obergrenze.
7. **Ember Crucible** (Abschnitt 8): Legendary Powers per Salvage lernen und in drei Crucible-Slots tragen (Kanais Würfel).
   Dazu der **Training Dummy** (Abschnitt 9) und der Autopilot mit Runes (Abschnitt 10).

Reihenfolge und Fragen an Timo: Abschnitte 11 und 12.

---

## 1. Befunde (gemessen und im Code gelesen)

### 1.1 Spannung nur am Boss

Messung: Balance-CLI, alle 15 Builds, Run 1–4, Seed 7.

| Messung | Wert |
|---|---|
| Tode im neuesten Act, die **am Boss** passieren | 90–100 % (fast jeder Build) |
| Tode in den alten Acts eines Runs | 0 |
| Ø Kampfdauer in alten Acts | 8–16 s (Ziel im GDD: 30–60 s) |
| Ø Kampfdauer im neuesten Act | 12–45 s, Boss 25–200 s |

Das Balancing ist nicht „schlecht“. Es ist auf genau **ein** Ziel eingestellt, die Anläufe am neuesten Boss, und alles
andere wird nicht gemessen. Die Ursachen stehen im Code:

1. **Der Boss ist eine Klippe, keine Spitze.** `PROGRESSION.wall`: Der Boss trifft mit der vollen Wand-Stärke (×4,8–8,3).
   Die normalen Gegner steigen bis Stage 14 nur auf `rampShare` = 30 % davon, die Gatekeeper auf `gateShare` = 50 %.
   Stage 14 → Boss ist also ein Sprung um ×2–3.
2. **Die alten Acts sind kein Regear mehr.** `prestige-acts-v1.md` hat die alten Acts als Rampe gebaut, weil man beim
   Prestige sein Gear verlor. Seit Playtest 2 behält der Held **alles außer dem Act-Fortschritt**
   (`progression/game/state.ts`). Der Run startet beim Monster Level des letzten Bosses, der Held steht aber schon
   10 Level darüber, voll ausgerüstet. Die ersten Acts eines Runs sind deshalb Leerlauf.
3. **Leerlauf entwertet Loot.** Alte Acts droppen ein Item Level unter dem Gear, das man trägt. Fast jeder Pick wird
   Ash. Zusammen mit ~850 Picks bis zum Finale fühlt sich der einzelne Pick bedeutungslos an.
4. **Life zwischen den Stages ist kein Druck.** Die Zermürbung (keine Regeneration, 3 Flask-Ladungen) ist eine gute Idee,
   greift aber nicht, solange normale Kämpfe nach 10 s ohne nennenswerten Schaden enden.

### 1.2 Die Systeme geben dieselben Zahlen

Zählung der Stat-Boni im Skill Web (189 Nodes: 123 Minor, 40 Notable, 14 Skill, 12 Keystone):

| Stat | Nodes im Web | auch in |
|---|---|---|
| Elemental Damage | 20 | Gear, INT, Prestige-Äste, Mastery |
| **Ailment Duration** | **19** | Gear, WIS, Prestige-Äste (10), Mastery |
| Physical Damage | 17 | Gear, STR, Prestige-Äste, Mastery |
| Armor % | 16 | Gear, STR |
| Life % | 13 | Gear, VIT, Prestige-Äste |
| Attack Speed | 11 | Gear, AGI, Prestige-Äste (8), Mastery |
| Crit Chance | 11 | Gear, DEX, Prestige-Äste, Mastery |
| Trigger Chance | 5 | Gear, Charm, DEX, Prestige-Äste, Mastery |

- Fast jeder Wert kommt aus **fünf** Quellen. Dann ist jede Entscheidung eine Addition, und kein System ist für
  irgendetwas allein zuständig.
- **Ailment Duration** ist der häufigste Minor, bringt laut `balance-grundlagen-v1.md` aber nur bei Poison mehr Schaden.
  Das sind 19 Fallen im Web und 10 weitere in den Prestige-Ästen.
- Timo hat recht: **Gear rein defensiv zu machen, wäre falsch.** Crit, Trigger Chance und die Trigger selbst sind das,
  was Loot spannend macht. Die Lösung ist umgekehrt: **Die Bäume geben die Zahlen ab, das Gear behält sie.**

### 1.3 Namen sind mehrfach vergeben

| Name | bedeutet |
|---|---|
| Venomancer, Void Lord, Butcher, Pyromancer | Web-Notable **und** Prestige-Ast |
| Second Wind | Web-Minor, Tactician-Notable, Elite-Modifier |
| Spark | Web-Minor, Sorcerer-Trait, Default Attack der Wand |
| Precision | Refine-Node der Mastery (Treffergenauigkeit) und Tactician III (Trigger Chance) |
| Ember Ward | Web-Minor und Battle-Plan-Capstone |
| Toxin, Barbs | Web-Minor und Mastery-Pfad des Bogens |
| Opportunist, Clarity | Web-Node und Attribut-Perk (DEX 7, WIS 10) |
| Pyre | Pfad der Wand-Mastery und Keystone der Staff-Mastery |
| Hardened, Cadence, Kindling | Elite-Modifier / zwei Bäume / Rune-Wort und alte Währung |
| Headsman | Web-Keystone und Warrior-Titel (Butcher-Ast) |

Dazu ein alter Befund, der noch offen ist: **Warrior (Iron Blood) und Sorcerer (Spark) haben denselben Trait** („Treffer +20 % Schaden“). Spark sollte etwas Elementares werden, z. B. „Elemental Hits apply their Ailment 10 % more often“.

Ein Name soll genau eine Sache sein. Die Umbenennung kommt mit Web v3 und Mastery v2 (Abschnitte 3 und 4).

---

## 2. Das Leitbild: Jedes System hat ein Hoheitsgebiet 💡

**Regel:** Ein Wert hat genau eine **Hauptquelle**, höchstens zwei kleine Nebenquellen. Neue Inhalte müssen in die
Spalte ihres Systems passen, sonst gehören sie woanders hin.

| System | Hoheitsgebiet | Gefühl beim Spieler | gibt ab |
|---|---|---|---|
| **Gear** (9 Slots + Charm) | **Zahlen**: Damage %, Crit, Attack Speed, Life, Armor/Evasion/Barrier, Resistances, Trigger-Affixe | „Mein Build wird stärker, ich min-maxe“ | – (bekommt mehr Gewicht) |
| **Skill Web** | **Spezialisierung**: Bedingungen, Conversion, Skills, Keystones | „Mein Build tut etwas Besonderes“ | generische Offense-Minors |
| **Prestige-Äste** | **Ascendancy**: die eine große Identität des Charakters | „Ich bin ein Stormcaller“ | generische Minors |
| **Weapon Mastery** | **Kampfstil**: Precision, Damage Range, Glancing, Heat Form, Innate, Riposte, Sunder | „Meine Klinge, mein Stil“ | Crit, Evasion, Trigger Chance, Attack Speed (außer Refine) |
| **Attribute** | **Charakter**: Breakpoints bei 4/7/10 | „Wer mein Held ist“ | – |
| **Battle Plan** | **Timing und Taktik** | „Ich programmiere den Kampf“ | – |
| **Legendary / Crucible** | **Regelbruch** | „Das ändert alles“ | – |
| **Boons, Draughts, Omens** | **Würze für einen Zug** | „Dieser Run ist anders“ | – |
| **Ashborn** (neu, Endgame) | **Ausgleich**: Schwächen ausbügeln, sehr langsam | „Ich komme immer weiter“ | – |

### Wer liefert welchen Wert

| Wert | Hauptquelle | Nebenquellen | fällt weg aus |
|---|---|---|---|
| Physical / Elemental Damage % | Gear | STR / INT, Ashborn | Web-Minors, Mastery |
| Crit Chance | Gear (Helm, Gloves, Jewelry) | DEX | Web-Minors, Mastery-Minors, Prestige-Minors |
| Attack Speed | Gear (Gloves, Jewelry) | AGI, Refine „Balance“ | Web-Minors, Prestige-Minors |
| Trigger Chance | Gear + Charm | DEX | Web, Mastery, Prestige-Äste |
| Ailment Chance | Mastery (Innate, Attunement) + Gear | bedingte Web-Notables | Web-Minors |
| Ailment Duration | WIS | einzelne Notables mit Regel | 29 Minors in Web und Prestige-Ästen |
| Heat Gain, Starting Heat | Mastery (Heat Form) | WIS, Gear (Off Hand, Helm) | Web-Minors (Core behält Heat-Notables mit Regel) |
| Life %, Armor %, Barrier %, Evasion | Gear | Web-Travel-Nodes, Attribute, Ashborn | – |
| Resistances | Gear, Draughts | Ashborn (klein) | Web-Minors |
| Precision, Damage Range, Glancing | **nur** Mastery | DEX 4 | – |

**Folge fürs Balancing:** Wenn das Web keine rohen Offense-Zahlen mehr gibt, fehlt Schaden. Der wandert auf das Gear
(höhere Rolls, ein Prefix mehr für Rare/Epic) und in bedingte „more“-Multiplikatoren im Web. Das macht Gear-Drops
wichtiger, genau wie gewünscht.

---

## 3. Weapon Mastery v2: Gabelungen und eigene Werte 💡

### 3.1 Bewertung der heutigen Nodes

**Stark (behalten):**
- **Refine** (Steady Hand, Full Swing, Precision, Balance) ist eigenständig. Damage Range und Precision gibt es nur hier.
- **Heat Forms** und **Innate Forms** sind echte Stil-Entscheidungen (Cleaving / Rising / Sundering Strike).
- Die **Notables** sind fast alle gut, weil sie waffeneigene Mechanik haben: Read the Blow, Unbroken Flow, Counterweight,
  Keen Edge, Rhythm, Deep Cuts.
- **Echoes** (Ashfall Wrath, Winter's Last Breath …) als Boss-Andenken an der Waffe.

**Schwach (ändern):**
- **Jeder Pfad ist eine Kette aus zwei Minors**, die sich dreimal wiederholen (`buildTree`: a, b, a, Notable, b, a, b,
  Notable). Riposte = 3× „+2 % Evasion“ und 3× „+3 % Trigger Chance“. Die einzige Entscheidung ist, wie tief man geht.
- **Die Minors sind generisch** (Crit, Evasion, Attack Speed, Trigger Chance, Heat Gain) und doppeln Web und Gear.
- **Einige Keystones sind reine Zahlen-Tauschs:** Siege Engine (+60 % Damage, −30 % Attack Speed), Repeater, Glass Cannon,
  Thousand Cuts. Sie ändern nicht, *wie* die Waffe kämpft.

### 3.2 Neuer Grundriss eines Pfads

```
Pfad (z. B. Riposte)
  Technik I (Minor, 3 Ränge, waffeneigener Wert)
        │
  Gabel 1:  Notable A  ◇  Notable B      (nur eins lernbar)
        │
  Technik II (Minor, 3 Ränge, waffeneigener Wert)
        │
  Gabel 2:  Notable C  ◇  Notable D      (nur eins lernbar)
        │
  Pfad-Meister (verlangt Gabel 2, verbindet den Pfad mit einem anderen System)
```

| Teil | heute | v2 |
|---|---|---|
| Nodes pro Pfad | 8 (6 Minor, 2 Notable) | 9 (2 Technik à 3 Ränge, 4 Notables in 2 Gabeln, 1 Meister) |
| Punkte für einen vollen Pfad | 8 | 9 (3 + 1 + 3 + 1 + 1) |
| Entscheidungen pro Pfad | 0 | 2 Gabeln + Ränge |
| Summe des Baums | 49 Nodes / 38 Punkte | 55 Nodes / 41 Punkte (Budget bleibt 20) |

Mit 20 Punkten schafft man **einen vollen Pfad plus einen halben**, oder zwei Pfade bis zur ersten Gabel. Zwei Swords
unterscheiden sich damit in Pfad, Gabeln, Form und Keystone: 3 × 2 × 2 = 12 Pfadvarianten statt 3.

### 3.3 Waffeneigene Werte für die Technik-Minors

Diese Werte gibt es **nur** in der Mastery. So hat das System etwas, das kein Item liefern kann:

| Wert | Wirkung |
|---|---|
| Precision | weniger eigene Glancing Blows |
| **Parry** (neu) | gegnerische Angriffe werden öfter zu Glancing Blows (Defense nur über die Waffe) |
| Glancing Damage | eigene Glancing Blows machen mehr Schaden (heute fest 50 %) |
| Damage Range Min / Max | wie Refine, aber pfadgebunden |
| Innate Damage / Innate Cost | Stärke und Heat-Kosten des Innate Skills |
| Extra-Attack Damage | Riposte, Double Stab, Split Shot, Rain of Arrows |
| Sunder pro Treffer / Max Sunder | Mace, Crossbow |
| Ailment Potency der Waffe | Bleed/Poison/Burn aus dem Innate stärker (nicht Duration!) |
| Heat per Hit | für Cooling und Steady |

### 3.4 Beispiel: Sword

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Pfad-Meister |
|---|---|---|---|---|---|
| **Riposte** (Konter) | +6 % Parry/Rang | **Counterweight** (Riposte trifft immer sauber, +1 Sunder) ◇ **Read the Blow** (nach Block/Evade/Parry: nächster Treffer sauberer Crit) | +15 % Extra-Attack Damage/Rang | **Perfect Timing** (Parry löst Riposte aus, 1 s Cooldown) ◇ **Iron Wall** (Block und Parry geben 8 Heat) | **Master of the Counter**: Ripostes lösen deine Trigger-Affixe aus (Gear-Synergie) |
| **Edge** (Präzision) | +3 % Precision/Rang | **Keen Edge** (Crits bluten) ◇ **Measured Cut** (+10 % Precision, Min +10 %) | +10 % Glancing Damage/Rang | **Clean Line** (5 saubere Treffer in Folge: nächster Treffer +100 %) ◇ **Hamstring** (Bleed senkt Gegner-Attack-Speed um 10 %) | **Master of the Edge**: Glancing Blows gibt es nicht mehr, darüber hinausgehende Precision wird zu Crit Chance |
| **Tempo** (Rhythmus) | +1 Heat per Hit/Rang | **Rhythm** (jeder 3. Slash +10 Heat) ◇ **Unbroken Flow** (+3 % Attack Speed pro sauberem Treffer, bis 5) | +8 % Innate Damage/Rang | **Building Edge** (Innate kostet 5 Heat weniger pro sauberem Treffer seit dem letzten Skill) ◇ **Steady Breath** (Glancing Blows kühlen nicht ab) | **Master of Tempo**: der erste Rotation Slot wird nach jedem Innate kostenlos wiederholt, 1× pro 8 s (Battle-Plan-Synergie) |

Die Pfad-Meister binden je ein anderes System an: **Gear** (Trigger), **Attribute** (Precision → Crit, also DEX),
**Battle Plan** (Rotation). Das ist das Muster für alle acht Waffen.

### 3.5 Keystones

Jeder Keystone muss ändern, **wie** die Waffe kämpft. Ersetzen würde ich:

| raus | rein (Beispiel) |
|---|---|
| Siege Engine (+60 % Damage, −30 % Attack Speed) | **Siege Engine**: jeder Bolt lädt 2 s, trifft dafür alle Sunder-Stacks auf einmal und setzt sie zurück |
| Repeater (+50 % Attack Speed, −30 % Damage) | **Repeater**: Bolts kommen in Dreier-Salven, jede Salve teilt sich einen Crit-Wurf |
| Glass Cannon (+40 % Elemental Damage, −10 % Life) | **Glass Cannon**: Barrier gibt es nicht mehr, Spark trifft für 25 % deiner fehlenden Barrier extra |
| Thousand Cuts (+40 % Attack Speed, Max 80 %) | **Thousand Cuts**: jeder Treffer setzt 1 Poison-Stack, aber Poison Chance zählt nicht mehr |

### 3.6 Antwort auf Timos Frage

Ja, die Pfade bekommen Nodes dazu (+1 pro Pfad), aber wichtiger ist: **Gabelungen statt Ketten** und **eigene Werte
statt geliehener**. Die Zahl der Nodes ist nicht das Problem, die fehlende Wahl ist es.

---

## 4. Skill Web v3: von „+6 %“ zu „wenn, dann“ 💡

### 4.1 Bewertung der heutigen Nodes

**Gut:**
- Das **Netz** aus acht Regionen mit Brücken für Hybride ist eine gute Struktur (näher an PoE als die alten Äste).
- **Skill-Nodes** im Netz geben dem Tree Gewicht (Crushing Blow, Meteor, Rend, Soul Harvest …).
- **Defense-Knospen** (Thick Hide, Oakheart, Ever-Ward) waren nötig und sind richtig platziert.
- Einige Notables haben echte Regeln: **Glacier**, **Firestarter**, **Coup de Grace**, **Leeching Rot**, **Battle Scars /
  Unbroken**, **Exsanguinate**, **Hungering Void**.

**Langweilig oder doppelt:**
- **65 % der Nodes sind Minors mit einem einzigen Stat**, viele identisch: „+5 % Chance to Burn“ fünfmal in einer Brücke,
  „+8 % Ailment Duration“ zehnmal, „+1,5 % Crit Chance“ sechsmal.
- **Nur 8 von 40 Notables ändern eine Regel.** Der Rest sind größere Minors: Colossus (+25 % Physical, +10 % Armor),
  Killer's Eye (+5 % Crit), Bloodthirst (+2 % Lifesteal), Stoneskin.
- **Vier Keystones nutzen dieselbe Schablone** „X more, Default Attack less“ (Spellblade, Arcane Conduit, Black Flame,
  Slow Death), zwei sind Spiegelbilder (Plague Bearer / Hemomancer).
- Im Vergleich zu PoE fehlt, was dort die Tiefe macht: **bedingte Modifier** („against Bleeding Enemies“),
  **Conversion** (Physical → Fire), **Jewel Sockets** und **Cluster mit Thema** statt verstreuter Prozentwerte.

### 4.2 Neue Regeln für Web-Nodes

| Typ | Inhalt | Beispiel |
|---|---|---|
| **Travel** (ersetzt die Minors) | nur Defense: Life %, Armor %, Barrier %, Evasion, Tenacity, je klein | „+3 % max Life“ |
| **Notable** | immer bedingt **oder** mit Regel, nie reine Zahl | „Your hits deal 30 % more damage to Bleeding enemies“ |
| **Conversion** (neu) | wandelt Schadensart um, öffnet Hybride | „30 % of Physical Damage is converted to Fire“ |
| **Skill** | wie heute | Meteor, Rend … |
| **Rune Socket** (neu) | nimmt eine Rune auf, die eine dritte „Web-Wirkung“ hat | Rune „Ember“ im Web: Burns +15 % |
| **Keystone** | Regelbruch mit echtem Preis, keine Schablone | siehe 4.4 |

Travel-Nodes mit Defense haben den Effekt, den die Attribut-Nodes im PoE-Tree haben: **Der Weg zur Offense kostet nichts
und gibt etwas Defense**. Wer viel Defense will, nimmt die Defense-Notables, wer Schaden will, die bedingten Notables.

### 4.3 Bedingungen, die das Web nutzt

Sie greifen auf Zustände zurück, die es in der Sim schon gibt. Deshalb entsteht automatisch Synergie mit Battle Plan,
Ailments und Mastery:

| Bedingung | verbindet mit |
|---|---|
| Gegner hat Ailment X / Y Stacks | Ailment-Builds, Rotation Conditions |
| Heat ≥ 50 / Heat voll / nach Skill-Einsatz | Battle Plan, Heat Forms |
| Gegner Sundered / Stunned / Chilled | Mace, Crossbow, Cold |
| nach Crit / Evade / Block / Parry, für 3 s | Mastery-Pfade, Gear-Trigger |
| eigene Life unter / Barrier aktiv | Defense-Builds, Reaction Slots |
| Gegner unter 35 % Life | Execute-Builds |
| während Telegraph des Gegners | Reaction Slots |

### 4.4 Keystones ohne Schablone (Beispiele)

| heute | Vorschlag |
|---|---|
| Spellblade (Default +40 %, Skills +25 % Heat) | **Spellblade**: deine Skills treffen zusätzlich mit deiner Waffe, die Default Attack macht 0 Schaden |
| Arcane Conduit (Skills −30 % Heat, Default −50 %) | **Arcane Conduit**: Heat hat kein Maximum mehr, Skills kosten alles, was du hast, und skalieren mit der Menge |
| Black Flame (Burn corrupts, Default −25 %) | **Black Flame**: Burn und Corruption sind ein Ailment, das sowohl wächst als auch Heilung senkt |
| Slow Death (DoT +50 %, Default −30 %) | **Slow Death**: Treffer machen keinen Schaden mehr, 100 % davon werden zu einem Ailment ihres Typs |
| Plague Bearer / Hemomancer (Spiegel) | ein Keystone **Blood and Bile**: Bleed und Poison teilen sich die Stacks, jeder Stack zählt für beide |

### 4.5 Prestige-Äste als Ascendancy

Die zehn Prestige-Äste sind der richtige Ort für die **große Identität**. Sie bekommen dieselbe Behandlung:
Minors werden zu Travel-Nodes oder entfallen, jede Stufe bringt ein **Notable mit Regel** und den Keystone. Die vier
Namen, die heute zugleich Web-Notables sind (Venomancer, Void Lord, Butcher, Pyromancer), bleiben **nur** als Ast-Namen.

### 4.6 Umfang

| | heute | v3 |
|---|---|---|
| Nodes im Web | 189 | ca. 150 (90 Travel, 36 Notables, 14 Skills, 10 Keystones, 8 Rune Sockets, ~6 Conversion) |
| reine Zahl-Notables | 32 | 0 |
| Ailment-Duration-Nodes | 19 | 2–3 Notables mit Regel |

Der Tree bleibt groß genug für das Budget von 100 Skill Points (`level-v2.md`), aber jeder Punkt entscheidet mehr.

---

## 5. Jeder Act wird im neuen Run hart (Timos Idee, ausgebaut) 💡

Kein Auto-Resolve ✅ (Timo). Stattdessen soll **jeder Kampf etwas bedeuten**, also mehr echte Spielzeit statt mehr Leerlauf.

### 5.1 Die Welt brennt neu: Level-Band pro Run

**Heute:** Das Level-Band eines Runs läuft vom letzten Boss-Level bis zum neuen Boss-Level, verteilt über alle Stages.
Act 1 liegt also immer weit unter dem Helden.

**Neu (wie Nightmare und Hell in D2):** Im neuen Run startet **jeder Act** auf der neuen Stufe.

| Act im Run | Monster Level (Vorschlag) |
|---|---|
| Act 1 | Level Cap des letzten Runs (= Heldenlevel bei Run-Start), also ein fairer Kampf ab Stage 1 |
| jeder weitere Act | +2 bis +3 Level gegenüber dem vorigen |
| neuester Act | endet beim neuen Boss-Level wie heute |

Beispiel Run 5 (Band heute 45 → 60): Act 1 bei ML 55, Act 2 bei 57, Act 3 bei 59 … Act 5 endet bei 60 + Wand.
Damit droppt **jeder Act aktuelles Gear**, und der Held muss die ganze Strecke ernst nehmen.

### 5.2 Omens: Jeder Act ist in jedem Run anders

Damit der fünfte Besuch im Rotwood nicht der vierte ist, bekommt **jeder alte Act pro Run ein Omen**: eine sichtbare
Regel für den ganzen Act, die der Scout ankündigt. Omens sind dasselbe System wie die Wildfire-Mods (Abschnitt 7).
Ein System, zwei Einsätze.

| Omen (Beispiel) | Wirkung | Frage an den Build |
|---|---|---|
| Blight Bloom | Gegner heilen sich an ihrem eigenen Poison | Anti-Heal (Burn), Burst |
| Stoneflesh | Gegner +50 % Armor | Penetration, Sunder, Elemental |
| Cinder Rain | alle 8 s ein Feuer-Telegraph | Fire Resistance, Reaction Slot |
| Parched | keine Flask auf diesem Zug, dafür doppelte Ember Coal | Lifesteal, Barrier |
| Restless Dead | Elites kommen in Paaren (zwei Kämpfe am Stück, ohne Pause) | Zermürbung |
| Thin Veil | Ailments halten auf beiden Seiten doppelt so lange | DoT-Builds, Tenacity |

Pro Run wählt das Spiel für jeden alten Act ein Omen aus der Liste seines Acts. Die Bosse behalten ihre neue
Prestige-Fähigkeit (`gegner-bosse-v1.md`). Jedes Omen bekommt seinen Look in der Arena (`weather.ts`, Partikel).

### 5.3 Sägezahn statt Klippe im Act

| Stage | heute (Anteil der Wand-Stärke) | neu |
|---|---|---|
| 1–4 normal | steigt bis ~10 % | 35 → 50 % |
| 5 Gatekeeper | 50 % | **75 %** |
| 6–9 normal | ~20 % | 50 → 65 % |
| 10 Gatekeeper | 50 % | **85 %** |
| 11–14 normal | bis 30 % | 65 → 75 % |
| 15 Boss | 100 % | 100 % (Schaden etwas niedriger, siehe 5.5) |

Ziel-Verteilung der Tode im neuesten Act (neuer Akzeptanztest in der Balance-CLI):

| Ort | Ziel |
|---|---|
| Boss | 35–55 % |
| Gatekeeper | 20–30 % |
| Elites | 10–20 % |
| normale Stages | 5–15 % |

### 5.4 Zermürbung wird die eigentliche Run-Spannung

Mit härteren normalen Stages greift, was schon gebaut ist: **Life bleibt zwischen den Stages, keine Regeneration,
3 Flask-Ladungen.** Die Kernfrage jedes Zugs wird „**Weiter oder zurück ins Camp?**“, wie in Darkest Dungeon.
Dazu zwei kleine Ergänzungen:

- **Hearth Embers:** Waymark-Stages (5, 10) heilen 25 % Life. Ein Zwischenziel, auf das man hinkämpft.
- **Push-Bonus:** Jede Stage ohne Camp-Rückkehr erhöht die Item-Rarity der nächsten Pick-Auswahl leicht (bis +3 Stufen).
  Mutig weiterzugehen lohnt sich, Retreat bleibt erlaubt.

### 5.5 Kampfdauer

| Kampf | heute | Ziel |
|---|---|---|
| normal | 8–16 s (alte Acts), 12–45 s (neuester) | 20–30 s |
| Elite | ~20–40 s | 35–50 s |
| Gatekeeper | ~30–60 s | 45–70 s |
| Boss | 25–200 s | 60–100 s |

Hebel: Gegner-Life (√ wie bei den Wänden), nicht Schaden. Länger heißt mehr Zeit, um Battle Plan, Trigger und
Ailments in der Arena zu sehen. Mehr Spielzeit pro Kampf, die man gern anschaut.

### 5.6 Was das kostet und bringt

- **Spielzeit:** Alte Acts werden echte Kämpfe. Grob +40–60 % Kampfzeit bis zum Finale, und zwar verteilt statt am Boss.
- **Risiko:** Run 2 und 3 werden spürbar länger. Gegenmittel: Run 1–2 bleiben sanfter (Faktor wie heute `wall[0]`).
- **Item Level:** Jeder Act droppt aktuelles Gear, also lohnt jeder Pick (Abschnitt 6.3).

---

## 6. Elites und Item-Picks 💡

### 6.1 Elites: Mini-Bosse mit Thema

Heute: 1–3 Modifier aus 20, garantiert Rare, Ember Coal. Sie sterben meist wie normale Gegner. Neu:

1. **Ein Act-Modifier + ein allgemeiner.** Jeder Act hat 3–4 eigene Elite-Modifier (Rotwood: Sporeburst, Rootbound;
   Frost Peaks: Shatter Armor …). Elites fühlen sich dann nach ihrem Ort an.
2. **Jeder Modifier stellt eine Battle-Plan-Frage.** Ashen Shell (Barrier alle 8 s) → Reaction `barrierBreaks`.
   Enraged → Telegraph → Reaction Slot. Vampiric → Burn. Die Conditions dafür existieren schon.
3. **Beute nach Thema:** Der Modifier lenkt den Loot. Stone Skin droppt bevorzugt Armor-Affixe, Vampiric Lifesteal,
   Frenzied Attack Speed. Elites werden **gezieltes Farmen**: „Ich brauche Lifesteal, ich jage Vampiric-Elites.“
4. **Name und Look:** Ein Elite trägt einen Namen aus seinen Modifiern („Vampiric Stone-Skinned Barkhide“) und bekommt
   Pixi-Effekte pro Modifier (Aura, Partikel, Blend Mode).
5. **Rare Elite (Champion):** Ab Run 3 hat jede Act-Strecke mit ~10 % Chance einen **benannten Champion** mit drei
   Modifiern und eigenem Hoard (garantiert Epic, 15 % Legendary). Das ist der D2-Moment „ein Unique Monster!“.

### 6.2 Routen statt einer festen Linie (optional, größerer Schritt) ❓

Auf der Straßenkarte gabelt sich der Weg an zwei Stellen pro Act (z. B. nach Stage 3 und 8): **Elite-Pfad** (2 Elites,
bessere Beute) oder **Shrine-Pfad** (Boon, ein Normalkampf). Kein Auto-Resolve, keine Abkürzung, aber eine echte Wahl,
die vom Zustand des Helden abhängt (Life, Flask, Bounty). Wie die Karte in Slay the Spire.

### 6.3 Item-Picks: weniger, aber schwerer

Heute: nach **jedem** Sieg 1 aus 3, bis zum Finale ~850-mal. So viele Wahlen ermüden, und die meisten Karten sind Ash.

| Kampf | heute | neu |
|---|---|---|
| normal | 1 aus 3 | Ash und Acorns, **jede dritte Stage** 1 aus 3 |
| Elite / Gatekeeper | 1 aus 3, höhere Rarity | 1 aus 3, höhere Rarity, Thema-Affixe (6.1) |
| Boss | 1 aus 3 | 1 aus 4, eine Karte garantiert mit Build-Tag |

Dazu auf jeder Karte:
- **Upgrade-Markierung** gegen das getragene Item, berechnet über den Training Dummy (Abschnitt 9): „+8 % DPS, −3 % Fire Res“.
- **Build-Tags:** Ein Affix, das der Build nutzt (z. B. Bleed Chance bei einem Bleed-Build), leuchtet.

Weniger Picks, aber jeder auf aktuellem Item Level, mit Thema und mit sichtbarem Unterschied. So spürt man wieder, was man nimmt.

---

## 7. Endgame: Wildfire mit Omens und Ashborn 💡

### 7.1 Ziel (Timo)

- I–V: Aufwärmen bis „jeder Build schafft V“.
- VI–VII: Gear farmen.
- **VIII–X: Pinnacles**, kaum oder gar nicht ohne Min-Maxing.
- Es braucht etwas zum **Farmen, wenn Gear und Tree fertig sind**, damit auch ein schwächerer Build irgendwann X schafft.

### 7.2 Omens als Wildfire-Mods (wie Map-Mods und Heat in Hades)

Vor jedem Wildfire-Zug wählt man **Omens** aus einem Pool von ~20. Jedes Omen hat einen **Glutwert** (1–3).

| Regel | Wert (Startwert) |
|---|---|
| Mindest-Glut pro Stufe | I–V: 0 · VI: 2 · VII: 4 · VIII: 6 · IX: 8 · X: 10 |
| Belohnung pro Glut | +8 % Ashborn-XP, +5 % Legendary-Chance, +1 Rune-Rang ab 4 Glut |
| Omen-Arten | Gegner-Omens (stärker), Helden-Omens (Einschränkung), Welt-Omens (Regel) |

Beispiele:

| Omen | Glut | Wirkung |
|---|---|---|
| Searing Touch | 1 | Gegner-Treffer setzen Burn |
| Stoneflesh | 1 | Gegner +50 % Armor |
| Hexed Ground | 2 | −15 % max Resistance |
| Bloodfever | 2 | Gegner +25 % Attack Speed |
| Parched | 2 | keine Flask |
| Short Fuse | 2 | Kampf-Limit 90 s, danach Niederlage |
| Silenced Ember | 3 | der erste Rotation Slot ist gesperrt |
| Crushing Weight | 3 | Heavy-Hit-Deckel 50 % statt 35 % |

**Warum das zu Pinnacles passt:** Auf X braucht man 10 Glut, darf sie aber **selbst wählen**. Ein Barrier-Caster nimmt
„Stoneflesh“ (betrifft ihn nicht), ein Physical-Build nimmt „Hexed Ground“, wenn seine Resistances überzählig sind.
Min-Maxing heißt dann auch: **die Omens wählen, die zum Build passen.** Dieselben Omens erscheinen in den Runs als
feste Act-Twists (Abschnitt 5.2), man lernt sie also schon vorher kennen.

### 7.3 Levelkurve oder Paragon? Meine Empfehlung: Ashborn (Paragon)

| | A: Levelkurve strecken (Ankunft mit 80–90) | B: Ashborn nach Level 100 |
|---|---|---|
| Wirkung | +7 % Kraft pro Level, pauschal | gezielt: Offense **oder** Defense **oder** Sustain |
| Schwächen ausbügeln | nein, nur mehr von allem | ja, genau Timos Ziel |
| Eingriff in Run 1–7 | groß (ganze XP-Kurve, alle Wände neu) | keiner (startet erst nach dem Finale) |
| Langer Farm | 10–20 Level, dann Ende | lang, mit fester Obergrenze |
| Risiko | Finale und Wände verschieben sich | Power Creep, wenn ohne Grenze (D3-Fehler) |

**Empfehlung: B.** Die Levelkurve bleibt, wie sie ist. Ab Level 100 fließt XP in **Ashborn-Level**.

**Ashborn** (Arbeitsname: der Held wird aus der Asche neu geboren, passt zu Harvest und Phoenix Feathers):

- Jedes Ashborn-Level gibt **1 Ashborn-Punkt**. XP pro Ashborn-Level steigt um 4 % pro Level.
- Vier **Glutkreise** (Boards), je 6 Werte mit eigener Obergrenze:

| Kreis | Werte (je bis zur Grenze) |
|---|---|
| **Onslaught** (Offense) | Damage %, Crit Chance, Attack Speed, Ailment Potency, Penetration, Skill Damage |
| **Aegis** (Defense) | Life %, Armor/Evasion/Barrier %, Resistances (+max Resistance bis +5 %), Tenacity, Block |
| **Mending** (Sustain) | Lifesteal, DoT-Heilung, Barrier-Recharge, Flask-Wirkung |
| **Ignite** (Heat und Trigger) | Heat Gain, Starting Heat, Trigger Chance, Skill Cost |

- **Obergrenze gesamt: 200 Punkte.** Ein Wert kann höchstens etwa **25 Punkte** aufnehmen, kein Build kann also alles
  maximieren, und die Punkte gehen dorthin, wo der Build schwach ist.
- **Respec** jederzeit bei Kaelen für Acorns (eine Regel für alles, wie in `entschlackung-v1.md`).
- **Ziel-Zeiten:** Ein gut gebauter Build schafft X mit ~60 Punkten (Min-Maxing + Omen-Wahl), ein schwächerer mit
  ~150–200 Punkten nach langem Farmen. Akzeptanztest: Der schwächste Build aus dem Autopilot-Ranking schafft X mit
  200 Punkten.
- **Wo man XP farmt:** Wildfire, je mehr Glut, desto schneller. Damit bekommen die Omens einen Grund jenseits der Stufe.
- **Look:** Ashborn-Level zeigen sich am Helden (Glutrisse, Aschepartikel ab 50/100/150/200).

### 7.4 Was man außerdem farmt, wenn alles fertig ist

1. **Ashborn-XP** (sicherer, langsamer Hebel, wie Level in Run 1–7).
2. **Bessere Crucible-Powers** (Abschnitt 8.4): ein höherer Roll einer Legendary Power ersetzt den gelernten.
3. **Wildfire-Uniques:** ab VI eine kleine Zahl Uniques, die nur dort droppen (Pinnacle-Beute, wie die Uber-Uniques in PoE).

---

## 8. Ember Crucible: Legendary Powers lernen und tragen (Kanais Würfel) 💡

### 8.1 Idee

Legendary Powers sind heute an ihr Item gebunden. Ein Spieler mit dem perfekten Rare-Helm kann die Power eines schlechten
Legendary-Helms nicht nutzen. Das **Ember Crucible** löst das, und es nutzt dieselbe Regel wie der Trigger Codex:
**Was man salvaged, lernt man.**

### 8.2 Ablauf

| Schritt | Wo | Was |
|---|---|---|
| **Extract** | Thoric (Salvage) | Ein Legendary oder Unique salvagen → seine Power steht im **Power Codex**. Das Item ist weg. |
| **Bind** | Liora (Affix-Magie) | Eine gelernte Power in einen **Crucible-Slot** legen. Kostet Ash und Ember Coal, Wechsel kostet erneut. |
| **Improve** | Thoric | Eine Power mit **höherem Roll** salvagen ersetzt den gelernten Roll. Das ist der Farm im Endgame. |

### 8.3 Drei Crucible-Slots

Da die Waffe fest ist, sortiere ich nicht nach Slots wie in D3, sondern nach **Art der Power**:

| Slot | Powers | offen ab |
|---|---|---|
| **Strike** | Treffer, Crits, Extra-Attacks, Execute | erster Legendary-Extract (Run 4–5) |
| **Ward** | Defense, Heilung, Barrier, Block | The Last Ember gewonnen |
| **Ember** | Ailments, Heat, Trigger, Regeln | Wildfire V gewonnen |

### 8.4 Regeln

- Eine Power wirkt **nur einmal**, auch wenn sie zusätzlich auf einem getragenen Item ist.
- Im Crucible wirkt eine Power mit ihrem gelernten Roll. Der höchste Roll ist ein Ziel für das Endgame.
- Der Power Codex ist **permanent** (überlebt Prestige) und gehört **dem Charakter** ❓ (oder dem Account wie der Stash,
  dann lohnt sich Twinken mehr).
- **Mehr Powers:** heute 13. Ziel ~36: pro Klasse 4 eigene, 16 allgemeine. Jede bekommt einen Look in der Arena.
- Boss-Uniques (Trophies) haben eine Power, die man nur bei diesem Boss lernen kann: Grund, ihn erneut zu besuchen.

### 8.5 Warum das in den Rest passt

- Es gibt dem Salvage einen zweiten Sinn neben Ash und Trigger-Bausteinen.
- Legendary-Drops bleiben spannend, auch wenn das Item selbst schlecht ist.
- Das Gear wird freier für Zahlen (Hoheitsgebiet aus Abschnitt 2): Regeln im Crucible, Zahlen auf dem Gear.
- Zwei Codices (Trigger und Power) bei zwei Personas mit derselben Logik: einmal gelernt, überall verstanden.

---

## 9. Training Dummy (statt Proving Grounds) 💡

Timos Version: Build testen und **live** ein anderes Item ausrüsten.

- **Ort:** Kaelens Übungsplatz im Camp. Ein Strohmann in der Arena, der Held kämpft endlos gegen ihn.
- **Live-Werte** (gleitendes Fenster 15 s): Schaden/s nach Quelle (Default Attack, Skills, Trigger, Ailments), Heat/s,
  Trigger pro Minute, Crit-Rate, Anteil Glancing Blows.
- **Live tauschen:** Items aus Inventar und Supply Wagon per Drag & Drop anlegen, Battle Plan ändern. Die Zahlen springen
  sofort, mit Pfeil gegen den Stand vor dem Tausch („+12 % Schaden/s“).
- **Dummy-Profile:** Ohne Defense · wie der Boss des nächsten Acts (Armor, Resistances) · **zurückschlagend** wie der
  Boss (zeigt Schaden genommen/s gegen Heilung/s, also das Sustain-Rennen aus `endgame-balance-v1.md`).
- **Deterministisch:** fester Seed, damit zwei Vergleiche gleich ablaufen.
- **Kein** Skill-Tree- oder Mastery-Respec im Dummy (das kostet weiter Acorns bei Kaelen).
- Dieselbe Rechnung liefert die Upgrade-Markierung auf den Loot-Karten (Abschnitt 6.3).

---

## 10. Autopilot: Runes und Runewords 💡

Ja. Solange der Autopilot keine Runes nutzt, unterschätzen alle Balance-Zahlen echte Spieler.

- Runes sockeln: Normal-Items mit Sockets, Runes nach Build-Tags (Bleed-Build → Thorn/Venom, Caster → Ember/Rime …).
- Runewords: Wenn ein Rezept vollständig im Inventar liegt und eine passende Basis da ist, baut er es, sofern es das
  getragene Item schlägt (Vergleich über den Dummy-Rechner).
- Kombinieren (drei gleiche → nächster Rang) bei Nyssa, wenn Acorns reichen.
- Crafting (Reforge, Temper, Kindle) bleibt draußen. So bleiben die Zahlen für VIII–X bewusst pessimistisch.

---

## 11. Reihenfolge (Produktplan) 💡

| Phase | Inhalt | Warum zuerst | Aufwand |
|---|---|---|---|
| **0** | GDD v2 (erledigt in diesem PR), Merkliste für später | Agents arbeiten sonst gegen alte Regeln | klein |
| **1** | Autopilot mit Runes, Balance-CLI misst Tod-Verteilung und Kampfdauer pro Stage-Art | Messwerkzeug vor jeder Balance-Änderung | klein |
| **2** | Welt-Band pro Run (5.1), Sägezahn (5.3), Kampfdauer (5.5), Hearth Embers und Push-Bonus (5.4) | größter Spaß-Hebel, ändert nur Zahlen und wenig Code | mittel |
| **3** | Elites neu (6.1), Item-Picks (6.3), Training Dummy (9) | macht Loot und Elites spürbar | mittel |
| **4** | Hoheitsgebiete (2), Web v3 (4), Mastery v2 (3), Umbenennungen (1.3) | großer Inhalt, braucht Phase 1–3 als stabile Basis | groß |
| **5** | Omens (5.2 und 7.2), Wildfire neu, Ashborn (7.3), Ember Crucible (8) | Endgame baut auf allem davor auf | groß |
| später | Routen (6.2), siehe auch `merkliste-spaeter.md` | optional | mittel |

Jede Phase ist ein eigener PR mit Vorher/Nachher-Messung (15 Builds × 3 Läufe).

---

## 12. Fragen an Timo

1. **Hoheitsgebiete (2):** Einverstanden, dass die Bäume rohe Offense-Zahlen abgeben und das Gear dafür stärker wird?
2. **Mastery v2 (3):** Gabelungen und Pfad-Meister wie im Sword-Beispiel? Neuer Wert **Parry** als Defense nur über die Waffe?
3. **Web v3 (4):** Travel-Nodes nur Defense, Notables immer bedingt, Conversion und Rune Sockets im Web?
4. **Welt pro Run (5.1):** Jeder Act startet beim Heldenlevel des Run-Starts, wie Nightmare/Hell in D2?
5. **Omens (5.2):** Jeder alte Act bekommt pro Run ein Omen, das gleiche System wie die Wildfire-Mods?
6. **Picks (6.3):** Normale Kämpfe nur jede dritte Stage mit Item-Pick, dafür Elites und Bosse mit mehr Gewicht?
7. **Routen (6.2):** jetzt, später oder gar nicht?
8. **Endgame (7.3):** Ashborn (Paragon mit Obergrenze 200) statt einer gestreckten Levelkurve?
9. **Crucible (8.4):** Power Codex pro Charakter oder für den ganzen Account?
10. **Namen:** Ashborn, Omen, Glut, Ember Crucible, Parry, Hearth Embers als Arbeitsnamen in Ordnung?
