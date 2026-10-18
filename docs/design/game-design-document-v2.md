# Game Design Document – v2

**Titel:** Emberheir · **Stand:** 18.10.2026 (Klassengerüst v1: drei Klassen, Heirloom, Masteries, Ash Tree) · **Genre:** 1v1-Auto-Battler mit ARPG-Loot,
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
Attribute, Heirloom, Mastery, Ash Tree, Gear und Battle Plan. Das Itemsystem nach Vorbild von Diablo 2 und Path of Exile
ist der Kern. Jeder Drop soll spannend sein, jeder Kampf sichtbar zeigen, was der Build tut (PixiJS-Arena).

**Endziel:** Sieben Runs, in denen sich die Welt Act für Act öffnet, dann das Finale **The Last Ember**. Danach das
Endgame **Wildfire I–X**.

---

## 2. Spielablauf

### 2.1 Charakter ✅
- **Sechs Charakter-Slots** im Startbildschirm (wie in Diablo). Klasse und Waffe sind fest, kein Klassenwechsel.
- **Drei Klassen** (Details: `klassengeruest-v1.md`). Jede Ebene beantwortet eine Frage: **Klasse** = wer
  (Hauptattribut, Waffen-Familie, Fokus, Trait), **Heirloom-Path** = womit (Damage Type und Ailment), **Mastery** = wie
  (Stil), **Ash Tree** = womit ich das stütze und schütze.

| Klasse | Hauptattribut | Waffen (eine wählen) | Fokus | Class Trait | Masteries (Burst · Tempo · Ailment) |
|---|---|---|---|---|---|
| **Cinderguard** | Strength | Sword, Axe, Mace | starke Angriffe | Fury: jeder Treffer +2 % Schaden mehr als der letzte, bis +20 % | Vanquisher · Berserker · Ravager |
| **Ashstrider** | Dexterity | Bow, Crossbow, Dagger | Crits | Hunter's Mark: +10 % Crit Chance gegen einen Gegner mit einem deiner Ailments | Deadeye · Skirmisher · Trickster |
| **Emberseer** | Intelligence | Wand, Staff | Ailments | Overcharge: jeder Skill gibt eine Ladung, bei 3 eine Nova deines Elements (150 % Weapon Damage, setzt sicher ihr Ailment) | Archmage · Spellweaver · Warlock |

- Start-Arrays (STR/DEX/AGI/INT/WIS/VIT): Cinderguard 5-1-2-1-2-3, Ashstrider 1-5-3-1-1-3, Emberseer 1-1-1-5-3-3.
  Start-Off-Hands: Round Shield, Quiver (Dagger: Blood Talisman), Ember Focus.
- Jeder Trait hat in der Arena einen eigenen Moment (Fury-Glut, Mark, Overcharge-Nova).

- Die Klasse ist ein Startpunkt, kein Käfig: Alle Items und alle Regionen des Ash Trees sind für jede Klasse nutzbar.
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
- **Routen** (`elites-routen-v1.md`): Vor jedem Waymark vor dem Boss gabelt sich der Weg für zwei Stages (3–4 und 8–9):
  **Elite-Pfad** (zwei sichere Elites), **Shrine-Pfad** (danach eine Shrine), **Hearth-Pfad** (danach +25 % Life),
  mit offener Thief-Bounty auch die **Thief's Trail**. Gewählt in der Intermission als große Karten in der Mitte; es gibt keinen Default, NEXT STAGE wartet auf die Wahl.
- **Omens** (`neuausrichtung-v1.md` 5.2): Wer in einen **alten** Act des Runs aufbricht (jeder Act vor dem neuesten),
  wählt bei Eldrin **eins von zwei Omens**. Das Angebot ist pro Act und Run fest, das nächste Prestige würfelt neu.
  Jedes Run-Omen hat einen **Preis und einen Lohn** und nimmt keiner Defense- oder Heil-Schicht mehr als die Hälfte:

  | Omen | Preis | Lohn |
  |---|---|---|
  | Stoneflesh | Gegner +50 % Armor | +50 % Ember Coal |
  | Blight Bloom | Gegner-Treffer vergiften, Gegner heilen sich an ihrem Poison | Runes einen Rang höher |
  | Cinder Rain | Gegner-Treffer setzen Burn | +20 % XP |
  | Dry Season | Flask heilt 40 % weniger | Hearth Embers und Feuer der Gabelung heilen 60 % mehr |
  | Restless Dead | Elites 60 % häufiger | +30 % Legendary-Chance |
  | Thin Veil | Gegner-Treffer lassen bluten, Gegner-Ailments +30 % | eigene Ailments +20 % |
  | Blood Moon | Gegner +15 % Attack Speed | eigene +10 % Attack Speed |
  | Hollow Wind | −10 % alle Resistances | +40 % Ember Coal, +10 % XP |

  Der neueste Act hat kein Omen. Das gewählte Omen steht während des Zugs im „Up next“-Kasten.
- Jeder Kampf ist 1 gegen 1 und läuft automatisch. Keine Zeitraffer- oder Auto-Resolve-Funktion ✅ (Timo).

### 2.3 Nach jedem Kampf ✅ (`entschlackung-v1.md`)
- XP, Acorns, Ash. **Item-Picks** (`elites-routen-v1.md` 3): normale Kämpfe in jedem Run nur **jede dritte Stage 1 aus 3**
  (sonst werden die Karten sofort zu Ash; auch in Run 1, Timo 15.10.2026), Elites, Gatekeeper und
  Bosse immer. Die DPS-Pfeile auf den Karten misst der
  Training Dummy.
