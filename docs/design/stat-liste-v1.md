# Stat-Liste – Entwurf v1

Stand: 28.09.2026. Erster Vorschlag zum Diskutieren, nichts davon ist festgelegt.

Leitgedanke: Da der Spieler im Kampf nicht eingreift, soll jeder Stat entweder direkt Stärke bringen **oder** einen Trigger füttern. Stats, die nichts auslösen und nichts verändern, fliegen raus.

---

## 1. Grundattribute (4)

Werden pro Level verteilt und kommen auf Items vor. Jedes Attribut speist 2–3 abgeleitete Werte, damit es für mehrere Builds interessant ist.

| Attribut | Wirkung (Vorschlag) | Typischer Build |
|---|---|---|
| **Stärke** | + phys. Schaden %, + Rüstung, + Blockwert | Krieger, Tank |
| **Geschick** | + Krit-Chance, + Ausweichen, + Angriffstempo (gering) | Assassine, Schnell-Angreifer |
| **Intelligenz** | + Elementarschaden %, + Energiegewinn, + Zustandsdauer | Magier, Trigger-Builds |
| **Vitalität** | + Leben, + Lebensregeneration | alle |

Items können zusätzlich **Attribut-Anforderungen** haben (wie D2). Das gibt Stärke & Co. auch für Nicht-Nutzer einen Wert.

---

## 2. Kampfressource: Energie

Vorschlag statt Mana und Cooldowns: **Energie** (0–100). Man gewinnt sie durch eigene Angriffe und durch erlittene Treffer. Bei 100 wird automatisch der aktive Skill gewirkt, danach fällt sie auf 0.

Das ist gut lesbar (Balken füllt sich), und viele Stats greifen daran an: Energiegewinn, "Start mit X Energie", "bei Krit +10 Energie".

---

## 3. Offensive Stats

| Stat | Beschreibung |
|---|---|
| **Waffenschaden** | Min–Max, kommt von der Basis-Waffe |
| **Angriffstempo** | Angriffe pro Sekunde; wichtig für alle "bei Angriff"-Trigger |
| **Schaden % (je Typ)** | Physisch, Feuer, Kälte, Blitz, Gift |
| **Zusatzschaden (flach)** | z. B. "+5–12 Feuerschaden" pro Treffer |
| **Krit-Chance / Krit-Schaden** | Basis 5 % / 150 % |
| **Durchdringung (je Typ)** | ignoriert X % der gegnerischen Resistenz bzw. Rüstung |
| **Lebensraub** | % des verursachten Schadens als Heilung |
| **Zustandschance (je Zustand)** | z. B. "15 % Chance zu Verbrennen" |

---

## 4. Defensive Stats

| Stat | Beschreibung |
|---|---|
| **Leben** | Basis + Vitalität + Items |
| **Rüstung** | reduziert phys. Schaden mit abnehmendem Ertrag, z. B. `Rüstung / (Rüstung + 10 × Gegnerlevel)` |
| **Resistenzen** | Feuer, Kälte, Blitz, Gift; Cap 75 %. Jedes Prestige gibt einen Resistenz-Malus (wie D2 Alptraum/Hölle) |
| **Ausweichen** | Chance, einen Angriff komplett zu vermeiden; Cap z. B. 50 % |
| **Block** | Chance + Blockwert (blockt flachen Schaden); nur mit Schild |
| **Barriere** | temporäres Extra-Leben, verfällt nach Kampfende |
| **Lebensregeneration** | Leben pro Sekunde |
| **Dornen** | fester Schaden an Angreifer bei jedem erlittenen Treffer |

---

## 5. Zustände (Status-Effekte)

Jedes Element bekommt einen eigenen Zustand mit klarer Rolle, damit Schadenstypen sich unterschiedlich anfühlen.

| Zustand | Quelle | Wirkung |
|---|---|---|
| **Brennen** | Feuer | Schaden über Zeit, stapelt nicht, wird erneuert |
| **Frost** | Kälte | −X % Angriffstempo und Energiegewinn des Gegners |
| **Schock** | Blitz | Gegner erleidet +X % Schaden |
| **Gift** | Gift | Schaden über Zeit, **stapelt** |
| **Blutung** | Physisch | Schaden über Zeit, stärker, je mehr der Gegner angreift |
| **Betäubung** | selten, v. a. Skills | Angriffs- und Energie-Timer pausiert |

---

## 6. Utility & Meta

| Stat | Beschreibung |
|---|---|
| **Energiegewinn %** | schnellere Skills |
| **Start-Energie** | Skill kommt früher im Kampf |
| **Trigger-Chance %** | erhöht alle prozentualen Trigger-Chancen (starker Nischen-Stat) |
| **Zustandsdauer %** | alle ausgelösten Zustände |
| **Magic Find / Gold Find / XP %** | Loot-Qualität und Fortschritt |

---

## 7. Trigger-Affixe: Bedingung + Effekt

Jedes Trigger-Affix besteht aus vier Teilen:
**Bedingung** → **Chance** (optional) → **Effekt** → **interne Abklingzeit** (verhindert Endlosschleifen, z. B. 0,5 s).

### Bedingungen ("Wenn …")

| Gruppe | Bedingungen |
|---|---|
| **Zeit** | Kampfbeginn, alle X Sekunden, nach X Sekunden Kampf, Kampfende (Sieg) |
| **Angriff** | bei Angriff, jeder N-te Angriff, bei Treffer, bei Krit |
| **Verteidigung** | wenn getroffen, wenn ausgewichen, wenn geblockt, wenn Barriere bricht |
| **Schwellen** | Leben unter X %, Gegner-Leben unter X %, Energie voll |
| **Skill** | bei Skill-Einsatz |
| **Zustände** | wenn Gegner brennt / vergiftet ist / …, wenn du einen Zustand zufügst |
| **Tötung** | bei Tötung (nur relevant, falls mehrere Gegner pro Kampf, siehe Frage unten) |

### Effekte ("… dann")

- Zusatzschaden oder Projektil (z. B. Feuerball, Kettenblitz)
- Zustand zufügen
- Temporärer Buff (Stat + X % für Y Sekunden, ggf. stapelbar)
- Heilung oder Barriere
- Energie gewinnen
- Zusatzangriff
- Debuff auf Gegner (Rüstung/Resistenz senken)

### Beispiele, wie sie auf Items stehen würden

- "Jeder 4. Angriff verursacht 200 % Schaden"
- "Bei Krit: 25 % Chance, Brennen zu verursachen"
- "Wenn geblockt: +15 Energie"
- "Leben unter 30 %: Barriere in Höhe von 20 % max. Leben (einmal pro Kampf)"
- "Wenn der Gegner vergiftet ist: +20 % Krit-Chance"

Die letzte Art (Bedingung auf einen Zustand, den ein *anderes* Item erzeugt) ist der Kern von Synergien.

---

## 8. Level

Vorschlag pro Level: **+5 Attributpunkte** zum freien Verteilen und **+1 Skillpunkt**. Dazu eine kleine feste Steigerung von Leben.

---

## Offene Fragen

1. **Kämpft man 1 gegen 1 oder gegen Gruppen/Wellen?** Davon hängen Flächenschaden, "bei Tötung"-Trigger und Ziel-Logik ab.
2. **Attributpunkte frei verteilen (D2) oder automatisch je Klasse?** Frei ist mehr Buildtiefe, automatisch ist zugänglicher.
3. **Energie-System für Skills** wie oben, oder klassische Abklingzeiten?
