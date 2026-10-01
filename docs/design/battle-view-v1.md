# Battle-View – v1 (Inhalt, noch kein Layout)

Stand: 30.09.2026, Thread "UI Views" (Runde 2 mit Timos Antworten eingearbeitet). Grundlage: `skills-v1.md` (Battle Plan, Reaction Slots), `gegner-bosse-v1.md` (Gegner-Heat, Telegraphs, Elites, Bosse), `loot-rewards-v1.md` (Item- und Spoils-Auswahl), GDD (Ember Flask, Retreat, Attributpunkte).
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

---

## 1. Ausgangslage: Was tut der Spieler im Battle?

Der Battle-View hat zwei Phasen, und in beiden macht der Spieler etwas völlig anderes:

| Phase | Was der Spieler tut | Was er braucht |
|---|---|---|
| **Fight** | Nur zuschauen. Keine Eingabe möglich (Flask nur zwischen Stages, kein Speed, kein Timer ✅). | Lesen können, **warum** der Build gewinnt oder verliert: Life, Heat, welcher Skill als nächstes kommt, welche Ailments laufen, was der Gegner vorbereitet. |
| **Intermission** (nach dem Sieg) | Entscheiden: Item wählen, Spoils wählen, Flask trinken, Attributpunkte verteilen, weiter oder Retreat. | Die Auswahl, einen Vergleich mit dem getragenen Item, den eigenen Zustand (Life, Flask). |

Daraus folgt die Regel für alles andere: **Im Fight nur, was den Kampf erklärt. In der Intermission nur, was die Entscheidung braucht. Alles, was man selten oder nur zum Nachschauen braucht, ist Overlay.**

---

## 2. Fest im Battle-View (Fight)

### Hero- und Enemy-Plaque ✅ (mit VS-Medaillon)

| Element | Hero | Enemy | Warum |
|---|---|---|---|
| Name, Level | ✅ | ✅ | Enemy Level erklärt die Schwierigkeit (Monsterlevel bestimmt alles). |
| Typ-Kennung | – | Archetyp-Symbol (Brute, Caster …), **Elite** mit Modifier-Chips (Fire Enchanted, Vampiric …), **Boss**-Rahmen | Der Spieler soll sehen, welche Frage dieser Gegner an den Build stellt. |
| **Life-Bar** mit Zahl | ✅ | ✅ | Kernzustand. |
| **Barrier** als Schicht auf der Life-Bar | ✅ | ✅ | Second Wind, Warden-Gegner, Ember Ward. |
| **Boss-Phasen** als Kerben auf der Life-Bar (75/50/25 %) | – | nur Boss | Man sieht, wann die nächste Phase kommt. |
| **Heat-Bar** | ✅ | ✅ (sichtbar laut Design) | Kern des Kampfsystems. |
| **Status-Leiste**: Buffs, Debuffs, Ailments mit Stacks und Restdauer | ✅ | ✅ | Ohne sie sind DoT-Builds (Poison-Stacks, Corruption-Stufe, Burn) und Shock/Chill unlesbar. |

✅ **Plaketten bleiben symmetrisch** (Timo). Flask-Charges gehören nicht in die Hero-Plakette.
✅ **VS-Medaillon bleibt reines Medaillon**, ohne Inhalt. Stage-Nummer steht in der Act-Leiste, Elite-/Boss-Kennung an der Enemy-Plakette.
✅ **Flask-Charges** sind im Battle-View sichtbar, aber an eigener Stelle (Vorschlag: Aktionsbereich unten zusammen mit Retreat).

### Skill-Leiste (Battle Plan im Kampf) ✅ sehr wichtig (Timo)

