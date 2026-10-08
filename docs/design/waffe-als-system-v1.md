# Weapon Mastery: die Waffe als eigenes System (Konzept v4, 2026-10-08)

Die 8 Bäume im Detail: `weapon-mastery-baeume-v1.md`.

Timo, 2026-10-08: Die Waffe wird kein normaler Item-Slot mehr. Sie wird mit Klasse und Waffe beim Anlegen des Charakters fest,
ist nie austauschbar, es droppen keine Waffen mehr. Stattdessen verfeinert und personalisiert man sie wie einen eigenen Skill Tree.

Baut auf: `waffen-v1.md` (Default Attack, Heat), `klassen-v2.md` (Innates, Start-Waffen pro Klasse), `item-system-v1.md`,
`legendary-runes-v1.md`, `skilltree-v2.md`.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen. Zahlen sind Startwerte für die Balance-CLI.

**Timo zu v1 (2026-10-08):**
- Das System liegt bei **Kaelen** (Trainer), der Baum heißt **Weapon Mastery** ✅
- Es ersetzt nicht die Affixe, sondern denkt die Waffe im RPG neu: Du verfeinerst die Waffe **und** lernst selbst, mit ihr umzugehen ✅
- Pfad-Nodes ✅, Innate Forms ✅, Forge Points über **Weapon Rank** ✅
- Keystones: **nur einer**, exklusiv ✅ (wo genau: Abschnitt 5)
- 25 von 30 Nodes ist zu viel: Am Ende soll sich die Waffe von anderen Spielern mit derselben Waffe unterscheiden ✅
- Heat-Verhalten, Sockets, Uniques/Sigils neu denken

**Timo zu v2 (2026-10-08):** kein selbst vergebener Waffenname, höchstens ein Name aus der Skillung wie bei den Klassentiteln ✅ ·
Glancing Blow ✅ · Weapon Damage automatisch pro Rank ✅ · Heat Forms frei wählbar ✅ (Vorauswahl ❓) · Keystones Variante A ✅ ·
keine Sockets, nur Echoes ✅ · 10. Slot: kein Cloak (schwierig mit gemalten Klassen-Assets), eher Shoulders oder Charm

**Timo zu v3 (2026-10-08):** Steady als Start ✅, aber **ohne Empfehlung** ✅ · **Charm** als 10. Slot ✅ ·
Güte-Stufen **Crude, Honed, Tempered, Ascendant, Exalted** ✅ · Echoes tragen **malerische Namen**, nicht den Boss-Namen ✅ ·
Name aus der Skillung ✅ · Bäume ausarbeiten ✅

---

## 1. Grundidee ✅

Die Waffe ist am Anfang roh, und der Heir kann noch nicht mit ihr umgehen. Weapon Mastery hat zwei Hälften:

| Hälfte | Bild | Werte |
| --- | --- | --- |
| **Refine** (die Waffe wird besser) | schleifen, auswuchten, härten | Weapon Damage, Damage Range, Heat Form |
| **Master** (du wirst besser) | Technik, Übung, Stil | Precision, Pfade, Innate Form, Keystone |

Die Waffe geht durch jedes Prestige mit. Kein selbst vergebener Name ✅, der Name ergibt sich aus der Skillung (Abschnitt 1a).

### 1a. Waffenname aus der Skillung ✅

Wie die Klassentitel, in drei Teilen, die nacheinander dazukommen:

| Teil | Kommt von | Beispiel Sword |
| --- | --- | --- |
| **Güte** (Präfix) | Weapon Rank | *Crude* (Start) → *Honed* → *Tempered* → *Ascendant* → *Exalted* |
| **Form** (Hauptwort) | gewählter Keystone, vorher der Waffentyp | *Sword* → *Parrying Blade* (Perfect Parry), *Bleeding Edge* (Deep Cuts), *Dancing Blade* (Flowing Blade) |
| **Echo** (Beiname) | getragenes Echo | *of Ashfall Wrath*, *of the Whispering Brood*, *of Stolen Dawn* |

Verlauf: *Crude Sword* → *Honed Sword* → *Tempered Parrying Blade* → *Ascendant Parrying Blade of Ashfall Wrath*.
Steht im Character View unter dem Klassentitel und im Waffen-Tooltip. Zwei Warrior mit Sword heißen so fast nie gleich.

---

## 2. Die neuen Waffenwerte 💡

### Weapon Damage (Schärfe)

Grundschaden der Waffe. Steigt **automatisch mit dem Weapon Rank** (die Waffe wird durch Benutzung besser), damit niemand
Pflicht-Punkte in reinen Schaden stecken muss und die Kurve mit den Monstern mitwächst. Nodes geben nur noch kleine Extras.

### Damage Range

Jeder Treffer würfelt zwischen **Min** und **Max** in Prozent des Weapon Damage. Start: **40–110 %** (Schnitt 75 %).