- Ember Coal und Runes fallen **passiv** in den Beutel (Elite 2–3 Ember Coal, Boss 4–6, normale Gegner 15 % auf 1).
- **Ember Shrine** nach Stage 5 und 10 und nach Elites (nur in Acts, die in diesem Run noch nicht geschafft sind):
  1 aus 3 **Stolen Fire Boons**.
- Boss: zusätzlich **Boss Hoard** (Chance auf Boss-Unique/Trophy) und sein **Echo** für das Heirloom.

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
- **Man bekommt:** einen neuen Act · eine Mastery-Wahl (Haupt-Mastery vertiefen oder Tier I einer anderen) · die nächste Battle-Plan-Sprosse ·
  +2 Skill Points · +2 Attributpunkte · ein höheres Level Cap und Level-Band · bei Prestige 2, 4 und 6 einen weiteren
  Keystone-Platz · ab Prestige 1 die Draughts.

### 2.6 Finale und Endgame ✅
- **The Last Ember** (nach dem 7. Prestige): 7 Stages ohne Loot und Level-Ups. Stage 1–6 sind die **Warden-Echos** der
  Acts 1–6 (Echo n hat n Boss-Fähigkeiten, Stärke steigt von 60 % auf 90 %), Stage 7 ist der **Harvester's Core** (100 %,
  härtester Kampf). Nach jedem Echo 1 aus 3 Boons. Tod: zurück zum Eingang, beliebig viele Versuche. Ziel: 3–5 Anläufe.
- **Wildfire I–X** (nach dem Finale): Ein gewählter Act brennt erneut auf einer Stufe. Monster Level 92 (I) bis 110 (X).
  Mehr Legendaries und Runes, keine Shrines. Ziel: I–V schafft jeder Build, VI–VII mit Gear-Farmen, VIII–X nur über
  Min-Maxing (`endgame-balance-v1.md`).
- **Wildfire-Omens** (`neuausrichtung-v1.md` 7.2): Vor jedem Wildfire-Zug wählt man beliebig viele aus 20 Omens, jedes mit
  **Peril 1–3**. Mindest-Peril: I–V 0, VI 2, VII 4, VIII 6, IX 8, X 10. **Jeder Punkt Peril** gibt +8 % XP und +5 %
  Legendary-Chance, je 4 Peril einen Rune-Rang mehr, je 3 Peril ein Cinderglass mehr am Boss.
  - Peril 1: Searing Touch (Treffer setzen Burn), Stoneflesh (+50 % Armor), Frostbite (Chill), Venom (Poison),
    Swollen (+25 % Life), Dry Season (Flask halb), Iron Will (Gegner +40 % Tenacity).
  - Peril 2: Hexed Ground (−15 % Resistances), Bloodfever (+25 % Attack Speed), Parched (keine Flask), Short Fuse
    (Kampf über 90 s ist verloren), Fury (+20 % Schaden), Warded Foes (+20 % Resistances), Restless Dead (doppelt so
    viele Elites), Leeches (Gegner 8 % Lifesteal), Ember Tax (Skills +30 % Heat).
  - Peril 3: Silenced Ember (erster Rotation Slot leer), Crushing Weight (Heavy-Hit-Deckel 50 % statt 35 %), Giants
    (+50 % Life), Brittle Bones (−20 % max Life).
- **Ashborn** (`neuausrichtung-v1.md` 7.3): Ab Level 100 fließt XP in **Ashborn-Level** (das erste kostet 12.000 XP,
  jedes weitere 4 % des ersten mehr). Jedes gibt einen Punkt, höchstens **100**, höchstens **15 pro Wert**, auf vier
  Boards: **Onslaught** (Damage, Crit Chance, Attack Speed, Ailment Effect, Penetration), **Aegis** (Life, Defenses,
  Resistances, Max Resistance bis +5 %, Tenacity, Block), **Mending** (Lifesteal, Ailment Healing, Barrier Recharge,
  Flask) und **Ignite** (Heat Gain, Starting Heat, Trigger Chance, Skill Cost). Verteilt im **Character Sheet**
  (Tab „Ashborn“), zurückgesetzt bei **Old Nan** für 2.000 Acorns.
- **Greater Affixes** und **Cinderglass**: siehe 5.3. **Ember Crucible**: siehe 5.3.

### 2.7 Camp ✅

| Persona | Rolle | Aufgaben |
|---|---|---|
| **Kaelen** | Trainer | Ash Tree, Heirloom, Battle Plan (jeder Respec kostet Acorns), **Training Dummy** (Schaden/s nach Quelle, Items live anprobieren) |
| **Thoric** | Blacksmith | Upgrade (Tier, mit Phoenix Feathers), Reforge (Ember Coal), Salvage (→ Ash, lehrt den Trigger Codex und den Power Codex) |
| **Liora** | Mystic | Temper (einen Affix-Wert neu würfeln), Kindle (Trigger aus dem Trigger Codex bauen), nach The Last Ember **Awaken, Shift, Intensify** (Greater Affixes), **Ember Crucible** (gelernte Powers binden) |
| **Nyssa** | Runesmith | Add Socket, Socket Rune, Combine Runes, Runeword Codex |
| **Marisha** | Black Market | Gamble (Zufalls-Item für einen Slot) |
| **Eldrin** | Scout | **The Road**: Act-Wahl, Omen, Wildfire, Draught, **Bounties** (ein optionaler Auftrag pro Zug), The Last Ember, Set Out |
| **Old Nan** | Hearthkeeper | Ratschläge, Compendium, **Reset** von Attributen und Ashborn (für Acorns; neu verteilt wird im Character Sheet) |

