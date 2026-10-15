# Neuausrichtung v1: Jeder Kampf eine Frage, jedes System eine Aufgabe

Stand 13.10.2026 · von Timo entschieden (Abschnitt 12) · Phase 1–4 gebaut (`balance-messung-v1.md`, `elites-routen-v1.md`), Phase 5 gebaut: Weapon Mastery v2 (`weapon-mastery-v2.md` 6), Skill Web v3, Hoheitsgebiete, Umbenennungen (Abschnitt 13) · Basis: `main` nach PR #28 · Game-Begriffe auf Englisch
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen. Zahlen sind Startwerte für die Balance-CLI.

Timo hat ausdrücklich erlaubt, jedes System grundlegend zu hinterfragen. Dieses Dokument nutzt das. Es ist aus der Sicht
eines verantwortlichen Game Designers und Produktmanagers geschrieben: Was ändere ich, in welcher Reihenfolge, und warum.

**Begleitdokumente:** `weapon-mastery-v2.md` (alle 24 Pfade, Precision, Mighty Hits) · `ailments-v2.md` (Ailments,
Ailment Effect, Wisdom) · `merkliste-spaeter.md` (Ideen für später, auch alle Pixi-Looks).

### Runde 2 (Timo, 13.10.)

| Punkt | Timo | Folge im Dokument |
|---|---|---|
| Warrior und Sorcerer haben denselben Trait | überarbeiten, Klassenidentität statt nur Physical/Elemental | neuer Abschnitt 2.1 |
| Weapon Mastery v2 | gefällt ✅, Pfade bitte konkret zeigen | `weapon-mastery-v2.md` |
| Precision und Damage Range aufwerten | Idee: Range 20–200 %, evtl. 4 Stufen | Mighty Hits, breitere Ranges, 3 stärkere Stufen (`weapon-mastery-v2.md` 1) |
| Glancing Damage | sinnvoll? | gestrichen (3.3) |
| Omens | spannend, aber gezielt wählen; Parched zu hart | Regeln für Omens (5.2) |
| Push-Bonus | nötig? Man startet nach dem Camp ohnehin bei Stage 1 | gestrichen (5.4) |
| Längere Kämpfe über mehr Gegner-Life | gefällt ✅ | 5.5 entschieden |
| Pixi-Effekte | erst als Idee merken (gemalte Assets kommen noch) ✅ | alle Looks in `merkliste-spaeter.md` |
| Routen | coole Ergänzung ✅ | 6.2 entschieden |
| Gear im Endgame | Greater Affixes wie in Diablo? | neuer Abschnitt 7.5 |
| Ashborn bei Kaelen zu voll | lieber am Charakter? | 7.3: Character Sheet und Old Nan |
| Ailments | Identität, Burst, Ailment Duration, Wisdom prüfen | `ailments-v2.md` |

---

## 0. Kurzfassung

Emberheir hat starke Bausteine (Heat, Battle Plan, Trigger-Affixe, Weapon Mastery, Attribute mit Breakpoints, D2/PoE-Defense).
Was fehlt, ist **Struktur über den Bausteinen**: Viele Systeme geben dieselben Zahlen, und die Spannung eines Runs sitzt fast
nur am Boss des neuesten Acts. Mein Plan in sieben Punkten:

1. **Jedes System bekommt ein Hoheitsgebiet** (Abschnitt 2). Gear liefert die **Zahlen** (auch Offense!), die Bäume liefern
   **Mechanik**, der Battle Plan das **Timing**. Generische „+X %“-Minors verschwinden aus Web und Mastery.
2. **Weapon Mastery v2** (Abschnitt 3): Pfade mit **Gabelungen** und einem **Pfad-Meister** statt einer Kette aus zwei
   wiederholten Minors. Waffeneigene Werte (Precision, Parry, Damage Range mit **Mighty Hits**, Riposte …) statt Crit/Evasion/Trigger Chance.
3. **Skill Web v3** (Abschnitt 4): weniger, aber bedingte Notables („vs. Bleeding“, „bei Heat ≥ 50“), **Conversion**,
   Rune Sockets im Web, Keystones ohne Schablone. Travel-Nodes werden Defense, wie die Attribut-Nodes im PoE-Tree.
4. **Die ganze Welt wird im neuen Run hart** (Abschnitt 5): Jeder Act passt sich der neuen Schwierigkeit an, dazu
   ein **Sägezahn** im Act (Elites, Gatekeeper, Boss) und **Omens**, die jeden Act pro Run anders machen.
5. **Elites werden Mini-Bosse mit Beute-Thema** (Abschnitt 6), und **Item-Picks** werden seltener, aber schwerer.
6. **Endgame** (Abschnitt 7): Wildfire bekommt **Omens als Map-Mods**, VIII–X werden Pinnacles. Nach Level 100 kommt
   **Ashborn** (Paragon): langsam zu farmen, gezielt gegen die Schwächen des Builds, mit einer festen Obergrenze.
   **Greater Affixes** halten das Gear im Endgame lebendig.
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

