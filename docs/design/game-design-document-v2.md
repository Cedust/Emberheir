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
| **Cinderguard** | Strength | Sword, Axe, Mace | starke Angriffe | Fury: jede Default Attack, die trifft, und jeder eingesteckte Treffer gibt 1 Fury (bis **5**, Phase 5 21.10.2026: vorher 10, die Leiste wurde nie voll); das Innate gibt alle aus, +25 % more pro Fury. Sword 12–18 bei 0,95/s, Axe 14–22 bei 0,8/s, Mace 18–26 bei 0,65/s (Waffen-Pips siehe unten) | Vanquisher · Berserker · Ravager |
| **Ashstrider** | Dexterity | Bow, Crossbow, Dagger | Saubere Treffer | Hunter's Mark: **jede** saubere Default Attack markiert den Gegner, auch ein Crit (bis **5** Marken); der nächste Crit eines **Skills oder des Innate** gibt alle aus, +15 % more pro Marke (Phase 5, 21.10.2026: vorher nur DAs ohne Crit, bis 10, ausgegeben vom nächsten Crit; Crit-Builds sammelten am Ende gar keine Marken). Bow 14–22 bei 0,8/s, Crossbow 23–34 bei 0,5/s, Dagger 11–15 bei 1,1/s | Deadeye · Skirmisher · Trickster |
| **Emberseer** | Intelligence | Wand, Staff | Ailments | Overcharge: jeder Skill gibt eine Ladung, bei 3 eine Nova deines Elements (125 % Weapon Damage, setzt sicher ihr Ailment). Wand 12–18 bei 0,95/s, Staff 18–26 bei 0,65/s | Archmage · Spellweaver · Warlock |

- **Waffen-Pips** (Timo 21.10.2026, Phase 5): Speed + Power = 6 und die Pips legen die Zahlen fest. Speed-Pip 5–1 =
  Speed **110 · 95 · 80 · 65 · 50** (100 = 1 Angriff/s), Power-Pip 1–5 = Ø-Treffer **13 · 15 · 18 · 22 · 28,5**. Gleiche Pips,
  gleiche Zahlen: Dagger 5/1, Sword und Wand 4/2, Bow und Axe 3/3, Staff und Mace 2/4, Crossbow 1/5. Die Waffen
  unterscheiden sich in Damage Range, Heat Form und ihren Extras.
- Start-Arrays (STR/DEX/AGI/INT/WIS/VIT): Cinderguard 5-1-2-1-2-3, Ashstrider 1-5-3-1-1-3, Emberseer 1-1-1-5-3-3.
  Start-Off-Hands: Round Shield, Quiver (Dagger: Blood Talisman), Ember Focus.
- Jeder Trait hat in der Arena einen eigenen Moment (Fury-Glut, Mark, Overcharge-Nova).

- Die Klasse ist ein Startpunkt, kein Käfig: Alle Items und alle Regionen des Ash Trees sind für jede Klasse nutzbar.
- **Lineage** (Phase 5, Timo 21.10.2026): Jede Klasse, die das Finale gewinnt, entzündet ihre Flamme (Iron, Keen,
  Hollow Lineage). Jeder neue Charakter **jeder** Klasse bekommt bei der Erstellung **+1 Attribute Point** im
  Hauptattribut jeder entzündeten Klasse (STR, DEX, INT), höchstens 3. Die Punkte sind an- und abwählbar (Default an),
  leuchten feuerrot, zählen für Breakpoint Perks und gehören zur Untergrenze beim Respec. Alle drei Flammen = Titel
  „Emberheir“ und das Ahnenporträt. (Vorher: kleine Prozent-Boni nur für die eigene Klasse, Stufen 1–5.)

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
- **Warden's Gate** (`notes/laengere-runs-v1.md`, Längere Runs Phase 1): Vor jeder Wand des neuesten Acts (den
  Gatekeepern auf Stage 5 und 10 und dem Boss) wählt man **Challenge** (Kampf; beim Boss bringt der Sieg The Harvest)
  oder **Wander**: zurück auf Stage 1 desselben Acts, um zu farmen. Life,
  Flask, Boons und Bounty bleiben, die Act-Karte wird neu gewürfelt. Beim Wandern gibt es **keine neuen Shrines**
  (keine Boons aus dem Farmen), Waymarks zahlen ihren Skill Point weiter nur einmal pro Run. Das Tor zeigt das
  Level der Wand, rot, solange der Held darunter liegt. Nicht im Wildfire, im Finale und nach dem letzten Prestige.
- **Waymarks:** Stage 5, 10 und 15 jedes Acts. Der erste Sieg dort in einem Run gibt einen Skill Point.
- **Act-Karte** (`notes/laengere-runs/act-karte-entwurf-v1.md`, Längere Runs Phase 2, Timo 21.10.2026; ersetzt die
  Routen aus `elites-routen-v1.md`): Jeder Zug durch einen Act hat eine gewürfelte Karte wie bei Slay the Spire,
  **3 Spuren, eine Reihe pro Stage** (15, Emberfall 10). Reihe 1 ist ein einzelner Start-Kampf, die Waymark-Reihen
  (5, 10, 15; Emberfall 3, 7, 10) sind einzelne Knoten, in die alle Spuren münden. Jeder Knoten führt zu 1–2 Knoten
  der nächsten Reihe, Wege kreuzen sich nie, jeder Knoten hat einen Kampf als Nachfolger, in der Reihe vor dem Boss
  liegt immer ein Hearth. Neu gewürfelt bei jedem Aufbruch, nach dem Tod und bei Wander. Wildfire und Finale haben
  keine Karte.

  | Knoten | Kampf? | Was passiert |
  |---|---|---|
  | Fight | ja | normaler Kampf (kann zufällig Elite oder Ember Thief sein) |
  | Elite | ja | sicherer Elite, ohne Shrine danach |
  | Thief's Trail | ja | nur bei offener Thief-Bounty, in den ersten zwei Abschnitten: sicherer Ember Thief |
  | Shrine | nein | 1 aus 3 Boons; nur in den ersten zwei Abschnitten und solange Shrines brennen (nicht beim Wandern) |
  | Hearth | nein | Rast +25 % Life (Dry Season +60 %) **oder** +1 Flask-Ladung |
  | Cache | nein | ein Item-Pick, eine Rune oder Ember Coal |
  | Event | nein | eins von 8 Events (`content/src/events.ts`), jedes mit freiem **Walk On**; was man nicht bezahlen kann, ist ausgegraut mit Tooltip. Kein Preis nimmt mehr als die Hälfte einer Schicht |
  | Marisha | nein | Gamble für 3 zufällige Slots, 25 % günstiger als im Camp; höchstens einmal pro Karte, im zweiten Abschnitt (sicher, solange sie noch nicht im Camp ist) |
  | Hunt | ja | ein gewählter Gegner des Acts (der mit den wenigsten Kills), ohne Elite/Thief; zählt 2× für seinen Trail und gibt immer einen Item-Pick. 0–2 pro Karte (mit offener Trail-Hunt-Bounty einer mehr, nach ihrem Gegner), nicht im Wildfire (siehe 2.3 Hunts) |

  Events: Smoldering Altar (−20 % Life → Rune einen Rang höher), Ember Spring (+30 % Life oder +1 Flask), Trapped
  Chest (Item-Pick, 50 % −25 % Life), Ashen Challenger (nächster Kampf ein Elite mit 2 Items), Hedgehog Peddler
  (Acorns → Flask, Ash → 2 Ember Coal), Hunters' Camp (+20 % Life oder XP von 2 Kämpfen), Cursed Spark (1 aus 3 Boons,
  Gegner +15 % Schaden bis zur nächsten Waymark; nur solange Shrines brennen), Lost Cub (−1 Flask → nächster
  Item-Pick mindestens Rare). Die Karte steht rechts in der Intermission und öffnet sich groß mit **M**. Die
  erreichbaren Knoten erscheinen als große Karten in der Mitte (auch ein Klick auf den Knoten wählt); gibt es
  mehr als einen Weg, wartet NEXT STAGE auf die Wahl. Groß lässt sich die Karte zoomen und verschieben. Zwischen
  den Kämpfen ist die Arena leer, der Heir erscheint erst im Kampf.