- **Hearthfire** (Legacy): Worn Gear, **Collections** (Trophy Wall, Runeword Codex, Trigger Codex: links Fortschritt
  und Belohnung, rechts die gewählte Sammlung im Detail) und Lineage, alles, was das Feuer übersteht.
- **Bedienung:** Ein Klick auf eine Persona öffnet ihr Fenster; Hover zeigt ein Namensschild. Personas, die noch nicht
  zur Karawane gestoßen sind (Liora, Nyssa), stehen erst im Camp, wenn sie da sind. Marker über den Köpfen
  zeigen wartende Punkte (Heir: Attribute Points, Kaelen: Skill/Mastery Points) und eine fertige Bounty (Eldrin „!“).
  Unten im Camp stehen nur die Act-Leiste und Set Out; braucht der Zug noch ein Omen, öffnet Set Out Eldrins Fenster.
- **Werkstätten** (Thoric, Liora, Nyssa, Marisha): links die Persona mit Spruch und ihren Diensten als Kacheln, in der
  Mitte die Werkbank (Anvil, Altar, Rune Table) mit Now → After, rechts Paperdoll und Tasche. Ein Item kommt per Klick,
  Rechtsklick oder Ziehen auf die Werkbank; Kosten stehen als Währungs-Icons vor dem Knopf, Salvage wird gehalten.
  Jede Arbeit hat einen kurzen Effekt (Funken, Licht, Runenglühen, Münzen).
- **Kaelen**: der Battle Plan sieht aus wie die Skill-Leiste im Kampf, ohne Dropdowns. Slot anklicken, rechts aus der
  Bibliothek wählen (oder einen Skill auf den Slot ziehen); Modifier sitzen als Sockel unter dem Slot, „Fires at Heat“
  ist ein Regler am Heat-Balken, Bedingungen sind kleine Schilder. Unten läuft „One rotation“ als dunkle Kampf-Leiste.
  Respec und Forget werden gehalten.
- **Old Nan** spricht in einer Dialog-Box (Hades): großes Porträt, ihr Spruch, Antworten mit Zifferntasten
  („Tell me more.“, Compendium, die Resets mit Acorn-Preis, „Farewell.“). Ein Reset fragt einmal nach.
- **Title Screen** und **Class Select** stehen vor dem nächtlichen Camp; Menu und Settings sind Fenster im selben Rahmen.
  Die Combat Lab gibt es nur mit `?dev` in der Adresse.

- **Supply Wagon:** gemeinsamer Stash aller Charakter-Slots. Währungen bleiben pro Charakter. Großer Stash links,
  Paperdoll und Tasche rechts (wie PoE); Details beim Hovern, Rechtsklick oder Ctrl+Klick schiebt ein Item hinüber.
  Der Stash hat **4 Tabs** (I-IV, je 10×10): Q/E oder Klick wechselt, ein gezogenes Item öffnet den Tab, über dem es
  schwebt; Rechtsklick legt in den offenen Tab, Sort ordnet nur diesen. Getragene Ausrüstung geht per Rechtsklick,
  Ctrl+Klick oder Ziehen direkt in den Stash (ist der offene Tab voll, zieht Rechtsklick sie in die Tasche aus).
- **Intermission:** steht in der Arena des Acts (der Heir wartet dort, Wetter läuft weiter). Links der Heir (Life,
  Flask, Battle Plan), in der Mitte die Wahl des Moments (Beute, Shrine, Pfad), rechts der Weg (Up Next, Bounty); bei
  der Item-Wahl steht dort die Paperdoll. Character und Skill Tree öffnen als Fenster über der Arena.
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
| **Cinderglass** | nur aus dem Wildfire (Boss 1–2, +1 je 3 Peril, +1 ab VIII): Greater Affixes |

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
  Jede Harvest: +2 Punkte. Zurücksetzen bei Old Nan für Acorns, neu verteilt im Character Sheet.
- **Breakpoints bei 4, 7 und 10** schalten je einen Perk frei (nur eigene Punkte zählen).

| Attribut | Wirkung pro Punkt | Perks 4 / 7 / 10 |
|---|---|---|
| **Strength** | +6 % Armor; Hauptattribut des Cinderguard: +8 % Damage | Armorbreaker / Stoneguard / Titan |
| **Dexterity** | +2 % Evasion; Hauptattribut des Ashstrider: +8 % Damage | Quick Reflexes / Ember Dance / True Shot |
| **Intelligence** | +8 % Barrier; Hauptattribut des Emberseer: +8 % Damage | Attuned / Elemental Surge / Spellfire |
| **Agility** | +3 % Attack Speed, +1,5 % Crit Chance | Hawkeye / Opportunist / Double Time |
| **Wisdom** | +6 % Heat Gain, +5 % Ailment Effect, +4 % Trigger Chance | Inner Fire / Afterglow / Clarity (Payoffs +25 %) |
| **Vitality** | +6 % Life, +3 % Tenacity | Second Breath / Thick Skin / Undying |

