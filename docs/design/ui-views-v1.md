# UI Views – v1 (Übersicht)

Stand: 30.09.2026, Thread "UI Views". Look und Farben: `ui-look-v1.md`. Alle Mocks im Design-Canvas: https://claude.ai/artifact/1MGju8Hgdz1UZxuv6Vv773 (alte Boards "Kampf"/"Sieg" am 01.10.2026 entfernt)
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen · 🧪 im PoC
Spielsprache bleibt **Englisch** ✅: alle Beschriftungen, Buttons und Texte im Spiel sind englisch.

---

## 1. Act-Lauf (Kern-Loop)

| View | Inhalt | Status |
|---|---|---|
| **Battle** 🧪 | Kern ✅: Hero- und Enemy-Plaque mit VS-Medaillon, große Sprites, Heat-Bars, Schadenszahlen, Skill Slots. **Kein Inventar im Battle** ✅. Act-Fortschritt als **Leiste** ✅. Inhalt Fight/Intermission/Overlays: siehe `battle-view-v1.md` 💡 | in Arbeit |
| **Victory / Rewards** 🧪 | Automatische Belohnungen (Gold, Dust, XP) → Item-Auswahl 1 aus 3 (Equip / Take, Salvage All) → ggf. Spoils-Auswahl. | ❓ Platzierung neu |
| **Zwischen den Stages** 🧪 | Ember Flask nutzen, Attributpunkte verteilen, Retreat, nächste Stage. | ❓ |
| **Death** 🧪 | Kurzer Screen "Ashbound": Asche, zurück ans Hearthfire. Death Recap später hier. | 💡 |

## 2. Held & Build