## 2. Das Leitbild: Jedes System hat ein Hoheitsgebiet ✅

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
| Ailment Duration → **Ailment Effect** (`ailments-v2.md`) | WIS, Gear | einzelne Notables mit Regel | 29 Minors in Web und Prestige-Ästen |
| Heat Gain, Starting Heat | Mastery (Heat Form) | WIS, Gear (Off Hand, Helm) | Web-Minors (Core behält Heat-Notables mit Regel) |
| Life %, Armor %, Barrier %, Evasion | Gear | Web-Travel-Nodes, Attribute, Ashborn | – |
| Resistances | Gear, Draughts | Ashborn (klein) | Web-Minors |
| Precision, Damage Range, Glancing | **nur** Mastery | DEX 4 | – |

**Folge fürs Balancing:** Wenn das Web keine rohen Offense-Zahlen mehr gibt, fehlt Schaden. Der wandert auf das Gear
(höhere Rolls, ein Prefix mehr für Rare/Epic) und in bedingte „more“-Multiplikatoren im Web. Das macht Gear-Drops
wichtiger, genau wie gewünscht.

---

### 2.1 Class Traits: Identität statt Zahl ✅

**Timo (13.10.):** Warrior und Sorcerer haben denselben Trait. Die Traits sollen die Klassenidentität tragen, nicht nur
Physical gegen Elemental unterscheiden.

Regel für Traits: **Ein Trait beschreibt, wie die Klasse kämpft.** Er nutzt eine Mechanik, die man in der Arena sieht
(Telegraph, Skill-Rhythmus, Wunden, lange Kämpfe), und er ist etwa 2 Skill Points wert (wie in `klassen-v2.md`).

| Klasse | heute | neu (Vorschlag) | Warum |
|---|---|---|---|
| **Warrior** | Iron Blood: Treffer +20 % | **Iron Blood**: Angekündigte Heavy Attacks des Gegners machen 25 % weniger Schaden, und jede überstandene gibt 20 Heat | Der Warrior **steht den großen Schlag durch** und schlägt zurück. Nutzt Telegraphs, das Herz des 1v1 |
| **Reaver** | Bloodletter: Bleed und Poison +15 % | bleibt, als **+15 % Ailment Effect für Bleed und Poison** | passt, die Wunden töten |
| **Hunter** | Keen Eye: +5 % Crit Chance | **Keen Eye**: Der erste Treffer jedes Kampfes und jeder Treffer, während der Gegner zu einer Heavy Attack ausholt, ist ein sauberer Crit | Der Jäger **schießt in die Lücke**. Crit Chance gehört dem Gear (Abschnitt 2) |
| **Sorcerer** | Spark: Treffer +20 % | **Spark**: Nach jedem Skill macht die nächste Default Attack +50 % Schaden und setzt immer das Ailment ihres Elements | Rhythmus **Skill → Funke**, sichtbar, passt zur Wand mit Warming-Heat |
| **Warlock** | Lingering: Ailments +20 % | **Lingering**: Deine Ailments machen pro Sekunde Kampfdauer 1 % mehr Schaden (bis +40 % nach 40 s) | „Je länger der Kampf, desto sicherer stirbt der Gegner“ (Klassentext) |

Warrior und Hunter nutzen beide den Telegraph, aber von verschiedenen Seiten: Der Warrior hält ihn aus, der Hunter
bestraft das Ausholen. Ein Warrior-Hunter-Vergleich im Dummy zeigt den Unterschied sofort.

---

## 3. Weapon Mastery v2: Gabelungen und eigene Werte ✅

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
| Damage Range Min / Max und **Mighty Hits** | breitere Ranges, Mighty Hit ab 125 % Weapon Damage (`weapon-mastery-v2.md` 1) |
| Innate Damage / Innate Cost | Stärke und Heat-Kosten des Innate Skills |
| Extra-Attack Damage | Riposte, Double Stab, Split Shot, Rain of Arrows |
| Sunder pro Treffer / Max Sunder | Mace, Crossbow |
| Ailment Effect der Waffe | Bleed/Poison/Burn aus der Waffe stärker (nicht Duration, siehe `ailments-v2.md`) |
| Heat per Hit | für Cooling und Steady |

**Glancing Damage** (in der ersten Fassung als Wert vorgeschlagen) ist gestrichen ✅: Es wird mit jedem Punkt Precision
schwächer und ist nie die bessere Wahl. Glancing Blows bekommen stattdessen Mechanik (Heat, Gratis-Bolzen).

### 3.4 Beispiel: Sword