- Das **Hauptattribut** gibt +8 % Schaden jeder Art (Physical und Elemental), alle anderen Attribute geben keinen
  Schaden. Gear und Ash Tree behalten Physical/Elemental Damage %, beide Penetrations und die Ailment-Chancen.

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
  (50 % Schaden) und löst keine Trigger aus. Jede Waffe hat eine **Damage Range** (z. B. 40–140 % beim Sword, 20–180 % bei
  der Axe). Die Range bestimmt den Stil, nicht die Stärke: Der Durchschnittstreffer jeder Waffe ist derselbe wie mit den
  alten, engeren Ranges.
- **Mighty Hits** (`weapon-mastery-v2.md` 1.2): Ein sauberer Waffentreffer, der **125 % Weapon Damage** oder mehr würfelt.
  Startchance je nach Range 0 % (Dagger, Staff) bis 46 % (Crossbow). Bedingung für Mastery-Nodes und Keystones
  (Headsplitter, Ragged Cut, Earthbreaker, Gore …). In der Arena: Bodenwelle und ⚒ an der Zahl.
- **Telegraphs:** Gegner kündigen Heavy Attacks an. Ein angekündigter Treffer nimmt höchstens **35 %** von Life + Barrier.

### 4.2 Damage Types und Ailments

| Damage Type | Ailment | Mechanik | Eingebauter Payoff |
|---|---|---|---|
| Physical | **Bleed** | 50 % des Treffers/s für 3 s, wird erneuert | Rend (Skill) |
| Physical | **Poison** | 14 %/s für 5 s, stapelt bis 20 | **Overflow**: ein Stack über der Grenze platzt sofort |
| Fire | **Burn** | 22 %/s für 4 s, halbiert die Heilung des Gegners | **Combust**: Fire-Treffer auf Brennende lösen 25 % des Rest-Burns aus |
| Void | **Corruption** | 9 %/s, wächst pro Tick (+25 %, bis 12×), 6 s | **Collapse**: bei vollem Wachstum 4 s Schaden auf einmal, zurück auf halbes Wachstum |
| Cold | **Chill** | −25 % Attack Speed und Heat Gain, 2 s (mit Ailment Effect bis −40 %) | – |
| Lightning | **Shock** | +10 % erlittener Schaden pro Stack, bis 3 Stacks, 3 s (mit Ailment Effect bis +50 %) | – |

- **Ailment Effect** (statt Ailment Duration, `ailments-v2.md`): stärkere DoTs, stärkeres Chill und Shock, nicht
  längere Ailments. Längere Dauer gibt es nur als Regel einzelner Nodes. Immolate löst Combust dreifach aus.

- **Crit Damage ist fest 150 %** (nur Crit Chance skaliert; Ausnahmen über einzelne Keystones).
- **Sunder** (Debuff, senkt Armor stapelnd) ≠ **Physical Penetration** (ignoriert Armor pro Treffer).

### 4.3 Defense

| Layer | Quelle | Regel |
|---|---|---|
| **Armor** | Gear, STR | Reduktion = Armor / (Armor + 20 × Angreifer-Level), max. 90 % |
| **Evasion** | Gear, AGI | weicht Angriffen aus (max. 50 %); **Deflect**: Spells mit derselben Chance halbiert (nur Held) |
| **Barrier** | Caster-Basen, Affix „Warded“, INT (+8 %/Punkt) | voll bei Kampfbeginn, lädt immer 3 %/s, nach 1,5 s ohne Treffer 20 %/s |
| **Block** | Shield | stoppt 50 % des Treffers (Stoneguard mehr), max. 75 % Chance |
| **Parry** | nur Heirloom (Sword: Winter-Path, Keystone Perfect Parry) | ein gegnerischer Angriff (kein Spell) wird zum Glancing Blow: halber Schaden, keine Trigger des Gegners; max. 30 % |
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

### 5.1 Heirloom ✅ (`klassengeruest-v1.md` 4, `waffe-als-system-v1.md`, `weapon-mastery-v2.md`)
- **Die Waffe ist fest** und droppt nie: das Heirloom. Sie wächst über den **Weapon Rank** (gleiche XP wie der Held,
  Rank Cap pro Run 4/7/10/13/16/18/20, 1 Heirloom Point pro Rank). Weapon Damage steigt automatisch mit dem Level.
- Güte: Crude · Honed · Tempered · Ascendant · Exalted.
- Baum pro Waffe (8 Bäume, gleicher Grundriss):

| Teil | Inhalt |
|---|---|
| **Refine** (11 Punkte) | Steady Hand (Range-Min +15 %), Full Swing (Range-Max +25 %, bis 220 %), Precision (+5 %), Balance (Attack Speed) |
| **Heat Form** (1 aus 4) | ab Rank 3 |
| **Innate Form** (1 aus 3) | Variante des Innate Skills, ab Rank 5 |
| **3 Build-Paths** | je Technik I (3 Ränge) → **Gabel 1** → Technik II (3 Ränge) → **Gabel 2** → **Pfad-Meister**. **Nur ein Path pro Held**: der erste Punkt legt Damage Type und Ailment fest (Infusion) |
| **Keystone** (1 aus 4) | ab 12 ausgegebenen Punkten; jeder ändert, *wie* die Waffe kämpft |
| **Echoes** | Andenken der Act-Bosse, werden pro Run stärker |

- **Infusion:** Der Path tauscht den Damage Type der Waffe (Implicit Physical ↔ Elemental), ersetzt ihre Ailment-Chance
  und schreibt den Innate um (Name, Typ, Ailment). Ohne Punkt gilt der erste Path. Mastery-Skills sind „infused“ und
  folgen ihm auch. In der Arena glüht die Waffenspitze in der Farbe des Paths.