- **Omens** (`neuausrichtung-v1.md` 5.2): Wer in einen **alten** Act des Runs aufbricht (jeder Act vor dem neuesten),
  wählt bei Eldrin **eins von zwei Omens**. Das Angebot ist pro Act und Run fest, das nächste Prestige würfelt neu.
  Jedes Run-Omen hat einen **Preis und einen Lohn** und nimmt keiner Defense- oder Heil-Schicht mehr als die Hälfte:

  | Omen | Preis | Lohn |
  |---|---|---|
  | Stoneflesh | Gegner +50 % Armor | +50 % Ember Coal |
  | Blight Bloom | Gegner-Treffer vergiften, Gegner heilen sich an ihrem Poison | Runes einen Rang höher |
  | Cinder Rain | Gegner-Treffer setzen Burn | +20 % XP |
  | Dry Season | Flask heilt 40 % weniger | Hearth Embers und Hearth-Knoten heilen 60 % mehr |
  | Restless Dead | Elites 60 % häufiger | +30 % Legendary-Chance |
  | Thin Veil | Gegner-Treffer lassen bluten, Gegner-Ailments +30 % | eigene Ailments +20 % |
  | Blood Moon | Gegner +15 % Attack Speed | eigene +10 % Attack Speed |
  | Hollow Wind | −10 % alle Resistances | +40 % Ember Coal, +10 % XP |

  Der neueste Act hat kein Omen. Das gewählte Omen steht während des Zugs im „Up next“-Kasten.
- Jeder Kampf ist 1 gegen 1 und läuft automatisch. Keine Zeitraffer- oder Auto-Resolve-Funktion ✅ (Timo).

### 2.3 Nach jedem Kampf ✅ (`entschlackung-v1.md`)
- XP, Acorns, Ash. **Item-Picks** (`elites-routen-v1.md` 3): normale Kämpfe in jedem Run nur **jeder dritte normale Kampf 1 aus 3** (seit der Act-Karte, vorher jede dritte Stage)
  (sonst werden die Karten sofort zu Ash; auch in Run 1, Timo 15.10.2026), Elites, Gatekeeper und
  Bosse immer. Die DPS-Pfeile auf den Karten misst der
  Training Dummy.
- Ember Coal und Runes fallen **passiv** in den Beutel (Elite 1–2 Ember Coal, Boss 4–6, normale Gegner 5 % auf 1; Economy-Audit 26.10.2026: vorher Elite 2–3 und 15 %, seit Längere Runs gab es Coal im Überfluss).
- **Ember Shrine** nach Stage 5 und 10, nach zufälligen Elites auf Fight-Knoten und als Shrine-Knoten der Act-Karte (nur in Acts, die in diesem Run noch nicht geschafft sind):
  1 aus 3 **Stolen Fire Boons**.
- Boss: zusätzlich **Boss Hoard** (15 % auf eine Trophy des eigenen Wardens, ab Run 4; vorher 10 %) und sein **Echo** für das Heirloom.
- **Act-Beute** (`notes/laengere-runs/act-beute-entwurf-v1.md`, Timo 21.10.2026): jeder Act hat eine **Home Rune**
  (Ashen Fields Bark, Rotwood Thorn, Ember Wastes Ember, Frost Peaks Rime, Storm Spires Volt, Void Rift Venom,
  Emberfall Dusk). Dort ist jede 5. Rune die Home Rune (Kampf, Cache, Smoldering Altar), Volt und Dusk jede 10. und
  nur von Elites, Gatekeepern, Bossen und Caches; die Anzahl Runes bleibt gleich. **Home Uniques** fallen im eigenen
  Act 3-mal so oft (Ashen Fields Ashwalkers, Rotwood Barkhide Bulwark und Mossgrown Mail, Ember Wastes Cinderwick).
  Eldrin zeigt beides im Act-Text, der Cache-Knoten nennt die Home Rune.
- **Hunts** (`notes/hunts-entwurf-v1.md`, Längere Runs Phase 4, Timo 21.10.2026): jeder Gegner hat einen
  **Trail**, gezählt in Kills, die das Prestige überstehen (Elite/Gatekeeper 3, Champion 5, Hunt-Knoten ×2, ein
  geflohener Thief zählt nicht). Jeder Gegner hat zwei **Hunt Affixes** (`content/src/hunts.ts`). Die Affix-Ranges
  bestimmen weiter Item Tier und Item Level; nur das Hunt Affix des besiegten Gegners wird mit dem Trail besser:

  | Trail | Act 1 | Act 2–6 | Act 7 | Thief | Warden (Siege) | Lohn |
  |---|---|---|---|---|---|---|
  | I · Tracked | 10 | 5 | 5 | 3 | 1 | Bestiary-Seite, einmal 25 Acorns |
  | II · Hunted | 25 | 15 | 10 | 8 | 3 | ein Hunt Affix sicher auf einer Karte jedes Item-Picks nach einem Sieg über ihn; einmal 2 Ember Coal; Warden: Trophy-Chance 25 % statt 15 % |
  | III · Cornered | 100 | 60 | 40 | 20 | 6 | das Hunt Affix rollt in der besten Qualitätsstufe, die das Item Level erlaubt |
  | IV · Apex | 300 | 200 | 100 | 60 | 15 | das Hunt Affix rollt als Greater Affix (Rang I–V, 110–150 %); Endgame |

  Der Kampf zeigt den Trail unter der Gegner-Plakette, ein neuer Trail läuft als Pfotenspur durch die Arena (nicht
  bei Skip) und kommt danach als Notification; die Karte mit dem Hunt Affix trägt ein Band mit der Trail-Marke,
  und die Affix-Zeile behält ihr Brandzeichen dauerhaft (`AffixRoll.hunt`, weg nach Reforge oder Temper). Jeder
  Fight- und Elite-Knoten vor dem Boss kennt seinen Gegner schon beim Würfeln der Karte; die Weg-Karten zeigen ihn mit
  Trail und Kills (ungesehene Gegner als Schatten), damit man gezielt jagen kann. Der Ember Thief kann weiter
  dazwischenkommen, ob ein Fight zum Elite wird, bleibt offen. Das
  **Bestiary** ist eine Collection am Hearthfire (voll, wenn jeder Gegner Cornered ist; Belohnung Pelz-Banner im
  Camp), Eldrin zeigt die Trails des gewählten Acts. Gemalte Trail-Marken: Icon Sheet 11.

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
- Pflicht nach dem Sieg über den Boss des neuesten Acts. Wer noch farmen will, wählt am **Warden's Gate** Wander
  (oder macht Retreat/Revisit).
- **Es bleibt alles** außer dem Act-Fortschritt (Gear, Inventar, Supply Wagon, Level, Währungen, Punkte, Codices).
- **Man bekommt:** einen neuen Act · eine Mastery-Wahl (Haupt-Mastery vertiefen oder Tier I einer anderen) · die nächste Battle-Plan-Sprosse ·
  +2 Skill Points · +2 Attributpunkte · ein höheres Level Cap und Level-Band · bei Prestige 2, 4 und 6 einen weiteren
  Keystone-Platz · ab Prestige 1 die Draughts (Iron, Ward, Vigor; Element-Draughts beim ersten Sieg über ihr Element).
