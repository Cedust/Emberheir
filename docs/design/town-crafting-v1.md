# Camp & Crafting – Entwurf v1

Stand: 28.09.2026. Baut auf `item-system-v1.md` und `gegner-bosse-v1.md` auf.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

## Was schon feststeht ✅

- Am Anfang jedes Acts schlägt die Karawane ein Camp auf. Nur dort kann man Gear craften und upgraden.
- Tod oder **Retreat** führen zurück zum letzten Camp. Gear und Währung bleiben.
- **Revisit Act:** Aus dem Camp kann man bereits geschaffte Acts erneut farmen.
- Crafting umfasst Upgrade (Tier) und Reroll. Respec ist möglich.
- Loot: nach jedem Sieg 1 aus 3 Items wählen.

---

## 1. Camps 💡

- **7 Camps**, eines vor jedem Act. Das erste Camp (vor Stage 1) ist das Start-Camp. Die Personas reisen als Karawane mit (siehe `story-theme-v1.md`).
- In jedem Camp sind dieselben Personas, optisch passend zum Act.
- Personas werden im **ersten Durchgang nach und nach freigeschaltet** (dauerhaft). So lernt man die Systeme Schritt für Schritt.

| Persona | Freigeschaltet | Aufgabe |
|---|---|---|
| **Blacksmith** | von Beginn an | Upgrade (Tier), Sockets, Salvage |
| **Merchant** | von Beginn an | Base Items kaufen, Gamble |
| **Mystic** | nach Act 1 | Affixe: Reroll, Temper, Imbue |
| **Trainer** | nach Act 1 | Respec (Skillpunkte, Attributpunkte) |
| **Runesmith** | nach Act 2 | Runes sockeln ✅, Runes kombinieren, Runeword Codex |
| **Scout** | nach Act 2 | Vorschau auf den nächsten Act, Revisit Act, **Next Enemy** in der Intermission ✅ (dauerhaft freigeschaltet, sobald Nyssa da ist) |

Der Stash ist in jedem Camp über den **Supply Wagon** erreichbar ✅. Den Battle Plan bearbeitet man bei Kaelen, zusammen mit dem Skill Tree 💡 (Thread "UI Views", 30.09.2026).

---

## 2. Währungen 💡

Bewusst wenige, jede mit klarer Aufgabe:

| Währung | Quelle | Nutzen |
|---|---|---|
| **Gold** | jeder Kampf | Merchant, Respec, Grundkosten fürs Crafting |
| **Salvage Dust** | Zerlegen von Items | Crafting-Kosten |
| **Reforge Stone** | Elites, Bosse, **beim Mystic aus Salvage Dust herstellbar** 💡 | alle Affixe eines Items neu würfeln |
| **Essence** (je Typ) | **act-spezifisch** | Imbue: ein Affix gezielt setzen |
| **Ascension Shard** | Bosse, selten Elites | Item um ein Tier anheben |

**Essences sind act-gebunden:** Fire Essence droppt in den Ember Wastes, Tenacity Essence im Rotwood usw. Damit liefert jeder Act die Werkzeuge für seine eigene Frage, und **Revisit Act** bekommt einen klaren Zweck.

**Auto-Salvage:** Die zwei Items, die man bei der Loot-Auswahl nicht nimmt, werden automatisch zu Salvage Dust. Kein Loot ist verschwendet, und es gibt kein Inventar-Chaos.

---

## 3. Crafting-Aktionen 💡

| Aktion | Persona | Wirkung | Kosten |
|---|---|---|---|
| **Upgrade** | Blacksmith | +1 Tier, Roll-Qualität bleibt ✅ | Ascension Shard + Gold |
| **Add Socket** | Blacksmith | +1 Socket bis zum Maximum der Base (nur Normal) | Dust + Gold |
| **Salvage** | Blacksmith | Item → Salvage Dust | – |
| **Reforge** | Mystic | alle zufälligen Affixe neu würfeln (inkl. Trigger). Bleibt: Base, Tier, Rarity, Sockets, Legendary Power. Hebt den Affix-Lock auf | Reforge Stone |
| **Temper** | Mystic | Wert **eines** Affixes neu würfeln (im Bereich) | Dust + Gold |
| **Imbue** | Mystic | **ein** Affix durch einen gewählten Typ ersetzen | passende Essence |
| **Buy Base** | Merchant | Normal-Items mit Sockets kaufen (Runeword-Basen) | Gold |
| **Gamble** | Merchant | zufälliges Item für einen gewählten Slot | viel Gold |
| **Socket Rune** ✅ | Runesmith | Rune in einen freien Socket setzen (Reihenfolge zählt für Runewords) | Gold 💡 |
| **Combine Runes** | Runesmith | 3 gleiche Runes → 1 höhere | Gold |
| **Respec** | Trainer | Punkte neu verteilen | Gold, steigend pro Durchgang |