- **Rotation Slots** in Reihenfolge, **Zeiger auf den nächsten Skill**, Heat Cost je Slot.
- **Trigger Threshold** als Markierung auf der Heat-Bar (ab Prestige 2). Die wichtigste Einzelinfo: "Bei diesem Füllstand feuert der nächste Skill."
- **Reaction Slots** getrennt daneben, mit Condition-Symbol und Cooldown-Uhr (ab Prestige 4).
- Aufblitzen des Slots, wenn der Skill feuert. Tooltip bei Hover (Name, Cost, Effekt, Condition).
- In Act 1 nur der **Start-Skill** ✅ (1 Slot), die Leiste wächst mit dem Spiel mit.

🧪 **Symmetrisch für den Gegner** (Timo: ausprobieren, Fokus bleibt auf dem Spieler): Gegner nutzen dieselben Regeln (Heat + 1–2 Skills). Unter der Enemy-Plaque eine kleine Skill-Leiste mit Zeiger. Dazu die **Telegraphs** (Heavy Attack lädt, Curse, Heal) dort als Warnsymbol. Dann versteht der Spieler, warum Guard im Reaction Slot "When Enemy charges a Heavy Attack" genau jetzt ausgelöst hat.

### Arena ✅

- Große Sprites, Schadenszahlen (Farbe = Damage Type, Crit über Form ✅), Heal grün mit "+".
- Ailment-Effekte am Sprite (brennt, vergiftet …), Telegraph-Wind-up (Heat-Leiste leuchtet, Ausholen).
- Hintergrund pro Act eingefärbt ✅.
- Heir zeigt Weapon und Off Hand sichtbar, Rüstung nicht 💡.

### Act-Fortschritt als Leiste ✅

- **Camp am Anfang** ✅, dann 15 Stages als Punkte, aktuelle hervorgehoben, **Boss** am Ende, **Spoils-Stages** (5 und 10) markiert.
- Act-Name dazu ("Act 1 · Ashen Fields").
- Elites stehen nicht vorher fest und werden deshalb nicht markiert.

### Kleine Buttons am Rand

- Overlay-Buttons **Character (C)** und **Skill Tree (T)** mit Badge bei unverteilten Punkten.
- **Menu (Esc)**.

---

## 3. Nur in der Intermission (nach dem Sieg)

Die Loot-Auswahl ersetzt die Sprites ✅ (Timos Wunsch). Die Plaques bleiben stehen, der Gegner ist besiegt.

| Element | Wann | Hinweis |
|---|---|---|
| **Belohnungen**: Gold, Dust, XP als kurze Einblendung, Level-Up-Hinweis | jeder Sieg | Wallet ist nicht dauerhaft sichtbar 💡, nur hier und in den Overlays. |
| **Item-Auswahl 1 aus 3** mit **Equip / Take** ✅ | jeder Sieg | Hover zeigt Vergleich mit dem getragenen Item. Kein Salvage pro Karte (Timo): Nicht gewählte werden automatisch Dust. Wer keins will: **Salvage All** 💡 |
| **Spoils-Auswahl 1 aus 3** | nach Elite, Boss, Stage 5 und 10 | erst nach der Item-Auswahl ✅ |
| **Ember Flask trinken** (+35 % Life) | immer, solange Charges da sind | Auto-Schwelle wird im Menu eingestellt ✅ |
| **Attributpunkte** | wenn welche offen sind | öffnet das Character-Overlay, hier ist Verteilen erlaubt ✅ |
| **Next Stage** | immer, **per Klick** ✅ | kein Auto-Weiter |

---

## 4. Overlays (per Hotkey, über dem Battle)

| Overlay | Inhalt | Im Battle | Hotkey |
|---|---|---|---|
| **Character** | Paperdoll, Stats, Attribute, Inventar, Wallet | Ansehen immer. Attribute verteilen und Items tauschen nur in der Intermission. | C |
| **Skill Tree** | Tree und Punkte | nur Ansehen (Verteilen bei Kaelen ✅) | T |
| **Menu** | Settings (inkl. Flask-Schwelle), Compendium 💡, Quit | immer | Esc |

💡 **Kein eigenes Battle-Plan-Overlay:** Die Skill-Leiste steht ohnehin im Battle-View, Tooltips reichen. Bearbeitet wird bei Kaelen.

