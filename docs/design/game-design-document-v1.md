# Game Design Document – v1

**Titel:** Emberheir · **Stand:** 28.09.2026 · **Genre:** Auto-Battler mit Rogue-Lite-, Prestige- und ARPG-Loot-Elementen

Dieses Dokument fasst alle Entscheidungen zusammen. Details stehen in den Einzeldateien im selben Ordner (siehe Anhang).
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen / im PoC prüfen

---

## 1. Vision

Ein Held kämpft automatisch, der Spieler kämpft nie selbst. **Alle Entscheidungen stecken im Build:** Ausrüstung, Affixe, Skill Tree und die Reihenfolge der Skills. Das Itemsystem nach Vorbild von Diablo 2 ist der Kern des Spiels. Jeder Drop soll spannend sein, auch im zehnten Durchgang.

**Endziel:** Nach **10 Durchgängen** (10 Siege über den Ashen Harvester = 10 Prestiges) sind alle 10 Ausrüstungs-Slots gesichert. Danach folgt das kurze Finale **The Last Ember**. Wer es schafft, hat das Spiel durchgespielt ✅ (30.09.2026).

---

## 2. Game Loop

### Ein Durchgang (Run) ✅
- **100 Stages**, aufgeteilt in **7 Acts**: 6 Acts à 15 Stages, dazu das Finale (Stages 91–100).
- Jeder Kampf ist **1 gegen 1** und läuft automatisch.
- Nach jedem Sieg: XP, Währung und **1 aus 3 Items** wählen. Die zwei anderen werden automatisch zu Salvage Dust.
- Nach Elites, Bossen und Stage 5 und 10 zusätzlich die **Spoils-Auswahl** (1 aus 3 Währungen/Verbrauchsgüter). Details: `loot-rewards-v1.md`.
- Stage 15, 30, 45 … sind **Boss-Stages**. Danach folgt ein **Camp**. Stage 100 ist der finale Boss.
- Keine Zeitraffer-Funktion: Jeder Kampf und jede Loot-Wahl zählt.

### Tod ✅
- Zurück zum **letzten Camp** (Beginn des aktuellen Acts).
- Gear, Level, Skillpunkte, Inventar, Stash und Währung **bleiben**.
- Der Act wird damit zur **Farm-Einheit**: Man spielt ihn, bis man den Boss schafft.
- **Retreat:** Mitten im Act freiwillig zurück ins Camp (wirkt wie ein Tod).
- **Revisit Act:** Aus dem Camp einen bereits geschafften Act gezielt erneut farmen.
- ✅ **Pity:** Nach mehreren Toden im selben Act steigt die Rarity in der Item-Auswahl leicht. Reset, sobald der Boss fällt.
- ✅ **Rarity nach Act** (Playtest 1, 02.10.2026): In Act 1 droppen normale Gegner nur Normal und Magic, Elites Rare, der Boss Epic. Rare droppt frei ab Act-Stufe 2, Epic ab Act-Stufe 3 (Act-Stufe = Act-Nummer + Prestige).

### Prestige ✅
- ✅ **Prestige ist Pflicht** (30.09.2026, Thread "Prestige-Pflicht"): Der Sieg über den Ashen Harvester (Stage 100) löst das Prestige sofort aus. Den Zeitpunkt wählt der Spieler trotzdem selbst: Wer noch farmen oder Items per Ascension Shard upgraden will, macht vorher Retreat oder Revisit Act. Wer gegen den Harvester antritt, tut das mit Absicht. Kein "Point of no return"-Hinweis, das lernt man im ersten Durchgang.
- ✅ **Save Tokens verteilt man am Ende des Durchgangs, wenn das Harvesting beginnt** (direkt nach dem Sieg, vor dem Brand). Wer in Act 1 bei Old Nan landet, findet alles andere schon verbrannt vor.
- **Man verliert:** alles Gear außer den gesicherten Slots, Inventar, Stash, nicht ausgegebene Währung und lose Runes, Act-Fortschritt (damit auch Pity und Distill-Zähler).
- **Man erhält:**
  - **+1 Harvester's Ember** (für einen Keystone) ✅.
  - **+1 Save Token.** Tokens hängen an **Slots**, nicht an Items, und können bei jedem Prestige neu verteilt werden.
  - **+1 Skill-Tree-Ast** nach freier Wahl.
  - **+1 Battle-Plan-Upgrade** (siehe Skills).
  - ✅ **Feste Menge Salvage Dust** als Startbonus, unabhängig vom Inhalt des Stashes. Die Menge steigt mit der Prestige-Stufe (Werte im PoC-Balancing).