- **Ablauf** (Timo 26.10.2026): zwei Screens. **Victory** vor dem brennenden Act, dann **The Harvest**: ein Fenster mit
  der Mastery-Wahl links und „You gain" rechts (neuer Act, Level Cap, Skill/Attribute Points, Battle-Plan-Sprosse,
  Keystone-Platz, Draughts, Ember Penalty in Rot), jede Zeile mit Tooltip. „Let It Burn" führt direkt ins Camp,
  die Attributpunkte verteilt man danach im Character Sheet.

### 2.6 Finale und Endgame ✅
- **The Last Ember** (nach dem 7. Prestige): 7 Stages ohne Loot und Level-Ups. Stage 1–6 sind die **Warden-Echos** der
  Acts 1–6 (Echo n hat n Boss-Fähigkeiten, Stärke steigt von 60 % auf 90 %), Stage 7 ist der **Harvester's Core** (100 %,
  härtester Kampf). Nach jedem Echo 1 aus 3 Boons. Tod: zurück zum Eingang, beliebig viele Versuche. Ziel: 3–5 Anläufe.
- **Wildfire I–X** (nach dem Finale): Ein gewählter Act brennt erneut auf einer Stufe. Monster Level 92 (I) bis 110 (X).
  Mehr Legendaries und Runes, keine Shrines. Ziel: I–V schafft jeder Build, VI–VII mit Gear-Farmen, VIII–X nur über
  Min-Maxing (`endgame-balance-v1.md`). Pro Stufe bis V +8 % Life, +6 % Schaden; darüber +20 % Life und +25 % Schaden
  pro Stufe (Schritt 7, vorher +35 % Life, +8 % Schaden: VI–VII waren zu leicht).
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
| **Kaelen** | Trainer | Ash Tree, Heirloom, Battle Plan (jeder Respec kostet Acorns). Sein **Training Dummy** steht links vom Feuer und ist ein eigener Klickpunkt im Camp (Schaden/s nach Quelle, Items live anprobieren; Timo 19.10.2026) |
| **Thoric** | Blacksmith | Upgrade (Tier, mit Phoenix Feathers), Reforge (Ember Coal), Salvage (→ Ash, lehrt den Trigger Codex und den Power Codex) |
| **Liora** | Mystic | Temper (einen Affix-Wert neu würfeln), Kindle (Trigger aus dem Trigger Codex bauen), nach The Last Ember **Awaken, Shift, Intensify** (Greater Affixes), **Ember Crucible** (gelernte Powers binden) |
| **Nyssa** | Runesmith | Add Socket, Socket Rune, Combine Runes, Runeword Codex |
| **Marisha** | Black Market | Gamble (Zufalls-Item für einen Slot). Odds wie die Karte eines normalen Gegners im Run, Legendary/Unique so oft wie auf der Karte eines Elites (Timo 26.10.2026; vorher eine Rarity-Stufe über den Drops) |
| **Eldrin** | Scout | **The Road**: Act-Wahl, Omen, Wildfire, Draught, **Bounties** (ein optionaler Auftrag pro Zug), The Last Ember, Set Out |
| **Old Nan** | Hearthkeeper | Ratschläge, Compendium, **Reset** von Attributen und Ashborn (für Acorns; neu verteilt wird im Character Sheet) |

- **Hearthfire** (Legacy): Worn Gear, **Collections** (Trophy Wall, Runeword Codex, Trigger Codex, Bestiary: links Fortschritt
  und Belohnung, rechts die gewählte Sammlung im Detail) und Lineage, alles, was das Feuer übersteht.
- **Wer ab wann dabei ist** (`notes/camp-personas-freischalten-v1.md`, Timo 27.10.2026): ab Start nur Old Nan, Thoric,
  Eldrin (plus Hearthfire, Supply Wagon). Die anderen trifft man unterwegs, jedes Treffen ist ein **Story Blip**
  (gemaltes Portrait, eine Zeile, ein Knopf, einmal pro Save): **Kaelen** + Training Dummy nach dem ersten
  gewonnenen Waymark-Kampf (kommt zu spät), **Marisha** beim dritten Treffen auf ihrem Karten-Knoten (bis dahin auf
  jeder Karte sicher, drei kleine Szenen; ihr Camp-Gamble erst danach), **Liora** nach dem ersten Act-Boss, **Nyssa**
  nach dem ersten gewonnenen Kampf in Rotwood. Wer einmal dabei ist, bleibt über jedes Prestige.
- **Bedienung:** Ein Klick auf eine Persona öffnet ihr Fenster; Hover zeigt ein Namensschild. Personas, die noch nicht
  zur Karawane gestoßen sind, stehen erst im Camp, wenn sie da sind. Marker über den Köpfen
  zeigen wartende Punkte (Heir: Attribute Points, Kaelen: Skill/Mastery Points) und eine fertige Bounty (Eldrin „!“).
  Unten im Camp stehen nur die Act-Leiste und Set Out; braucht der Zug noch ein Omen, öffnet Set Out Eldrins Fenster.
- **Werkstätten** (Thoric, Liora, Nyssa, Marisha): links die Persona mit Spruch und ihren Diensten als Kacheln, in der
  Mitte die gemalte Werkbank (Anvil, Altar, Rune Table) mit Now → After, rechts Paperdoll und Tasche; bei Marisha
  liegt das zuletzt gegamblete Item auf der Mystery Crate. Ein Item kommt per Klick,
  Rechtsklick oder Ziehen auf die Werkbank; Kosten stehen als Währungs-Icons vor dem Knopf, Salvage wird gehalten.
  Jede Arbeit hat einen kurzen Effekt (Funken, Licht, Runenglühen, Münzen).
- **Kaelen**: der Battle Plan sieht aus wie die Skill-Leiste im Kampf, ohne Dropdowns. Slot anklicken, rechts aus der
  Bibliothek wählen (oder einen Skill auf den Slot ziehen); Modifier sitzen als Sockel unter dem Slot, „Fires at Heat“
  ist ein Regler am Heat-Balken, Bedingungen sind kleine Schilder. Unten läuft „One rotation“ als dunkle Kampf-Leiste.
  Respec und Forget werden gehalten.
- **Compendium** (Timo 27.10.2026): Old Nans Buch mit acht Kapiteln (The Journey, The Fight, Your Heir, Loot, Enemies,
  Gifts of the Road, The Camp, Beyond the Harvest). Ein Kapitel klappt beim Anklicken seine Seiten auf, die
  Pfeiltasten blättern. Die Seiten sind kurz und benutzen die gemalten Icons (Währungen, Stats, Attribute, Runes …).
- **Old Nan** spricht in einer Dialog-Box (Hades): großes Porträt, ihr Spruch, Antworten mit Zifferntasten
  („Tell me more.“, Compendium, die Resets mit Acorn-Preis, „Farewell.“). Ein Reset fragt einmal nach.
- **Title Screen** und **Class Select** stehen vor dem nächtlichen Camp; Menu und Settings sind Fenster im selben Rahmen.
  Class Select (19.10.2026): links die drei Klassen, in der Mitte die gewählte Klasse, die mit ihrer Startwaffe Kaelens
  Training Dummy schlägt, darunter die Waffen als gemalte Bretter. Rechts Class Trait, die Waffe (Innate, Speed,
  Power), ihre drei Heirloom-Paths als „Playstyles“ (Schadensart + Ailment) und die drei Masteries; Erklärungen
  stehen im Hover. Danach die 6 freien Attributpunkte. Der Heir hat **keinen Namen** mehr: überall steht der Titel.
  Die Combat Lab gibt es nur mit `?dev` in der Adresse.

