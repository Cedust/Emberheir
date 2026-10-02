# Trigger Codex: Trigger-Affixe gezielt farmen (Vorschlag v1)

**Stand:** 02.10.2026 · **Status:** ✅ angenommen von Timo (02.10.2026), Werte 💡 · Thread "Prestige-Alternativen"
Ersetzt den einfachen Affix Codex aus `prestige-acts-v1.md`, Abschnitt 5.

---

## 1. Warum der einfache Affix Codex zu flach war

Timo hat recht: "Affix lernen, später einprägen" ist nach ein, zwei Durchgängen komplett, danach passiert nichts mehr. Außerdem ging es um Stat-Affixe, also um Zahlen, die man ohnehin über Imbue setzen kann. Das Spannende im Spiel sind die **Trigger-Affixe**.

## 2. Die Grundidee

Ein Trigger-Affix besteht schon heute aus Teilen: **Condition → Chance → Effect → Internal Cooldown** (siehe `stat-liste-v2.md`, Abschnitt 8). Der Trigger Codex sammelt nicht ganze Affixe, sondern **Conditions** und **Effects** einzeln. Damit wird daraus ein Baukasten:

> **On Crit** (Condition) + **Chain Lightning** (Effect) = "On Crit: 20 % Chance to cast Chain Lightning"

Ca. 20 Conditions × ca. 12 Effects ergeben rund 240 mögliche Trigger. Man sammelt nicht "alle Affixe", sondern Bausteine, und baut daraus seine eigenen.

## 3. So benutzt man ihn

### Lernen (Salvage bei Thoric)
- Salvaged man ein Item mit Trigger-Affix, lernt der Codex dessen **Condition und Effect**.
- Der Codex merkt sich pro Baustein das **höchste Item Tier**, auf dem man ihn salvaged hat: die **Mastery** (T1–T10).
- Der Codex ist **permanent** und überlebt jedes Prestige, wie der Runeword Codex.

### Bauen (Kindle bei der Mystic)
- **Kindle:** Man wählt eine gelernte Condition und einen gelernten Effect und setzt den Trigger auf ein Item. Er ersetzt dort einen vorhandenen Trigger oder füllt einen freien Trigger-Platz (Magic, Rare, Epic, Legendary).
- **Stärke:** Das Tier des Triggers ist die **niedrigere Mastery** der beiden Bausteine, aber höchstens das Tier des Items. Der Roll liegt bei maximal **70 %** der möglichen Spanne.
- **Grenze:** Ein gekindelter Trigger pro Item. Er zählt als Eingriff für den Affix-Lock.
- **Kosten:** Dust und **1 Kindling**. Kindling ist ein neues Material, das nur Elites und Bosse in der Spoils-Auswahl geben.

Gedropte Trigger bleiben der Jackpot: Nur sie erreichen 100 % Roll, und auf Epic Items auch zwei Trigger. Die Regel "Trigger nicht per Imbue" bleibt. Kindle ist ein eigener, begrenzter Weg.

## 4. Gezielt farmen: woher die Bausteine kommen

Jeder Baustein hat eine **Heimat**. Dort droppt er deutlich häufiger (z. B. ×4 Gewicht).

| Baustein | Heimat | Beispiele |
| --- | --- | --- |
| Attack-Conditions | Skirmisher | On Hit, On Crit, Every Nth Attack |
| Defense-Conditions | Brutes | When Hit, On Block, On Evade |
| Skill-, Time- und Threshold-Conditions | Caster | On Skill Use, Every X Seconds, Heat Full |
| Ailment-Conditions und -Effects | Act des Elements | Bleed und Poison in Rotwood, Burn im Feuer-Act |
| Element-Effects | Act des Elements | Chain Lightning im Storm-Act, Void Bolt im Void-Act |
| Seltene Effects | Act-Bosse | Extra Attack, Barrier, Heat gewinnen |

**Quarry (bei Old Nan):** Vor dem Aufbruch markiert man einen Baustein, der schon im Codex steht. Im passenden Act zeigt die Loot-Auswahl ihn öfter, und nach ca. 5 Elites ohne Treffer kommt er garantiert (Pity).

Im Compendium zeigt der Codex unbekannte Bausteine als Silhouette mit Heimat-Hinweis ("Rotwood, Bleeders"). So weiß man, wohin man muss, ohne Text-Erklärungen im Spiel.

## 5. Warum man nicht schnell fertig ist

- **Kennen geht schnell, meistern nicht.** Die Mastery hängt am Item Tier, und das steigt mit dem Monsterlevel. T10 gibt es erst im letzten Durchgang. Jeder Durchgang ist also ein neuer Grund, seine Lieblings-Bausteine erneut zu farmen.
- **Freischaltung über Acts.** Mit dem Act-Modell kommen die Heimat-Acts erst nach und nach dazu. Void-Effects gibt es erst, wenn der Void-Act offen ist.
- **Kindling ist knapp.** Man kann nicht jedes Item umbauen, sondern entscheidet, wo der Wunsch-Trigger hin soll.

## 6. Wie das beim Prestige hilft

Nach dem Prestige ist das Gear weg, aber der Codex bleibt. Mit dem ersten Kindling setzt man seinen Kern-Trigger wieder auf ein frisches Item, auf dem Tier der eigenen Mastery. Der Build ist damit schneller wieder "da", ohne dass die Seals an Wert verlieren: Ein gesichertes Item behält 100 % Rolls, zwei Trigger und die Legendary Power.

## 7. Offene Punkte

- Genaue Liste der Conditions und Effects mit Heimat (bei M8/M9 mit dem Content).
- Werte: 70 %-Grenze, Pity nach 5 Elites, Kindling-Menge (Balance-CLI).
- Name: "Kindle" und "Kindling" passen zur Glut-Welt, Alternativen willkommen.
