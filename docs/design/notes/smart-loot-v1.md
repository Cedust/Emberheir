# Smart Loot – Analyse und Vorschlag (v1)

Stand: 28.10.2026, Thread "Smart Loot prüfen". Backlog-Punkt vom 16.10.2026: "Loot ist kaum klassenbezogen".
Spielbegriffe englisch, Erklärungen deutsch. Noch nichts umgesetzt, wartet auf Timos Entscheidung.

## 1. Wie Loot heute funktioniert (Code-Stand main, c4794d0)

- Item Pick 1 aus 3 (Bosse mehr Karten), bei normalen Kämpfen nur jede 3. Stage. Waffen droppen nie (Heirloom).
- Pro Karte: Slot nach Gewicht (Ring 1,5, sonst 1), dann **Base zufällig gleichverteilt**, dann Affixe aus dem Slot-Pool.
- Es gibt schon Gewichtungen, aber alle **nach Ort/Gegner, keine nach dem Helden**: Trigger Codex, Act-Affixe
  (z. B. Fire Resistance in den Ember Wastes), Elite-Themen, Build-Karte des Bosses, Hunt Signature Affix, Home Uniques.
- Requirements: Rüstungs-Bases sind dreigeteilt: Iron (STR 5–6), Leather (AGI 3), Silk (INT 3). Off Hands passen nur
  zu bestimmten Waffen (Shield/Talisman Nahkampf, Quiver Bow/Crossbow, Focus/Grimoire Wand/Staff).
- Attribute sind knapp: 14 Start + 6 bei Erstellung + 2 pro Harvest (≈ 32 am Ende). Man öffnet also selten eine zweite
  Rüstungs-Familie.
- Marisha: Slot frei wählbar, Base aber ebenfalls zufällig.

## 2. Messung (4000 Item Picks pro Klasse/Waffe, Startattribute + 2 Erstellungspunkte auf Hauptattribut)

| Klasse | Karten, die man nicht tragen kann | davon Rüstung (Helm/Body/Gloves/Boots) | Picks mit 3 nutzbaren Karten |
|---|---|---|---|
| Cinderguard | 35 % | 69 % | 24 % |
| Ashstrider | 43 % | 69 % | 16 % |
| Emberseer | 41 % | 69 % | 18 % |

Timos Eindruck stimmt: gut jede dritte Karte ist für den eigenen Helden tot, bei Rüstung zwei von drei. Bei nur
einem Pick alle drei normalen Stages ist das viel verschenkte Spannung.

Nebenbefund: Leather braucht AGI, obwohl seit dem Klassengerüst **DEX** die Evasion-Klasse ist (Ashstrider).
Das passt heute nur zufällig, weil der Ashstrider mit AGI 3 startet.

## 3. Wie es die Vorbilder machen

| Spiel | Ansatz | Warum es dort passt |
|---|---|---|
| Diablo 2 | Kein Smart Loot. Alles droppt für alle. | Riesige Drop-Mengen, Handel, Mules. Off-Class-Items sind Handelsware. |
| Path of Exile | Kein Smart Loot, aber Loot Filter. STR/DEX/INT-Bases wie bei uns. | Hunderte Drops pro Map, Filter blendet Unpassendes aus, Handel. |
| Diablo 3 (ab RoS) | Smart Loot: ca. 85 % der Legendaries für die eigene Klasse, Hauptattribut passt immer. | Wenige bedeutsame Drops, kein Handel: genau wie bei uns. |
| Diablo 4 | Gewichtung zur eigenen Klasse (Waffentypen, Affixe). | Ebenfalls kein relevanter Handel. |

Emberheir ist vom Aufbau her **D3, nicht D2**: wenige Picks, kein Handel, kein Loot Filter, knappe Attribute.
Der D2-Ausgleich (Masse + Handel) fehlt. Einzig der geteilte Stash gibt Off-Class-Items einen Wert (für Alts).

## 4. Optionen

**A · Nichts ändern, nur besser anzeigen.** Unpassende Karten deutlich markieren. Löst das Gefühl nicht, eine Karte
von drei bleibt tot.

**B · Smart Base (empfohlen).** Bei Rüstung und Off Hand wird die Base meist so gewürfelt, dass der Held sie tragen
kann (Vorschlag: 75 %, der Rest bleibt zufällig, damit der Stash für Alts weiter etwas bekommt). Affixe bleiben
völlig frei. Gilt für Item Picks, Caches und Marisha. Basis ist der Held selbst (Attribute + Waffe), nicht die
Klasse, also passt es auch zu ungewöhnlichen Attribut-Verteilungen. Erwartung: tote Karten von ~40 % auf ~12 %.
Kleiner Eingriff in `rollItemChoices`, Balance kurz nachmessen (etwas mehr Gear-Power, Autopilot nimmt Bestes).

**C · Smart Base + Smart Affixes.** Zusätzlich leichte Gewichtung auf den Schadenstyp und das Ailment des
Heirloom-Pfads (z. B. Fire-Pfad → mehr Burn Chance / Elemental Damage). Gefahr: Loot wird vorhersehbar, Hybride
seltener, und es gibt dafür schon Werkzeuge (Codex, Boss-Build-Karte, Hunts). Mehr Power, größere Neumessung.

**Mitnehmen bei B oder C:** Leather-Requirement von AGI auf DEX umstellen (Rüstungsfamilie = Hauptattribut der Klasse,
wie in PoE), damit die Regel "STR = Iron, DEX = Leather, INT = Silk" klar ist.

## 5. Empfehlung

**B + Leather auf DEX.** Löst die Ursache (zufällige Base trotz knapper Attribute), ohne den Reiz der Affixe zu
nehmen, und bleibt Diablo-typisch. C nur, falls nach dem Spielen von B noch "das passt nie zu meinem Build" kommt.

## 6. Umgesetzt und gemessen (28.10.2026)

Timo wählte **B + Leather auf DEX**. Smart Base: 75 % der Karten eines Slots mit untragbaren Bases würfeln unter den
tragbaren (eigene Attribute, Off Hand passt zur Waffe). Gilt für Item-Picks, Cache, Eldrin's Cache und Marisha.

Balance-CLI `--act 7 --generations 7 --build all --runs 2 --seed 31`, main gegen Branch:

| | main | Smart Base |
|---|---|---|
| Versuche pro neuestem Act (alle) | 3,2 | 2,4 |
| Tode gesamt | 734 | 457 |
| Cinderguard / Ashstrider / Emberseer (Ø Versuche) | 3,5 / 3,2 / 2,7 | 2,4 / 2,3 / 2,4 |
| Spielzeit bis Ende Run 7 | 14,1 h | 12,7 h |
| Act 7 in Run 7 | 4,3 | 4,1 |

Das Spiel wird spürbar leichter (mehr nutzbares Gear = mehr Power), die Klassen liegen dafür enger beieinander.
Offen: ob die Gegner das ausgleichen sollen (Timos Entscheidung).