- **Supply Wagon:** gemeinsamer Stash aller Charakter-Slots. Währungen bleiben pro Charakter. Großer Stash links,
  Paperdoll und Tasche rechts (wie PoE); Details beim Hovern, Rechtsklick oder Ctrl+Klick schiebt ein Item hinüber.
  Der Stash hat **4 Tabs** (I-IV, je 10×10): Q/E oder Klick wechselt, ein gezogenes Item öffnet den Tab, über dem es
  schwebt; Rechtsklick legt in den offenen Tab, Sort ordnet nur diesen. Getragene Ausrüstung geht per Rechtsklick,
  Ctrl+Klick oder Ziehen direkt in den Stash (ist der offene Tab voll, zieht Rechtsklick sie in die Tasche aus).
- **Intermission:** steht in der Arena des Acts (der Heir wartet dort, Wetter läuft weiter). Links der Heir (Life,
  Flask, Battle Plan), in der Mitte die Wahl des Moments (Beute, Shrine, Pfad), rechts der Weg (Up Next, Bounty); bei
  der Item-Wahl steht dort die Paperdoll. Character und Skill Tree öffnen als Fenster über der Arena.
- **Notifications:** kleine Karten oben rechts (Tooltip-Look, gemaltes Icon, Titel + eine kurze Zeile), über jedem
  Screen, 4,5 s (Hover hält sie, Klick schickt sie weg), höchstens 3 zugleich, eigener Sound-Schalter. Sie kommen für
  Bounty done (Turn in at Eldrin), Waymark, Hearth Embers, einen neuen Trail, Ashborn-Level, eine neue oder stärkere
  Echo, eine neue Trophy (wenn ihre Karte aufgedeckt wird) und einen neuen Weapon Rank (Mastery-Punkt bei Kaelen).
  Keine für Währungen, Items oder Runes (die haben eigene Drop-Animationen) und keine Erinnerung an offene Punkte.
- **Draughts** (ab Prestige 1, `draughts-einfuehrung-v1.md`, Timo 27.10.2026): Liora braut sie, gewählt wird bei
  Eldrin. Vor dem Aufbruch wird eine Flask-Ladung plus ein paar Acorns (3 normale Kills auf Boss-Level des Runs,
  `killPrice`) zu einem Draught, der bis zur Rückkehr wirkt. Ohne genug Acorns wird nichts gebraut. Iron +25 % Armor,
  Ward +25 % Barrier, Vigor +10 % Life kommen mit Prestige 1 (Story Blip von Liora). Fire/Frost/Storm/Void (+20 %
  Resistance und +5 % max) lernt Liora, sobald der Heir zum ersten Mal einen Gegner besiegt, der mit diesem Element
  zuschlägt (Fire ab Act 1, Void ab Rotwood, Cold ab Act 4, Lightning ab Act 5); dazu eine Notification
  „New Draught". Nicht gelernte zeigt die Auswahl gar nicht (Timo); im Tooltip stehen die Boni als Stichpunkte.
- **Bounties** (`bounties-v2-plan.md`, Timo 27.10.2026): Eldrin bietet für den gewählten Act **zwei**
  Bounties an, man nimmt eine oder keine. Das Angebot bleibt gleich, bis man eine Bounty einreicht oder das nächste
  Prestige kommt. Nicht im Wildfire und im Finale. Wander behält die Bounty, eine erfüllte bleibt erfüllt (auch nach
  Tod), gescheitert ist sie einfach weg. Solange eine erfüllte nicht eingereicht ist, gibt es keine neue.

  | Bounty | Ziel | Bonus im Cache |
  |---|---|---|
  | Elite Hunt | 2 Elites (Act 1–3), 3 Elites (ab Act 4); **Gatekeeper zählen nicht** | 4–6 Ember Coal |
  | Trail Hunt | 4–8 Kills auf den Gegner des Acts, dessen nächster Trail am nächsten ist (so viele Kills, wie ihm fehlen); die Karte bekommt einen Hunt-Knoten mehr für ihn | +5 Trail-Kills, eine Karte trägt sicher sein Hunt Affix |
  | Thief Chase (ab Act 2) | den Ember Thief fangen, bevor er flieht (Thief ×5 häufiger, Thief's Trail auf der Karte) | 4 Karten, 2 nehmen |
  | Dry Throat | den Boss schlagen, ohne auf diesem Zug aus der Flask zu trinken | alle Karten eine Rarity höher (im Boss-Fenster des Runs) |

  Einreichen bei Eldrin öffnet **Eldrin's Cache**: die **Home Rune** des Acts (Volt und Dusk nur zu 25 %, sonst eine
  Rune wie am Cache-Knoten), ein **Item-Pick 1 aus 3** in Elite-Qualität auf Boss-Level des Acts (Home Uniques ×3) und
  der Bonus. Rune, Coal und Trail-Kills gibt es sofort, die Karten warten im Eldrin-Fenster; was nicht genommen
  wird, wird zu Ash. Die Act-Karte markiert die Knoten, die für die Bounty zählen. Der Autopilot nimmt Bounties
  (Trail Hunt vor Elite Hunt vor Thief vor Dry Throat), die CLI zeigt sie pro Run.

### 2.8 Währungen ✅

| Währung | Zweck |
|---|---|
| **Acorns** | universell: Respec, Sockets, Runes, Gamble |
| **Ash** | aus Salvage und nicht gewählten Items; Crafting-Grundstoff |
| **Ember Coal** | Reforge, Kindle |
| **Phoenix Feathers** | Item-Upgrade um ein Tier (Bosse) |
| **Runes** | Sockets und Runewords |
| **Cinderglass** | nur aus dem Wildfire (Boss 1–2, +1 je 3 Peril, +1 ab VIII): Greater Affixes |

- **Preise in Kämpfen** (Economy-Audit, Timo 26.10.2026, `economy-audit-v1.md`): Acorn- und Ash-Preise
  zählen in normalen Kills auf dem Item Level (bei Resets auf dem Boss-Level des Runs), so wachsen Einnahme und Preis
  gleich, egal wie lang ein Run ist. Temper 1 Kill Acorns + 6 Kills Ash; Add Socket 2 Kills Acorns + 3 Kills Ash × neue
  Socket-Zahl; Upgrade 1 Feather + 1 Kill Acorns × Tier; Socket Rune ¼ Kill × Rang; Combine Runes ½ Kill × Rang;
  Kindle 6 Kills Ash + 2 Coal; Respec von Tree, Attributen und Heirloom 8 Kills; Capstone-Wechsel 2 Kills; Crucible 20
  Kills Ash. Gamble war schon 60 + 12 × Item Level (≈ 6 Kills). Reforge bleibt 1 Ember Coal, Ashborn-Reset 2.000
  (nur auf Level 100, ≈ 10 Kills). Die Balance-CLI zeigt pro Run, was ein eifriger Crafter von den Einnahmen des
  neuesten Acts ausgibt.

---

## 3. Held: Level, Attribute, Punkte