💡 **Später:** Combat Log / Fight Stats (Schaden nach Quelle, Ailment-Anteile). Nutzt dasselbe Event-Log wie der spätere Death Recap. Nicht im PoC.

**Retreat** ✅ ist **immer** möglich, auch mitten im Kampf (Timo). Button im Aktionsbereich.

**Bewusst nicht im Battle:** Inventar (Timo ✅), Stash, Legacy, Crafting, Act Preview. Das alles gehört ins Camp.

---

## 5. Entschieden ✅ (30.09.2026)
1. Overlays **pausieren** den Kampf.
2. Gegner-Skill-Leiste: **ausprobieren** im Mock, Fokus bleibt auf dem Spieler.
3. Nächste Stage **immer per Klick**.
4. Wallet nur in Intermission und Overlays.
5. **Retreat immer**, auch im Kampf.

---

## 6. Runde 3 (30.09.2026, Timo) ✅ / 💡

- **Skillbar unten** am Bildschirmrand wie in anderen RPGs ✅. Rotation Slots nummeriert, der nächste Skill leuchtet und füllt sich mit Heat bis zu seinem Threshold ("58/70") 💡, Reaction Slots rechts daneben mit Cooldown.
- **Menu** nur als Icon (Esc) ✅.
- **Drink-Button** nur, wo man trinken kann, also nur in der Intermission ✅. Im Fight nur die Flask-Anzeige (unten links).
- **Intermission ist ein eigener Screen** ✅, keine Plaketten, keine Skillbar.

### Welche Infos braucht die Intermission? 💡

| Info | Wofür |
|---|---|
| **Eigene Life** (groß, mit Vorschau der Flask-Heilung) | Flask-Entscheidung ✅ (Timo) |
| **Flask-Charges + Drink** | Flask-Entscheidung |
| **Item-Auswahl** mit Vergleich zum getragenen Item | Kernentscheidung |
| **Inventarplatz** ("31 / 40") | Ob "Take" noch geht |
| **Spoils-Auswahl** (nach Elite, Boss, Stage 5/10) | zweite Entscheidung |
| **Up next**: nächste Stage, nächste Spoils-Stage, Abstand zum Boss | Retreat-Entscheidung: lohnt es sich weiterzugehen? |
| **XP / Level-Up**, unverteilte Attributpunkte (Badge an Character) | Attribute verteilen |
| **Wallet** mit Zuwachs | Überblick |
| **Next Stage**, **Salvage All**, **Retreat** | Aktionen |

**Inventar voll** ✅: Equip und Take werden pro Karte gesperrt, wenn das Item (bzw. beim Equip das alte Item) nicht ins Grid passt ("No room"). Equip macht das alte Item nie zu Dust. Button **Open Inventory** öffnet das Character-Overlay mit Inventar, dort Items zu Dust zerlegen.

Nicht nötig: Heat (startet jeden Kampf neu), Barrier (verfällt nach dem Kampf), Ailments, Gegner-Infos des besiegten Gegners.

✅ **Nächsten Gegner zeigen** ("Next enemy: Ashen Skirmisher, Elite, Extra Fast") ist eine Fähigkeit des **Scouts Nyssa** (Timo, 01.10.2026). Erst wenn sie zur Karawane gestoßen ist (nach Act 2), erscheint die Info in der Intermission. Davor zeigt "Up next" nur Stage, Spoils und Boss-Abstand. Nicht im PoC.

### Warum die Enemy-Plakette im Fight bleibt 💡
Enemy Life zeigt, wie nah der Kill ist (Execute unter 30 %, Boss-Phasen). Enemy Heat und Telegraph erklären, warum ein Reaction Slot feuert. Die Status-Leiste zeigt, ob der eigene Build wirkt (Bleed, Poison-Stacks, Sunder, Shock). Elite-Modifier erklären, warum der Kampf schwer ist.