- ✅ **Abgebrannter Stash:** Zu Beginn von Act 1 ist der Stash abgebrannt und gesperrt. Er wird bei der ersten Rückkehr ins Camp repariert (Tod, Retreat oder Sieg über den Act-1-Boss).
- Bleibt dauerhaft: Level, Attribut- und Skillpunkte (seit 30.09.2026), Save Tokens, freigeschaltete Äste, Battle Plan, Runeword Codex, freigeschaltete Camp-Personas, Flask-Upgrades ✅, kosmetische Camp-Upgrades, Einstellungen.
- **Schwierigkeit** und **Item Tier** steigen über das **Monsterlevel** ✅, das in jedem Durchgang ein höheres Level-Band hat (siehe Gegner, Skalierung). Act 1 bleibt dabei bewusst einfach.

### Zählweise ✅ (30.09.2026, Thread "Prestige schärfen")
- **Durchgang** (Run) 1–10 ist die Zähleinheit für Spieler und Docs. Ein Durchgang = 100 Stages bis zum Sieg über den Ashen Harvester.
- **Prestige** ist das Ereignis nach jedem Harvester-Sieg (Belohnungen + Neustart). Es gibt **10 Prestiges**: nach den Durchgängen 1–9 mit Neustart, nach Durchgang 10 ohne Neustart, direkt ins Finale.
- **Prestige-Stufe** = Durchgang − 1 (0–9). Mit ihr rechnen Elite-Chance, Level Cap und Level-Band. Schwierigkeit und Item Tier hängen seit 30.09.2026 nur noch am Monsterlevel.
- Das 10. Prestige bringt die letzten Belohnungen (Seal 10, Ember 10, Ast 10, Battle-Plan-Capstone), aber kein höheres Level Cap. Sie werden im Finale genutzt.

### Finale: The Last Ember ✅ (30.09.2026)
- Kein 11. Durchgang mit 100 Stages. Nach dem 10. Sieg zerbirst der Harvester wie immer, aber mit allen 10 Seals kann der Heir den Flammen folgen.
- **Ablauf:** Ein Camp davor (Respec, Capstone und Ast wählen), dann ein kurzer Boss-Gauntlet: **6 Warden-Echos** (die Bosse der Acts 1–6 mit allen Prestige-Fähigkeiten), zum Schluss der **Kern des Harvesters** (seine letzte Flamme).
- **Stolen Fire** ✅: Nach jedem Kampf wählt man 1 aus 3 Boons, die nur für diesen Versuch gelten und den Build verbiegen (à la Hades). Kein Loot, keine Level-Ups, Gear und Tree sind fertig.
- **Tod:** zurück zum Eingang des Finales, beliebig viele Versuche. Heirlooms sind nie in Gefahr ✅ (keine Slot-Sperre).
- Schwierigkeit des Finales: eigener Wert, im Balancing festlegen ❓.

### Warum man nie "stuck" ist
- Der Tod kostet fast nichts. Jeder Versuch bringt mehr Loot und Level.
- ✅ **Act Preview** (Scout: Element, Gegnertypen, Boss-Mechanik des nächsten Acts), gezieltes Crafting (Imbue, Distill), ✅ **act-thematischer Loot**, Revisit Act, Stash, Retreat und Respec geben dem Spieler Werkzeuge, um eine Wand gezielt zu durchbrechen.
- ⏸ **Death Recap** (später, nicht im PoC): Nach einem Tod zeigt ein kurzer Bildschirm, woran es lag (Auswertung des Kampf-Event-Logs, einfache Regeln → Top-3-Hinweise zum Build).
- ✅ **Act 1 ist in jedem Durchgang einfach:** Sein Monsterlevel liegt unter dem Level Cap des vorherigen Durchgangs. Dort kann man im Zweifel nach dem Prestige neues Gear farmen. Erst ab Act 2 zieht die Schwierigkeit an.

---

