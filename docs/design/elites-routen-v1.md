# Elites, Routen, Item-Picks und Training Dummy v1

Stand 13.10.2026 · Phase 4 der Neuausrichtung (`neuausrichtung-v1.md` 6 und 9) · gebaut, Zahlen sind Startwerte ·
Game-Begriffe auf Englisch

Timo (13.10.): „Du machst einen Vorschlag.“ Dies ist der Vorschlag für die Elite-Modifier pro Act, so wie er gebaut ist.
Alles ist Daten in `packages/content/src/elites.ts` und lässt sich ohne Code ändern.

---

## 1. Elites mit Thema (6.1)

**Regel:** Ein Elite würfelt zuerst einen Modifier **seines Acts**, dann allgemeine. Emberfall (Act 7) hat keine eigenen,
dort kommt der erste Modifier aus allen Acts. Der Elite heißt nach seinem Act-Modifier („Rootbound Barkhide“).

**Beute nach Thema:** Jeder Modifier hat `lootTags`. Affixe mit einem dieser Tags würfeln auf der Beute des Elites
4-mal so oft (`PROGRESSION.eliteThemeWeight`). „Ich brauche Lifesteal, ich jage Vampiric- und Hungering-Elites.“

### 1.1 Act-Modifier (neu, 18)

| Act | Modifier | Wirkung | Frage an den Build | Beute (Tags) |
|---|---|---|---|---|
| Ashen Fields | **Ironhide** | +25 Armor, +20 % Tenacity | Penetration, Sunder, Elemental? | defense |
| | **Brawler** | jeder 4. Angriff trifft doppelt | Armor, Block | physical, offense |
| | **Ash Cloak** | Barrier 25 % seiner Life beim Kampfstart | Reaction „Barrier bricht“, Burst | barrier |
| Rotwood | **Sporeburst** | jeder 4. erlittene Treffer vergiftet dich | Tenacity, schnell töten | ailment |
| | **Rootbound** | heilt alle 2 s 3 % Life | Burn (halbe Heilung), Burst | life |
| | **Thornbark** | 5 Thorns, +30 % Bleed Chance | wenige große Treffer statt vieler kleiner | physical, ailment |
| Ember Wastes | **Cinderborn** | +35 % Burn Chance | Fire Resistance, Draught | elemental, resistance |
| | **Molten Core** | einmal unter 50 %: Barrier 30 % | Reaction „Barrier bricht“ | barrier, defense |
| | **Wildfire Heart** | +50 % Heat Gain (mehr Skills) | Defense gegen Skill-Spitzen | heat |
| Frost Peaks | **Rimebound** | +35 % Chill Chance | Cold Resistance, Tenacity | elemental, resistance |
| | **Ice Shell** | alle 12 s Barrier 6 % | Dauerdruck, DoT | barrier, defense |
| | **Numbing Blow** | jeder 8. Angriff betäubt dich 0,5 s | Tenacity | defense, speed |
| Storm Spires | **Stormcharged** | +35 % Shock Chance | Lightning Resistance | elemental, crit |
| | **Static Skin** | jeder 5. erlittene Treffer blitzt zurück (max 4 % deiner Life) | wenige große Treffer, Block | resistance, block |
| | **Blinking** | +12 % Evasion | Precision, Spells, DoT | crit, speed |
| Void Rift | **Voidtouched** | +35 % Corruption Chance | Void Resistance, kurze Kämpfe | ailment, elemental |
| | **Hungering** | 15 % Lifesteal, +15 % Tenacity | Burn, Burst | life |
| | **Rift Surge** | alle 6 s +30 Heat | Reaction auf Telegraph | heat, offense |

### 1.2 Allgemeine Modifier (bestehend, jetzt mit Beute-Thema)

| Modifier | Beute (Tags) |
|---|---|
| Extra Fast | speed |
| Stone Skin | defense, resistance |
| Vampiric | life |
| Thorns | defense, block |
| Enraged | speed, offense |

### 1.3 Champions (6.1, Punkt 5)