### Grenzen, damit Items nicht "perfekt" gecraftet werden 💡

- **Affix-Lock (wie der Mystic in Diablo 3):** Sobald man an einem Item Temper oder Imbue auf ein Affix anwendet, kann man danach nur noch **dieses eine Affix** verändern.
- Legendary Powers und Runewords sind nicht veränderbar.
- Trigger-Affixe können nicht per Imbue gesetzt werden, nur Stat-Affixe. Trigger bleiben Loot-Glück und damit spannend.

---

## 4. Prestige und Währung 💡

- Beim Prestige geht nicht ausgegebene Währung verloren (siehe Game Loop). Einziger Ausgleich ist eine feste Menge Salvage Dust als Startbonus (siehe Abschnitt 6).
- Deshalb sind die letzten Camp-Besuche vor dem Harvester-Kampf wichtig (sein Sieg löst das Prestige sofort aus ✅): Man nutzt Ascension Shards, um die Items in den gesicherten Slots auf das nächste Tier zu heben.

---

## 5. Für den PoC 💡

Ein Camp mit Blacksmith (Upgrade, Salvage) und Mystic (Reroll, Imbue). Nur Gold, Dust und eine Essence-Art. Das reicht, um zu testen, ob Crafting Wände durchbrechen kann, ohne das Loot zu entwerten.

---

## 6. Inventar & Stash ✅

- **Inventar:** Grid wie in Diablo 2 (z. B. 10 × 4), Items belegen je nach Typ unterschiedlich viele Felder (Ring 1 × 1, Schwert 1 × 3, Body Armor 2 × 3).
- **Stash:** nur im Camp, größer (z. B. 10 × 10), feste Größe, keine zusätzlichen Tabs ✅.
- Währungen und Runes belegen **keinen** Platz (eigene Leiste bzw. Rune-Beutel).
- **Loot-Auswahl bei vollem Inventar** ✅ (30.09.2026, Thread "UI Views"): Jede Karte hat zwei Optionen: **Equip** (das alte Item geht ins Inventar) und **Take** (ins Inventar). **Equip macht das alte Item nie zu Dust** (Timo). Passt das neue bzw. das alte Item nicht ins Grid, ist der Button gesperrt ("No room", pro Karte geprüft, da D2-Grid). Dann öffnet **Open Inventory** das Inventar, dort kann man Items zu Dust zerlegen und Platz schaffen. Wer keins will, nimmt **Salvage All** 💡.
- **Tod:** Inventar und Stash bleiben.
- **Prestige:** Inventar **und Stash** werden geleert. Sonst könnte man Items im Stash parken und die Save Tokens umgehen.
- ✅ **Ausgleich:** Pro Prestige gibt es eine feste Menge Salvage Dust, unabhängig vom Stash-Inhalt (sonst würde man den Stash vorher vollstopfen). Die Menge steigt mit der Prestige-Stufe.
- ✅ **Abgebrannter Stash:** Zu Beginn von Act 1 ist der Stash gesperrt und wird bei der ersten Rückkehr ins Camp repariert (Tod, Retreat oder Act-1-Boss). Kostet nichts, da er dann ohnehin leer ist.

## Entscheidungen (28.09.2026)

- Blacksmith und Mystic getrennt ✅
- Affix-Lock wie in Diablo 3 ✅
- Auto-Salvage der nicht gewählten Loot-Items ✅
- Trigger-Affixe nicht per Imbue ✅

## Offene Fragen (Stand vor den Entscheidungen)

1. **Blacksmith und Mystic getrennt** (meine Empfehlung, klarere Rollen) oder alles beim Blacksmith?
2. **Affix-Lock** wie in Diablo 3: ja oder nein?
3. **Auto-Salvage** der nicht gewählten Loot-Items: ja oder nein?
4. **Trigger-Affixe nicht per Imbue:** passt das?
