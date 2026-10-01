# Stat-Liste – v2

Stand: 28.09.2026. Ersetzt v1. Spielbegriffe sind englisch, Erklärungen deutsch.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen / im PoC prüfen

Leitgedanke: Jeder Stat bringt direkt Stärke **oder** füttert einen Trigger. Kampf ist 1v1 ✅.

---

## 1. Attributes ✅

| Attribute | Wirkung | Rolle |
|---|---|---|
| **Strength** | Physical Damage %, Armor | Kraft |
| **Dexterity** | Crit Chance, Trigger Chance | Präzision / Technik |
| **Agility** | Attack Speed, Evasion | Tempo |
| **Intelligence** | Elemental Damage %, All Resistance (klein, Resistances kommen vor allem über Items) | Magische Kraft |
| **Wisdom** | Heat Gain, Ailment Duration | Magische Kontrolle |
| **Vitality** | Life, Tenacity | Überleben |

Verworfen: Luck, Constitution, Charisma. Was ein Level-Up bringt: siehe GDD Abschnitt "Level" ✅ (Attributpunkte, 1 Skillpunkt, Base Life; Level bleibt beim Prestige).

---

## 2. Build-Achsen (klassenlos, Variante A) ✅

| Achse | Pole | Bestimmt durch |
|---|---|---|
| **Damage Type** | Physical / Elemental | Skill Tree, Affixe |
| **Range** | Melee / Ranged | Waffe |
| **Delivery** | Direct / Over Time | Skills, Trigger-Affixe |

Details und die 8 Archetypen: `klassen-varianten.md`.

💡 Range-Mechanik im 1v1: Ranged greift sofort an, Melee muss erst die Distanz schließen (1–2 s), trifft dafür härter.

---

## 3. Heat ✅

- Eine Leiste (0–100), gefüllt durch Angriffe, erlittene Treffer usw.
- **1–3 Skill Slots** 💡 (weitere über Prestige / Skill Tree), jeder Skill hat eigene **Heat Cost**.
- Skills laufen in einer festen, vom Spieler gesetzten **Rotation** ✅. Sobald genug Heat für den nächsten Skill da ist, wird er gewirkt.
- Passive Skills kosten nichts.
- ✅ Verhalten je Waffe: **Cooling** (Melee), **Steady** (Bow, Crossbow), **Warming** (Wand, Staff). Details in `waffen-v1.md`.

---

## 4. Offensive Stats

| Stat | Beschreibung |
|---|---|
| **Weapon Damage** | Min–Max, von der Basis-Waffe |
| **Attack Speed** | Angriffe pro Sekunde |
| **Damage % (je Typ)** | Physical, Fire, Cold, Lightning, Void |
| **Added Damage** | flacher Zusatzschaden, z. B. "+5–12 Fire Damage" |
| **Crit Chance** | Basis 5 %, skalierbar |
| **Crit Damage** | ✅ **fix 150 %**, nicht erhöhbar (gegen Power Creep) |
| **Penetration (je Typ)** | ignoriert X % Resistance bzw. Armor |
| **Lifesteal** | % des Schadens als Heilung; ✅ wirkt nur auf eigene Hits, nicht auf DoT-Ticks |
| **Ailment Chance (je Ailment)** | z. B. "15 % Chance to Burn" |

---

## 5. Defensive Stats

| Stat | Beschreibung |
|---|---|
| **Life** | Basis + Vitality + Items |
| **Armor** | reduziert Physical Damage mit abnehmendem Ertrag, z. B. `Armor / (Armor + 10 × Gegnerlevel)` |
| **Resistances** | Fire, Cold, Lightning, Void; Cap 75 %; statt Malus je Prestige steigt die Resistance Penetration der Monster mit dem Monsterlevel ✅ |
| **Evasion** | Chance, einen Angriff komplett zu vermeiden; Cap z. B. 50 % |
| **Block** | Block Chance + Block Value; nur über Shield / Items, nicht über Attribute |
| **Tenacity** | reduziert Dauer (und ggf. Chance) von Ailments auf dir |
| **Barrier** | temporäres Extra-Life, verfällt nach dem Kampf |
| **Thorns** | fester Schaden an den Angreifer bei jedem erlittenen Treffer |
| **Life on Kill** 💡 | heilt X % Max Life nach jedem Sieg (im 1v1 = einmal pro Stage). Klein halten: **3–8 %**, nur auf Amulet, Belt, Ring, dazu ein Notable im Core-Tree. Wirkt für alle Builds, auch DoT. |
| ~~Life Regeneration~~ | ✅ verworfen. Keine freie Heilung nach dem Kampf, Life bleibt zwischen Stages, Heilung über Ember Flask (siehe GDD, Heilung). |