Alle acht Waffen mit je drei Pfaden, Build-Ideen und Nodes: **`weapon-mastery-v2.md`**. Hier nur das Sword:

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Pfad-Meister |
|---|---|---|---|---|---|
| **Riposte** (Konter) | +4 % Parry/Rang | **Counterweight** (Riposte trifft immer sauber, +1 Sunder) ◇ **Read the Blow** (nach Block/Evade/Parry: nächster Treffer sauberer Crit) | +20 % Extra-Attack Damage/Rang | **Perfect Timing** (Parry löst Riposte aus, 1 s Cooldown) ◇ **Iron Wall** (Block und Parry geben 8 Heat) | **Master of the Counter**: Ripostes lösen deine Trigger-Affixe aus (Gear-Synergie) |
| **Edge** (Präzision) | +3 % Precision/Rang | **Keen Edge** (Crits bluten) ◇ **Clean Line** (5 saubere Treffer in Folge: nächster Treffer +100 %) | +12 % Bleed-Wirkung des Swords/Rang | **Hamstring** (Bleed senkt Gegner-Attack-Speed um 10 %) ◇ **Deep Wound** (Bleed aus Crits ×1,5) | **Master of the Edge**: Glancing Blows gibt es nicht mehr, darüber hinausgehende Precision wird zu Crit Chance |
| **Tempo** (Rhythmus) | +8 % Heat per Hit/Rang | **Rhythm** (jeder 3. Slash +10 Heat) ◇ **Unbroken Flow** (+3 % Attack Speed pro sauberem Treffer, bis 5) | +10 % Innate Damage/Rang | **Building Edge** (Innate kostet 5 Heat weniger pro sauberem Treffer seit dem letzten Skill) ◇ **Steady Breath** (Glancing Blows kühlen nicht ab) | **Master of Tempo**: der erste Rotation Slot wird nach jedem Innate kostenlos wiederholt, 1× pro 8 s (Battle-Plan-Synergie) |

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

## 4. Skill Web v3: von „+6 %“ zu „wenn, dann“ ✅

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

### 5.1 Die Welt brennt neu: Level-Band pro Run ✅

**Heute:** Das Level-Band eines Runs läuft vom letzten Boss-Level bis zum neuen Boss-Level, verteilt über alle Stages.
Act 1 liegt also immer weit unter dem Helden.

**Neu (wie Nightmare und Hell in D2):** Im neuen Run startet **jeder Act** auf der neuen Stufe.

| Act im Run | Monster Level (Vorschlag) |
|---|---|
| Act 1 | **5 Level unter** dem Level Cap des letzten Runs (= Heldenlevel bei Run-Start): Aufwärmen, aber kein Leerlauf ✅ |
| jeder weitere Act | steigt gleichmäßig bis zum neuen Boss-Level |
| neuester Act | endet beim neuen Boss-Level wie heute |

**Timo (13.10.):** ja, Act 1 leicht darunter (~5 Level) ✅. Das passt: Nach dem Prestige hat der Held neue Punkte
(Ast, Battle-Plan-Sprosse), die er in Act 1 ausprobieren soll, bevor es ernst wird.

Beispiel Run 5 (Band heute 45 → 60, Held startet mit Level 55): Act 1 bei ML 50, Act 2 bei 53, Act 3 bei 55,
Act 4 bei 58, Act 5 endet bei 60 + Wand.
Damit droppt **jeder Act aktuelles Gear**, und der Held muss die ganze Strecke ernst nehmen.

### 5.2 Omens: Jeder Act ist in jedem Run anders ✅

Damit der fünfte Besuch im Rotwood nicht der vierte ist, bekommt **jeder alte Act pro Run ein Omen**: eine sichtbare
Regel für den ganzen Act. Omens sind dasselbe System wie die Wildfire-Mods (Abschnitt 7.2). Ein System, zwei Einsätze.

**Timo (13.10.):** spannend, aber Omens müssen **gezielt gewählt** werden; „Parched“ (keine Flask) ist zu hart und für manche
Builds vielleicht gar nicht machbar.

**Hilft der Level-Bonus gegen ein hartes Omen?** Nein. Die Messungen in `endgame-balance-v1.md` zeigen: Wandkämpfe sind ein
Sustain-Rennen, das fast binär kippt (Poison: +5 % Heilung drehten 0 % auf 100 % Siege). Ein Omen, das einem Build seine
Heilung nimmt, gleicht kein Level aus. Deshalb gelten feste Regeln:

| Regel | Inhalt |
|---|---|
| **Wahl statt Zufall** | Beim Aufbruch in einen alten Act zeigt Eldrin **2 Omens**, der Spieler wählt eins. Wer gegen Armor schwach ist, nimmt das andere. |
| **Zweischneidig** | Jedes Run-Omen hat einen Preis **und** einen Lohn (mehr Ember Coal, eine Rune, bessere Rarity, ein Vorteil für den Helden). |
| **Keine Schicht ganz weg** | Ein Run-Omen schwächt eine Defense- oder Heil-Schicht höchstens um die Hälfte, schaltet sie aber nie ab. |
| **Harte Omens nur im Wildfire** | Omens wie „Parched“ (keine Flask) gibt es nur im Wildfire, wo der Spieler sie selbst für mehr Belohnung wählt. |
| **Lesbar** | Ein Satz pro Omen, der Scout nennt die Frage an den Build („Brauchst du Penetration?“). |