### 3.1 Level ✅ (`level-v2.md`)
- Max Level 100. **Level Cap pro Run** = Boss-Level des Runs + 10: **20, 30, 40, 55, 70, 85, 100**.
- Monster-Level-Band pro Run endet bei **10, 20, 30, 45, 60, 75, 90**. **Die ganze Welt brennt neu**
  (`neuausrichtung-v1.md` 5.1): Ab Run 2 beginnt Act 1 **5 Level unter dem Level Cap des vorigen Runs**
  (15, 25, 35, 50, 65, 80), das Band steigt gleichmäßig über alle Stages bis zum neuen Boss. So droppt jeder Act
  aktuelles Gear.
- Jedes Level: **+4 % Base Life, +3 % Weapon Damage** (zusammen ~+7 % Kampfkraft). Sonst nichts.
- XP-Malus: −4 % pro Level über dem Gegner bis +5, danach −10 % pro Level (min. 10 %).
- Ein Level kostet **6,75 × (1,6 + 0,07 × (Level − 1))** normale Kills gleichen Levels (×1,5 mit dem Warden's Gate,
  noch einmal ×1,5 in Phase 5): Die Wände verlangen ihr Level, und das Level braucht Zeit.
- **Level-Malus** (Timo 19.10., mild): Ein Gegner über dem Level des Helden trifft +4 % härter pro Level Abstand,
  höchstens +40 %. **Elites, Gatekeeper, Champions und Bosse: +10 % pro Level, höchstens +100 %** (Timo 21.10.,
  Phase 5: weit unter dem Level gewinnt die Wand das Rennen, nah dran entscheidet das Gear) (im Wildfire nur bis Level 100 gerechnet, Timo 22.10.: Monster-Level über 100 kann niemand wegfarmen). Das Gegner-Level steht dann rot, der Tooltip
  nennt den Aufschlag.
- Level ist der **sichere, langsame Hebel** gegen eine Wand; Gear der schnelle, glücksabhängige.

### 3.2 Attribute ✅ (`attribute-v1.md`)
- Sechs Attribute, Skala **1–10** (Gear hebt bis 12). Bei der Erstellung: Klassen-Array + 6 freie Punkte (max. 7).
  Jede Harvest: +2 Punkte. Zurücksetzen bei Old Nan für Acorns, neu verteilt im Character Sheet.
- **Breakpoints bei 4, 7 und 10** schalten je einen Perk frei (nur eigene Punkte zählen). Ziel (Timo 21.10.2026): ein
  sichtbarer Moment oder Rhythmus, der zur Rolle des Attributs passt, keine weiteren Prozent-Werte; erstrebenswert,
  aber kein Build stirbt ohne ihn. Phase 5: Armorbreaker macht jeden 4. Angriff zum Mighty Hit, Mighty Hits geben Sunder (statt Crits), Stoneguard nur noch Heavy Attacks −25 % (kein Block-Bonus mehr),
  Barrier Burst ersetzt Spellfire.

| Attribut | Wirkung pro Punkt | Perks 4 / 7 / 10 |
|---|---|---|
| **Strength** | +6 % Armor; Hauptattribut des Cinderguard: +8 % Damage | Armorbreaker (jeder 4. Angriff ist ein Mighty Hit, Mighty Hits geben Sunder) / Stoneguard (Heavy Attacks −25 %) / Titan |
| **Dexterity** | +2 % Evasion; Hauptattribut des Ashstrider: +8 % Damage | Quick Reflexes / Ember Dance / True Shot |
| **Intelligence** | +8 % Barrier; Hauptattribut des Emberseer: +8 % Damage | Attuned / Elemental Surge / **Barrier Burst** (bricht die Barrier, trifft sie mit 50 % der max. Barrier im Element der Waffe, setzt sicher ihr Ailment; wieder, wenn sie voll war) |
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
| Fire | **Burn** | 22 %/s für 4 s, halbiert die Heilung des Gegners | **Combust**: Fire-Treffer auf Brennende lösen 25 % des Rest-Burns aus, höchstens so viel wie ein normaler Burn (4 s) noch macht (Schritt 7) |
| Void | **Corruption** | 9 %/s, wächst pro Tick (+25 %, bis 12×), 6 s | **Collapse**: bei vollem Wachstum 4 s Schaden auf einmal, zurück auf halbes Wachstum |
| Cold | **Chill** | −25 % Attack Speed und Heat Gain, 2 s (mit Ailment Effect bis −40 %) | – |
| Lightning | **Shock** | +10 % erlittener Schaden pro Stack, bis 3 Stacks, 3 s (mit Ailment Effect bis +50 %) | – |

- **Ailment Effect** (statt Ailment Duration, `ailments-v2.md`): stärkere DoTs, stärkeres Chill und Shock, nicht
  längere Ailments. Längere Dauer gibt es nur als Regel einzelner Nodes. Immolate löst Combust dreifach aus.
- **Stun** (Schritt 7): hält den Gegner an, sein laufender Angriff pausiert und geht danach weiter. Nur die Stuns des
  Mace-Paths Quake (Technique Jolt) lassen ihn von vorn anfangen. Vorher setzte jeder Stun den Angriff zurück, und
  Frost Nova alle paar Sekunden machte Cold-Caster zu den leichtesten Builds.
- **Ailments aus Gear-Triggern** (Venom Sting und Co., Schritt 7) wachsen wie Waffen-Ailments aus dem Treffer vor
  Crit und More und zählen für den Treffer, der sie ausgelöst hat (Budget: Waffenanteil).

- **Crit Damage ist fest 150 %** (nur Crit Chance skaliert; Ausnahmen über einzelne Keystones).
- **Schadensformel mit festen Töpfen** (Timo 2026-10-19, `balancing-neustart-v1.md` Schritt 2):
  Treffer = Basis (Waffe/Spell × Skill) × (1 + Increased aus Gear/Attributen) × (1 + **More**) × Crit × Armor/Resistance
  × Damage Taken. Alle „X % more“ aus Ash Tree, Mastery, Heirloom, Keystones und Class Trait **addieren sich** in
  einem Topf; nur Abzüge („10 % less“) multiplizieren. Overcharge und Arcane Conduit zählen in den More-Topf.
- **DoTs** wachsen aus dem Treffer **vor** Crit, More und Damage Taken. Sie haben einen eigenen, additiven
  **DoT-Topf** (DoT-Boni, Boni des einzelnen Ailments, bedingte Ailment-Boni, Lingering). Cash In legt Skill
  Damage in diesen Topf, statt ihn zu multiplizieren.
- **Skill Level** (Schritt 7): Spells und Angriffs-Skills wachsen gleich, +10 % Basisschaden pro Skill Level über 1
  (Spells vorher +20 %; Spells verfehlen nie und streifen nie).
- **Sunder** (Debuff, senkt Armor stapelnd) ≠ **Physical Penetration** (ignoriert Armor pro Treffer).

### 4.3 Defense