| Waffe | Path 1 | Path 2 | Path 3 |
|---|---|---|---|
| Sword | Edge (Physical, Bleed) | Thunder (Lightning, Shock) | Winter (Cold, Chill) |
| Mace | Quake (Physical, Stun) | Forge (Fire, Burn) | Stormwall (Lightning, Shock) |
| Axe | Butcher (Physical, Bleed) | Blaze (Fire, Burn) | Glacier (Cold, Chill) |
| Dagger | Venom (Physical, Poison) | Cutthroat (Physical, Bleed) | Static (Lightning, Shock) |
| Bow | Toxin (Physical, Poison) | Fire Arrows (Fire, Burn) | Storm (Lightning, Shock) |
| Crossbow | Venom Bolts (Physical, Poison) | Incendiary (Fire, Burn) | Frost (Cold, Chill) |
| Wand | Starfall (Void, Corruption) | Storm (Lightning, Shock) | Rime (Cold, Chill) |
| Staff | Hollow (Void, Corruption) | Smolder (Fire, Burn) | Glacial (Cold, Chill) |

- Der Mace-Stun ersetzt ein Ailment (Quake: Stunned Sunder). Attunement gibt es nicht mehr, der Path übernimmt es.
- **Techniken** geben nur Werte, die es ausschließlich an der Waffe gibt: Precision, Damage Range, **Parry**, Sunder,
  Ailment-Wirkung der Waffe, Extra-Attack Damage, Innate Damage/Cost, Mighty-Hit-Schaden, Heat per Hit.
- **Innate Skills:** Power Strike (Sword), Skull Crack (Mace), Lacerate (Axe), Envenom (Dagger), Barbed Arrow (Bow),
  Heavy Bolt (Crossbow), Shockbolt (Wand), Void Bolt (Staff); der Path benennt sie um (z. B. Frostbolt, Voidbolt).
  Jeder Innate gibt Heat laufend aus (Angriff oder Spell).

### 5.2 Mastery ✅ (`klassengeruest-v1.md` 5)
- Ersetzt die Prestige-Äste. Jede Klasse hat drei Masteries, eine pro Stil: **Burst** (große Treffer, Skills, Heat
  ausgeben), **Tempo** (viele schnelle Treffer, Default Attack, On Hit), **Ailment** (Chance, Stärke, Dauer). Jede
  passt zu allen drei Paths der Klassenwaffen.
- Die **erste Harvest** wählt die Haupt-Mastery (Tier I: Titel, Mastery-Skill, Keystone). Jede weitere Harvest vertieft
  sie (bis **Tier V**) oder nimmt Tier I einer anderen. Eine Tier kostet 8 / 5 / 6 / 4 / 4 Skill Points; Keystone II
  und III heißen Greater und Supreme, jede tiefere Tier gibt dem Mastery-Skill einen Rang.
- Neue Bausteine: Skill Damage, Ailment Chance, Ailment Duration, „Crits setzen dein Ailment“.
- Die Masteries wachsen an einem Notable aus dem Ash Tree (Vanquisher: Brutal Force, Ravager: Flayer, Trickster:
  Venom Heart, Archmage: Pyroclasm, Spellweaver: Storm Weaver, Deadeye: Deep Freeze, Warlock: Hollow Crown, Berserker
  und Skirmisher aus den Wurzeln). Der Held trägt in der Arena die Aura seiner Haupt-Mastery.
- Titel = Name der Haupt-Mastery.

### 5.3 Ash Tree ✅ (`klassengeruest-v1.md` 6, `level-v2.md` 7, `neuausrichtung-v1.md` 4)
- Tab bei Kaelen: **Ash Tree**. Er **stützt und schützt** den Build, den Heirloom und Mastery gewählt haben.

| Teil | Inhalt |
|---|---|
| **Krone** | eine Region pro Damage Type mit Ailment: Steel (Physical, Stun), Blood (Bleed), Venom (Poison), Flame (Burn), Storm (Shock), Frost (Chill), Void (Corruption). Die 19 Skills für den Battle Plan liegen hier |
| **Stamm** | Verteidigung für alle: Block, Resistances, Iron Bastion, Shield Wall/Shield Bash, Retaliation, Unbreakable, Iron Will, Keystone Juggernaut |
| **Wurzeln** | Heat und Rotation: Heat from Hits Taken (Battle Scars, Unbroken), Rally, Battle Trance, Refund, Stoked, Keystones Glass Focus, Grand Strategy, Arcane Conduit |

- Krone und Stamm liegen auf einem Ring um die Spitze des Stamms, die Wurzeln hängen am mittleren Notable des Stamms
  (Iron Will). Jede Region: Hub, drei Speichen (drei Nodes, dann ein Notable oder eine Gabel), Travel-Nodes zu den
  Nachbarn, eine Ward-Knospe und ein Rune Socket. 21 Skills, 13 Keystones, 12 Gabeln.
- **Keine Region ist gesperrt.** Ailment-Nodes verstärken nur Ailments, die man setzt („Your Poisons …“).
- **Klassen-Start:** Cinderguard bei Steel, Ashstrider bei Venom, Emberseer bei Void.
- **Hoheitsgebiete** (`neuausrichtung-v1.md` 2): Travel-Nodes geben nur Defense (Life, Armor, Barrier, Evasion,
  Tenacity; im Stamm auch Block und Resistances). **Notables** sind bedingt oder haben eine Regel; Conversion
  (Searing Steel, Arcane Edge, Void Ember) öffnet Hybride.