| Run-Omen (Beispiel) | Preis | Lohn | Frage an den Build |
|---|---|---|---|
| Blight Bloom | Gegner heilen sich an ihrem eigenen Poison | Burn wirkt doppelt gegen Heilung | Anti-Heal (Burn), Burst |
| Stoneflesh | Gegner +50 % Armor | +50 % Ember Coal | Penetration, Sunder, Elemental |
| Cinder Rain | alle 8 s ein Fire-Telegraph | jeder überstandene Telegraph +5 Heat | Fire Resistance, Reaction Slot |
| Dry Season | Flask heilt 20 % statt 35 % | Waymarks heilen 40 % | Lifesteal, Barrier |
| Restless Dead | Elites kommen in Paaren | jedes Paar gibt eine extra Pick-Karte | Zermürbung |
| Thin Veil | Ailments halten auf beiden Seiten doppelt so lange | – (beidseitig) | DoT-Builds, Tenacity |

Die Bosse behalten ihre Prestige-Fähigkeit (`gegner-bosse-v1.md`). Looks der Omens: später (`merkliste-spaeter.md`).

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
Dazu eine kleine Ergänzung:

- **Hearth Embers:** Waymark-Stages (5, 10) heilen 25 % Life. Ein Zwischenziel, auf das man hinkämpft.

Den **Push-Bonus** aus der ersten Fassung streiche ich ✅ (Timo, 13.10.). Timo hat recht: Nach jeder Rückkehr ins Camp
beginnt der Act wieder bei Stage 1. Weiterkämpfen wird schon dadurch belohnt, dass man dem Boss näher kommt und keinen
Weg doppelt läuft. Ein Extra-Bonus würde nur das Retreat bestrafen, das gewollt ist.

### 5.5 Kampfdauer ✅ (Timo, 13.10.: „Wir wollen die Kämpfe und unseren Build sehen.“)

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
4. **Name:** Ein Elite trägt einen Namen aus seinen Modifiern („Vampiric Stone-Skinned Barkhide“). Looks pro Modifier:
   später (`merkliste-spaeter.md`).
5. **Rare Elite (Champion):** Ab Run 3 hat jede Act-Strecke mit ~10 % Chance einen **benannten Champion** mit drei
   Modifiern und eigenem Hoard (garantiert Epic, 15 % Legendary). Das ist der D2-Moment „ein Unique Monster!“.

### 6.2 Routen statt einer festen Linie ✅ (Timo, 13.10.: „coole Ergänzung“)

Auf der Straßenkarte gabelt sich der Weg an zwei Stellen pro Act (z. B. nach Stage 3 und 8): **Elite-Pfad** (2 Elites,
bessere Beute) oder **Shrine-Pfad** (Boon, ein Normalkampf). Kein Auto-Resolve, keine Abkürzung, aber eine echte Wahl,
die vom Zustand des Helden abhängt (Life, Flask, Bounty). Wie die Karte in Slay the Spire.

Ausbau 💡:

| Knoten auf der Route | Inhalt |
|---|---|
| **Elite-Pfad** | 2 Elites hintereinander, garantierte Thema-Beute (6.1) |
| **Shrine-Pfad** | ein Normalkampf, danach Ember Shrine (Boon) |
| **Hearth-Pfad** | ein Normalkampf, danach heilt der Held 25 % (statt Hearth Embers am Waymark, wenn genommen) |
| **Thief-Spur** | nur wenn eine Thief-Bounty läuft: der Ember Thief taucht sicher auf |

- Gabelungen nach Stage 3 und nach Stage 8, beide Wege gleich lang, damit niemand Kämpfe spart.
- Die Gatekeeper (Stage 5, 10) und der Boss bleiben fest.
- Die Straßenkarte im Camp zeigt die Routen schon vorher (Planung gehört zum Spiel).

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

## 7. Endgame: Wildfire mit Omens und Ashborn ✅

### 7.1 Ziel (Timo)

- I–V: Aufwärmen bis „jeder Build schafft V“.
- VI–VII: Gear farmen.
- **VIII–X: Pinnacles**, kaum oder gar nicht ohne Min-Maxing.
- Es braucht etwas zum **Farmen, wenn Gear und Tree fertig sind**, damit auch ein schwächerer Build irgendwann X schafft.

### 7.2 Omens als Wildfire-Mods (wie Map-Mods und Heat in Hades) ✅

Vor jedem Wildfire-Zug wählt man **Omens** aus einem Pool von ~20. Jedes Omen hat einen **Peril**-Wert (1–3). (Vorher „Glut“, Timo: deutsches Wort, also englischer Spielbegriff.)

| Regel | Wert (Startwert) |
|---|---|
| Mindest-Peril pro Stufe | I–V: 0 · VI: 2 · VII: 4 · VIII: 6 · IX: 8 · X: 10 |
| Belohnung pro Peril | +8 % Ashborn-XP, +5 % Legendary-Chance, +1 Rune-Rang ab 4 Peril |
| Omen-Arten | Gegner-Omens (stärker), Helden-Omens (Einschränkung), Welt-Omens (Regel) |

Beispiele:

| Omen | Peril | Wirkung |
|---|---|---|
| Searing Touch | 1 | Gegner-Treffer setzen Burn |
| Stoneflesh | 1 | Gegner +50 % Armor |
| Hexed Ground | 2 | −15 % max Resistance |
| Bloodfever | 2 | Gegner +25 % Attack Speed |
| Parched | 2 | keine Flask |
| Short Fuse | 2 | Kampf-Limit 90 s, danach Niederlage |
| Silenced Ember | 3 | der erste Rotation Slot ist gesperrt |
| Crushing Weight | 3 | Heavy-Hit-Deckel 50 % statt 35 % |