| Layer | Quelle | Regel |
|---|---|---|
| **Armor** | Gear, STR | Reduktion = Armor / (Armor + 20 × Angreifer-Level), max. 90 % |
| **Evasion** | Gear, AGI | weicht Angriffen aus (max. 50 %); **Deflect**: Spells mit derselben Chance halbiert (nur Held) |
| **Barrier** | Caster-Basen, Affix „Warded“, INT (+8 %/Punkt) | voll bei Kampfbeginn, lädt immer 3 %/s, nach 3 s ohne Treffer 10 %/s (Timo 2026-10-19: vorher 1,5 s/20 %, Emberseer in Akt 2–3 zu sicher) |
| **Block** | Shield | stoppt 50 % des Treffers, max. 75 % Chance |
| **Parry** | nur Heirloom (Sword: Winter-Path, Keystone Perfect Parry) | ein gegnerischer Angriff (kein Spell) wird zum Glancing Blow: halber Schaden, keine Trigger des Gegners; max. 30 % |
| **Resistances** | Gear, Draughts | Cap 75 %; **Ember Penalty** −10 % pro Prestige bis −60 % |
| **Tenacity** | Gear, VIT | kürzere Ailments auf dem Helden |
| **Heilung** | Lifesteal (nur Treffer), DoT-Heilung (nur aus DoT-Nodes), Heal-Trigger, Barrier | keine Life Regeneration. DoT-Heilung ist knapp (Schritt 7, vorher bis zu 3× so viel): Mastery-Node 3 % (Ravager, Trickster, Warlock), Ash Tree Venom 3 %, Void 1 % plus Keystone Pact of Ash 3 %, Heirloom 3–8 %, Uniques 2–8 %, Boons 1,5–3 %, Ashborn 0,2 %/Punkt |

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
- **Heat-Kosten** fallen durch Rabatte nie unter **50 %** der eigenen Kosten (Timo 2026-10-19). Nur ausdrückliche
  Gratis-Regeln (Whirl, Ignition, Vigil, Master of Quake) gehen darunter.

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
  und schreibt den Innate um (Name, Typ, Ailment). Ohne Punkt gilt der erste Path. **Attunement** (Wand und Staff,
  Phase 5): Das Element der Default Attack (und von allem, was „das Element deiner Waffe“ nimmt: Overcharge, Barrier
  Burst) ist frei unter den drei Path-Elementen wählbar, kostenlos im Camp bei Kaelen; Default „wie der Path“. Path,
  Innate und Path-Nodes behalten ihr Element. Mastery-Skills sind „infused“ und
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
- **Barbed Arrow** (Bow-Innate vor dem Heirloom, Schritt 5): 180 % (vorher 100 %, das schwächste Innate pro Heat;
  der Bow brauchte in Act 1 6,5 Versuche, Crossbow und Dagger 4,4). Die Formen Hooked Arrow 180 %, Toxic Arrow 2 × 90 %,
  Split Arrow 3 × 65 % ziehen mit. **Siege Engine** (Crossbow-Keystone): kein fester Bolzen-Takt mehr; der kostete
  bei Steady Heat (nur aus Treffern) auch die Skills und unterm Strich bis 70 % Schaden.
- **Innate Skills:** Power Strike (Sword), Skull Crack (Mace), Lacerate (Axe), Envenom (Dagger), Barbed Arrow (Bow),
  Heavy Bolt (Crossbow), Shockbolt (Wand), Void Orb (Staff); der Path benennt sie um (Wand: Voidbolt, Frostbolt; Staff: Fire Orb, Frost Orb).
  Jeder Innate gibt Heat laufend aus (Angriff oder Spell).
- **Innate-Level** (Schritt 4, 19.10.2026): Das Innate steigt mit der Waffe, +1 Level pro **Weapon Grade** (Crude 1,
  Honed 2 … Exalted 5). Vorher blieb es auf Level 1, während jeder andere Skill über Ränge wuchs; die Waffe fiel im
  Endgame unter 10 % des Schadens.
- **Rampage** (Axe-Keystone, Schritt 4): +2 % pro Bleed-Tick (vorher 1 %), auch auf den Bleed selbst; Start −10 %
  (vorher −20 %). Vorher verstärkte er nur Treffer, obwohl Butcher fast alles über Bleed macht, und kostete Schaden.

### 5.2 Mastery ✅ (`klassengeruest-v1.md` 5)
- Ersetzt die Prestige-Äste. Jede Klasse hat drei Masteries, eine pro Stil: **Burst** (große Treffer, Skills, Heat
  ausgeben), **Tempo** (viele schnelle Treffer, Default Attack, On Hit), **Ailment** (Chance, Stärke, Dauer). Jede
  passt zu allen drei Paths der Klassenwaffen.
- Die **erste Harvest** wählt die Haupt-Mastery (Tier I: Titel, Mastery-Skill, Keystone). Jede weitere Harvest vertieft
  sie (bis **Tier V**) oder nimmt Tier I einer anderen. Eine Tier kostet 8 / 5 / 6 / 4 / 4 Skill Points; Keystone II
  und III heißen Greater und Supreme, jede tiefere Tier gibt dem Mastery-Skill einen Rang.
- Neue Bausteine: Skill Damage, Ailment Chance, Ailment Duration, „Crits setzen dein Ailment“.
- **Cash In** (Burst, Timo 19.10.2026): Der Burst-Skill (Earthsplitter, Deadly Aim, Arcane Blast) beendet nach seinem
  Treffer alle DoTs auf dem Gegner und macht 150 % ihres Restschadens auf einmal, als Treffer (Lifesteal greift, Skill
  Damage zählt). Grund: Fast jeder Build macht den Großteil seines Schadens über Ailments; Burst hat vorher nur
  Skill-Treffer verstärkt und lag klar hinter Tempo und Ailment. Ailment lässt die DoTs laufen, Burst löst sie ein.
  **Earthsplitter** (Schritt 4): löst nur das Ailment der eigenen Waffe ein, und zwar **vor** seinem Treffer, der es
  danach neu setzt. Vorher löste er alles ein (auch Gear-Poison), und Vanquisher lag 2× über den anderen Masteries.
- **Element-Angriffe** (Schritt 4): Waffenkämpfer bekommen im Ash Tree je einen Angriff pro Element, auf dem Weg zu
  den Element-Notables: Searing Blow (Flame, 160 % Fire, setzt immer Burn), Storm Strike (Storm, 3 × 70 % Lightning,
  je 50 % Shock), Frost Strike (Frost, 240 % Cold, setzt immer Chill). Sie ersetzen die Reise-Nodes Ember Ash, Steady
  Mind und Still Mind (Spielstand-Version 10 zieht gelernte Punkte um). Seit Schritt 5 schießen auch die
  Element-Builds des Ashstrider damit (vorher warfen Fire-, Storm- und Frost-Bögen Cleave und Rend mit Bleed).
- **Deadly Aim** (Deadeye, Schritt 5): wie Earthsplitter, löst nur das Ailment der eigenen Waffe ein, vor dem Treffer,
  der es danach sicher neu setzt. Vorher beendete er auch Gear-Poison und die Poison-Stapel der Venom-Paths.
- **Hit and Run** (Skirmisher, Schritt 5): 4 × 65 % (vorher 55 %), der Skirmisher lag einen Versuch hinter dem Trickster.
- **Arcane Blast** (Archmage, Schritt 6): wie Earthsplitter und Deadly Aim, löst nur das Ailment der eigenen Waffe ein,
  vor dem Treffer, der es danach sicher neu setzt. Vorher beendete er Burn und die Corruption-Rampe.
- **Warlock** (Schritt 6): Malediction setzt das Ailment 2× so stark (vorher 2,5×), Lingering 1 %/s bis 20 % (vorher
  2 %/s bis 30 %), Dark Pact +10 % DoT (+10 % je Stufe, vorher +25 %), Soul Drain eine Tier später (tauscht mit
  Withering). Der Warlock lag klar vor Archmage und Spellweaver; jetzt gebaut wie Ravager.
- **Endless Night** (Staff-Keystone, Schritt 6): Corruption hält 3× so lang (vorher 10×), −30 % Treffer. Mit Cash In
  zahlte der Archmage sonst 60 s Corruption auf einmal aus. **Pyre:** Burn +40 % und 20 % kürzer (vorher +60 %, 40 %).