## 3. Held & Stats

### Attributes ✅ (je zwei Effekte)

| Attribute | Effekte |
|---|---|
| **Strength** | Physical Damage %, Armor |
| **Dexterity** | Crit Chance, Trigger Chance |
| **Intelligence** | Elemental Damage %, All Resistance (klein) |
| **Agility** | Attack Speed, Evasion |
| **Wisdom** | Heat Gain, Ailment Duration |
| **Vitality** | Life, Tenacity |

### Level ✅ (überarbeitet 30.09.2026, Thread "Level-Progression")
- **Level, Attribut- und Skillpunkte bleiben beim Prestige erhalten** ✅. Der Heir erbt, was er gelernt hat. Respec jederzeit beim Trainer gegen Gold.
- **Level Cap:** **20 im ersten Durchgang**, danach **+20 pro Prestige** ✅ (Playtest 1, 02.10.2026; vorher 10/+10) → **Level 200** im 10. Durchgang. Das 10. Prestige hebt das Cap nicht mehr an, im Finale gibt es keine Level-Ups. Der erste Durchgang ist eine leichte, schnelle Einführung.
- Jedes Level gibt **1 Skillpunkt** und automatisch etwas **Base Life** ✅. **Keine Attributpunkte mehr pro Level** (2026-10-09): Attribute laufen 1–10, Punkte nur bei Charaktererstellung und The Harvest, siehe `attribute-v1.md`.
- Jeder Durchgang bringt so 10 Skillpunkte, passend zu einem neuen Prestige-Ast mit ca. 10 Nodes. Am Ende ca. 100 Punkte bei ca. 160 Nodes → man muss sich spezialisieren.
- **Attributpunkte** darf man **zwischen zwei Kämpfen** verteilen ✅ (im PoC testen). **Skillpunkte** nur beim **Trainer** im Camp ✅.
- **Keystones** kosten **Harvester's Ember** ✅: ein Material, das man dem Ashen Harvester bei jedem Sieg über ihn klaut (1 pro Prestige). Im ersten Durchgang gibt es daher keinen Keystone. Nach 10 Siegen hat man 10, der letzte wird im Finale genutzt.
- **XP-Kurve:** Das Cap des Durchgangs erreicht man etwa zu Beginn des Finales (Stage ~91). Die Kurve ist am Anfang steiler (im ersten Durchgang Level 1–5 schon in Act 1). Werte über die Balance-CLI.
- **XP-Regel** ✅: Gegner unter deinem Level geben weniger XP (−10 % pro Level Abstand, min. 10 %).
- **Enemy Level = Level-Band des Durchgangs** ✅: Act 1 liegt knapp unter dem Cap des vorherigen Durchgangs, die Acts 2–7 laufen durch das neue Band (z. B. dritter Durchgang: Act 1 Level 18–20, Acts 2–7 Level 21–30). ✅ **Das Monsterlevel allein bestimmt die Kampfwerte** (30.09.2026), siehe `gegner-bosse-v1.md`, Skalierung.
- **Kein Sonderbonus für Maxlevel** ✅.

### Wichtige Regeln ✅
- **Crit Damage ist fix bei 150 %**, nur Crit Chance skaliert (gegen Power Creep).
- **Block** nur über Shield und Items.
- Kein Magic Find, Gold Find oder XP %.

### Heilung ✅ (Werte im PoC prüfen)
- **Keine Life Regeneration.** Im Kampf heilt man nur über **Lifesteal** (wirkt nur auf eigene Hits, nicht auf DoT-Ticks), Heal-Trigger-Affixe und Barrier-Skills (z. B. Second Wind in einem Reaction Slot).
- **Keine freie Heilung nach dem Sieg.** Life bleibt zwischen den Stages erhalten, ein Act ist ein zusammenhängender Lauf.
- **Ember Flask** (Arbeitsname): eigener Slot, kein Gear, Heilung konkurriert nie mit Damage-Affixen.
  - Startet mit **3 Charges**, jede heilt **35 % Max Life**.
  - Nur **zwischen den Stages** nutzbar, **nur per Klick** ✅ (Playtest 1, 02.10.2026: Auto-drink entfernt).
  - Wird im **Camp voll aufgefüllt**. Keine Charges mehr = typischer Grund für einen **Retreat**.
  - Nachschub im Act: **Flask Charge** als Karte in der **Spoils-Auswahl** (nach Elites, Bossen, Stage 5 und 10), nicht in der Item-Auswahl. Details: `loot-rewards-v1.md`.
  - Später: Upgrades (mehr Charges, stärkere Heilung) und **Flask-Modifier** für den nächsten Kampf (z. B. +20 % Attack Speed, entfernt Ailments, startet mit 30 Heat), über **Old Nan** ✅ (keine eigene Persona, 30.09.2026) oder als Prestige-Bonus. ✅ Flask-Upgrades bleiben beim Prestige erhalten.