---

## 6. Damage Types & Ailments ✅

| Damage Type | Element | Ailment | Mechanik |
|---|---|---|---|
| Physical | – | **Bleed** | DoT, stark und kurz, skaliert mit der Höhe des Treffers |
| Physical | – | **Poison** | DoT, schwach pro Stack, **stapelt**, skaliert mit vielen Treffern |
| Elemental | Fire | **Burn** | DoT, wird erneuert (neue Anwendung setzt Dauer zurück), **reduziert Heilung** des Gegners |
| Elemental | Void | **Corruption** | DoT, **wird stärker, je länger sie läuft** |
| Elemental | Cold | **Chill** | −X % Attack Speed und Heat Gain des Gegners |
| Elemental | Lightning | **Shock** | Gegner erleidet +X % Schaden |
| – | – | **Stun** 💡 | selten, v. a. Skills; pausiert Angriffe und Heat |

---

## 7. Utility

| Stat | Beschreibung |
|---|---|
| **Heat Gain %** | Skills kommen öfter |
| **Starting Heat** | erster Skill kommt früher |
| **Trigger Chance %** | erhöht alle prozentualen Trigger-Chancen |
| **Ailment Duration %** | alle zugefügten Ailments |

Verworfen ✅: Magic Find, Gold Find, XP %.

---

## 8. Trigger-Affixe

Aufbau: **Condition** → **Chance** (optional) → **Effect** → **Internal Cooldown** (verhindert Endlosschleifen).

### Conditions

| Gruppe | Conditions |
|---|---|
| Time | On Fight Start, Every X Seconds, After X Seconds, On Victory |
| Attack | On Attack, Every Nth Attack, On Hit, On Crit |
| Defense | When Hit, On Evade, On Block, When Barrier Breaks |
| Threshold | Life below X %, Enemy Life below X %, Heat Full |
| Skill | On Skill Use |
| Ailment | While Enemy is Burning / Poisoned / …, On Inflicting Ailment |

"On Kill" entfällt im 1v1 (bzw. = On Victory).

### Effects

- Extra Damage / Projectile (z. B. Fireball, Chain Lightning, Void Bolt)
- Ailment zufügen
- Buff (Stat +X % für Y Sekunden, ggf. stapelbar)
- Heal oder Barrier
- Heat gewinnen
- Extra Attack
- Debuff (Armor / Resistance senken)

### Beispiele

- "Every 4th Attack deals 200 % Damage"
- "On Crit: 25 % Chance to Burn"
- "On Block: +15 Heat"
- "Life below 30 %: gain Barrier equal to 20 % Max Life (once per fight)"
- "While Enemy is Poisoned: +20 % Crit Chance"
- "Corruption on the Enemy lasting over 5 s: +1 Heat per second"
- "On Victory: 20 % Chance to gain a Flask Charge" 💡 (seltenes Affix)

---

## Offene Punkte

1. ~~Level-Up-Belohnungen~~ ✅ entschieden, siehe GDD Abschnitt "Level"
2. ~~Heat-Verhalten je Waffe~~ ✅ entschieden, siehe `waffen-v1.md`
3. ~~Life Regeneration / Heilung~~ ✅ entschieden (Ember Flask, Life on Kill 💡)
4. Konkrete Zahlen (Basiswerte, Caps, Skalierung) – sinnvoll erst mit PoC