**Warum das zu Pinnacles passt:** Auf X braucht man 10 Peril, darf sie aber **selbst wählen**. Ein Barrier-Caster nimmt
„Stoneflesh“ (betrifft ihn nicht), ein Physical-Build nimmt „Hexed Ground“, wenn seine Resistances überzählig sind.
Min-Maxing heißt dann auch: **die Omens wählen, die zum Build passen.** Dieselben Omens erscheinen in den Runs als
feste Act-Twists (Abschnitt 5.2), man lernt sie also schon vorher kennen.

### 7.3 Levelkurve oder Paragon? Meine Empfehlung: Ashborn (Paragon) ✅

| | A: Levelkurve strecken (Ankunft mit 80–90) | B: Ashborn nach Level 100 |
|---|---|---|
| Wirkung | +7 % Kraft pro Level, pauschal | gezielt: Offense **oder** Defense **oder** Sustain |
| Schwächen ausbügeln | nein, nur mehr von allem | ja, genau Timos Ziel |
| Eingriff in Run 1–7 | groß (ganze XP-Kurve, alle Wände neu) | keiner (startet erst nach dem Finale) |
| Langer Farm | 10–20 Level, dann Ende | lang, mit fester Obergrenze |
| Risiko | Finale und Wände verschieben sich | Power Creep, wenn ohne Grenze (D3-Fehler) |

**Entscheidung: B** ✅ (Timo, 13.10.). Die Levelkurve bleibt, wie sie ist. Ab Level 100 fließt XP in **Ashborn-Level**.

**Ashborn** (Arbeitsname: der Held wird aus der Asche neu geboren, passt zu Harvest und Phoenix Feathers):

- Jedes Ashborn-Level gibt **1 Ashborn-Punkt**. XP pro Ashborn-Level steigt um 4 % pro Level.
- Vier **Ashborn Boards**, je 6 Werte mit eigener Obergrenze:

| Kreis | Werte (je bis zur Grenze) |
|---|---|
| **Onslaught** (Offense) | Damage %, Crit Chance, Attack Speed, Ailment Effect, Penetration, Skill Damage |
| **Aegis** (Defense) | Life %, Armor/Evasion/Barrier %, Resistances (+max Resistance bis +5 %), Tenacity, Block |
| **Mending** (Sustain) | Lifesteal, DoT-Heilung, Barrier-Recharge, Flask-Wirkung |
| **Ignite** (Heat und Trigger) | Heat Gain, Starting Heat, Trigger Chance, Skill Cost |

- **Obergrenze gesamt: 100 Punkte** ✅ (Timo, 13.10.: „reicht Obergrenze 100?“ – ja). Ein Wert nimmt höchstens
  **15 Punkte** auf, kein Build kann also alles maximieren, und die Punkte gehen dorthin, wo der Build schwach ist.
  100 reichen, weil Ashborn nicht mehr der einzige Farm im Endgame ist: Greater Affixes (7.5) und Crucible-Rolls (8.4)
  laufen daneben. Jeder Punkt ist dafür doppelt so viel wert wie in der 200er-Fassung, also spürbarer.
- **Wo:** Timo (13.10.): Kaelen ist mit Skill Web, Weapon Mastery, Battle Plan und Attributen zu voll. Mein Vorschlag:

  | Was | wo | warum |
  |---|---|---|
  | Attribute und Ashborn **verteilen** | im **Character Sheet** (Charakter-Ansicht), überall im Camp | Das ist der Held selbst, kein Training |
  | Attribute und Ashborn **zurücksetzen** | bei **Old Nan** am Hearthfire, für Acorns: alle Punkte kommen frei zurück, neu verteilt wird danach im Character Sheet | Sie weckt den Heir aus der Asche, also setzt sie ihn zurück. Passt zum Namen Ashborn |
  | Skill Web, Weapon Mastery, Battle Plan | bei **Kaelen** (wie heute) | Kaelen bleibt der Trainer für Technik und Taktik |

  Die Regel aus `entschlackung-v1.md` („Respec kostet überall Acorns“) bleibt, nur der Ort für den Helden selbst wechselt.
- **Ziel-Zeiten:** Ein gut gebauter Build schafft X mit ~30 Punkten (Min-Maxing + Omen-Wahl), ein schwächerer mit
  ~80–100 Punkten nach langem Farmen (dazu Greater Affixes). Akzeptanztest: Der schwächste Build aus dem
  Autopilot-Ranking schafft X mit 100 Punkten und Greater III auf seinen wichtigsten Items.
- **Wo man XP farmt:** Wildfire, je mehr Peril, desto schneller. Damit bekommen die Omens einen Grund jenseits der Stufe.

### 7.4 Was man außerdem farmt, wenn alles fertig ist

Drei Spuren, je in einem anderen System (Abschnitt 2), damit kein System im Endgame stirbt:

| Spur | System | Hebel |
|---|---|---|
| **Ashborn-XP** | Held | sicher, langsam, gegen Schwächen |
| **Greater Affixes** (7.5) | Gear (Zahlen) | Gear wächst über das Maximum hinaus |
| **Bessere Crucible-Powers** (8.4) | Regeln | ein höherer Roll ersetzt den gelernten |

Dazu **Wildfire-Uniques**: ab VI eine kleine Zahl Uniques, die nur dort droppen (Pinnacle-Beute, wie die Uber-Uniques in PoE).

### 7.5 Greater Affixes: Gear über das Maximum heben (Timos Idee, ausgebaut) ✅

**Timo (13.10.):** Ohne etwas für das Gear zählt im Endgame nur noch Ashborn, und das Gear ist als System tot, sobald alles
min-maxed ist. Idee wie in Diablo: Ein Item auswählen, eine Wildfire-Währung zahlen, ein zufälliges Affix wird **Greater**.
Nur eins pro Item, jederzeit neu würfelbar, danach weiter verstärkbar (Greater I–V oder I–X).

**Meine Meinung:** Ja, genau das fehlt. Es hält das Gear im Endgame am Leben und gehört ins Hoheitsgebiet des Gears
(Zahlen). Ich würde es so bauen:

| Schritt | bei | Kosten | Wirkung |
|---|---|---|---|
| **Awaken** | Liora (Affix-Magie) | 3 Cinderglass | ein **zufälliges** Affix (Stat oder Trigger) wird **Greater I** |
| **Shift** | Liora | 1 Cinderglass | das Greater wandert auf ein anderes zufälliges Affix des Items, **die Stufe bleibt** |
| **Intensify** | Liora | 2 / 4 / 8 / 16 Cinderglass | Greater II → V |

- **Wert:** Greater I = 110 % des Höchstwerts seines Tiers, jede Stufe +10 %, Greater V = 150 %.
- **Fünf Stufen, nicht zehn:** Jede Stufe soll man spüren. Fünf Stufen auf zehn Items sind 310 Cinderglass ohne Shifts,
  also ein langer, aber endlicher Farm.
- **Meine Verbesserung:** Die **Stufe gehört dem Item, nicht dem Affix.** Wer neu würfelt (Shift), verliert keine
  Investition, sondern nur den Zufall. So ist Neu-Würfeln nie eine Strafe, und das teure Intensify geht nie verloren.
- **Regeln mit dem restlichen Crafting:** Reforge würfelt die Affixe neu, das Greater bleibt mit seiner Stufe auf einem
  zufälligen neuen Affix. Temper und Upgrade (Tier) gehen weiter. Legendary Powers und Runewords können nicht Greater werden.
- **Uniques dürfen ein Greater Affix bekommen.** Das ist der einzige Weg, ein Unique zu verbessern, und macht gute Uniques
  zu einem Endgame-Projekt.
- **Cinderglass** (neue Währung, **nur aus Wildfire**): jeder Wildfire-Boss 1–2, +1 pro 3 Peril, Pinnacles (VIII–X) mehr.
  Im Wildfire schmilzt die Asche zu Glas, daher der Name. Es ist Währung Nummer 6. Sie wird erst im Endgame
  sichtbar, deshalb verletzt sie die Entschlackung nicht.
- **Gezielt statt Zufall?** Ich lasse den Zufall bewusst drin (Timos Idee, sonst ist Min-Maxing zu schnell fertig).
  Nur das Ziel ist zufällig, die Stufe nie.

---

## 8. Ember Crucible: Legendary Powers lernen und tragen (Kanais Würfel) ✅

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
- Der Power Codex ist **permanent** und gehört **dem ganzen Account** ✅ (Timo, 13.10.), wie der Supply Wagon und die
  Lineage: Was ein Charakter lernt, kennen alle. Die **Crucible-Slots** schaltet aber jeder Charakter selbst frei
  (8.3), und das Binden kostet seine eigenen Währungen. So hilft der Codex beim Twinken, ersetzt aber nicht den Fortschritt.
- **Mehr Powers:** heute 13. Ziel ~36: pro Klasse 4 eigene, 16 allgemeine.
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
| **0** | GDD v2, Merkliste, Mastery v2 und Ailments v2 als Konzept (erledigt) | Agents arbeiten sonst gegen alte Regeln | klein |
| **1** | Autopilot mit Runes, Balance-CLI misst Tod-Verteilung und Kampfdauer pro Stage-Art | Messwerkzeug vor jeder Balance-Änderung | klein |
| **2** | Welt-Band pro Run (5.1), Sägezahn (5.3), Kampfdauer über Gegner-Life (5.5), Hearth Embers (5.4) | größter Spaß-Hebel, ändert nur Zahlen und wenig Code | mittel |
| **3** | Ailments v2 (`ailments-v2.md`), Class Traits (2.1) | ändern die Grundzahlen aller Builds, also vor den Bäumen | mittel |
| **4** | Elites neu (6.1), Routen (6.2), Item-Picks (6.3), Training Dummy (9) | macht Loot, Elites und den Weg durch den Act spürbar | mittel |
| **5** | Hoheitsgebiete (2), Web v3 (4), Mastery v2 (`weapon-mastery-v2.md`), Umbenennungen (1.3) | großer Inhalt, braucht Phase 1–4 als stabile Basis | groß |
| **6** | Omens (5.2 und 7.2), Wildfire neu, Ashborn (7.3), Greater Affixes (7.5), Ember Crucible (8) | Endgame baut auf allem davor auf | groß |
| später | Pixi-Looks für alles Neue, Ancestor Duels, Presets, Death Recap: `merkliste-spaeter.md` | nach den gemalten Assets | – |