- Fallback: Fühlt sich die Zermürbung schlecht an, per Config auf volle Heilung nach jedem Kampf umschalten.

Details: `stat-liste-v2.md`

---

## 4. Damage Types & Ailments ✅

| Damage Type | Element | Ailment | Mechanik |
|---|---|---|---|
| Physical | – | **Bleed** | DoT, stark und kurz, skaliert mit der Höhe des Treffers |
| Physical | – | **Poison** | DoT, stapelt |
| Elemental | Fire | **Burn** | DoT, wird erneuert, reduziert Heilung des Gegners |
| Elemental | Void | **Corruption** | DoT, wird stärker, je länger er läuft |
| Elemental | Cold | **Chill** | verlangsamt Attack Speed und Heat Gain |
| Elemental | Lightning | **Shock** | Gegner erleidet mehr Schaden |

---

## 5. Build-Achsen statt Klassen ✅

Keine feste Klasse. Der Build ergibt sich aus drei Achsen:

| Achse | Pole | Bestimmt durch |
|---|---|---|
| **Damage Type** | Physical / Elemental | Skill Tree, Affixe |
| **Range** | Melee / Ranged | Waffe |
| **Delivery** | Direct / Over Time | Skills, Trigger-Affixe |

Daraus entstehen 8 Archetypen (Warrior, Reaver, Marksman, Hunter, Spellblade, Hexblade, Sorcerer, Warlock).
✅ Range im 1v1: keine eigene Kampfregel (Timo, 05.10.2026). Melee und Ranged unterscheiden sich über Heat-Verhalten, Off Hand, Default Attack und Tree-Nodes.

Details: `klassen-varianten.md`

---

## 6. Items ✅

### Slots
Main Hand, Off Hand, Helm, Body Armor, Gloves, Boots, Belt, Amulet, 2× Ring = **10 Slots = 10 Save Tokens**.
Keine Zweihänder. Die Off Hand passt zur Waffe: Shield (Melee), Quiver (Bow/Crossbow), Focus (Wand/Staff).

### Waffen 💡
Sword, Axe, Mace, Dagger (Melee) · Bow, Crossbow, Wand, Staff (Ranged). Jede Waffe hat eine eigene **Default Attack** (z. B. Slash, Smash, Spark), einen festen Implicit und ein Heat-Verhalten. Jede besetzt ein eigenes Feld aus Damage Type × Range × Delivery. Details: `waffen-v1.md`.

### Heat je Waffe ✅
Die Skill-Ressource heißt **Heat** ✅ (vorher Momentum). Die drei Verhalten heißen **Cooling** (kühlt ab, wenn man nicht trifft), **Steady** (bleibt, wo sie ist) und **Warming** (steigt von selbst mit der Zeit).

| Verhalten | Waffen | Laden | Eigenheit |
|---|---|---|---|
| **Cooling** | Melee | eigene Hits; erlittene Treffer nur über den Skill Tree | kühlt ständig ab, 1 Heat/s ✅ (05.10.2026) |
| **Steady** | Bow, Crossbow | nur eigene Hits | verfällt nie, neutraler Standard |
| **Warming** | Wand, Staff | pro Sekunde, unabhängig von Attack Speed | gleichmäßig |

