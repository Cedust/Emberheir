# Gegner & Bosse – Entwurf v1

Stand: 28.09.2026. Baut auf allen bisherigen Design-Dateien auf.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

## Was schon feststeht ✅

- Kampf ist 1v1.
- 100 Stages pro Prestige. Stage 15, 30, 45 … sind Boss-Stages, danach folgt ein Camp. Stage 100 ist der finale Boss.
- Die Schwierigkeit hängt nur am Monsterlevel ✅ (30.09.2026). Act 1 bleibt in jedem Durchgang einfach, ab Act 2 zieht sie an.
- Reaction Slots brauchen Gegner, die ihre großen Angriffe ankündigen.

---

## 1. Acts: 15 Stages mit eigenem Thema 💡

Die Stages zwischen zwei Camps bilden einen **Act** mit eigenem Gebiet, eigener Gegnerfamilie und einem Element-Schwerpunkt. So weiß der Spieler, worauf er sich vorbereiten muss (wie Resistances in D2), und jeder Act testet einen anderen Teil des Builds.

| Act | Stages | Gebiet (Arbeitstitel) | Schwerpunkt |
|---|---|---|---|
| 1 | 1–15 | **Ashen Fields** | Physical, Einstieg |
| 2 | 16–30 | **Rotwood** | Bleed, Poison |
| 3 | 31–45 | **Ember Wastes** | Fire, Burn |
| 4 | 46–60 | **Frost Peaks** | Cold, Chill |
| 5 | 61–75 | **Storm Spires** | Lightning, Shock |
| 6 | 76–90 | **Void Rift** | Void, Corruption |
| 7 | 91–100 | **Emberfall** | gemischt, finaler Boss |

---

## 2. Gegner nutzen dieselben Regeln wie der Held 💡

- Gegner haben dieselben Stats (Life, Armor, Resistances, Attack Speed, Evasion …).
- Gegner haben **eine eigene Heat-Leiste und 1–2 Skills**. Die Leiste ist sichtbar. Der Spieler sieht also, wann der Gegner seinen großen Angriff vorbereitet.
- Vorteil: Ein System für beide Seiten, weniger Sonderregeln, und Chill ("−Heat Gain des Gegners") oder Stun wirken sichtbar.

---

## 3. Gegner-Archetypen 💡

Jeder Archetyp stellt eine andere Frage an den Build:

| Archetyp | Profil | Testet |
|---|---|---|
| **Brute** | viel Life und Armor, langsame harte Treffer | Physical Damage gegen Armor, Penetration, Sunder |
| **Skirmisher** | schnell, hohe Evasion | viele Treffer, Trigger Chance, Chill |
| **Caster** | Elemental Damage, wenig Life | Resistances, Burst |
| **Afflicter** | fügt DoTs zu | Tenacity, Lifesteal |
| **Warden** | Barrier, Block, heilt sich | Burn (Anti-Heal), Shock, DoTs gegen Barrier |
| **Thornback** | Thorns, bestraft viele kleine Treffer | große Einzeltreffer statt Tempo |

Jeder Act mischt 3–4 Archetypen in seinem Element.

---

## 4. Elites 💡

Mit einer gewissen Chance ist ein Gegner ein **Elite** mit 1–3 Modifikatoren. Elites sind härter, geben aber eine bessere Loot-Auswahl (höhere Rarity garantiert).

Beispiel-Modifikatoren: **Fire Enchanted**, **Extra Fast**, **Stone Skin**, **Vampiric**, **Thorns**, **Cursed** (wirkt einen Curse auf dich), **Enraged** (unter 30 % Life deutlich stärker).

Die Elite-Chance steigt dreistufig: Basis pro Prestige, dazu pro Act und pro Stage im Act (Start 5 % im ersten Durchgang). Formel und Werte: `loot-rewards-v1.md`, Abschnitt 6. Die Zahl der Modifikatoren steigt mit dem **Monsterlevel** ✅ (30.09.2026). Die Elite-Chance hängt weiter am Prestige ✅.

---