Jede Phase ist ein eigener PR mit Vorher/Nachher-Messung (15 Builds × 3 Läufe).

---

## 12. Entscheidungen (Timo, 13.10.)

Alle Fragen aus Runde 1 und 2 sind beantwortet. Die Umsetzung folgt der Reihenfolge in Abschnitt 11: Phase 1 bis 4 sind
gebaut (`balance-messung-v1.md`, `elites-routen-v1.md`), Phase 5 (Abschnitt 13). Neues Ziel (Timo, 13.10.): **3–5 Anläufe** pro neuestem Act,
weil Runes zum Spiel gehören.

| # | Thema | Entscheidung |
|---|---|---|
| 1 | Hoheitsgebiete (2) | ✅ Bäume geben rohe Offense-Zahlen ab, Gear wird stärker |
| 2 | Skill Web v3 (4) | ✅ Travel-Nodes nur Defense, Notables bedingt, Conversion, Rune Sockets |
| 3 | Welt pro Run (5.1) | ✅ jeder Act auf der neuen Stufe, **Act 1 etwa 5 Level unter** dem Heldenlevel bei Run-Start |
| 4 | Item-Picks (6.3) | ✅ normale Kämpfe nur jede dritte Stage, Elites und Bosse mit mehr Gewicht |
| 5 | Ashborn (7.3) | ✅ Paragon statt gestreckter Levelkurve, **Obergrenze 100**, höchstens 15 pro Wert |
| 6 | Power Codex (8.4) | ✅ gehört dem **Account**, Crucible-Slots schaltet jeder Charakter selbst frei |
| 7 | Class Traits (2.1) | ✅ |
| 8 | Weapon Mastery v2 | ✅ Mighty Hits, breitere Ranges, Parry, 24 Pfade |
| 9 | Ailments v2 | ✅ eingebaute Payoffs, Ailment Effect statt Duration, Wisdom neu |
| 10 | Omens (5.2) | ✅ 2 zur Wahl, zweischneidig, harte Omens nur im Wildfire |
| 11 | Greater Affixes (7.5) | ✅ Awaken / Shift / Intensify, Greater I–V, Stufe gehört dem Item, Cinderglass nur aus Wildfire |
| 12 | Ashborn und Attribute (7.3) | ✅ verteilen im Character Sheet; Old Nan nur **zurücksetzen** |
| 13 | Namen | ✅ Ashborn, Omen, Peril (statt „Glut“), Ember Crucible, Parry, Mighty Hit, Combust (statt Flashpoint), Collapse, Cinderglass (statt Fireglass) |

**Zur Erinnerung (Timos Rückfrage zu 13):**

- **Combust** ist der eingebaute Payoff von **Burn**: Trifft ein Fire-**Treffer** einen brennenden Gegner, wird sofort
  25 % des restlichen Burn-Schadens ausgelöst, und der Burn läuft weiter. Fire-Builds mit direkten Treffern und Burn
  spielen sich damit zusammen (`ailments-v2.md` 3.1).
- **Collapse** ist der eingebaute Payoff von **Corruption**: Hat die Corruption ihr volles Wachstum erreicht, bricht sie
  zusammen, trifft sofort mit dem Schaden von 4 Sekunden und fällt auf halbes Wachstum zurück. Danach wächst sie wieder.
  So hat der Warlock in langen Kämpfen wiederkehrende große Momente (`ailments-v2.md` 3.1).

---

## 13. Umsetzung Phase 5 (14.10.)

Gebaut: Weapon Mastery v2 (`weapon-mastery-v2.md` 6), Skill Web v3, Hoheitsgebiete, die Umbenennungen aus 1.3.
Messung: `balance-messung-v1.md` 8 und 9.