- Leiste 0–100 für alle. Keystones können das Verhalten später umstellen.
- **Heat per Hit** ist ein Grundwert des Waffentyps (kein Implicit): Ziel-Rate (z. B. 12/s) ÷ Basis-Attacks per Second. So laden alle Waffen im Grundtempo gleich schnell.
- **Heat from Hits Taken** (nur Cooling; beim Held nur über Might-Nodes Battle Scars, Grudge, Unbroken ✅ 05.10.2026): 1 Heat pro 1 % Max Life Schaden, max. 10 pro Treffer. Block und Evade geben nichts.
- **Keine Cast Time.** Attack Speed beschleunigt die Default Attack jeder Waffe, auch bei Castern. Warming-Heat hängt aber nicht davon ab.
- **Sunder** ✅ (Debuff, senkt stapelnd die Armor des Gegners) ist etwas anderes als **Physical Penetration** (Stat des Angreifers, ignoriert Armor pro Treffer).

### Base Items
Basiswerte, Implicit, maximale Sockets, **Attribute Requirements** ✅.

### Tier & Level
- ✅ **Item Level = Monsterlevel** des Gegners, der es droppt.
- ✅ **Item Tier** ergibt sich aus dem Item Level (Level 1–10 = T1, 21–30 = T3 usw.) und bestimmt Basiswerte und Affix-Bereiche. Das Item Level bestimmt, welche Affix-Stufen innerhalb des Tiers rollen. Act 1 droppt deshalb noch das Tier des vorherigen Durchgangs.
- Gesicherte Items können per **Ascension Shard** ein Tier höher gehoben werden. Die Roll-Qualität bleibt erhalten.

### Rarities
| Rarity | Affixe | Besonderheit |
|---|---|---|
| **Normal** | keine | Sockets, einzige Basis für Runewords |
| **Magic** | 1–2, höhere Werte | früh stark |
| **Rare** | 3–4 | Arbeitstier |
| **Epic** | 4–5, garantiert 1 Trigger-Affix | erste Build-Bausteine |
| **Legendary** | 3–4 + feste **Legendary Power** | build-definierend |
| **Unique** | fest | später |

### Affixe
- **Stat Affix** (Zahlen), **Trigger Affix** (Condition → Chance → Effect → Internal Cooldown), **Legendary Power** (regelverändernd).
- Affix-Pools je Slot, Gewichtung je Base.

### Runes & Runewords
Runes geben einzeln kleine Boni. Die richtige Reihenfolge in einem Normal-Item mit passender Socket-Zahl ergibt ein Runeword. Gefundene Runewords landen dauerhaft im **Runeword Codex**.

### Inventar & Stash
- Inventar als Grid wie in Diablo 2, Stash im Camp mit fester Größe (keine zusätzlichen Tabs).
- ✅ Drag & Drop (05.10.2026): Items im Inventar, Stash und auf die Equipment-Slots ziehen. Bei Ringen wählt ein Shortcut-Button (Ring 1 / Ring 2) den anderen Slot für Vergleich und Equip. Salvage nur beim Blacksmith, im Inventar nur **Discard** (gibt nichts).
- Loot-Karten: **Equip**, **Take** ✅. Die nicht gewählten werden automatisch zu Dust. Wer keins will: **Salvage All** 💡. Die Auswahl blockiert nie.
- Beim Prestige werden Inventar und Stash geleert. Dafür gibt es eine feste Menge Salvage Dust, und der Stash ist bis zur ersten Rückkehr ins Camp gesperrt.

Details: `item-system-v1.md`, `town-crafting-v1.md`

---

## 7. Skill Tree ✅

- Gemeinsamer Tree: **Core** plus vier Grundäste
  - **Might** (Physical Direct), **Rupture** (Bleed/Poison), **Arcana** (Elemental Direct), **Affliction** (Burn/Corruption)
- Range steckt in bedingten Nodes ("While wielding a Melee Weapon …").
- Node-Typen: **Minor**, **Notable**, **Skill** (schaltet aktive Skills frei, mehrere Ränge), **Keystone** (Regel mit Nachteil).
- **Prestige-Äste** (frei wählbar, einer pro Prestige): Duelist, Marksman, Butcher, Venomancer, Stormcaller, Frostbinder, Pyromancer, Void Lord, Warden, Tactician.
- Grund-Tree ca. 60 Nodes, Prestige-Äste je ca. 10 Nodes → ca. 160 Nodes, ca. 100 Skillpunkte am Ende. Keystones kosten Harvester's Ember. Skillpunkte verteilt und Respec macht der Trainer gegen Gold.

