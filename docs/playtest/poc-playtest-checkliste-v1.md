# PoC-Playtest-Checkliste – v1

Stand: 01.10.2026 (M5). Grundlage: `game-design-document-v1.md`, Abschnitt 11 („Im PoC zu prüfen“).
Spielbar unter https://cedust.github.io/Emberheir/ (mit `?dev` am Ende gibt es Kampf-Tempo und Skip).

**So geht's:** Ein neues Spiel starten und einmal komplett durchspielen: Act 1 bis Gorrak, das
Prestige, danach Act 1 als Generation 2 noch einmal bis Gorrak. Am besten einmal mit **Sword** und
einmal mit **Fire Wand**. Zu jeder Frage reicht eine kurze Notiz: 👍 passt / 🤏 knapp / 👎 ändern,
plus ein Satz, warum.

## Ablauf, den der PoC abdeckt

1. Title → New Game → Waffe wählen → Camp
2. Set Out → 15 Stages (Loot-Wahl, Spoils nach Stage 5 und 10, Ember Flask) → Gorrak
3. Tod oder Retreat → Camp (alles bleibt, nur der Act-Fortschritt nicht)
4. Gorrak fällt → **Victory** → **Seal** (1 Slot versiegeln) → **Let It Burn** → **Inheritance**
5. Camp in Generation 2: Kaelen (Skill Tree, Battle Plan mit Rotation Slot 2), Liora, Supply Wagon
   abgebrannt, Act 1 mit Monster Level 3–6

## Die 5 PoC-Fragen

### 1. Heilung: Life-Zermürbung mit Ember Flask (3 × 35 %) oder volle Heilung nach jedem Kampf?

- [ ] Hattest du in der Mitte des Acts das Gefühl, haushalten zu müssen (Flask sparen, Retreat)?
- [ ] War ein Tod wegen leerer Flask fair oder frustrierend?
- [ ] Hast du Flask Charges in den Spoils gewählt? Wann?
- Zahlen zum Vergleich (Balance-Tool, Autopilot trinkt unter 50 % Life): ca. 3–4 Tode, bevor
  Gorrak in Generation 1 fällt.

### 2. Heat-Verhalten: Fühlen sich Cooling (Sword) und Warming (Wand) unterschiedlich und gleich stark an?

- [ ] Merkst du im Kampf den Unterschied (Sword: Heat durch Treffer, Wand: wird mit der Zeit heißer)?
- [ ] Fühlt sich eine Waffe klar stärker an? Balance-Tool: beide schaffen Act 1 gleich oft.
- [ ] Generation 2: Zweiter Skill im Rotation Slot 2 (Sword: Flurry, Wand: Chain Lightning).
      Macht die Rotation einen spürbaren Unterschied?

### 3. Kampfdauer (Ziel 30–60 s) und Act-Länge (15 Stages zu lang?)

- [ ] Wie fühlen sich normale Kämpfe bei 1× an: zu lang, passend, zu kurz?
- [ ] Gorrak: spannend oder zäh?
- [ ] Wie lange hat ein Durchgang durch Act 1 gedauert (Uhr), und war das zu lang?
- Zahlen nach M5 (Generation 1): Kämpfe im Schnitt **27 s**, 90 % kürzer als **37 s**, Gorrak
  ca. **36 s**. Generation 2: Sword 34 s, Wand 28 s.

### 4. Wie oft stirbt man vor dem Boss, und fühlt sich Farmen gut an?

- [ ] Wie oft bist du gestorben, bevor Gorrak fiel? Woran lag es meistens?
- [ ] Hat sich jeder neue Versuch stärker angefühlt (Level, Loot, Pity)?
- [ ] Gab es einen Moment, an dem du nicht wusstest, was du verbessern sollst?
- Zahlen: Generation 1 ca. 3,3 (Sword) bzw. 3,9 (Wand) Tode, rund 40 % davon bei Gorrak.
  Der erste Kampf eines neuen Spiels geht jetzt nie verloren (keine Elites auf Stage 1–2).

### 5. Machen Trigger-Affixe den Unterschied, den wir uns erhoffen?

- [ ] Hast du Trigger-Affixe (gelbe Zeilen „On Hit…“, „When Hit…“) im Kampf bemerkt?
- [ ] Hast du ein Item wegen eines Triggers gewählt, obwohl die Zahlen schlechter waren?
- [ ] Wirkte ein Trigger zu stark oder zu unsichtbar?

## Prestige light (neu in M5)

- [ ] Ist klar, was beim Prestige verbrennt und was bleibt (Listen „Burns“ / „Stays“)?
- [ ] Welchen Slot hast du versiegelt, und warum? (Hinweis: Mit Sword ohne versiegelte Waffe startet
      man mit einem einfachen Normal-Schwert. Das macht Generation 2 deutlich zäher.)
- [ ] Fühlt sich Generation 2 wie ein Neuanfang mit Vorsprung an, oder nur wie eine Wiederholung?
- [ ] Inheritance: Sind die Belohnungen (Seal, Rotation Slot 2, Ember, Dust, Level Cap) verständlich?
- [ ] Legacy am Hearthfire: Ist das Heirloom und die Chronicle verständlich?

## Allgemein

- [ ] Was war der beste Moment?
- [ ] Wo hast du dich gelangweilt oder geärgert?
- [ ] Was fehlt am meisten, um es „ein Spiel“ zu nennen?

## Balance-Werte nach M5 (zum Nachschlagen)

| Wert                                | Vorher     | Jetzt                        |
| ----------------------------------- | ---------- | ---------------------------- |
| Elites auf Stage 1–2                | 5 % Chance | keine                        |
| Erster Kampf verloren (neues Spiel) | 1,4 %      | 0 %                          |
| Ashen Brute Base Life               | 620        | 540                          |
| Flurry                              | 4 × 70 %   | 4 × 90 %                     |
| Prestige: Monster Level             | –          | +2 pro Prestige (Act 1: 3–6) |
| Prestige: Salvage Dust              | –          | 150 × Prestige-Stufe         |
| Prestige: Level Cap                 | 10         | 20                           |
| Prestige: Harvester's Ember         | –          | +1                           |

Nachrechnen: `npm run balance -- --act 1 --runs 300 --generations 2`