- **Schritt 7** (gemeinsame Systeme): Lingering (Warlock) bis 10 % (vorher 20 %); Foul Play (Trickster) +20 % DoT
  (+10 % je Stufe) wie Ravage. Die Ailment-Masteries waren die leichtesten, vor allem über DoT-Heilung (siehe 4.3).
  **Spark** (Wand Starfall, ersetzt Amplify): nach einem Skill ist die nächste Default Attack geladen, 30 % mehr Schaden
  und setzt sicher das Ailment der Waffe. Vorher gab keine Klasse den Spark, Flashpoint und Master of Starfall liefen leer.
  **Jolt** (Mace Quake): Stuns halten 10 % länger und lassen den Gegner seinen Angriff neu beginnen (siehe 4.2).
- **Innate-Namen** (Timo 20.10.2026): Das Staff-Innate heißt Void Orb (nicht mehr Void Bolt, zu nah am Voidbolt des
  Void-Wands); die Lance-Form des Wand heißt Spear.
- **Smolder** (Staff, Timo 19.10.2026): Cinders +40 % Burn-Schaden (war 25 %), Master of Smolder +35 % (war 20 %), weil
  derselbe Held mit Hollow 10–35 % mehr Schaden machte.
- **Twin Cast** (Spellweaver, Timo 19.10.2026): Twin Sparks (jede 4.) und Endless Weave (jede 3.) zählen Aktionen statt
  Angriffe: eine Default Attack schlägt noch einmal zu, ein Rotation-Skill wird gratis noch einmal gewirkt (zählt nicht
  für Overcharge). Grund: Warming-Waffen sammeln Heat pro Sekunde, mit viel Heat Gain ist fast jede Aktion ein Skill;
  auf dem Staff liefen die Default-Attack-Nodes des Spellweavers sonst ins Leere.
- Die Masteries wachsen an einem Notable aus dem Ash Tree, jede Klasse erreicht ihre drei nach 7/9/9 Nodes
  (Vanquisher: Brutal Force, Ravager: Flayer, Skirmisher: Red Tide, Deadeye: Searing Steel, Trickster: Venom Heart,
  Archmage: Deep Freeze, Warlock: Hollow Crown; Berserker und Spellweaver wachsen als untere Äste links und rechts aus
  dem Stamm, an Unbreakable und Shield Wall). Der Held trägt in der Arena die Aura seiner Haupt-Mastery.
- Titel = Name der Haupt-Mastery.

### 5.3 Ash Tree ✅ (`klassengeruest-v1.md` 6, `level-v2.md` 7, `neuausrichtung-v1.md` 4)
- Tab bei Kaelen: **Ash Tree**. Er **stützt und schützt** den Build, den Heirloom und Mastery gewählt haben.

| Teil | Inhalt |
|---|---|
| **Krone** | eine Region pro Damage Type mit Ailment: Steel (Physical, Stun), Blood (Bleed), Venom (Poison), Flame (Burn), Storm (Shock), Frost (Chill), Void (Corruption). Die 19 Skills für den Battle Plan liegen hier |
| **Stamm** | Verteidigung für alle: Block, Resistances, Iron Bastion, Shield Wall/Shield Bash, Retaliation, Unbreakable, Iron Will, Keystone Juggernaut |
| **Wurzeln** | Heat und Rotation: Heat from Hits Taken (Battle Scars, Unbroken), Rally, Battle Trance, Refund, Stoked, Keystones Glass Focus, Grand Strategy, Arcane Conduit |

- Der Baum ist wie ein echter Baum geformt (Timo 2026-10-19, kein Riesenrad): die Kronen-Regionen sitzen gestuft an
  Ästen über dem Stamm (Steel und Void unten, Blood/Frost, Venom/Storm, Flame oben am Leittrieb), der Stamm trägt nur
  Rinde (keine Zweige, kein Laub), die Wurzeln hängen am mittleren Notable des Stamms (Iron Will). Laub nur in der
  Krone; Rinde, Stammfuß und Laub sind gemalt (`design/notes/ash-tree-art-v1.md`).
- **Leiter am Leittrieb** (Timo 2026-10-19, kürzere Wege): der innere Travel-Node jeder Kronen-Region sitzt am
  Leittrieb, wo ihr Ast abgeht; links und rechts auf gleicher Höhe sind verbunden, jede Seite mit der Sprosse darüber,
  unten hängt der Hub des Stamms (Heartwood). Von jedem Klassen-Start ist jede Region in höchstens 5 Schritten
  erreichbar (vorher bis 8 über den Ring). Die äußeren Ring-Brücken zwischen Nachbar-Regionen entfallen.
- Stamm und Wurzeln sind von Hand gelegt: alle Stamm-Nodes im Stamm, kein Weg durch das Sigil, die Wurzel-Nodes auf
  den gemalten Wurzeln (Taproot links, damit der Weg von Iron Will am Sigil vorbeiführt), die tiefen Keystones an
  dünnen Wurzeln darunter. Jeder Node hängt an Holz: kein Ast schwebt.
  Jede Region: Hub, drei Speichen (drei Nodes, dann ein Notable oder eine Gabel), ein Travel-Node am Leittrieb, eine
  Ward-Knospe und ein Rune Socket. 21 Skills, 13 Keystones, 12 Gabeln.
- **Keine Region ist gesperrt.** Ailment-Nodes verstärken nur Ailments, die man setzt („Your Poisons …“).
- **Klassen-Start:** Cinderguard bei Steel, Ashstrider bei Venom, Emberseer bei Void.
- **Hoheitsgebiete** (`neuausrichtung-v1.md` 2): Travel-Nodes geben nur Defense (Life, Armor, Barrier, Evasion,
  Tenacity; im Stamm auch Block und Resistances). **Notables** sind bedingt oder haben eine Regel; Conversion
  (Searing Steel, Arcane Edge, Void Ember) öffnet Hybride.
- **Keystones tauschen nie Schaden gegen Überleben** (Timo 2026-10-19): kein „+X % Schaden genommen“, „Life ×0.8“
  oder „keine Barrier“. Die Kosten bleiben auf derselben Achse (Unyielding: Barrier lädt nicht nach; Juggernaut,
  Glass Focus, Skirmish, Bastion, Glass Cannon: Skills kosten 20 % mehr Heat; Grand Strategy: Default Attack −15 %;
  Elemental Overload: Treffer −10 %; Vanishing Act: −10 % Precision). Glass Cannon behält die Barrier und schlägt mit
  15 % davon zu. Deep Cuts (Sword): Bleed aus Crits ist 60 % stärker (vorher verdoppelte jeder Crit den laufenden
  Bleed ohne Grenze).
- **Keystones** kosten 3 Skill Points und einen Keystone-Platz (1, +1 bei Prestige 2/4/6, max. 4): Final Mercy,
  Unyielding (Steel), Blood Price, Blood and Bile (Blood), Slow Death (Venom), Black Flame (Flame), Spellblade (Storm),
  Elemental Overload (Frost), Pact of Ash (Void), Juggernaut (Stamm), Glass Focus, Grand Strategy, Arcane Conduit
  (Wurzeln).
- **Rune Sockets** (9, einer pro Region): ein gelernter Socket nimmt bei Kaelen eine Rune aus dem Beutel und gibt ihre
  **Web-Wirkung**. Herausnehmen oder Vergessen legt die Rune zurück in den Beutel. **Jede Rune nur einmal** im Ash
  Tree (Timo 2026-10-19).

