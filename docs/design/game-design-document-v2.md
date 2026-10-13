# Game Design Document – v2

**Titel:** Emberheir · **Stand:** 13.10.2026 (Code auf `main` nach PR #28) · **Genre:** 1v1-Auto-Battler mit ARPG-Loot,
Rogue-Lite-Runs und Prestige

Dieses Dokument beschreibt den **aktuellen Stand des Spiels**, wie er im Code gebaut ist. Es ersetzt
`archiv/game-design-document-v1.md` (Stand 28.09.), dessen Regeln an vielen Stellen überholt sind (Save Tokens,
klassenlos, Waffen-Drops, Spoils, Essences, Harvester's Ember, 10 Durchgänge).

- Details stehen in den Einzeldateien (Anhang). Bei Widerspruch gilt der Code, dann dieses Dokument, dann die Einzeldatei.
- Vorschläge, die noch nicht entschieden sind, stehen in `neuausrichtung-v1.md`. Ideen für später: `merkliste-spaeter.md`.
- **Pflege:** Jeder PR, der eine Regel aus diesem Dokument ändert, ändert auch dieses Dokument.

Markierung: ✅ gebaut · 💡 Vorschlag · ❓ offen. Zahlen sind Startwerte der Balance-CLI und stehen im Code
(`COMBAT` in `packages/sim/src/combat/constants.ts`, `PROGRESSION` in `packages/sim/src/progression/constants.ts`).

---

## 1. Vision ✅

Ein Held kämpft automatisch 1 gegen 1. Der Spieler kämpft nie selbst: **Er gewinnt vor dem Kampf**, über Klasse,
Attribute, Weapon Mastery, Skill Web, Gear und Battle Plan. Das Itemsystem nach Vorbild von Diablo 2 und Path of Exile
ist der Kern. Jeder Drop soll spannend sein, jeder Kampf sichtbar zeigen, was der Build tut (PixiJS-Arena).

**Endziel:** Sieben Runs, in denen sich die Welt Act für Act öffnet, dann das Finale **The Last Ember**. Danach das
Endgame **Wildfire I–X**.

---

## 2. Spielablauf

### 2.1 Charakter ✅
- **Sechs Charakter-Slots** im Startbildschirm (wie in Diablo). Klasse und Waffe sind fest, kein Klassenwechsel.
- **Fünf Klassen** (Details: `klassen-v2.md`):

| Klasse | Achsen | Waffe (eine wählen) | Class Trait | Klassenpfade (Prestige-Äste) |
|---|---|---|---|---|
| **Warrior** | Physical · Melee · Direct | Sword, Mace | Iron Blood: Treffer +20 % Schaden | Duelist, Butcher, Warden, Tactician |
| **Reaver** | Physical · Melee · Over Time | Axe, Dagger | Bloodletter: +15 % Bleed und Poison Damage | Butcher, Venomancer, Duelist, Tactician |
| **Hunter** | Physical · Ranged | Bow, Crossbow | Keen Eye: +5 % Crit Chance | Marksman, Venomancer, Warden, Tactician |
| **Sorcerer** | Elemental · Ranged · Direct | Wand (Fire Wand) | Spark: Treffer +20 % Schaden | Stormcaller, Frostbinder, Warden, Tactician |
| **Warlock** | Elemental · Ranged · Over Time | Staff | Lingering: Ailments +20 % Schaden | Pyromancer, Void Lord, Warden, Tactician |

- Die Klasse ist ein Startpunkt, kein Käfig: Alle Items und alle Regionen des Skill Webs sind für jede Klasse nutzbar.
- **Lineage:** Gewinnt ein Charakter das Finale, bekommen alle Klassen des Accounts einen kleinen Lineage-Bonus
  (pro Klasse eigener Wert), der mit jedem weiteren Finale-Sieg eines anderen Charakters steigt (bis Stufe 5).

### 2.2 Runs und Acts ✅ (`prestige-acts-v1.md`)

| Act | Name | Schwerpunkt | Stages | Boss |
|---|---|---|---|---|
| 1 | Ashen Fields | Physical | 15 | Gorrak, the Pit Brute |
| 2 | Rotwood | Bleed, Poison | 15 | Mother of Rot |
| 3 | Ember Wastes | Fire | 15 | Cinder Tyrant |
| 4 | Frost Peaks | Cold | 15 | Rime Warden |
| 5 | Storm Spires | Lightning | 15 | Storm Herald |
| 6 | Void Rift | Void | 15 | Voidborn Maw |
| 7 | Emberfall | gemischt | 10 | The Ashen Harvester |

- **Run 1** besteht nur aus Act 1. **Jeder Run öffnet einen Act mehr**, Run 7 umfasst alle sieben Acts.
- Fällt der Boss des **neuesten** Acts, kommt **The Harvest**: Der Harvester erntet die Glut, der Heir erwacht im Camp,
  das nächste Prestige beginnt. In Run 7 kämpft man selbst gegen den Harvester.
- **Waymarks:** Stage 5, 10 und 15 jedes Acts. Der erste Sieg dort in einem Run gibt einen Skill Point.
- Jeder Kampf ist 1 gegen 1 und läuft automatisch. Keine Zeitraffer- oder Auto-Resolve-Funktion ✅ (Timo).

### 2.3 Nach jedem Kampf ✅ (`entschlackung-v1.md`)
- XP, Acorns, Ash und **1 aus 3 Items** (Equip oder Take; die anderen zerfallen zu Ash).
- Ember Coal und Runes fallen **passiv** in den Beutel (Elite 2–3 Ember Coal, Boss 4–6, normale Gegner 15 % auf 1).
- **Ember Shrine** nach Stage 5 und 10 und nach Elites (nur in Acts, die in diesem Run noch nicht geschafft sind):
  1 aus 3 **Stolen Fire Boons**.
- Boss: zusätzlich **Boss Hoard** (Chance auf Boss-Unique/Trophy) und sein **Echo** für die Weapon Mastery.

### 2.4 Tod, Retreat, Revisit ✅
- **Tod:** zurück ins Camp (Beginn des aktuellen Acts). Level, Gear, Inventar, Währungen und Punkte **bleiben**.
- **Retreat:** freiwillig zurück ins Camp, wirkt wie ein Tod.
- **Revisit:** geschaffte Acts über die Straßenkarte erneut spielen (Farmen).
- Boons des laufenden Acts verbrennen bei Tod und Retreat, ein geschaffter Act behält sie bis zum Prestige.
- **Life bleibt zwischen den Stages erhalten**, keine Regeneration. Heilung zwischen Stages nur über die **Ember Flask**
  (3 Ladungen à 35 % Max Life, voll im Camp, nur per Klick; Belt-Affix „of Plenty“ +1–2 Ladungen).
- **Hearth Embers:** Ein gewonnener Waymark vor dem Boss (Stage 5 und 10) heilt 25 % Life, jedes Mal (nicht im
  Wildfire). Ein Zwischenziel, auf das man hinkämpft (`neuausrichtung-v1.md` 5.4).

### 2.5 Prestige ✅ (`entschlackung-v1.md`)
- Pflicht nach dem Sieg über den Boss des neuesten Acts. Wer noch farmen will, macht vorher Retreat oder Revisit.
- **Es bleibt alles** außer dem Act-Fortschritt (Gear, Inventar, Supply Wagon, Level, Währungen, Punkte, Codices).
- **Man bekommt:** einen neuen Act · eine Prestige-Ast-Wahl (neuer Ast oder Vertiefen) · die nächste Battle-Plan-Sprosse ·
  +2 Skill Points · +2 Attributpunkte · ein höheres Level Cap und Level-Band · bei Prestige 2, 4 und 6 einen weiteren
  Keystone-Platz · ab Prestige 1 die Draughts.

### 2.6 Finale und Endgame ✅
- **The Last Ember** (nach dem 7. Prestige): 7 Stages ohne Loot und Level-Ups. Stage 1–6 sind die **Warden-Echos** der
  Acts 1–6 (Echo n hat n Boss-Fähigkeiten, Stärke steigt von 60 % auf 90 %), Stage 7 ist der **Harvester's Core** (100 %,
  härtester Kampf). Nach jedem Echo 1 aus 3 Boons. Tod: zurück zum Eingang, beliebig viele Versuche. Ziel: 3–5 Anläufe.
- **Wildfire I–X** (nach dem Finale): Ein gewählter Act brennt erneut auf einer Stufe. Monster Level 92 (I) bis 110 (X).
  Mehr Legendaries und Runes, keine Shrines. Ziel: I–V schafft jeder Build, VI–VII mit Gear-Farmen, VIII–X nur über
  Min-Maxing (`endgame-balance-v1.md`). Umbau mit Omens und Ashborn: siehe `neuausrichtung-v1.md` 💡.

### 2.7 Camp ✅

| Persona | Rolle | Aufgaben |
|---|---|---|
| **Kaelen** | Trainer | Skill Web, Weapon Mastery, Battle Plan, Attribute; jeder Respec kostet Acorns |
| **Thoric** | Blacksmith | Upgrade (Tier, mit Phoenix Feathers), Reforge (Ember Coal), Salvage (→ Ash, lehrt den Trigger Codex) |
| **Liora** | Mystic | Temper (einen Affix-Wert neu würfeln), Kindle (Trigger aus dem Trigger Codex bauen) |
| **Nyssa** | Runesmith | Add Socket, Socket Rune, Combine Runes, Runeword Codex |
| **Marisha** | Black Market | Gamble (Zufalls-Item für einen Slot) |
| **Eldrin** | Scout | Act Preview, **Bounties** (ein optionaler Auftrag pro Zug) |
| **Old Nan** | Hearthfire | Geschichte, Compendium, Legacy |

- **Supply Wagon:** gemeinsamer Stash aller Charakter-Slots. Währungen bleiben pro Charakter.
- **Draughts** (ab Prestige 1): Vor dem Aufbruch wird eine Flask-Ladung zu einem Draught, der bis zur Rückkehr wirkt
  (Iron +25 % Armor, Ward +25 % Barrier, Vigor +10 % Life, Fire/Frost/Storm/Void +20 % Resistance und +5 % max).
- **Bounties:** Elite Hunt, Culling, Thief Chase (ab Act 2), Dry Throat, Hale and Whole. Einreichen bei Eldrin,
  Belohnung: Acorns, 2 Ember Coal und ein Item ab Rare.

### 2.8 Währungen ✅

| Währung | Zweck |
|---|---|
| **Acorns** | universell: Respec, Sockets, Runes, Gamble |
| **Ash** | aus Salvage und nicht gewählten Items; Crafting-Grundstoff |
| **Ember Coal** | Reforge, Kindle |
| **Phoenix Feathers** | Item-Upgrade um ein Tier (Bosse) |
| **Runes** | Sockets und Runewords |

---

## 3. Held: Level, Attribute, Punkte

### 3.1 Level ✅ (`level-v2.md`)
- Max Level 100. **Level Cap pro Run** = Boss-Level des Runs + 10: **20, 30, 40, 55, 70, 85, 100**.
- Monster-Level-Band pro Run endet bei **10, 20, 30, 45, 60, 75, 90**. **Die ganze Welt brennt neu**
  (`neuausrichtung-v1.md` 5.1): Ab Run 2 beginnt Act 1 **5 Level unter dem Level Cap des vorigen Runs**
  (15, 25, 35, 50, 65, 80), das Band steigt gleichmäßig über alle Stages bis zum neuen Boss. So droppt jeder Act
  aktuelles Gear.
- Jedes Level: **+4 % Base Life, +3 % Weapon Damage** (zusammen ~+7 % Kampfkraft). Sonst nichts.
- XP-Malus: −2 % pro Level über dem Gegner bis +5, danach −10 % pro Level (min. 10 %).
- Level ist der **sichere, langsame Hebel** gegen eine Wand; Gear der schnelle, glücksabhängige.

### 3.2 Attribute ✅ (`attribute-v1.md`)
- Sechs Attribute, Skala **1–10** (Gear hebt bis 12). Bei der Erstellung: Klassen-Array + 6 freie Punkte (max. 7).
  Jede Harvest: +2 Punkte. Respec bei Kaelen für Acorns.
- **Breakpoints bei 4, 7 und 10** schalten je einen Perk frei (nur eigene Punkte zählen).

| Attribut | Wirkung pro Punkt | Perks 4 / 7 / 10 |
|---|---|---|
| **Strength** | +8 % Physical Damage, +6 % Armor | Armorbreaker / Stoneguard / Titan |
| **Dexterity** | +1,5 % Crit Chance, +4 % Trigger Chance | Hawkeye / Opportunist / True Shot |
| **Intelligence** | +8 % Elemental Damage, +8 % Barrier | Attuned / Elemental Surge / Spellfire |
| **Agility** | +3 % Attack Speed, +2 % Evasion | Quick Reflexes / Ember Dance / Double Time |
| **Wisdom** | +6 % Heat Gain, +6 % Ailment Duration | Inner Fire / Afterglow / Clarity |
| **Vitality** | +6 % Life, +3 % Tenacity | Second Breath / Thick Skin / Undying |

### 3.3 Skill Points ✅
- Genau **100** im ganzen Spiel: 2 zum Start, 1 pro Waymark (84), 2 pro Harvest (14). Nicht pro Level.

---

## 4. Kampf ✅

### 4.1 Ablauf
- Simulation mit 20 Ticks/s, deterministisch über `Rng` (gleicher Seed + gleicher Build = gleicher Kampf). Limit 300 s.
- Beide Seiten folgen denselben Regeln: Default Attack der Waffe, Heat-Leiste, Skills, Trigger, Ailments.
- **Heat** (0–100) füllt sich je nach **Heat Form** der Waffe:

| Heat Form | Verhalten |
|---|---|
| **Steady** (Start) | Heat aus eigenen Treffern, verfällt nie |
| **Cooling** | +25 % Heat per Hit, kühlt ohne Treffer ab |
| **Warming** | steigt von selbst um 12/s, Treffer geben nichts |
| **Smoldering** | Heat aus erlittenen Treffern, mehr Start-Heat und Life |

- Ist Heat ≥ **Trigger Threshold** des nächsten Rotation Slots, ersetzt der Skill die nächste Default Attack.
- **Precision und Glancing Blows:** Jede Waffe hat eine Precision (60–80 %). Ein unsauberer Treffer ist ein Glancing Blow
  (50 % Schaden) und löst keine Trigger aus. Jede Waffe hat eine **Damage Range** (z. B. 40–110 % beim Sword).
- **Telegraphs:** Gegner kündigen Heavy Attacks an. Ein angekündigter Treffer nimmt höchstens **35 %** von Life + Barrier.

### 4.2 Damage Types und Ailments

| Damage Type | Ailment | Mechanik |
|---|---|---|
| Physical | **Bleed** | 50 % des Treffers/s für 3 s, wird erneuert |
| Physical | **Poison** | 17 %/s für 5 s, stapelt bis 20 |
| Fire | **Burn** | 25 %/s für 4 s, halbiert die Heilung des Gegners |
| Void | **Corruption** | 10 %/s, wächst pro Tick (+25 %, bis 12×), 6 s |
| Cold | **Chill** | −30 % Attack Speed und Heat Gain, 2 s |
| Lightning | **Shock** | +20 % erlittener Schaden, 3 s |

- **Crit Damage ist fest 150 %** (nur Crit Chance skaliert; Ausnahmen über einzelne Keystones).
- **Sunder** (Debuff, senkt Armor stapelnd) ≠ **Physical Penetration** (ignoriert Armor pro Treffer).

### 4.3 Defense

| Layer | Quelle | Regel |
|---|---|---|
| **Armor** | Gear, STR | Reduktion = Armor / (Armor + 20 × Angreifer-Level), max. 90 % |
| **Evasion** | Gear, AGI | weicht Angriffen aus (max. 50 %); **Deflect**: Spells mit derselben Chance halbiert (nur Held) |
| **Barrier** | Caster-Basen, Affix „Warded“, INT (+8 %/Punkt) | voll bei Kampfbeginn, lädt immer 3 %/s, nach 1,5 s ohne Treffer 20 %/s |
| **Block** | Shield | stoppt 50 % des Treffers (Stoneguard mehr), max. 75 % Chance |
| **Resistances** | Gear, Draughts | Cap 75 %; **Ember Penalty** −10 % pro Prestige bis −60 % |
| **Tenacity** | Gear, VIT | kürzere Ailments auf dem Helden |
| **Heilung** | Lifesteal (nur Treffer), DoT-Heilung (nur aus DoT-Nodes), Heal-Trigger, Barrier | keine Life Regeneration |

### 4.4 Battle Plan ✅ (`skills-v1.md`)
- **Rotation Slots** feuern der Reihe nach, **Reaction Slots** bei einer Bedingung (Fight Start, Life unter X, Telegraph,
  Gegner unter X, Ailment, Gegner heilt, Barrier bricht, Stacks …). Kosten gehen von derselben Heat-Leiste ab.
- Start: 1 Rotation Slot (mit dem Innate der Waffe). Jedes Prestige bringt eine Sprosse:

| Prestige | Sprosse |
|---|---|
| 1 | Rotation Slot 2 · Reaction Slot 1 |
| 2 | Rotation Slot 3 · Trigger Threshold |
| 3 | Slot Modifiers · Rotation Conditions |
| 4 | Reaction Slot 2 · New Reactions |
| 5 | Rotation Slot 4 · 2nd Slot Modifier |
| 6 | Opening Move · Rare Modifiers |
| 7 | Capstone (Echo, Crescendo, Vigil, Ignition, Lingering Flame, Ember Ward) |

- **Slot Modifiers:** Thrifty (−15 % Heat Cost), Empowered (+1 Skill Level), Overcharge (Rest-Heat bis +50 % Wirkung),
  Reverb (selten, 20 % gratis wiederholen).

---

## 5. Build-Systeme

### 5.1 Weapon Mastery ✅ (`waffe-als-system-v1.md`, `weapon-mastery-baeume-v1.md`)
- **Die Waffe ist fest** und droppt nie. Sie wächst über den **Weapon Rank** (gleiche XP wie der Held, Rank Cap pro Run
  4/7/10/13/16/18/20, 1 Mastery Point pro Rank). Weapon Damage steigt automatisch mit dem Level.
- Güte: Crude · Honed · Tempered · Ascendant · Exalted.
- Baum pro Waffe (8 Bäume, gleicher Grundriss):

| Teil | Inhalt |
|---|---|
| **Refine** (11 Nodes) | Damage Range Min/Max, Precision, Attack Speed |
| **Heat Form** (1 aus 4) | ab Rank 3 |
| **Innate Form** (1 aus 3) | Variante des Innate Skills, ab Rank 5 |
| **3 Pfade** (je 6 Minor + 2 Notable) | Stil der Waffe, z. B. Sword: Riposte, Edge, Tempo |
| **Keystone** (1 aus 4) | ab 12 ausgegebenen Punkten |
| **Attunement** (nur Wand, Staff) | Element der Default Attack und des Innate |
| **Echoes** | Andenken der Act-Bosse, werden pro Run stärker |

- Am Ende ~20 von 38 möglichen Punkten: Zwei gleiche Waffen unterscheiden sich.
- **Innate Skills:** Power Strike (Sword), Skull Crack (Mace), Lacerate (Axe), Venom Coat (Dagger), Barbed Arrow (Bow),
  Heavy Bolt (Crossbow), Firebolt (Wand), Void Bolt (Staff).

### 5.2 Skill Web ✅ (`level-v2.md` Abschnitt 7)
- Ein **Netz aus acht Regionen**: vier Äste (Might, Rupture, Arcana, Affliction) und vier Brücken. Jede Klasse startet
  an ihrem Hub. 189 Nodes: 123 Minor, 40 Notable, 14 Skill, 12 Keystone, dazu Defense-Knospen zwischen den Regionen.
- **Skill-Nodes** schalten aktive Skills frei (Ränge = Skill Level), z. B. Crushing Blow, Flurry, Chain Lightning,
  Ice Lance, Meteor, Immolate, Soul Harvest, Corrupt, Wither, Toxic Burst, Envenom, Rend, Serrated Edge, Execute.
- **Keystones** kosten 3 Skill Points und einen Keystone-Platz (1, +1 bei Prestige 2/4/6, max. 4).
- **Prestige-Äste** (`skilltree-v2.md`): 10 Äste, jede Klasse wählt aus ihren 4 Klassenpfaden. Jedes Prestige: neuer Ast
  (Stufe I) oder einen eigenen Ast **vertiefen** (II, III; Keystone wird Greater / Supreme).
- Titel: Klassenname, später ein Titel nach dem Haupt-Ast (z. B. Warrior + Duelist = Blademaster).

### 5.3 Items ✅ (`item-system-v1.md`, `legendary-runes-v1.md`)
- **Slots:** Off Hand, Helm, Body Armor, Gloves, Boots, Belt, Amulet, 2× Ring, **Charm** (nur Trigger-Affixe).
  Off Hand passt zur Waffe: Shield (Melee), Quiver (Bow/Crossbow), Focus (Wand/Staff).
- **Item Level = Monster Level**, daraus das **Item Tier** (T1–T10). **Required Level** = Item Level − 5.
- **Rarities:** Normal (Sockets, Basis für Runewords) · Magic (1 Prefix + 1 Suffix) · Rare · Epic (garantiert Trigger) ·
  Legendary (Affixe + Legendary Power) · Unique (fest, oft mit Power; Boss-Uniques „Dropped by …“).
- Welche Rarity droppt, hängt am Run (Run 1: Normal/Magic, Rare am Boss; Epic ab Run 3; Legendary ab Run 4 am Boss).
- **Affixe:** Stat-Affixe (Prefix oder Suffix) und **Trigger-Affixe** (Condition → Chance → Effect → Cooldown).
- **Trigger Codex:** Salvage eines Items mit Trigger lehrt Condition und Effect. Liora baut daraus per **Kindle** einen
  Trigger auf ein Item (ein gekindelter Trigger pro Item, Roll bis 70 %).
- **Runes und Runewords:** 8 Runes (Bark, Moss, Thorn, Venom, Ember, Rime, Volt, Dusk), 10 Runewords. Runeword Codex
  bei Nyssa, permanent.
- **Crafting-Grenzen:** Reforge löst den Affix-Lock, Legendary Powers und Runewords sind unveränderbar,
  Uniques können nicht reforged/tempered werden.
- **Trophy Wall:** Sammlung aller gefundenen Uniques.

### 5.4 Stolen Fire Boons ✅
- Funken aus dem Feuer der Wardens: eine Familie pro Boss (Ash, Rot, Cinder, Rime, Storm, Void) plus Hearth.
- Biegen den Build bis zum Prestige (Slots Strike, Skill, Reaction, Heat exklusiv; Trigger, Passive stapeln),
  Güte Spark/Flame/Blaze, Fusion Boons im Finale.

---

## 6. Gegner ✅ (`gegner-bosse-v1.md`)
- Archetypen: Brute, Skirmisher, Caster, Afflicter, Warden, Thornback. Gleiche Regeln wie der Held, sichtbare Heat-Leiste,
  1–2 Skills, Telegraphs (Conditions für Reaction Slots).
- **Elites:** 1–3 von 20 Modifiern (Extra Fast, Stone Skin, Vampiric, Thorns, Enraged, Ashen Shell, Second Wind …),
  besserer Loot, Ember Coal, öffnen eine Ember Shrine.
- **Ember Thief:** seltener Gegner, der wegläuft; fängt man ihn, gibt es Beute.
- **Bosse:** pro Act einer mit Phasen und Signatur-Mechanik. Jedes Prestige gibt jedem Boss eine Fähigkeit dazu.
- **Skalierung:** Das Monster Level bestimmt die Grundwerte. Dazu:
  - **Run Pressure:** Life +80 %, Schaden +35 % pro Act nach dem ersten (der neueste Act bleibt der härteste).
  - **Wand** im neuesten Act: Der Boss trifft mit der Wand-Stärke des Runs (1,8 / 8,3 / 6,3 / 7 / 7 / 5,8 / 4,8),
    Life nur mit deren Wurzel. Davor steigt der Act im **Sägezahn** (`neuausrichtung-v1.md` 5.3, Startwerte aus
    `balance-messung-v1.md`): normale Stages 15 → 30 %, 25 → 35 %, 30 → 40 % der Wand, die **Gatekeeper** auf
    Stage 5 und 10 (sicherer Elite) sind Spitzen mit 40 % und 45 %. Jede Wand mit höchstens +10 Level schaffbar.
  - **Kampfdauer** (5.5): Gegner haben je Stage-Art mehr Life (normal ×1,2, Elite ×1,3, Gatekeeper ×1,4, Boss ×1,3;
    der Boss trifft dafür mit ×0,9), in allen Acts eines Runs, nicht im Finale und im Wildfire.
  - Ziele im neuesten Act (Balance-CLI, `--newest 1`): Tode Boss 35–55 %, Gatekeeper 20–30 %, Elites 10–20 %,
    normal 5–15 %; Kampfdauer normal 20–30 s, Elite 35–50 s, Gatekeeper 45–70 s, Boss 60–100 s.

---

## 7. Balance-Ziele ✅ (`balance-grundlagen-v1.md`, `endgame-balance-v1.md`)
- Keine One-Shots (Heavy-Hit-Deckel 35 %). Jede Klasse hat eine Defense, die den ganzen Kampf hält.
- Wände sind Stat-Checks, in die man über Level und Gear hineinwächst. Ein guter, aber schwächerer Build aus dem
  Autopilot-Ranking schafft jede Wand mit bis zu +10 Level.
- Resistance ist eine Entscheidung (Ember Penalty). Kein Magic Find, Gold Find oder XP %.
- Messung immer mit der Balance-CLI: 15 Autopilot-Builds (3 pro Klasse), mehrere Seeds, Vorher/Nachher im PR.
- Der Autopilot nutzt Runes und Runewords (behält Normal-Basen, schmiedet ein Runeword, wenn es das getragene Item
  schlägt, kombiniert übrige Runes), aber kein Crafting (Reforge, Temper, Kindle). `--runes 0` misst ohne Runes.
- Die CLI misst im neuesten Act die **Tode und Kampfdauern je Stage-Art** (normal, Elite, Gatekeeper, Boss; Median und
  p90) gegen die Ziele aus `neuausrichtung-v1.md` 5.3 und 5.5 (`--newest 1` zeigt nur diese Tabellen). Stand: `balance-messung-v1.md`.

---

## 8. Darstellung ✅ (`ui-look-v1.md`, `battle-view-v1.md`, `ui-views-v1.md`)
- Stage-Pixel (900 hoch, Breite aus dem Seitenverhältnis), 1080p und 4K sehen gleich aus, Ultrawide mit zentriertem 16:9.
- Light Mode Aged Parchment, Dark Mode Scorched Parchment.
- **Alles, was im Kampf passiert, ist in der Arena sichtbar** (PixiJS: `fx.ts`, `weather.ts`, `SKILL_FX`, `AILMENT_FX`).
  Effekte sind rein visuell, respektieren Screen Shake und `prefers-reduced-motion`.
- Fabelwelt: Der Heir ist ein Otter, Personas sind Tiere (`fabelwelt-v1.md`, `story-theme-v1.md`).

---

## 9. Offene Baustellen

- Neuausrichtung (Systemidentität, Class Traits, Web v3, Mastery v2, Ailments v2, Routen, Elites, Omens, Ashborn,
  Greater Affixes, Ember Crucible, Training Dummy): `neuausrichtung-v1.md`, von Timo entschieden (13.10.). Phase 1
  (Messwerkzeug) ist gebaut, Phase 2 (Welt-Band, Sägezahn, Kampfdauer, Hearth Embers) mit Startwerten begonnen.
- Später: Ancestor Duels, Battle Plan Presets, Death Recap, Fight Stats: `merkliste-spaeter.md`
- Autopilot nutzt kein Crafting (Reforge, Temper, Kindle): Die Balance-Zahlen sind bewusst etwas pessimistisch.

---

## Anhang: Detail-Dateien

| Datei | Inhalt | Stand |
|---|---|---|
| `klassen-v2.md` | Klassen, Start-Kits, Traits, Titel | gültig (Traits siehe 2.1) |
| `attribute-v1.md` | Attribute 1–10, Breakpoints | gültig |
| `level-v2.md` | Level, Level Cap, Skill Points, Skill Web | gültig |
| `waffe-als-system-v1.md` | Weapon Mastery Grundsystem | gültig |
| `weapon-mastery-baeume-v1.md` | die 8 Mastery-Bäume | gültig (Zahlen im Code) |
| `skilltree-v2.md` | Prestige-Äste, Vertiefen | gültig (Ast-Teil) |
| `skills-v1.md` | Skills, Battle Plan | gültig (Sprossen siehe 4.4) |
| `prestige-acts-v1.md` | Acts öffnen pro Prestige | gültig (Gear-Verlust und Seals überholt) |
| `entschlackung-v1.md` | Währungen, Personas, Bounties, Keystone-Limit | gültig |
| `balance-grundlagen-v1.md` | Defense, Ember Penalty, Wände, Draughts | gültig |
| `endgame-balance-v1.md` | Finale, Wildfire, Poison, Deflect | gültig |
| `item-system-v1.md`, `legendary-runes-v1.md`, `trigger-codex-v1.md` | Items, Legendary, Runes, Trigger Codex | teils überholt (Quarry, Kindling, Mastery gestrichen) |
| `gegner-bosse-v1.md` | Gegner, Bosse | gültig, Skalierung siehe 6 |
| `stat-liste-v2.md` | Stats, Trigger-Affixe | teils überholt (Attribute siehe 3.2) |
| `loot-rewards-v1.md`, `town-crafting-v1.md` | Belohnungen, Camp | **überholt** durch `entschlackung-v1.md` |
| `skill-tree-v1.md`, `klassen-varianten.md`, `waffen-v1.md` | Vorgänger | Geschichte |
| `ui-look-v1.md`, `ui-views-v1.md`, `battle-view-v1.md` | Darstellung | gültig |
| `story-theme-v1.md`, `story-texte-v1.md`, `fabelwelt-v1.md` | Welt und Texte | gültig |
| `neuausrichtung-v1.md` | Vorschläge zur Neuausrichtung | 💡 offen |
| `balance-messung-v1.md` | Messung Phase 1 (Runes im Autopilot, Tode und Kampfdauer je Stage-Art), Startwerte Phase 2 | gemessen |
| `weapon-mastery-v2.md` | neue Mastery-Pfade, Precision, Mighty Hits, Parry | 💡 offen |
| `ailments-v2.md` | Ailment-Identitäten, Payoffs, Ailment Effect, Wisdom | 💡 offen |
| `merkliste-spaeter.md` | Ideen für später | gemerkt |
