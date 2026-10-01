# Loot Rewards – v1

Stand: 29.09.2026. Fasst alle Belohnungen nach Kämpfen zusammen (aus `item-system-v1.md`, `town-crafting-v1.md`, `gegner-bosse-v1.md` und der Diskussion vom 29.09.).
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen / im PoC prüfen

---

## 1. Überblick: Was gibt es wann?

| Moment | Automatisch | Item-Auswahl (1 aus 3) | Spoils-Auswahl (1 aus 3) | Garantierte Drops |
|---|---|---|---|---|
| **Normaler Kampf** | Gold, Salvage Dust, XP | ✅ | – | – |
| **Stage 5 und 10 jedes Acts** | Gold, Dust, XP | ✅ | ✅ | – |
| **Elite** | Gold, Dust, XP (mehr) | ✅ höhere Rarity garantiert | ✅ | 2–3 Reforge Stones |
| **Boss** | Gold, Dust, XP (viel) | ✅ mindestens Epic | ✅ (inkl. Ascension Shard möglich) | 4–6 Reforge Stones, beim ersten Kill pro Prestige 1 Rune |

Reihenfolge nach dem Sieg: automatische Belohnungen → Item-Auswahl → ggf. Spoils-Auswahl.

---

## 2. Automatische Belohnungen ✅

- **Gold**, **Salvage Dust** und **XP** nach jedem Sieg, ohne Auswahl.
- Kein Magic Find, Gold Find oder XP % ✅.
- XP von Gegnern unter deinem Level sinkt (−10 % pro Level Abstand, min. 10 %) ✅. Bleibt auch mit dauerhaftem Level (30.09.2026); dafür läuft das Enemy Level im Level-Band des Durchgangs ✅.

---

## 3. Item-Auswahl ✅

- Nach **jedem** Sieg 3 Items, man wählt 1. Die Karten sind **immer echte Items**, nie Währung ✅.
- Optionen je Karte: **Equip**, **Take** (ins Inventar, wenn Platz) ✅. Die Auswahl blockiert nie. Bei vollem Inventar sind die Buttons gesperrt, **Open Inventory** schafft Platz; Equip macht das alte Item nie zu Dust ✅ (siehe `town-crafting-v1.md`). (geändert 30.09.2026, Thread "UI Views": kein Salvage pro Karte, stattdessen ein Button **Salvage All** = keins nehmen, alle 3 werden Dust 💡).
- Die zwei nicht gewählten Items werden **automatisch zu Salvage Dust** ✅.
- **Act-Loot:** Jeder Act droppt bevorzugt die Antwort auf seine eigene Frage (z. B. mehr Fire Resistance in den Ember Wastes) 💡.
- **Pity:** Nach mehreren Toden im selben Act steigt die Rarity in der Auswahl leicht 💡.

---

## 4. Spoils-Auswahl 💡

Eigene 1-aus-3-Auswahl nur für Verbrauchsgüter und Währungen, **zusätzlich** zur Item-Auswahl. So verdrängen Währungen nie Items.

**Wann:** nach jedem **Elite**, jedem **Boss** und fest nach **Stage 5 und 10** jedes Acts. Im ersten Durchgang ca. 4–5 Spoils-Auswahlen pro Act (später mehr, weil Elites häufiger werden). Bewusst nicht nach jedem Kampf: zwei Auswahlen pro Kampf wären beim Farmen Klickarbeit, und Spoils sollen besonders bleiben.

**Mögliche Karten:**

| Karte | Nutzen |
|---|---|
| **Flask Charge** | +1 Charge der Ember Flask (Heilung zwischen Stages) |
| **Reforge Stones** (mehrere) | alle Affixe eines Items neu würfeln (Mystic) |
| **Essence** (act-gebunden) | Imbue: ein Stat-Affix gezielt setzen (Mystic) |
| **Rune** | Sockeln, Runewords |
| **Ascension Shard** (nur Boss, selten Elite) | Item um ein Tier anheben (Blacksmith) |

---

## 5. Reforge Stones: Versorgung 💡

Sorge: eher **zu wenige** (10 Slots, 3–4 Rerolls pro Slot nötig).

- **Hauptquelle Drops** ✅: Elites 2–3, Bosse 4–6 garantiert, dazu Spoils-Karten.
- **Distill beim Mystic** ✅: Salvage Dust → 1 Reforge Stone. Die Kosten **verdoppeln sich mit jeder Umwandlung** (z. B. 100 / 200 / 400 Dust) und setzen sich erst beim nächsten Act-Start zurück. Sicherheitsventil, kein Dauer-Reroll.
- Grobe Erwartung: 10–20 Stones pro Act plus Distill. Wird im PoC gebalanct.

---

## 6. Elites 💡

Jeder normale Gegner kann mit einer Chance ein Elite sein (1–3 Modifikatoren). Die Chance setzt sich aus drei Stufen zusammen (Timos Modell ✅, Werte 💡):

`Elite-Chance = Basis(Prestige) + Act-Bonus × (Act − 1) + Stage-Bonus × (Stage im Act − 1)`, gedeckelt bei ca. 50 %.

| Stufe | Startwert 💡 | Wirkung |
|---|---|---|
| **Basis** je Prestige | 5 % im ersten Durchgang, +3 % pro Prestige | höhere Prestiges haben insgesamt mehr Elites |
| **Act-Bonus** | +2 % pro Act | innerhalb eines Runs werden Elites mit jedem Act häufiger |
| **Stage-Bonus** | +0,5 % pro Stage im Act | am Ende eines Acts häufen sich die Elites |

Beispiele im ersten Durchgang: Act 1 Stage 1 = 5 %, Act 1 Stage 14 = 11,5 %, Act 6 Stage 14 = 21,5 %. Erwartung: ca. 1 Elite in Act 1, ca. 2 in Act 4. Im 10. Durchgang (Prestige-Stufe 9): ca. 5 Elites schon in Act 1.

Bosse sind nie Elites. Die Chance bleibt am Prestige ✅, die Zahl der Modifikatoren hängt am **Monsterlevel** ✅ (30.09.2026).

**Wechselwirkung mit Reforge Stones:** Weniger Elites am Anfang heißt weniger Stones. Das ist vertretbar, weil man früh wenige gute Items zum Rerollen hat. Die festen Spoils (Stage 5 und 10) und die Boss-Drops tragen die frühe Versorgung.

---

## 7. Prestige ✅

- Nicht ausgegebene Währungen (inkl. Reforge Stones), lose Runes, Inventar und Stash gehen verloren.
- ✅ Dafür gibt es eine feste Menge Salvage Dust als Startbonus, unabhängig vom Stash-Inhalt, steigend mit der Prestige-Stufe.
- Deshalb nutzt man die letzten Camp-Besuche vor dem Harvester-Kampf, um gesicherte Items per Ascension Shard aufzuwerten. Der Sieg löst das Prestige sofort aus ✅ (Pflicht, 30.09.2026).

---

## 8. Für den PoC

- Item-Auswahl wie oben, Spoils-Auswahl mit Flask Charge, Reforge Stones und einer Essence-Art.
- Zu prüfen: Reichen die Reforge Stones? Fühlen sich Spoils nach Elites lohnend an? Ist die zweite Auswahl störend?