Details: `skill-tree-v1.md`

---

## 8. Skills & Battle Plan ✅

### Ablauf im Kampf
1. Basic Attacks und erlittene Treffer füllen die **Heat**-Leiste (0–100).
2. Ist Heat ≥ **Trigger Threshold** des nächsten Skills in der Rotation (Default = Cost), **ersetzt der Skill die nächste Basic Attack**.
3. Nur die Cost wird abgezogen, der Rest bleibt.

### Skills
- Types: **Attack**, **Spell**, **Buff**, **Curse**.
- Tags (Element, Delivery, Range, Defensive) für Item-Affixe und Trigger.
- Skill Level = Ränge im Node + Item-Boni ("+1 to Fire Skills").
- Aktive Skills kommen nur aus dem Skill Tree.

### Battle Plan (Skill Bar als Prestige-System)
- **Rotation Slots** laufen der Reihe nach.
- **Reaction Slots** feuern bei einer Condition (Telegraph, Life-Schwelle). Schwellen lösen einmal beim Überschreiten aus, jeder Slot hat eine Abklingzeit, Kosten gehen von derselben Heat-Leiste ab.
- **Slot Modifiers** (z. B. −15 % Cost, Reverb).
- Zielkorridor im Endgame: **4 Rotation + 2 Reaction Slots**.
- Freischaltung: Start 1 Slot → P1 Slot 2 → P2 Trigger Threshold → P3 Slot 3 → P4 Reaction 1 → P5 Modifiers → P6 Slot 4 → P7 Reaction 2 → P8 Conditions für Rotation → P9 2. Modifier → P10 **Capstone** nach Wahl (1 aus 6, beim Trainer wechselbar): Echo, Crescendo, Vigil, Ignition, Lingering Flame, Ember Ward ✅.

Details: `skills-v1.md`

---

## 9. Gegner & Bosse ✅

### Acts
| Act | Stages | Gebiet | Schwerpunkt |
|---|---|---|---|
| 1 | 1–15 | Ashen Fields | Physical |
| 2 | 16–30 | Rotwood | Bleed, Poison |
| 3 | 31–45 | Ember Wastes | Fire |
| 4 | 46–60 | Frost Peaks | Cold |
| 5 | 61–75 | Storm Spires | Lightning |
| 6 | 76–90 | Void Rift | Void |
| 7 | 91–100 | Emberfall | gemischt, Finale |

### Gegner
- Gleiche Regeln wie der Held, inklusive **sichtbarer Heat-Leiste** und 1–2 Skills.
- Archetypen: Brute, Skirmisher, Caster, Afflicter, Warden, Thornback.
- **Elites** mit 1–3 Modifikatoren und besserem Loot.
- **Telegraphs** (Heavy Attack, Curse, Enrage, Heal) sind gleichzeitig Conditions für Reaction Slots.

### Bosse
Ein Boss pro Act mit Phasen und Signatur-Mechanik (Gorrak, Mother of Rot, Cinder Tyrant, Rime Warden, Storm Herald, Voidborn Maw, The Ashen Harvester). Jedes Prestige gibt jedem Boss eine zusätzliche Fähigkeit ✅ (bleibt, das ist Inhalt, kein Zahlenwert).

### Skalierung
- ✅ (30.09.2026) **Das Monsterlevel bestimmt die Werte des Monsters.** Eine einzige Kurve, kein Prestige- oder Stage-Multiplikator mehr.
- Resistance Penetration der Monster steigt mit dem Monsterlevel (ersetzt den Resistance-Malus pro Prestige).
- Elite-Chance hängt weiter am Prestige (plus Act und Stage), die Zahl der Elite-Modifikatoren am Monsterlevel.

Details: `gegner-bosse-v1.md`

---

## 10. Camp & Crafting ✅

| Persona | Aufgabe |
|---|---|
| **Blacksmith** | Upgrade (Tier), Add Socket, Salvage |
| **Merchant** | Base Items, Gamble |
| **Mystic** | Reforge, Temper, Imbue |
| **Trainer** | Skillpunkte verteilen, Respec |
| **Runesmith** | Runes sockeln, Runes kombinieren, Runeword Codex |
| **Scout** | Act-Vorschau, Revisit Act, zeigt ab Freischaltung den nächsten Gegner in der Intermission ✅ |