- **Keystones** kosten 3 Skill Points und einen Keystone-Platz (1, +1 bei Prestige 2/4/6, max. 4): Final Mercy,
  Unyielding (Steel), Blood Price, Blood and Bile (Blood), Slow Death (Venom), Black Flame (Flame), Spellblade (Storm),
  Elemental Overload (Frost), Pact of Ash (Void), Juggernaut (Stamm), Glass Focus, Grand Strategy, Arcane Conduit
  (Wurzeln).
- **Rune Sockets** (9, einer pro Region): ein gelernter Socket nimmt bei Kaelen eine Rune aus dem Beutel und gibt ihre
  **Web-Wirkung**. Herausnehmen oder Vergessen legt die Rune zurück in den Beutel.

### 5.4 Items ✅ (`item-system-v1.md`, `legendary-runes-v1.md`)
- **Slots:** Off Hand, Helm, Body Armor, Gloves, Boots, Belt, Amulet, 2× Ring, **Charm** (nur Trigger-Affixe).
  Off Hand passt zur Waffe: Shield (Melee), Quiver (Bow/Crossbow), Focus (Wand/Staff).
- **Grundtypen (Bases):** 30 ohne Waffen, jeder mit festem Bonus (Implicit) und eigenem gemalten Icon. Armor-Slots haben
  je eine leichte (AGI), schwere (STR) und Caster-Variante (INT), Body zusätzlich den **Leather Cuirass** (STR + AGI).
  Schmuck: Bone Amulet, Ember Pendant, **Gold Medallion** (+5 % Physical Damage); Iron Ring, Garnet Ring, **Gold Ring**
  (+4 % Elemental Damage). Charms: War, Ward, Ember und **Leaf Charm** (würfelt bevorzugt Ailment-Trigger).
- **Item Level = Monster Level**, daraus das **Item Tier** (T1–T10). **Required Level** = Item Level − 5.
- **Rarities:** Normal (Sockets, Basis für Runewords) · Magic (1 Prefix + 1 Suffix) · Rare (4–5 Stat-Affixe) · Epic
  (5–6 und garantiert Trigger) · Legendary (4–5 Affixe + Legendary Power) · Unique (fest, oft mit Power; Boss-Uniques
  „Dropped by …“). Gear ist die **Hauptquelle der Zahlen** (Damage %, Crit, Attack Speed, Trigger Chance), die Bäume geben
  sie seit Phase 5 ab.
- Welche Rarity droppt, hängt am Run (Run 1: Normal/Magic, Rare am Boss; Epic ab Run 3; Legendary ab Run 4 am Boss).
- **Affixe:** Stat-Affixe (Prefix oder Suffix) und **Trigger-Affixe** (Condition → Chance → Effect → Cooldown).
- **Trigger Codex:** Salvage eines Items mit Trigger lehrt Condition und Effect. Liora baut daraus per **Kindle** einen
  Trigger auf ein Item (ein gekindelter Trigger pro Item, Roll bis 70 %).
- **Runes und Runewords:** 8 Runes (Bark, Moss, Thorn, Venom, Ember, Rime, Volt, Dusk), 10 Runewords. Runeword Codex
  bei Nyssa, permanent.
- **Crafting-Grenzen:** Reforge löst den Affix-Lock, Legendary Powers und Runewords sind unveränderbar,
  Uniques können nicht reforged/tempered werden.
- **Trophy Wall:** Sammlung aller gefundenen Uniques.
- **Greater Affixes** (`neuausrichtung-v1.md` 7.5, bei Liora nach The Last Ember): **Awaken** (3 Cinderglass) macht ein
  zufälliges Affix zu **Greater I** = 110 % des Höchstwerts seines Tiers, **Shift** (1) setzt es auf ein anderes
  zufälliges Affix, **Intensify** (2/4/8/16) hebt es bis **Greater V** = 150 %. Ein Greater pro Item, die **Stufe gehört
  dem Item** (Shift und Reforge behalten sie). Uniques dürfen eins bekommen, die feste Zahl von Epic/Legendary-Affixen
  (`epicValue`) nicht.
- **Ember Crucible** (`neuausrichtung-v1.md` 8): Salvage eines Legendary oder Unique lehrt seine Power den **Power
  Codex** (gehört dem ganzen Account, der höchste Tier zählt). Liora bindet gelernte Powers in drei Slots nach Art:
  **Strike** (Treffer, Crits, Execute; offen mit der ersten Power), **Ward** (Defense, Heilung; offen nach The Last
  Ember), **Ember** (Ailments, Heat, Trigger, Regeln; offen nach Wildfire V). Binden kostet 300 Ash und 3 Ember Coal,
  jeder Wechsel erneut. Eine Power wirkt nur einmal: Steckt sie auch auf einem getragenen Item, ruht die Kopie im
  Crucible.

### 5.5 Stolen Fire Boons ✅
- Funken aus dem Feuer der Wardens: eine Familie pro Boss (Ash, Rot, Cinder, Rime, Storm, Void) plus Hearth.
- Biegen den Build bis zum Prestige (Slots Strike, Skill, Reaction, Heat exklusiv; Trigger, Passive stapeln),
  Güte Spark/Flame/Blaze, Fusion Boons im Finale.