## 5. Telegraphs für Reaction Slots 💡

Damit Reaction Slots und defensive Skills Sinn ergeben, kündigen Gegner ihre gefährlichen Aktionen an:

| Telegraph | Anzeige | Passende Reaktion |
|---|---|---|
| **Heavy Attack** | Wind-up 1,5–2 s, Heat-Leiste leuchtet | Guard, Second Wind, Barrier |
| **Curse Cast** | Symbol über dem Gegner | Cleanse-Effekte, Tenacity |
| **Enrage** | ab bestimmter Life-Schwelle | Burst-Skills aufsparen (Threshold) |
| **Heal / Barrier** | Cast-Anzeige | Burn, Shock, großer Treffer |

Diese Telegraphs werden direkt zu **Conditions** für Reaction Slots: "When Enemy charges a Heavy Attack", "When Enemy is Enraged" usw.

---

## 6. Bosse 💡

Jeder Boss hat **Phasen** (bei 75 / 50 / 25 % Life) und eine **Signatur-Mechanik**, die genau das Thema seines Acts prüft:

| Stage | Boss (Arbeitstitel) | Signatur-Mechanik | Lehrt |
|---|---|---|---|
| 15 | **Gorrak, the Pit Brute** | alle 10 s ein angekündigter Slam | Telegraphs, Defensive Skills |
| 30 | **Mother of Rot** | stapelt Poison auf dir, heilt sich selbst | Tenacity, Anti-Heal |
| 45 | **Cinder Tyrant** | Fire Aura, Enrage unter 30 % | Fire Resistance, Burst |
| 60 | **Rime Warden** | Chill auf dir, Barrier-Phasen | Heat-Management, Barrier brechen |
| 75 | **Storm Herald** | Shock auf dir, reflektiert jeden 5. Treffer | Tempo vs. große Treffer |
| 90 | **Voidborn Maw** | Corruption auf dir wird immer stärker | Zeitdruck, schneller Kill |
| 100 | **The Ashen Harvester** | 3 Phasen, nutzt Mechaniken aller vorherigen Bosse (Rotation kopieren verworfen ✅) | alles |

**Boss-Belohnung:** Loot-Auswahl mit garantiert mindestens Epic, extra Währung, beim ersten Kill pro Prestige zusätzlich eine Rune (beim Harvester automatisch, da sein Sieg das Prestige auslöst).

**Prestige-Mechaniken:** Mit jedem Prestige bekommt jeder Boss eine zusätzliche Fähigkeit dazu. So bleiben bekannte Bosse auch im 8. Durchgang eine neue Herausforderung.

**Finale The Last Ember** ✅ (30.09.2026): Nach dem 10. Durchgang ein kurzer Boss-Gauntlet aus 6 Warden-Echos (Bosse der Acts 1–6 mit allen Prestige-Fähigkeiten) und dem Kern des Harvesters. Details im GDD, Abschnitt Zählweise und Finale.

---

## 7. Skalierung 💡

### Monsterlevel bestimmt alles ✅ (30.09.2026, Thread "Prestige-Pflicht")
- **Ein Monsterlevel bestimmt die Werte des Monsters.** Eine einzige Kurve (Level → Life, Damage, Armor, Resistances, Penetration), Werte über die Balance-CLI. Kein Prestige- oder Stage-Multiplikator mehr. Das ist leichter zu verstehen und leichter zu balancen.
- ~~`Multiplikator = 1 + Prestige × k × (Stage / 100)`~~ verworfen.
- **Level-Band pro Durchgang:** Die Acts 2–7 laufen durch das Band des Durchgangs, das Level steigt mit der Stage. Da das Helden-Level beim Prestige bleibt, geben so auch späte Durchgänge XP.
- **Act 1 ist einfach:** Sein Monsterlevel liegt knapp unter dem Level Cap des vorherigen Durchgangs. Dort farmt man nach dem Prestige neues Gear, erst ab Act 2 zieht die Schwierigkeit an.