### 5.4 Items ✅ (`item-system-v1.md`, `legendary-runes-v1.md`)
- **Slots:** Off Hand, Helm, Body Armor, Gloves, Boots, Belt, Amulet, 2× Ring, **Charm** (nur Trigger-Affixe).
  Off Hand passt zur Waffe: Shield oder Blood Talisman (Melee), Quiver (Bow/Crossbow), Focus oder Grimoire (Wand/Staff).
  Start-Off-Hand nach Waffe: Sword/Axe/Mace Round Shield (Axe seit Schritt 4, Timo 20.10.2026), Dagger Blood Talisman (+5 % Ailment Effect, +2 % Lifesteal),
  Bow/Crossbow Quiver, Wand Ember Focus, Staff Grimoire (+10 % Ailment Effect).
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
  Ember), **Ember** (Ailments, Heat, Trigger, Regeln; offen nach Wildfire V). Binden kostet die Ash von 20 Kills auf Boss-Level des Runs und 3 Ember Coal,
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
- **Gegner-Plakette:** nur der Name als Titel; Typ als gemaltes Icon (Name beim Hovern), Rang als gemalte Marke +
  Wort (ELITE, CHAMPION, GATEKEEPER, BOSS), Modifier als Chips darunter.
- **Ember Thief:** seltener Gegner, der wegläuft; fängt man ihn, gibt es Beute.
- **Bosse:** pro Act einer mit Phasen und Signatur-Mechanik. Jedes Prestige gibt jedem Boss eine Fähigkeit dazu.
- **Defense der Gegner:** Armor wächst mit dem Monster Level (×0,27 pro Level), dazu **10 % All Resistance** für
  jeden Gegner, so viel wie Armor von einem Physical Hit wegnimmt: Physical und Elemental kommen gleich schwer durch
  (Klassengerüst-Balance; vorher 30 %, das bremste jeden Element-Path). Act-Gegner mit Element-Thema haben 10–15 %
  in ihrem Element (Schritt 7, vorher 20–25 %: Element-Builds hingen im passenden Act, Cold in Act 4, Fire in Act 3).
  Emberfall (Act 7) hat 10 % All Resistance (vorher 15 %), der Harvester 15 %; die Ash Revenant trifft Physical, so
  stehen dort zwei Physical- und zwei Fire-Gegner.
- **Skalierung** (`balancing-neustart-v1.md` Schritt 3): Das Monster Level bestimmt die Grundwerte über **eine
  Tabelle** (`MONSTER_TABLE`), gemessen am Autopilot-Helden: Monster-Life wächst wie der Schaden pro Sekunde des Helden,
  Monster-Schaden wie seine effektive Life (`npm run balance -- --act 7 --build all --mastery all --curve 1`). Dazu
  nur noch:
  - **Stage-Art** (überall, auch Finale und Wildfire): normal Life ×1,4; Elite Life ×2 (Schritt 4); Gatekeeper
    Life ×2,2; Boss Life ×3, Schaden ×0,75. Champions +30 % Life.
  - **Wand** im neuesten Act (Timo 19.10.: länger über Life, Run 1 darf fordern): Boss Run 1 Life ×3,25, Schaden ×2,6;
    ab Run 2 Life ×3,5, Schaden ×6 (Schritt 7, vorher ×3/×3,5 und ×4,5/×6: Bosse machten 58 % der Tode, Bosskämpfe
    im neuesten Act ab Act 4 dauerten 136–200 s). Davor steigt der Act im **Sägezahn** (`neuausrichtung-v1.md` 5.3): normale Stages 15 → 30 %, 25 → 35 %,
    30 → 40 % der Wand, die **Gatekeeper** auf Stage 5 und 10 (sicherer Elite) sind Spitzen mit 40 % und 45 %. Ein Gatekeeper braucht 4 Stages
    Anlauf für seine volle Spitze, sonst anteilig (Schritt 7: Emberfall hat 10 Stages, Gatekeeper auf Stage 3 und 7, der
    erste stand nach 2 Stages schon voll da und war der häufigste Tod in Act 7).
  - Der Harvester trifft mit 45 % eines Bosses seines Levels (seine Phasen tragen sechs Boss-Mechaniken; Schritt 7,
    vorher 50 %).
  - Boss-Runde Schritt 7: Cinder Tyrant Fire Aura 0,45–0,7 (vorher 0,6–0,9), Enrage +30 % Attack Speed (vorher +50 %);
    Rime Warden Ice Barrier bei 75/50/25 % Life je 10 % (vorher 15 %).
  - Entfallen: Run Pressure, Kampfdauer- und Boss-Life-Faktoren, Elite-Faktoren, Harvester-Anteil, `endgameBoss`.
  - Ziele im neuesten Act (Balance-CLI, `--newest 1`): **etwa 5 Anläufe** (Timo, 12.10.: Richtwert, mit Runes), Tode Boss 35–55 %, Gatekeeper 20–30 %, Elites 10–20 %,
    normal 5–15 %; Kampfdauer normal 20–30 s, Elite 35–50 s, Gatekeeper 45–70 s, Boss 60–100 s.

---

## 7. Balance-Ziele ✅ (`balance-grundlagen-v1.md`, `endgame-balance-v1.md`)
- Keine One-Shots (Heavy-Hit-Deckel 35 %). Jede Klasse hat eine Defense, die den ganzen Kampf hält.
- Wände sind Stat-Checks, in die man über Level und Gear hineinwächst. Ein guter, aber schwächerer Build aus dem
  Autopilot-Ranking schafft jede Wand mit bis zu +10 Level.
- Resistance ist eine Entscheidung (Ember Penalty). Kein Magic Find, Gold Find oder XP %.
- Messung immer mit der Balance-CLI: 24 Autopilot-Builds (einer pro Heirloom-Path, `--build all`), mit
  `--mastery all` je Build alle drei Masteries der Klasse; mehrere Seeds, Vorher/Nachher im PR.
- **Stand Schritt 7** (20.10.2026, `balancing-neustart/schritt7-ergebnis.md`, alle 72 Paare, Seeds 41/51 × 2 Läufe):
  im neuesten Act 3,9 Versuche (Cinderguard 3,9, Ashstrider 4,2, Emberseer 3,5), Tode 4/18/21/57 % (normal/Elite/
  Gatekeeper/Boss), 9 h bis Ende Run 7. The Last Ember 2,9 Versuche. Wildfire I–V 1–3 Versuche, VI–VII etwa 2,5,
  VIII–X schafft der Autopilot nur selten (15/7/wenige %). Waffenanteil im Budget C/A/E 40/35/20 %. Alle Builds:
  `build-karten-v1.md`.
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
  Up Next, Old Nans Sprüche, Trophy Wall, Trigger Codex und das Compendium (noch nicht gesehene Seiten und Kapitel stehen dort als „Locked“, ohne Namen).
- **First Steps (Release 1.0):** Old Nan sagt neuen Spielern beim ersten Mal je einen kurzen Satz (Camp, Road, erster Kampf,
  Skill Points, Item Pick, Tod, Rückkehr ins Camp). Jeder Tipp kommt einmal pro Browser, „No more tips.“ oder Settings → Tips schaltet sie ab.
  Nur UI. Dazu Absturzschutz („The fire flickered“ mit Reload), Versionsnummer im Titel und Menü und Credits („Kindled by Cedust“).

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
| `entschlackung-v1.md` | Währungen, Personas, Bounties, Keystone-Limit | gültig (Bounties siehe `bounties-v2-plan.md`) |
| `bounties-v2-plan.md` | Bounties v2: Angebot 1 aus 2, Katalog, Eldrin's Cache | gebaut |
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
| `elites-routen-v1.md` | Elite-Modifier pro Act, Champions, Routen, Item-Picks, Training Dummy | gebaut (Routen durch die Act-Karte ersetzt) |
| `merkliste-spaeter.md` | Ideen für später | gemerkt |
