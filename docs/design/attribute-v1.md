# Attribute v1: wenige Punkte, große Wirkung

Stand: 08.10.2026 (v1.2, von Timo angenommen), Thread "Attribute wichtiger machen". Konzept steht, Umsetzung folgt.
Spielbegriffe englisch, Erklärungen deutsch. Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

Ersetzt bei Annahme: `stat-liste-v2.md` Abschnitt 1 (Werte pro Punkt), GDD Abschnitt "Level" (Attributpunkte pro Level),
`klassen-v2.md` (Start-Attribute), Attribut-Affixe und Attribute Requirements in `item-system-v1.md`.

---

## 1. Problem heute

| Heute (Code, 08.10.2026) | Folge |
|---|---|
| 36 Start-Punkte + **2 pro Level** → bei Level 140 ca. **314 Punkte** | Verteilen ist Routine, kein Moment |
| Wirkung pro Punkt winzig: +1 % Physical Damage, +0,2 % Crit Chance, +5 Life | ein einzelner Punkt ist egal |
| Attribut-Affixe auf jedem Slot (+1–4, wächst mit dem Tier) | Gear überdeckt die eigene Verteilung |
| Requirements wachsen +8 pro Tier | man **muss** Punkte in Requirements stecken, statt zu wählen |
| Kein Attribut-Respec | ist bei 314 Punkten auch egal |

Das Level macht heute zwei Dinge gleichzeitig: Skill Points **und** Attributpunkte. Darum fühlt sich keins davon besonders an.

## 2. Leitidee

**Attribute sind der Charakter, nicht der Fortschritt.** Wie bei D&D und Fallout (S.P.E.C.I.A.L.) legt man den Helden bei der
Erstellung fest. Danach gibt es nur wenige, bewusst verdiente Punkte, und jeder davon ist ein Ereignis.

Drei getrennte Fortschritts-Spuren:

| Spur | Was sie bringt | Woher |
|---|---|---|
| **Level** | Skill Points (Skill Tree), Base Life | XP (unverändert) |
| **Weapon Rank** | Mastery Points, Weapon Damage | wie gebaut (PR #18) |
| **Attributes** 💡 neu | Charakterwerte 1–10, Breakpoints | Erstellung + Meilensteine, **nicht** XP |

→ Das Level wird damit vom Attribut-System getrennt und ist nur noch der Motor des Skill Trees. Level Cap, XP-Kurve und
1 Skill Point pro Level bleiben, wie sie sind.

## 3. Die Skala: 1 bis 10 💡

- Jedes Attribut hat einen Wert von **1 bis 10**. 10 ist das Maximum aus eigenen Punkten.
- Items können ein Attribut **über 10 hinaus** heben, höchstens auf **12** ("Exalted", eigener Glanz in der UI).
- Am Ende des Spiels hat man ca. **34 Punkte** auf 6 Attribute (max. 60). Man kann also etwa **3 Attribute ausreizen**,
  der Rest bleibt niedrig. Das ist der Fallout-Moment: Man ist stark in etwas und bewusst schwach in anderem.

### Wirkung pro Punkt 💡 (Startwerte für die Balance-CLI)

Alle Werte sind Prozente, damit sie über 140 Level relevant bleiben (heute ist z. B. Life pro Vitality flach und veraltet).

| Attribute | Effekt 1 pro Punkt | Effekt 2 pro Punkt | bei 10 |
|---|---|---|---|
| **Strength** | +8 % Physical Damage | +6 % Armor | +80 % / +60 % |
| **Dexterity** | +1,5 % Crit Chance | +4 % Trigger Chance | +15 % / +40 % |
| **Intelligence** | +8 % Elemental Damage | +1,5 % All Resistance | +80 % / +15 % |
| **Agility** | +3 % Attack Speed | +2 % Evasion | +30 % / +20 % |
| **Wisdom** | +6 % Heat Gain | +6 % Ailment Duration | +60 % / +60 % |
| **Vitality** | +6 % Max Life | +3 % Tenacity | +60 % / +30 % |

Ein Punkt ist damit etwa **8–10× so viel wert** wie heute. Die Gesamtkraft aus Attributen am Spielende sinkt leicht
(heute ca. +150 % auf das Haupt-Attribut), der Rest kommt über die Breakpoints zurück. Gegner werden danach mit der
Balance-CLI nachgezogen.

## 4. Breakpoints: der Grund, warum jeder Punkt zählt 💡

Bei **4, 7 und 10** schaltet jedes Attribut einen festen Perk frei (wie Feats in D&D oder Perks mit S.P.E.C.I.A.L.-Bedingung
in Fallout). Ein einzelner Punkt kann also der Punkt sein, der einen Perk öffnet. Nur eigene Punkte zählen, Item-Boni nicht
(gleiche Regel wie bei Requirements, damit Gear-Tausch keine Perks an- und ausschaltet). ❓ siehe offene Punkte.

| Attribute | 4 | 7 | 10 |
|---|---|---|---|
| **Strength** | **Armorbreaker:** Crits setzen 1 Sunder-Stack | **Stoneguard:** +25 % Block Value | **Titan:** Treffer über 10 % Gegner-Life stunnen 0,5 s (1× pro 6 s) |
| **Dexterity** | **Hawkeye:** +5 % Precision (weniger Glancing Blows) | **Opportunist:** Glancing Blows können Trigger auslösen | **True Shot:** jeder 5. Angriff ist ein sicherer Crit |
| **Intelligence** | **Attuned:** +10 % Elemental Penetration | **Spillover:** +10 % Chance auf das Ailment des Elements | **Spellfire:** der erste Spell jedes Kampfes trifft doppelt |
| **Agility** | **Forewarned:** der erste gegnerische Angriff jedes Kampfes geht ins Leere | **Slipstream:** On Evade +5 Heat | **Double Time:** jeder 4. Angriff schlägt doppelt zu |
| **Wisdom** | **Ready Flame:** +10 Starting Heat | **Afterglow:** Skills geben 10 % ihrer Heat Cost zurück | **Clarity:** Ailments halten +1 Stack bzw. laufen +1 s länger |
| **Vitality** | **Second Breath:** 1× pro Kampf unter 30 % Life: heilt 15 % Max Life | **Scar Tissue:** −15 % Schaden durch Ailments | **Undying:** 1× pro Kampf überlebt man einen tödlichen Treffer mit 1 Life |

Jeder Perk bekommt einen eigenen Look in der Arena (CLAUDE.md, PixiJS-Regel): z. B. Titan = Schockwelle am Boden,
Undying = Glutsäule um den Otter, True Shot = Fadenkreuz-Glint vor dem Treffer, Forewarned = Nachbild beim Ausweichen.

## 5. Erstellung: das S.P.E.C.I.A.L.-Moment 💡

Beim Anlegen des Charakters (Klassenwahl, `klassen-v2.md`):

1. Alle Attribute starten bei **1**.
2. Die Klasse setzt ihr **Class Array** (+8 Punkte, fest).
3. Der Spieler verteilt **6 freie Punkte**. Kein Attribut über **7** bei der Erstellung.
4. **Summe zu Beginn: 20.**

| Klasse | STR | DEX | INT | AGI | WIS | VIT | Idee |
|---|---|---|---|---|---|---|---|
| **Warrior** | 4 | 2 | 1 | 2 | 1 | 4 | stark, zäh |
| **Reaver** | 3 | 3 | 1 | 3 | 1 | 3 | schnell, blutig |
| **Hunter** | 2 | 4 | 1 | 4 | 1 | 2 | präzise, flink |
| **Sorcerer** | 1 | 2 | 4 | 2 | 3 | 2 | Elementar-Kraft |
| **Warlock** | 1 | 2 | 3 | 1 | 4 | 3 | Heat und Ailments |

Jede Klasse startet also mit einem oder zwei Attributen auf 4 und kann mit den freien Punkten sofort einen ersten
Breakpoint verstärken oder einen zweiten erreichen. Die Live-Vorschau der Klassenwahl zeigt die Perks direkt mit.

Die Verteilung wird **bestätigt** und ist danach fest (Confirm-Dialog, kein Undo). Das ist der Punkt.

## 6. Weitere Punkte: bewusst verdient ✅ (Timo, 08.10.2026)

Einzige feste Quelle, nicht an XP gebunden:

| Quelle | Punkte | Wann |
|---|---|---|
| **The Harvest** | 7 × **2** = **14** | jedes Prestige (Durchgang 1–7), direkt nach dem ersten Sieg über den Boss des neuesten Acts. Dazu **Rekindle** (Abschnitt 7) |

→ **20 Punkte** bei der Erstellung, ca. **34 Punkte** am Ende.

Gestrichen (Timo): ~~Heartfire~~ (fiel immer mit dem Prestige zusammen), ~~Ember Seed~~ (keine seltenen Drops für
Attribute), ~~Codex Chapters~~.

**Temporär (Boons) ✅:** Nur Boons der höchsten Stufe (**Blaze**, das "Legendary" der Stolen-Fire- und Run-Boons) dürfen
ein Attribut um **+1 oder +2** erhöhen, solange sie gelten. Diese zählen für Breakpoints. So kann ein Run einen Perk
kurz "ausleihen", ohne die feste Verteilung zu ändern.

## 7. Umverteilen ✅ (Timo, 08.10.2026)

- **Rekindle:** Beim Prestige darf man **bis zu 2 Punkte** umsetzen, zusammen mit den 2 neuen Punkten der Harvest.
  Das ist der Moment zum Umschwenken.
- **Schutz vor Kaputtmachen:** Rekindle und Ashen Rebirth zeigen vor dem Bestätigen, welche Breakpoints und Requirements
  man verliert (verlorener Perk rot, Items, die nicht mehr passen, markiert). Erst dann Confirm.
- **Ashen Rebirth:** komplette Neuverteilung aller Punkte im Camp bei Kaelen. Kostet **1 Phoenix Ash** 💡 (Name).
  Jedes Prestige gibt **1 Phoenix Ash**, nicht genutzte sammeln sich an. Der erste Durchgang hat also noch keinen Notausgang,
  danach höchstens eine komplette Neuverteilung pro Durchgang.
- Sonst kein Respec.

## 8. Items 💡

- **Attribut-Affixe** ("of the Ox" usw.) nur noch auf **Amulet und Ring** (Charm bleibt Trigger-Slot), Wert **+1** (Epic und Legendary bis **+2**),
  wächst nicht mehr mit dem Tier. Uniques mit Attributen behalten ihre Identität mit +1/+2.
- Items heben höchstens bis **12** und zählen **nicht** für Breakpoints und Requirements.
- **Attribute Requirements** bleiben (D2-Gefühl), aber **fest pro Basis** und auf der neuen Skala, ohne Wachstum pro Tier:
  leichte Basis 0, mittlere 3–4, schwere 5–6 (z. B. Plate STR 6, Grimoire INT 5). So beeinflusst die Verteilung,
  welche Rüstungen man trägt, ohne zum Zwang zu werden.

## 9. UI 💡

- **Character View:** sechs große Attribut-Steine mit 10 Kerben, Breakpoints 4/7/10 als Glutsiegel, freigeschaltete Perks
  leuchten. Minimaler Text (Tooltip zeigt den Perk), "ein Videospiel, kein Handbuch".
- Neuer Punkt = kurzer eigener Moment (Funkenregen auf dem Stein, Glocke), Badge im Run Header wie heute.
- Breakpoint erreicht = größerer Moment, Perk fliegt in die Status-Leiste der Battle Bar.

## 10. Bestehende Spielstände

Einmalige **Neuverteilung**: Attribute auf Class Array zurück, 6 freie Punkte plus alle Punkte aus Quellen, die der Spielstand
schon verdient hat (2 pro Prestige) und 1 Phoenix Ash pro bisherigem Prestige. Der Spieler verteilt sie beim nächsten Laden.
Ausgerüstete Items mit unerfüllten Requirements wandern ins Inventar.

## 11. Alternative (nicht empfohlen)

**D&D-Stil:** 1 Attributpunkt alle 10 Level (14 bis Level 140), sonst wie oben. Einfacher, aber wieder an XP gebunden:
Punkte kommen "nebenbei" und nicht als Ereignis. Die Harvest-Punkte machen das Prestige zum großen Moment.

## 12. Entscheidungen

1. ✅ Skala 1–10, Breakpoints 4/7/10, Item-Attribute zählen nicht für Breakpoints.
2. ✅ Harvest = +2 Punkte + Rekindle 2 Punkte; Heartfire, Ember Seed und Codex Chapters gestrichen.
3. ✅ Ashen Rebirth gegen 1 Phoenix Ash, 1 pro Prestige.
4. ✅ Blaze-Boons dürfen Attribute vorübergehend um +1/+2 erhöhen.
5. 💡 Wirkung pro Punkt und Perks: Startwerte, Feintuning mit der Balance-CLI bei der Umsetzung.


## Umsetzung (2026-10-09)

- Perk-Namen umbenannt, weil Skill-Tree-Nodes, Boons, Uniques und Weapon-Mastery-Nodes schon so hießen
  (z. B. Bulwark, Overload, Light Feet, Second Wind, Focus, Rally).
- Attribut-Affixe nur auf Amulet und Ring: Charm ist laut früherer Entscheidung nur für Trigger da.
- Werte pro Punkt (Start fürs Balancing): STR +8 % Physical Damage / +6 % Armor, DEX +1,5 % Crit / +4 % Trigger,
  INT +8 % Elemental Damage / +1,5 % All Res, AGI +3 % Attack Speed / +2 % Evasion, WIS +6 % Heat Gain / +6 %
  Ailment Duration, VIT +6 % Life / +3 % Tenacity. Monster behalten die alte Skala.
- Balance-CLI (Sword und Staff, 7 Runs): ähnlich wie vorher, eher etwas leichter.