| Durchgang | Cap | Act 1 | Acts 2–7 |
|---|---|---|---|
| 1 | 10 | Level 1–3 | Level 4–10 |
| 3 | 30 | Level 18–20 | Level 21–30 |
| n (ab 2) | 10n | 10(n−1)−2 bis 10(n−1) | 10(n−1)+1 bis 10n |

Genaue Verteilung der Level auf Stages 💡 (Balance-CLI).

- Bosse liegen deutlich über normalen Gegnern ihrer Stage (Spike, z. B. +1–2 Level oder eigener Boss-Faktor 💡).
- **Resistance Penetration** der Monster steigt mit dem Monsterlevel ✅. Ersetzt den früheren Resistance-Malus pro Prestige (gleiche Wirkung wie Alptraum/Hölle in D2, aber am Level).
- **Elites:** Die Chance hängt weiter am Prestige (plus Act und Stage) ✅, die Zahl der Modifikatoren am Monsterlevel ✅.

### Pro Prestige (nur noch Inhalt)
- Neue Boss-Fähigkeit (siehe oben) ✅.
- Höhere Elite-Basis-Chance ✅.
- Item Tier ergibt sich aus dem Monsterlevel (siehe `item-system-v1.md`), steigt also mit dem Band.

---

## 8. Für den PoC 💡

Act 1 mit 2–3 Archetypen (Brute, Skirmisher, Caster), einfache Elites und Gorrak als Boss mit einer Heavy Attack. Das reicht, um Telegraphs, Defensive Skills und Skalierung zu testen.

---

## 9. Wie beantwortet der Spieler die Fragen? ✅ (29.09.2026: Punkte 1, 3, 6, 7 bestätigt)

1. **Vorbereitung:** Element und Boss des nächsten Acts sind im Camp sichtbar.
2. **Camp-Werkzeuge:** Blacksmith (Reroll, Upgrade, **Imbue**: ein Affix gezielt auf z. B. Fire Resistance setzen), Händler für Base Items bzw. Gamble, Respec, Battle Plan umbauen.
3. **Act-Loot:** Jeder Act droppt bevorzugt die Antwort auf seine eigene Frage (Rotwood mehr Tenacity und Poison-Resistenz, Ember Wastes mehr Fire Resistance).
4. **Stash:** Ein kleines Lager für Alternativ-Items, z. B. einen Fire-Resistance-Ring nur für Act 3.
5. **Nach dem Tod:** zurück ins **letzte Camp** ✅ (Beginn des aktuellen Acts). Man farmt den Act gezielt, bis man den Boss schafft, und kann vorher im Camp umbauen.
6. **Pity:** Nach mehreren Toden im selben Act steigt die Rarity in der Loot-Auswahl leicht.
7. ~~Prestige ist freiwillig~~ → ✅ **Prestige ist Pflicht, den Zeitpunkt wählt man selbst** (30.09.2026): Der Sieg über den Harvester löst das Prestige sofort aus (passt zur Lore: sein Sieg ist die Ernte). Farmen und Upgraden passiert vorher, per Retreat und Revisit Act. Nach dem Prestige ist Act 1 bewusst einfach, dort kann man neues Gear farmen.

## Entscheidungen (28.09.2026)

- 7 Acts à 15 Stages bleiben ✅
- Tod: zurück zum letzten Camp ✅
- **Retreat:** mitten im Act freiwillig zurück ins Camp (wirkt wie ein Tod) ✅
- **Revisit Act:** bereits geschaffte Acts aus dem Camp gezielt erneut farmen ✅

- Acts mit Element-Schwerpunkt ✅
- Gegner mit sichtbarer Heat-Leiste und Skills ✅
- Elites ✅
- Finaler Boss kopiert die Rotation: verworfen ✅

## Offene Fragen (Stand vor den Entscheidungen)

1. **Acts mit Element-Schwerpunkt:** passt das?
2. **Gegner mit eigener sichtbarer Heat-Leiste und Skills:** passt das?
3. **Elites** mit Modifikatoren: ja oder nein?
4. **Finaler Boss, der deine Rotation kopiert:** cool oder zu gimmicky?