- **Steady Hand** (Nodes) hebt das Minimum: verlässlicher Schaden.
- **Full Swing** (Nodes) hebt das Maximum: große Ausreißer.
- Beide sind gedeckelt (z. B. Min höchstens 100 %, Max höchstens 200 %), Min nie über Max.

Das ist eine echte Build-Frage: Bleed (skaliert mit dem Treffer) und Crit lieben ein hohes Max, Poison-Stacks und schnelle Waffen
eher ein hohes Min.

### Precision

Chance, sauber zu treffen. Start je Waffe (Dagger 80 %, Sword 75 %, Axe 70 %, Mace 65 %, Crossbow 60 % …).
Unabhängig von der Evasion des Gegners (die würfelt weiter vorher und gibt 0 Schaden).

**Was passiert bei einem unsauberen Treffer?** Optionen:

| Variante | Wirkung | Urteil |
| --- | --- | --- |
| Miss | 0 Schaden | frustrierend bei 60 %, bestraft Cooling/Steady doppelt (keine Heat), Kämpfe werden zäh |
| Malus | z. B. −50 % Schaden | klar, aber nur eine Zahl |
| **Glancing Blow** 💡 | **50 % Schaden, kann nicht critten, keine Ailment-Chance, keine On-Hit-Trigger**. Heat gibt es normal | sichtbar, gut lesbar, macht Precision für Crit- und Ailment-Builds wichtig |

Empfehlung **Glancing Blow**. In der Arena: stumpfer grauer Funke statt Glut, kleine Zahl, Wort "Glancing".
Precision bekommt dadurch Gewicht ohne die Kämpfe zu blockieren, und Crit Chance wirkt nur auf saubere Treffer.

---

## 3. Heat Form: Heat-Verhalten frei wählbar ✅

In Weapon Mastery wählt man **eine Heat Form** (exklusiv, Respec möglich).

**Vorauswahl** ✅: Jede Waffe startet **Steady**, also neutral: lädt durch eigene Treffer, verfällt nie, kein Bonus, kein Malus.
Passt zur rohen Waffe ("du hast noch keinen Rhythmus"). Ab **Weapon Rank 3** öffnet sich die Heat-Form-Wahl, **ohne Empfehlung** ✅.
Steady ist damit der Maßstab, die anderen drei sind Tausch-Geschäfte gegen Steady.

Die Formen:

| Heat Form | Lädt durch | Bonus | Malus |
| --- | --- | --- | --- |
| **Cooling** | eigene Treffer | +25 % Heat per Hit | verliert 1 Heat/s |
| **Steady** (Start) | eigene Treffer | verfällt nie | keiner (und kein Bonus) |
| **Warming** | 12 Heat/s, egal was passiert | planbar, Attack Speed egal | Treffer geben keine Heat, Attack Speed lädt nicht schneller |
| **Smoldering** (neu) | erlittene Treffer (1 Heat pro 1 % Max Life) | +10 % Armor, startet mit 20 Heat | eigene Treffer geben nur 30 % Heat |

Smoldering ersetzt die heutigen Might-Nodes Battle Scars / Grudge / Unbroken als Tank-Weg. So kann ein Sword-Warrior auch
Warming spielen, ein Crossbow-Hunter Cooling. Die Klasse bleibt erkennbar über Default Attack, Innate und Pfade.

---

## 4. Aufbau des Baums 💡

Ca. **50 Nodes pro Waffentyp**, bis zum Ende ca. **20 Punkte** (40 %). Pro Weapon Rank 1 Punkt.

| Teil | Nodes | Wahl |
| --- | --- | --- |
| **Refine** (Kern um die Waffe) | Steady Hand, Full Swing, Precision (je mehrere Ränge), etwas Weapon Damage, Attack Speed | frei |
| **Heat Form** | 4 | 1 aus 4 |
| **Innate Form** | 3 | 1 aus 3 |
| **3 Pfade** | je ca. 10, mit 2 Notables | man schafft etwa einen Pfad ganz oder zwei halb |
| **Keystone** | 4–5 | **1 aus allen** |

Beispiel Sword:

| Pfad | Spielgefühl | Beispiel-Nodes |
| --- | --- | --- |
| **Riposte** | Konter | Riposte-Chance 15 → 35 %, Riposte trifft immer sauber, Riposte setzt Sunder |
| **Edge** | Präzision, Crit | +Precision, saubere Crits lassen bluten |
| **Tempo** | Rhythmus | +Attack Speed, jeder 3. Slash +Heat |

Innate Forms Sword: Power Strike wird *Cleaving Strike* (mehr Schaden), *Rising Strike* (gibt Heat zurück) oder *Sundering Strike*.

---

## 5. Keystones: nur einer ✅ (Ort 💡)

Zwei Möglichkeiten:

- **A (Empfehlung):** Ab **12 ausgegebenen Punkten** öffnet sich in der Mitte ein Keystone-Ring. Man wählt **einen** von 4–5, unabhängig vom Pfad.
  So entstehen Mischungen: Tempo-Pfad mit *Deep Cuts*, Riposte-Pfad mit *Flowing Blade*. Mehr Unterschiede zwischen Spielern.