| Teil | gebaut | Abweichung vom Konzept |
|---|---|---|
| Hoheitsgebiete (2) | Web- und Prestige-Travel-Nodes geben nur Defense; Rare/Epic/Legendary rollen einen Stat-Affix mehr | – |
| Web v3 (4.2) | Travel = Defense, Notables bedingt oder mit Regel, Conversion (Searing Steel, Arcane Edge, Void Ember), Keystones ohne Schablone | Gerüst und Größe des Netzes bleiben (185 Nodes + 8 Rune Sockets statt ~150) |
| Rune Sockets (4.2) | 8 Sockets, einer pro Region; jede Rune hat eine dritte Wirkung im Web (eine kleine Regel); Kaelen setzt sie, Herausnehmen und Vergessen geben die Rune zurück | – |
| Bedingungen (4.3) | Ailment und Stacks des Gegners, Heat ≥ X, „innerhalb N s nach Crit/Evade/Block/Parry/Skill“, Barrier aktiv, eigene Life niedrig, Gegner unter X %, Telegraph, Stun | mehrere „more“-Boni multiplizieren |
| Keystones (4.4) | Spellblade, Arcane Conduit, Black Flame, Slow Death, Blood and Bile | Spellblade: Default Attack −60 % statt 0; Arcane Conduit: Heat behält ihr Maximum; Black Flame: Burn korrumpiert, Corruption halbiert Heilung; Slow Death: Treffer −50 %, Ailments bleiben stark, +25 % DoT; Blood and Bile: Bleed und Poison lösen einander aus (statt geteilter Stacks) |
| Prestige-Äste (4.5) | Minors sind Defense-Travel-Nodes, reine Zahl-Notables bekommen Bedingungen | – |
| Namen (1.3) | Venomancer → Venom Heart, Void Lord → Hollow Crown, Butcher → Flayer, Pyromancer → Pyre Heart (Web-Notables); Headsman → Final Mercy; Second Wind → Last Stand (Tactician) bzw. Recovery (Web); Spark → Sorcerer's Sigil (Hub); Ember Ward → Cinder Mantle; Kindling → Forge Heart; Hardened → Toughened; Opportunist → Exploit Weakness; Precision (Tactician), Toxin, Barbs, Cadence, Clarity als Web-/Ast-Minors weg; Wildfire (Pyromancer-Notable) → Flame Tongue; Shatter (Frostbinder) → Brittle; Deadeye (Marksman) → Sighted; Virulence (Venomancer) → Toxic Tide | – |
| Balance | Spark +30 %, Lingering bis +25 %, Wand-Stärke 1,8 / 9 / 7,6 / 9 / 8 / 7,6 / 6,6 | Werte nach Messung, siehe `balance-messung-v1.md` 9 |

Alte Saves (Version 4 → 5) bekommen alle Skill Points zurück und behalten ihren Klassenstart.


---

## 14. Umsetzung Phase 6 (15.10.)

Gebaut: Omens (5.2, 7.2) mit dem neuen Wildfire, Ashborn (7.3), Greater Affixes mit Cinderglass (7.5), Ember Crucible mit
Power Codex (8). Regeln im Detail: `game-design-document-v2.md` 2.2, 2.6, 2.7, 2.8 und 5.3. Messung:
`balance-messung-v1.md` 12.

| Teil | gebaut | Abweichung vom Konzept |
|---|---|---|
| Run-Omens (5.2) | 8 Omens mit Preis und Lohn; ein alter Act zeigt beim Aufbruch 2, eins muss gewählt werden; das Angebot ist pro Act und Run fest | Cinder Rain ohne Telegraph (Gegner-Treffer setzen Burn, Lohn +20 % XP); Restless Dead als häufigere Elites statt Paare (Lohn +30 % Legendary); Blight Bloom belohnt mit einem Rune-Rang; Thin Veil als +30 % Gegner-Ailments und Bleed statt doppelter Dauer; dazu Blood Moon und Hollow Wind |
| Wildfire-Omens (7.2) | 20 Omens mit Peril 1–3, Mindest-Peril I–V 0, VI 2 … X 10; pro Peril +8 % XP und +5 % Legendary, je 4 Peril ein Rune-Rang | Ashborn-XP ist die normale XP (ab Level 100 fließt sie in Ashborn) |
| Neue Kampf-Bausteine | Zeitlimit pro Kämpfer (Short Fuse), Heavy-Hit-Deckel als Regel (Crushing Weight) | – |
| Ashborn (7.3) | 19 Werte auf 4 Boards, max 100 Punkte und 15 pro Wert; Character Sheet verteilt, Old Nan setzt zurück (2.000 Acorns) | XP pro Level steigt **linear** um 4 % des ersten (12.000 XP), sonst wäre Level 100 50-mal so teuer wie Level 1; Skill Damage fehlt (kein eigener Wert im Kampf), dafür hat Aegis Block |
| Attribute zurücksetzen | bei Old Nan (alle Punkte über dem Klassen-Array frei), verteilt im Character Sheet; Kaelens Attribut-Tab ist weg | – |
| Greater Affixes (7.5) | Awaken 3 / Shift 1 / Intensify 2-4-8-16 Cinderglass, Greater I–V = 110–150 % des Höchstwerts; Reforge behält die Stufe | Affixe mit fester Epic-Zahl (`epicValue`) können nicht Greater werden |
| Cinderglass | Wildfire-Boss 1–2, +1 je 3 Peril, +1 ab VIII | – |
| Ember Crucible (8) | Salvage lehrt die Power (bester Tier zählt), Power Codex fürs ganze Konto, 3 Slots nach Art, Binden 300 Ash + 3 Ember Coal | Ember-Slot öffnet mit Wildfire V; die „Roll“-Stufe einer Power ist der Tier des Items (Powers haben keinen eigenen Roll); noch 26 Powers statt ~36 |
| Autopilot | wählt Omens über einen Probekampf gegen den Act-Boss, nimmt im Wildfire nur den Mindest-Peril, verteilt Ashborn, Cinderglass und bindet Powers | – |

Alte Saves (Version 5 → 6) brauchen keine Umstellung: alle neuen Felder sind optional.