- Ab **Run 3** ist ein Elite mit **4 %** Chance ein **Champion** (nicht auf Gatekeeper-Stages). Mit 3–5 Elites pro
  Act-Strecke sind das etwa 12–20 % pro Strecke.
- Ein Champion hat **drei Modifier** (Act + zwei allgemeine), **+30 % Life** und einen eigenen **Hoard**: 4 Karten,
  eine davon sicher **Epic**, mit **15 %** eine Legendary-Karte.
- In der Arena: violett-goldene Doppel-Aura, auf der Plakette das Schild **CHAMPION**.

### 1.4 Looks

Die Modifier selbst bekommen noch keinen eigenen Look (Timo: Looks erst mit den gemalten Assets, `merkliste-spaeter.md`).
Elite-Aura, Champion-Aura und Gatekeeper-Tor gibt es schon.

---

## 2. Routen (6.2)

- **Gabelungen:** die zwei Stages direkt vor jedem Waymark vor dem Boss. Im 15-Stage-Act sind das 3–4 und 8–9, in
  Emberfall (10 Stages) nur 5–6. So bleiben beide Wege gleich lang, die Gatekeeper stehen fest.
- **Wahl:** in der Intermission vor der Gabelung (auch schon in den Rewards der Stage davor). Ohne Wahl gilt der
  Shrine-Pfad. Die Straßenkarte zeigt die Gabelungen als Bogen über den beiden Stages.

| Pfad | Inhalt |
|---|---|
| **Elite** | beide Stages sind sichere Elites mit Thema-Beute; sie zahlen in Beute, nicht in Boons (keine Shrine) |
| **Shrine** | zwei Kämpfe, nach dem zweiten eine Ember Shrine (Boon) |
| **Hearth** | zwei Kämpfe, nach dem zweiten heilt der Held 25 % Life |
| **Thief's Trail** | nur mit offener Thief-Bounty: der Ember Thief steht sicher auf der ersten Stage |

- Keine Routen im Wildfire und im Finale.
- **Autopilot:** Life ≥ 75 % → Elite, unter 50 % → Hearth, sonst Shrine.

---

## 3. Item-Picks: weniger, aber schwerer (6.3)

| Kampf | vorher | jetzt |
|---|---|---|
| normal | 1 aus 3 nach jedem Sieg | **jede dritte Stage** 1 aus 3, sonst werden die Karten sofort zu Ash; gilt auch in Run 1 (Timo 15.10.2026; vorher hatte Run 1 einen Pick nach jedem Kampf) |
| Elite, Gatekeeper | 1 aus 3 | 1 aus 3 mit Thema-Beute (1.1) |
| Champion | – | Hoard aus 4 Karten, sicher Epic, 15 % Legendary |
| Boss | Hoard 6 Karten, 2 Picks | wie vorher, dazu **eine Build-Karte**: ihre Affixe würfeln 4-mal so oft mit den Tags des Builds (physical/elemental, ailment ab 15 % Chance, crit ab 15 %) |

**Upgrade-Markierung:** Die Pfeile auf den Loot-Karten („▲ +8 % DPS“) kommen jetzt aus dem Training Dummy (Kampf gegen
die Haut des nächsten Act-Bosses, 20 s), nicht mehr aus einer Schätzung. Ailments, Trigger und Battle Plan zählen mit.

---

## 4. Training Dummy (9)

Neuer Reiter **Training Dummy** bei Kaelen (nur im Camp):

- **Drei Dummies:** Straw Man (ohne Defense), Boss Hide (Armor und Resistances des nächsten Act-Bosses), Striking (der
  Boss schlägt zurück: Schaden genommen gegen Heilung pro Sekunde).
- **Zahlen** (30 s, fester Seed): Schaden/s gesamt und nach Quelle (Default Attack, Skills, Trigger, Ailments,
  Payoffs), Heat/s, Trigger pro Minute, Crit-Rate, Anteil Glancing Blows.
- **Anprobieren:** Items aus Inventar und Supply Wagon mit ihrem Unterschied (DPS, Life) gegen das getragene Item; ein
  Klick auf „Wear“ legt es an, die Zahlen springen sofort.
- Kein Respec im Dummy.