| View | Inhalt | Erreichbar | Status |
|---|---|---|---|
| **Character** 🧪 | Mock v1 im Canvas (Board "Character Overlay"), Details unten in Abschnitt "Character-Overlay v1". | Battle: Overlay per Hotkey ✅. Camp: Klick auf den eigenen Heir ✅ | 💡 Mock v1 |
| **Skill Tree** 🧪 | Core + 4 Grundäste + Prestige-Äste, Keystones (Harvester's Ember), Punkte-Anzeige. Erst ab Kaelen (nach Act 1) zugänglich ✅. | Battle: Overlay per Hotkey (nur ansehen?) ❓. Camp: beim Trainer Kaelen ✅ | 💡 Layout |
| **Battle Plan** 🧪 | Rotation Slots (Reihenfolge, Trigger Threshold), Reaction Slots (Bedingung, Cooldown), Slot Modifiers, Heat-Kosten. Erst ab Act 2 relevant (in Act 1 nur der Start-Skill) ✅. | Camp: bei Kaelen, zusammen mit dem Skill Tree 💡. Battle: Overlay nur zum Ansehen 💡 | 💡 Layout |
| **Item Tooltip / Compare** 🧪 | Komponente, kein eigener View: Rarity-Rahmen, Affixe, Trigger, Requirements, Vergleich mit getragenem Item. | überall | 💡 |

## 3. Camp

**Camp Hub** ✅: gemalte Szene, Personas stehen um das Hearthfire und sind anklickbar. Das Hearthfire ist ein **eigenes Objekt**, Old Nan eine eigene Person ✅.

| Klickziel | Öffnet | PoC |
|---|---|---|
| **Hearthfire** | **Legacy** ✅: Heirlooms, Save Tokens, Legacy Seals, Harvester's Ember, Prestige-Stufe (alles, was den Brand übersteht). | 🧪 (einfach) |
| **Eigener Heir** | Character ✅ | 🧪 |
| **Old Nan** (Hearthkeeper) | Dialog, Story, **Compendium** (How to Play) ✅, **Ember Flask** (Upgrades, Flask-Modifier) ✅, Prestige-Text | 🧪 (Dialog, Compendium) |
| **Thoric** (Blacksmith) | Upgrade (Tier), Add Socket, Salvage | 🧪 |
| **Liora** (Mystic) | Reforge (Affix-Lock), Temper, Imbue, Distill | 🧪 |
| **Marisha** (Merchant) | Base Items, Gamble | später |
| **Kaelen** (Trainer) | Skill Tree, Battle Plan 💡, Respec, Capstone wechseln | 🧪 nach Gorrak |
| **Eldrin** (Runesmith) | **Socket Runes** ✅, Runes kombinieren, Runeword Codex | später |
| **Nyssa** (Scout) | Act Preview, Revisit Act, schaltet **Next Enemy** in der Intermission frei ✅ | später |
| **Supply Wagon** | Stash ✅ (Timos Idee, passt zur Story: "Der Stash ist der Supply Wagon") | 🧪 |
| **Weg aus dem Camp** | Nächsten Act starten, Button **"Set Out"** ✅ | 🧪 |

💡 Alle Persona-Views teilen ein Layout: Porträt + Spruch links, Aktion in der Mitte, Inventar rechts.

## 4. Meta

| View | Inhalt | PoC |
|---|---|---|
| **Title / Main Menu** | Logo, Continue, New Game, Settings | 🧪 (einfach) |
| **Settings** | Light/Dark/System, Audio (Flask-Schwelle entfernt, Playtest 1). **Kein Loot-Filter** ✅ (Timo 01.10.2026: nur 3 Karten pro Pick, Normal Items bleiben dank Sockets/Runewords bis ins Endgame nützlich) | 🧪 (einfach) |
| **Prestige** | Sieg → Harvester-Text → Save Tokens auf Slots verteilen (das Harvesting beginnt) ✅ → Asche → Old Nan → Belohnungen wählen: neuer Ast, Battle-Plan-Upgrade, Ember. Kein "Point of no return"-Hinweis vor dem Kampf ✅ | 🧪 (light) |
| **Compendium** | How to Play, Stats, Ailments, Mechaniken nachschlagen. Über Old Nan ✅ | 🧪 (einfach) |
| **Runeword Codex** | Entdeckte Runewords, dauerhaft | später |
| **The Last Ember** | Battle-View im Finale-Look + Stolen-Fire-Auswahl (Variante der Loot-Karten) | später |
| **Ending / Credits** | Hearthfire mit allen 10 Heirlooms | später |

---

## Entschieden ✅ (30.09.2026)
- Camp als gemalte Szene, Personas um das Hearthfire zum Anklicken.
- Build-Views: im Battle als Overlay per Hotkey, im Camp über Klickziele (Heir/Hearthfire → Character, Kaelen → Skill Tree).
- Act-Fortschritt als Leiste.
- Nächster Mock: Camp Hub. v1 steht als Artboard "Camp Hub" im Mock-Canvas.
- Skill Tree erst ab Kaelen (nach Act 1), Act-1-Punkte sammeln sich an. Kein "self-taught" am Hearthfire.
- **Start-Skill:** 1 pro Waffe, automatisch ausgerüstet. Weitere Skills aus dem Tree ab Act 2.
- **Battle Plan** ist erst ab Act 2 relevant.
- **PoC-Ablauf:** Act 1 bis Boss Gorrak. Der Sieg zählt im PoC als Prestige light (1 Save Token, Rotation Slot 2). Danach Camp mit Kaelen und Liora, Skillpunkte verteilen, wieder ab Stage 1 von Act 1. Act 2 gibt es im PoC nicht.
- **Old Nan:** Compendium (How to Play) und Ember Flask (Upgrades, Modifier). Keine eigene Alchemist-Persona.
- **Hearthfire = Legacy-View.**
- **Eldrin sockelt Runes** (zusätzlich zu Combine Runes und Codex). Runes aus Act 1 (Gorrak) wartet man bis Eldrin nach Act 2.
- **Heir-Darstellung** 💡 (Claudes Vorschlag): fester Körper, sichtbar wechseln nur Weapon und Off Hand, Rüstung höchstens als Rarity-Schimmer. Gleiche Figur in Battle und Camp.

## Offene Fragen ❓
1. ~~Battle Plan bei Kaelen bestätigen~~ ✅ (Timo, 01.10.2026)
2. **Battle-Umfeld:** Was wird rund um die Arena angezeigt (Fortschrittsleiste, Life/Flask, Gold, Buttons)? Eigene Runde.

## Character-Overlay v1 💡 (01.10.2026)
Drei Spalten in einem Panel über dem abgedunkelten Screen:
- **Equipment** links: Paperdoll mit 10 Slots um eine Silhouette (PoC: 5). Rarity-Rahmen, Tier-Kürzel, **◆-Marke für versiegelte Slots** (Save Token, übersteht Prestige). Klick zeigt Details.
- **Attributes + Stats** Mitte: 6 Attribute mit Wert und ihren zwei Effekten, "+"-Buttons. Punkte gelten erst nach **Confirm** ✅, davor **Undo** (später nur Respec bei Kaelen). Stat-Sheet in Tabs **Offense / Defense / Heat** ✅, DPS-Schätzung oben.
- **Inventory** rechts: D2-Grid 10×4 mit Belegung ("23 / 40"), darunter Detailkarte des gewählten Items mit Vergleich zum getragenen, Buttons **Equip** und **Salvage (+Dust)**. Wallet unten.
- **Im Fight** (per C): Kampf pausiert, Banner "Fight paused · View only", Attribute und Equip/Salvage gesperrt. In Intermission und Camp alles aktiv.

## Kaelen: Skill Tree + Battle Plan v1 💡 (01.10.2026)
Ein Screen bei Kaelen mit zwei Tabs, Board "Kaelen: Skill Tree + Battle Plan" im Canvas. Kopfzeile: Skill Points, Harvester's Ember, Gold, **Respec** (Gold), zurück ins Camp.
- **Skill Tree:** Core in der Mitte (Start-Node + Ring), Grundäste diagonal (Might, Arcana, Affliction, Rupture), Prestige-Äste hängen außen an ihrem Grundast (Warden unten am Core). Node-Formen: Minor (klein rund), Notable (groß rund), Skill (Raute), Keystone (Quadrat, Ember-Farbe). Lernbare Nodes haben gestrichelte Verbindungen. Lernen wie bei Attributen: **pending → Confirm / Undo**. Rechts Detailkarte und Fortschritt je Ast. Im PoC nur Core + Might + Arcana.
- **Battle Plan:** Rotation Slots als große Karten (gesperrte mit "Unlocks at Prestige X"), je Slot **Fires at**-Regler (ab Prestige 2). Reaction Slots darunter mit Condition-Auswahl und Cooldown. Rechts **Known Skills** (Start-Skill + gelernte Skill-Nodes): Slot wählen, dann Skill. Darunter die Battle-Plan-Upgrades je Prestige. Unten **One rotation** ✅ (Variante B, Timo 01.10.2026): Kette aus Skill-Chips und **Flammen-Symbolen** ohne Text und ohne Zeiten (Timo). 1/2/3 Flammen = kurze/mittlere/lange Wartezeit auf Heat. Feuern zwei Skills direkt nacheinander, steht ein grünes **+** statt Heating dazwischen. Falls zu unruhig: Variante A (immer 1 Flamme).

## Prestige-Ablauf v1 💡 (01.10.2026)
Board "Prestige Flow" im Canvas, drei Schritte:
1. **Victory:** Vollbild, der Harvester zerbirst, sein Spruch ("You didn't kill me, little Heir. You harvested me."). Button "Hold On to What Matters".
2. **Seal** ("The Harvest Begins"): Paperdoll, Seals als Rauten oben (z. B. 4 von 5 gesetzt). Die Seals vom letzten Mal sind vorbelegt und lassen sich umsetzen. Unversiegelte Slots sind abgedunkelt mit Flamme. Rechts Detailkarte mit "Seal This Slot" / "Remove Seal", darunter **Burns** und **Stays**. Button **Let It Burn**, ohne Warnung (Prestige ist Pflicht, kein Point of no return).
3. **Inheritance:** Old Nan mit ihrem Prestige-Text links. Rechts die Belohnungen als Karten (Seal, Ember, Battle-Plan-Upgrade, Level Cap, Dust, Monsterlevel) und die **Wahl des neuen Asts** (1 aus den noch fehlenden) ✅ (Timo 01.10.2026: Ast-Wahl hier im Prestige, Kaelen verteilt nur Punkte). Button **Wake at the Hearthfire** führt ins Camp vor Act 1.
PoC-Variante: Gorrak statt Harvester, 1 Seal auf 5 Slots, Belohnungen Seal 1, Rotation Slot 2, Kaelen und Liora kommen ins Camp. Keine Ast-Wahl.

## Persona-View v1 💡 (01.10.2026)
Board "Persona: Thoric + Liora" im Canvas. Gemeinsames Layout für alle Crafting-Personas, drei Spalten:
- **Links:** Porträt, Name, Rolle, Spruch, darunter die Aktionen der Persona als Liste (Thoric: Upgrade, Add Socket, Salvage. Liora: Reforge, Temper, Imbue, Distill).
- **Mitte, Werkbank:** Item **Now → After** nebeneinander. Feste Ergebnisse zeigen den genauen Wert (Upgrade +25 %, Socket 1/2), zufällige den Bereich ("+4–8% Attack Speed") oder "?" (Reforge). Bei Temper und Imbue klickt man das Affix an; nach dem ersten Eingriff ist es **"Locked in"**, die anderen Affixe sind gesperrt bis zum Reforge. Imbue zeigt die Essences als Chips. Unten Kosten, Grund für Sperren ("Only Normal items can get Sockets") und der Aktions-Button. **Kein Undo** ✅ (Timo 01.10.2026), das Ergebnis erscheint als Zeile darüber.
- **Rechts:** getragene Items als Kacheln und das Inventar-Grid. Stash nur am Supply Wagon. Wallet in der Kopfzeile.
- **Salvage nur aus dem Inventar** ✅ (Timo 01.10.2026), getragene Items erst ablegen.

## Stash (Supply Wagon) v1 💡 (01.10.2026)
Board "Supply Wagon (Stash)" im Canvas. Drei Spalten: links getragene Items und Inventar (10×4), Mitte Stash (10×10, feste Größe, Button **Sort**), rechts Detailkarte mit Vergleich zum getragenen Item und den Aktionen **Move to Stash / Move to Inventory / Equip / Unequip**. Equip legt das alte Item dorthin zurück, wo das neue lag. Passt es nicht, wird blockiert ("No room"), nie zerstört. Im Spiel verschiebt Ctrl+Click direkt. **Salvage nur bei Thoric** ✅ (Timo 01.10.2026).
**Abgebrannt** (nach Prestige, bis zur ersten Rückkehr ins Camp): Stash-Bereich mit Brand-Overlay und Thorics Spruch, Move to Stash gesperrt.

## Legacy, Death, Meta v1 💡 (01.10.2026)
Neue Boards in der dritten Reihe des Canvas:
- **Legacy (Hearthfire):** Das Hearthfire in der Mitte, die 10 Slots im Kreis darum. Versiegelte Slots zeigen ihr Heirloom (◆, Glühen), leere sind gestrichelt. Links Kennzahlen (Generation, Seals, Harvester's Ember frei/verbraucht, Level Cap, Äste, Battle Plan, was sonst bleibt). Rechts Details zum Heirloom ("Sealed since Generation 2") und die **Chronicle**: pro Generation, welcher Slot versiegelt und welcher Ast gewählt wurde. Nur ansehen, Seals setzt man im Prestige.
- **Ashbound / Retreat:** Asche-Bildschirm mit Ort, Gegner und "Back to Camp", Old Nans Spruch, Platzhalter für den späteren Death Recap, Button "Wake at the Hearthfire". Retreat nutzt denselben Screen mit eigenem Titel und Spruch.
- **Title, Settings, Compendium:** Title mit Logo, Continue (zeigt Generation, Act, Stage), New Game, Settings, Quit. Settings: Theme, Damage Numbers, Audio. Compendium bei Old Nan: Themenliste links (How to Play, Heat and Rotation, Attributes, Ailments, Items and Rarity, Death and Prestige), Artikel rechts.