Personas werden im ersten Durchgang nach und nach freigeschaltet.

**Währungen:** Gold, Salvage Dust, Reforge Stone (garantiert von Elites 2–3 und Bossen 4–6, dazu Spoils; beim Mystic per **Distill** aus Dust mit sich verdoppelnden Kosten je Act ✅), **Essence** (act-gebunden, für Imbue), Ascension Shard.

**Grenzen:** Affix-Lock wie in Diablo 3, Trigger-Affixe nicht per Imbue, Legendary Powers und Runewords unveränderbar.

Details: `town-crafting-v1.md`

---

## 11. PoC-Umfang 💡

**Ziel des PoC:** Beantworten, ob der Kern Spaß macht. Macht es Spaß, zuzuschauen, wie der eigene Build kämpft? Fühlen sich Loot-Entscheidungen und die Rotation bedeutsam an?

| Bereich | Im PoC | Später |
|---|---|---|
| Stages | Act 1 (15 Stages) inkl. Boss Gorrak | Acts 2–7 |
| Prestige | 1 vereinfachtes Prestige (1 Save Token, Slot 2) | volle 10 Stufen |
| Held | alle 6 Attribute, Level, Tod → Camp | – |
| Items | 5 Slots (Main Hand, Off Hand, Body Armor, Amulet, Ring), Normal bis Epic, ~20 Stat- und ~8 Trigger-Affixe | Legendary, Runewords, restliche Slots |
| Waffen | Sword und Wand | restliche Waffen |
| Skill Tree | Core + Might + Arcana, ca. 30 Nodes, je 1 Keystone | weitere Äste, Prestige-Äste |
| Skills | 1 Start-Skill pro Waffe (automatisch ausgerüstet), 3 pro Ast, 2 Rotation Slots, Trigger Threshold | Reaction Slots, Modifiers |
| Gegner | Brute, Skirmisher, Caster, einfache Elites | weitere Archetypen |
| Camp | Blacksmith (Upgrade, Salvage), Mystic (Reforge, Imbue), Trainer Kaelen (Skill Tree, Battle Plan, ab Gorrak), Old Nan (Dialog, Compendium) | restliche Personas |
| Heilung | Ember Flask fest (3 × 35 %), Flask Charges in der Spoils-Auswahl | Flask-Upgrades und Modifier |
| Währungen | Gold, Dust, 1 Essence-Art | restliche |

**Im PoC zu prüfen:**
1. Heilung: Fühlt sich Life-Zermürbung mit Ember Flask (3 × 35 %) gut an, oder doch volle Heilung nach jedem Kampf?
2. Heat-Verhalten: Fühlen sich Cooling (Sword) und Warming (Wand) unterschiedlich und gleich stark an?
3. Kampfdauer (Ziel 30–60 s) und Act-Länge (15 Stages zu lang?).
4. Wie oft stirbt man, bevor man den Boss schafft, und fühlt sich Farmen gut an?
5. Machen Trigger-Affixe den Unterschied, den wir uns erhoffen?

---

## 12. Offene Punkte

- Konkrete Zahlen: Basiswerte, Caps, XP-Kurve (Ziel steht, Werte fehlen), Skalierungsfaktor `k`.
- Uniques.
- Technik: Engine und Plattform.

---

## Anhang: Detail-Dateien

| Datei | Inhalt |
|---|---|
| `loot-rewards-v1.md` | Belohnungen: Item-Auswahl, Spoils, Drops, Reforge-Versorgung |
| `waffen-v1.md` | Waffen, Default Attacks, Heat je Waffe |
| `stat-liste-v2.md` | Attributes, Stats, Ailments, Trigger-Affixe |
| `klassen-varianten.md` | Build-Achsen, 8 Archetypen |
| `item-system-v1.md` | Slots, Waffen, Tiers, Rarities, Affixe, Runes |
| `skill-tree-v1.md` | Aufbau, Node-Typen, Prestige-Äste |
| `skills-v1.md` | Kampfablauf, Skill-Liste, Battle Plan |
| `gegner-bosse-v1.md` | Acts, Archetypen, Elites, Bosse, Skalierung |
| `town-crafting-v1.md` | Personas, Währungen, Crafting, Inventar |