- **B:** Keystone am Ende jedes Pfads, wer einen nimmt, sperrt die anderen. Klarer, aber Pfad und Keystone hängen fest zusammen.

Sword-Keystones: **Perfect Parry** (Block und Evade lösen Riposte aus, −10 % Attack Speed), **Deep Cuts** (Crits verdoppeln
laufenden Bleed, Damage Range Min −20 %), **Flowing Blade** (Cooling kühlt nicht, solange du triffst; Glancing Blows unterbrechen es),
**Executioner's Form** (+50 % Schaden unter 30 % Gegner-Life, darüber −15 %).

---

## 6. Sockets ✅

**Keine Sockets auf der Waffe, nur Echoes.** Sockets und Runewords bleiben das Ding der Normal-Base-Items.
Die 4 Waffen-Runewords (Kindling, Splinter, Rotheart, Hearthfire) wandern auf andere Slots (z. B. Gloves, Off Hand) oder fallen weg.

---

## 7. Echoes statt Waffen-Uniques ✅ (Namen und Wirkung: `weapon-mastery-baeume-v1.md`)

Neu gedacht ohne Item-Logik: **Die Waffe erinnert sich an die Bosse, die sie besiegt hat.**

- Der **erste Sieg über einen Act-Boss** mit dieser Waffe gibt ein **Echo** (fest, kein Zufall). 7 Bosse, 7 Echoes, dazu der Harvester.
- Echoes sind die Boss-Powers, die es heute als Trophäen gibt: Gorrak → *Counter Slam*, Mother of Rot → *Mother's Brood*,
  Cinder Tyrant → *Tyrant's Wrath*, Rime Warden → *Avalanche*, Storm Herald → *Herald's Bolt*, Voidborn Maw → *Endless Hunger*,
  Harvester → *Last Harvest*.
- Man trägt **ein Echo** (bei Kaelen wechselbar). Ein Echo wird mit jedem späteren Sieg über denselben Boss (neue Runs) eine Stufe stärker.
- In der Arena: Die Waffe trägt die Farbe des Echos (Gorrak Steingrau, Mother of Rot Moosgrün …), die Power hat ihren eigenen Effekt.

Damit bleibt ein Boss-Moment ("die Klinge hat Gorraks Wut aufgenommen"), aber ohne Drop-Glück und ohne Item-Logik.
Die Waffen-Uniques (Heirloom Blade, Cinderwick, Rotfang) fallen weg oder werden zu Echo-Ideen.

---

## 8. Der 10. Slot: Charm ✅

Kein Cloak ✅ (mit gemalten Klassen-Assets schwer sichtbar zu machen). Kandidaten:

| Slot | Affixe | Für und Wider |
| --- | --- | --- |
| **Charm** 💡 | **nur Trigger-Affixe** (1 bei Magic, bis 3 bei Epic), keine Stats | unsichtbar, also kein Asset-Problem; ein reiner Build-Baustein; passt zum Trigger Codex; wenig Überschneidung mit anderen Slots |
| Shoulders | Armor, Life, Resistances | müsste auf dem gemalten Charakter sichtbar sein oder bleibt ein unsichtbarer Rüstungsteil; überschneidet sich stark mit Helm und Body Armor |

Entschieden ✅ **Charm**: ein Slot, der etwas Neues kann, statt eines vierten Rüstungsteils. Icon im Paperdoll neben dem Amulet.

---

## 9. Folgen für andere Systeme

| System | Folge |
| --- | --- |
| **Klassen** | "Jede Klasse kann jede Waffe tragen" fällt weg. Klasse + Waffe = Charakter |
| **Innate** | fest am Charakter, die Regel "Slot übernimmt den Innate der neuen Waffe" entfällt |
| **Skill Tree** | Battle Scars / Grudge / Unbroken gehen in die Heat Form Smoldering, Kaelen bekommt einen zweiten Reiter |
| **Loot** | keine Waffen-Karten mehr; Waffen-Affixe nur noch auf den passenden anderen Slots; Marisha ohne Main Hand; Temper/Reforge/Ascension Shard nicht mehr für Waffen |
| **Balance** | Glancing Blows und die breite Range senken den frühen Schaden; Weapon Damage pro Rank gleicht aus. Balance-CLI braucht einen Mastery-Autopilot |
| **Arena** | Glancing Blow, Damage Range (große Zahl bei Max-Treffern), Heat Form, Echo, Keystone: jeweils eigener Effekt |
| **Alte Spielstände** | die ausgerüstete Waffe wird die feste Waffe, Ränge nach Level gutgeschrieben, andere Waffen werden zu Dust |

---

## 10. Nächster Schritt

Die 8 Bäume (`weapon-mastery-baeume-v1.md`) mit Timo abstimmen, dann Umsetzung planen.