---

## 6. Gegner ✅ (`gegner-bosse-v1.md`)
- Archetypen: Brute, Skirmisher, Caster, Afflicter, Warden, Thornback. Gleiche Regeln wie der Held, sichtbare Heat-Leiste,
  1–2 Skills, Telegraphs (Conditions für Reaction Slots).
- **Elites** (`elites-routen-v1.md`): 1–3 Modifier, zuerst einer der drei **Act-Modifier** (z. B. Rotwood: Sporeburst,
  Rootbound, Thornbark), dann allgemeine (Extra Fast, Stone Skin, Vampiric, Thorns, Enraged). Ihre Beute folgt dem
  Thema der Modifier. Besserer Loot, Ember Coal, öffnen eine Ember Shrine.
- **Champions** (ab Run 3, 4 % pro Elite): drei Modifier, +30 % Life, eigener Hoard (sicher Epic, 15 % Legendary).
- **Ember Thief:** seltener Gegner, der wegläuft; fängt man ihn, gibt es Beute.
- **Bosse:** pro Act einer mit Phasen und Signatur-Mechanik. Jedes Prestige gibt jedem Boss eine Fähigkeit dazu.
- **Defense der Gegner:** Armor wächst mit dem Monster Level (×0,27 pro Level), dazu **10 % All Resistance** für
  jeden Gegner, so viel wie Armor von einem Physical Hit wegnimmt: Physical und Elemental kommen gleich schwer durch
  (Klassengerüst-Balance; vorher 30 %, das bremste jeden Element-Path). Act-Gegner mit Element-Thema haben 20–25 %
  in ihrem Element statt 30–40 %.
- **Skalierung:** Das Monster Level bestimmt die Grundwerte. Dazu:
  - **Run Pressure:** Life +80 %, Schaden +35 % pro Act nach dem ersten (der neueste Act bleibt der härteste).
  - **Wand** im neuesten Act: Der Boss trifft mit der Wand-Stärke des Runs (1,8 / 9 / 7,6 / 9 / 8,8 / 7,8 / 8),
    Life nur mit deren Wurzel. Davor steigt der Act im **Sägezahn** (`neuausrichtung-v1.md` 5.3, Startwerte aus
    `balance-messung-v1.md`): normale Stages 15 → 30 %, 25 → 35 %, 30 → 40 % der Wand, die **Gatekeeper** auf
    Stage 5 und 10 (sicherer Elite) sind Spitzen mit 40 % und 45 %. Jede Wand mit höchstens +10 Level schaffbar.
  - **Kampfdauer** (5.5): Gegner haben je Stage-Art mehr Life (normal ×1,4, Elite ×1,25, Gatekeeper ×1,7, Boss ×1,5;
    der Boss trifft dafür mit ×0,9), in allen Acts eines Runs, nicht im Finale und im Wildfire.
  - Ziele im neuesten Act (Balance-CLI, `--newest 1`): **3–5 Anläufe** (Timo, 13.10.: mit Runes), Tode Boss 35–55 %, Gatekeeper 20–30 %, Elites 10–20 %,
    normal 5–15 %; Kampfdauer normal 20–30 s, Elite 35–50 s, Gatekeeper 45–70 s, Boss 60–100 s.

---

## 7. Balance-Ziele ✅ (`balance-grundlagen-v1.md`, `endgame-balance-v1.md`)
- Keine One-Shots (Heavy-Hit-Deckel 35 %). Jede Klasse hat eine Defense, die den ganzen Kampf hält.
- Wände sind Stat-Checks, in die man über Level und Gear hineinwächst. Ein guter, aber schwächerer Build aus dem
  Autopilot-Ranking schafft jede Wand mit bis zu +10 Level.
- Resistance ist eine Entscheidung (Ember Penalty). Kein Magic Find, Gold Find oder XP %.
- Messung immer mit der Balance-CLI: 24 Autopilot-Builds (einer pro Heirloom-Path, `--build all`), mit
  `--mastery all` je Build alle drei Masteries der Klasse; mehrere Seeds, Vorher/Nachher im PR.
- **Stand Klassengerüst** (18.10., `--act 7 --mastery all --runs 2 --seed 41 --newest 1`, Summe der Anläufe über die
  sieben neuesten Acts): Cinderguard 27,1 (9,5–64,5), Ashstrider 24,3 (13–54), Emberseer 18,5 (7–50). Vorher (alte
  Resistances) 43,7 / 36,4 / 32,3. Schwächste Stellen: Cinderguard-Axt und Cold/Lightning-Paths in Act 4
  (Frost Warden, Ice Golem), Staff-Smolder in Act 5–6; der Emberseer ist im Schnitt am leichtesten.
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
- **Gemalte Icons** (Timo generiert Sheets, `tools/art/cut_*.py` schneidet sie): Klassen, Attribute, Elemente,
  Ailments, Stats, Heat Forms, Waffen, alle Item-Grundtypen, leere Slots, die Ember Flask (voll und leer) und die
  sieben Draughts. Im Kampf steht der gebraute Draught an der Stelle der Flask-Ladung, die er kostet. Seltenheit
  zeigt der Rahmen, nicht das Bild.
- **Keine Spoiler:** Die UI zeigt nur die Acts des aktuellen Runs (Run n = Acts 1..n). Ein Boss heißt „???“,
  bis der Heir ihm begegnet ist (oder der Act in diesem/einem früheren Run fiel). Gilt für Road, Camp-Kopf, Eldrin,
  Up Next, Old Nans Sprüche, Trophy Wall, Trigger Codex und das Compendium (The Last Ember erst, wenn sie offen ist).

---

## 9. Offene Baustellen

- Neuausrichtung (Systemidentität, Class Traits, Web v3, Mastery v2, Ailments v2, Routen, Elites, Omens, Ashborn,
  Greater Affixes, Ember Crucible, Training Dummy): `neuausrichtung-v1.md`, von Timo entschieden (13.10.). Phase 1
  (Messwerkzeug), Phase 2 (Welt-Band, Sägezahn, Kampfdauer, Hearth Embers), Phase 3 (Ailments v2, Class Traits) und
  Phase 4 (Elites, Routen, Item-Picks, Training Dummy) sind gebaut. Von Phase 5 ist **Weapon Mastery v2** gebaut
  (mit Mighty Hits, Parry und dem Freeze des Rime-Pfads), dazu **Skill Web v3**, die Hoheitsgebiete in Web und
  Prestige-Ästen, mehr Affixe auf Rare/Epic/Legendary, die Rune Sockets im Web und die Umbenennungen aus 1.3. Phase 6
  ist gebaut: Omens (Run und Wildfire), Ashborn, Greater Affixes mit Cinderglass, Ember Crucible mit Power Codex.
  Offen aus Phase 6: mehr Legendary Powers (heute 26, Ziel ~36), Wildfire-Uniques ab VI, Pixi-Looks der Omens.
- Später: Ancestor Duels, Battle Plan Presets, Death Recap, Fight Stats: `merkliste-spaeter.md`
- Autopilot nutzt kein Crafting (Reforge, Temper, Kindle): Die Balance-Zahlen sind bewusst etwas pessimistisch. Im
  Endgame nutzt er Greater Affixes, Ashborn und das Crucible.

---

## Anhang: Detail-Dateien

| Datei | Inhalt | Stand |
|---|---|---|
| `klassengeruest-v1.md` | Klassen, Heirloom-Paths, Masteries, Ash Tree | gebaut (Abweichungen siehe 2.1, 5.1–5.3) |
| `archiv/klassen-v2.md`, `archiv/sorcerer-ohne-fire-v1.md` | fünf Klassen, Wand ohne Fire | **überholt** durch `klassengeruest-v1.md` |
| `attribute-v1.md` | Attribute 1–10, Breakpoints | gültig |
| `level-v2.md` | Level, Level Cap, Skill Points, Skill Web | gültig (Regionen siehe 5.3) |
| `waffe-als-system-v1.md` | Weapon Mastery (heute Heirloom) Grundsystem | gültig (Attunement durch Paths ersetzt) |
| `weapon-mastery-baeume-v1.md` | die 8 Mastery-Bäume v1 | Pfade **überholt** durch `weapon-mastery-v2.md`; Formen, Keystone-Ring, Echoes gültig |
| `archiv/skilltree-v2.md` | Prestige-Äste, Vertiefen | **überholt** durch Masteries (`klassengeruest-v1.md` 5) |
| `skills-v1.md` | Skills, Battle Plan | gültig (Sprossen siehe 4.4) |
| `prestige-acts-v1.md` | Acts öffnen pro Prestige | gültig (Gear-Verlust und Seals überholt) |
| `entschlackung-v1.md` | Währungen, Personas, Bounties, Keystone-Limit | gültig |
| `balance-grundlagen-v1.md` | Defense, Ember Penalty, Wände, Draughts | gültig |
| `endgame-balance-v1.md` | Finale, Wildfire, Poison, Deflect | gültig |
| `item-system-v1.md`, `legendary-runes-v1.md`, `trigger-codex-v1.md` | Items, Legendary, Runes, Trigger Codex | teils überholt (Quarry, Kindling, Mastery gestrichen) |
| `gegner-bosse-v1.md` | Gegner, Bosse | gültig, Skalierung siehe 6 |
| `stat-liste-v2.md` | Stats, Trigger-Affixe | teils überholt (Attribute siehe 3.2) |
| `loot-rewards-v1.md`, `town-crafting-v1.md` | Belohnungen, Camp | **überholt** durch `entschlackung-v1.md` |
| `archiv/skill-tree-v1.md`, `archiv/klassen-varianten.md`, `waffen-v1.md` | Vorgänger | Geschichte |
| `ui-look-v1.md`, `ui-views-v1.md`, `battle-view-v1.md` | Darstellung | gültig |
| `story-theme-v1.md`, `story-texte-v1.md`, `fabelwelt-v1.md` | Welt und Texte | gültig |
| `neuausrichtung-v1.md` | Vorschläge zur Neuausrichtung | 💡 offen |
| `balance-messung-v1.md` | Messung Phase 1 (Runes im Autopilot, Tode und Kampfdauer je Stage-Art), Startwerte Phase 2 | gemessen |
| `weapon-mastery-v2.md` | Mastery-Pfade mit Gabeln, Precision, Mighty Hits, Parry | gebaut (Abweichungen dort in Abschnitt 6) |
| `ailments-v2.md` | Ailment-Identitäten, Payoffs, Ailment Effect, Wisdom | gebaut |
| `elites-routen-v1.md` | Elite-Modifier pro Act, Champions, Routen, Item-Picks, Training Dummy | gebaut |
| `merkliste-spaeter.md` | Ideen für später | gemerkt |
