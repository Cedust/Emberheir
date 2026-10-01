# Skills – Entwurf v1

Stand: 28.09.2026. Baut auf `stat-liste-v2.md` und `skill-tree-v1.md` auf.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

## Was schon feststeht ✅

- Aktive Skills werden über Skill-Nodes im Skill Tree freigeschaltet. Items verstärken sie ("+1 to Fire Skills"), schalten sie aber nicht frei.
- Skills laufen in einer festen, vom Spieler gesetzten Rotation und kosten Heat.
- Skill Slots sind dauerhafte Upgrades außerhalb des Trees (Vorschlag: 1 zu Beginn, 2 nach Prestige 1, 3 nach Prestige 3).

---

## 1. Ablauf im Kampf 💡

1. Der Held führt automatisch **Basic Attacks** aus (Tempo = Attack Speed).
2. Basic Attacks und erlittene Treffer füllen die **Heat**-Leiste (0–100).
3. Ein Zeiger zeigt auf den **nächsten Skill der Rotation**.
4. Sobald Heat ≥ **Trigger Threshold** dieses Skills ist (Default und Minimum = Cost, siehe Abschnitt 5), **ersetzt der Skill die nächste Basic Attack**.
5. Nur die **Cost wird abgezogen** ✅, Rest-Heat bleibt. Der Zeiger springt zum nächsten Slot, nach dem letzten wieder zu Slot 1.

Warum "ersetzt die nächste Basic Attack": Das ist gut lesbar (Held holt aus → Skill), und schnelle Waffen wirken Skills etwas früher.

**Heat-Quellen** 💡
- Pro Basic Attack: fester Wert je Waffe. Langsame Waffen geben mehr pro Treffer, damit alle Waffen ungefähr gleich schnell laden.
- Pro erlittenem Treffer: kleiner Wert.
- Heat Gain % (Wisdom, Items) skaliert beides.
- Trigger-Affixe ("On Block: +15 Heat").
- Heat-Verhalten (Cooling/Steady/Warming) über Waffe bzw. Keystone.

**Die Rotation als Entscheidung:** Ein teurer Skill in Slot 2 hält Slot 3 auf, bis genug Heat da ist. Günstige Skills vor teure zu setzen, oder einen Buff direkt vor den großen Treffer, ist die eigentliche Build-Entscheidung.

### Beispiel: Pyromancer mit 3 Slots

| Slot | Skill | Cost |
|---|---|---|
| 1 | Immolate (starker Burn) | 30 |
| 2 | Wither (Gegner erleidet +25 % DoT-Schaden) | 35 |
| 3 | Soul Harvest (entlädt alle DoTs sofort) | 70 |

Bei ca. 12 Heat pro Sekunde: Immolate nach ~2,5 s, Wither nach ~5,5 s, Soul Harvest nach ~11 s, dann von vorn. Der große Schaden kommt genau dann, wenn Burn und Debuff aktiv sind.

---

## 2. Aufbau eines Skills 💡

| Feld | Beschreibung |
|---|---|
| **Name** | englisch |
| **Heat Cost** | 20–100 |
| **Type** | **Attack** (skaliert mit Weapon Damage), **Spell** (eigener Basisschaden, skaliert mit Skill Level), **Buff** (wirkt auf dich, skaliert Dauer/Stärke mit Skill Level), **Curse** ✅ (Debuff auf den Gegner, z. B. Wither) |
| **Tags** | Physical/Fire/Cold/Lightning/Void, Direct/Over Time, Melee/Ranged/Any, Defensive |
| **Skill Level** | Ränge im Skill-Node (1–5) + Item-Boni ("+1 to Fire Skills") |
| **Effekt** | was passiert |

- Tags sind die Grundlage für Item-Affixe ("+1 to Void Skills"), Trigger ("On Using a Buff Skill") und Keystones.
- Die meisten Skills sind **Any** (funktionieren mit Melee und Ranged, Grafik passt sich an). Wenige sind waffengebunden.
- Attack vs. Spell sorgt dafür, dass Weapon Damage nicht für alles gilt. Wand und Staff verstärken Spells über ihre Implicits.

---

## 3. Erste Skills pro Grundast 💡

### Might (Physical Direct)

| Skill | Cost | Type | Effekt |
|---|---|---|---|
| **Power Strike** | 25 | Attack, Any | 220 % Weapon Damage |
| **Flurry** | 50 | Attack, Any | 4 schnelle Treffer à 70 %, jeder kann critten und On-Hit auslösen |
| **Sunder** | 40 | Attack, Melee | 150 % Weapon Damage, −20 % Armor für 6 s |
| **Battle Cry** | 35 | Buff | +25 % Attack Speed für 5 s |
| **Execute** | 90 | Attack, Any | 400 % Weapon Damage, doppelt gegen Gegner unter 30 % Life |

### Rupture (Physical Over Time)

| Skill | Cost | Type | Effekt |
|---|---|---|---|
| **Lacerate** | 25 | Attack, Any | 100 % Weapon Damage, garantierter Bleed |
| **Venom Coat** | 40 | Buff | Die nächsten 5 Angriffe fügen je 1 Poison Stack zu |
| **Rend** | 60 | Attack, Melee | Beendet Bleed und verursacht dessen Restschaden sofort ×1,5 |
| **Toxic Burst** | 80 | Attack, Any | Verdoppelt die Poison Stacks auf dem Gegner |

### Arcana (Elemental Direct)

| Skill | Cost | Type | Effekt |
|---|---|---|---|
| **Firebolt** | 20 | Spell, Fire | kleiner, günstiger Treffer |
| **Ice Lance** | 35 | Spell, Cold | mittlerer Treffer, garantierter Chill |
| **Chain Lightning** | 50 | Spell, Lightning | 3 Treffer mit abnehmendem Schaden, je Treffer Shock-Chance |
| **Void Bolt** | 45 | Spell, Void | ignoriert 30 % Void Resistance |
| **Elemental Weapon** | 30 | Buff | Nächste 4 Angriffe: +40 % Weapon Damage als Elemental Damage (Spellblade-Skill) |
| **Meteor** | 100 | Spell, Fire | sehr großer Treffer |

### Affliction (Elemental Over Time)

| Skill | Cost | Type | Effekt |
|---|---|---|---|
| **Immolate** | 30 | Spell, Fire | starker Burn |
| **Corrupt** | 40 | Spell, Void | Corruption, startet auf einer höheren Stufe |
| **Wither** | 35 | Debuff | Gegner erleidet +25 % DoT-Schaden für 8 s |
| **Soul Harvest** | 70 | Spell | verursacht sofort 4 Sekunden Schaden aller aktiven DoTs, DoTs laufen weiter |

### Core (Defensive)

| Skill | Cost | Type | Effekt |
|---|---|---|---|
| **Second Wind** | 60 | Buff | Barrier in Höhe von 25 % Max Life |
| **Guard** | 30 | Buff | Die nächsten 3 erlittenen Treffer −50 % Schaden |

### Prestige-Äste (je 1 Signature Skill)

| Ast | Skill | Idee |
|---|---|---|
| Duelist | **Riposte** | Die nächsten 3 Blocks/Evades kontern mit 150 % Weapon Damage |
| Marksman | **Rain of Arrows** | 8 Projektile, jedes löst On-Hit aus |
| Butcher | **Bloodbath** | Bleed explodiert bei Ablauf |
| Venomancer | **Plague** | Poison Stacks verfallen 10 s lang nicht |
| Stormcaller | **Thunderstorm** | 6 s lang jede Sekunde ein Blitz |
| Frostbinder | **Glacial Prison** | Friert den Gegner 2 s ein (pausiert Angriffe und Heat) |
| Pyromancer | **Inferno** | Burn stapelt 8 s lang |
| Void Lord | **Void Rift** | Corruption springt sofort auf die höchste Stufe |
| Warden | **Bulwark** | 5 s lang 100 % Block Chance |
| Tactician | **Overdrive** | Nächster Skill kostet 0 Heat |

---

## 4. Für den PoC 💡

**Start-Skill** ✅ (30.09.2026, Thread "UI Views"): Jede Waffe bringt 1 Start-Skill mit, der automatisch ausgerüstet ist (zusätzlich zur Default Attack). Weitere Skills kommen aus dem Skill Tree, der erst ab Act 2 bei Kaelen offen ist. Den Battle Plan bearbeitet man daher erst ab Act 2 (bei Kaelen 💡).

Might + Arcana mit je 3 Skills (z. B. Power Strike, Flurry, Execute / Firebolt, Chain Lightning, Meteor) und 1–2 Slots. Das reicht, um Rotation, Heat und die Wechselwirkung mit Trigger-Affixen zu testen.

---

## 5. Trigger Threshold ✅ (Idee von Timo)

Pro Slot legt man fest, ab wie viel Heat der Skill auslöst. Default und Minimum ist die Cost.

Beispiel: Battle Cry (20) vor Execute (50). Threshold von Battle Cry = 70. Der Held wartet bis 70 Heat, setzt Battle Cry (−20, Rest 50) und direkt danach Execute. Buff und großer Treffer kommen also zusammen.

---

## 6. Skill Bar als eigenes Prestige-System ✅

Die Skill Bar wird neben Save Tokens und Skill Tree zum dritten großen Prestige-System. Arbeitsname: **Battle Plan**.

### Zwei Slot-Arten

- **Rotation Slots:** laufen der Reihe nach, wie bisher.
- **Reaction Slots:** stehen außerhalb der Rotation und lösen nur bei einer **Condition** aus, z. B. "Life below 40 %", "Enemy is charging a heavy attack", "Fight Start". Kosten ebenfalls Heat.

Das ist die Antwort auf "Warum defensive Skills ausrüsten?": Ein defensiver Skill in einem Reaction Slot kostet **keinen Platz in der Schadens-Rotation** und feuert nur, wenn er gebraucht wird.

### Regeln für Reaction Slots ✅

- **Zwei Arten von Conditions:** Events (Telegraph startet, Gegner heilt, Barrier bricht) und Schwellen (Life below 30 %).
- Schwellen lösen **einmal beim Überschreiten** aus, nicht dauerhaft. Erst wenn der Wert wieder darüber liegt, ist der Slot wieder scharf.
- Jeder Reaction Slot hat zusätzlich eine **Abklingzeit** (z. B. 10 s).
- Reaction Skills kosten Heat aus derselben Leiste und schieben sich vor den nächsten Rotation Skill. Der Zeiger der Rotation bleibt stehen. Das ist der Preis: Jede Reaktion verzögert den Schaden.

### Weitere Hebel für defensive Skills

- **Gegner, die reine Schadens-Builds bestrafen:** Bosse mit angekündigten Heavy Attacks, Enrage-Phasen, Burst-Fenstern. Guard oder Second Wind im Reaction Slot rettet genau dann.
- **Defensive Skills mit Offensiv-Payoff:** Riposte, Thorns, "On Barrier Break"-Trigger, Warden-Keystones. Verteidigung wird zur Schadensquelle.
- **Günstige Costs:** Defensive Skills kosten wenig Heat und verzögern die Rotation kaum.

### Slot Modifiers

Jeder Slot kann einen Modifier bekommen, z. B.:
- −15 % Cost
- +1 Skill Level
- **Reverb** (früher Echo): 20 % Chance, den Skill sofort gratis zu wiederholen
- **Overcharge:** Wird der Skill über seiner Cost ausgelöst, wirkt überschüssiges Heat als +% Effekt

### Zielkorridor im Endgame

**4 Rotation Slots + 2 Reaction Slots.** Mehr als 4 Rotation Slots machen die Rotation lang und träge (Summe der Costs > 250), jede einzelne Entscheidung zählt dann weniger.

### Freischaltung über 10 Prestiges (Vorschlag)

| Prestige | Battle Plan Upgrade |
|---|---|
| Start | 1 Rotation Slot |
| 1 | Rotation Slot 2 |
| 2 | Trigger Threshold einstellbar |
| 3 | Rotation Slot 3 |
| 4 | Reaction Slot 1 |
| 5 | Slot Modifiers (1 pro Slot) |
| 6 | Rotation Slot 4 |
| 7 | Reaction Slot 2 |
| 8 | Conditions auch für Rotation Slots ("skip if Enemy is not Burning") |
| 9 | 2. Slot Modifier pro Slot |
| 10 | **Capstone** nach Wahl, siehe unten ✅ |

Pro Prestige gibt es damit drei Belohnungen: +1 Save Token, 1 neuer Skill-Tree-Ast, 1 Battle-Plan-Upgrade. Das 10. Prestige folgt auf den 10. Durchgang, der Capstone wird also im Finale **The Last Ember** genutzt (siehe GDD, Zählweise).

### Capstones ✅ (30.09.2026, Thread "Prestige schärfen")

Beim 10. Prestige wählt man **1 von 6 Capstones**. Beim Trainer lässt er sich gegen Gold wechseln. Jeder Capstone stärkt einen anderen Build-Typ. Werte über die Balance-CLI.

| Capstone | Effekt | Passt zu |
|---|---|---|
| **Echo** | Slot Modifier auf einem frei gewählten Slot: Der Skill dort feuert ein zweites Mal mit 50 % Wirkung. | großen Einzel-Skills |
| **Crescendo** | Pro 100 ausgegebener Heat +1 Stack Damage bis Kampfende. Zählt Heat, nicht Rotationen, damit leere Slots oder Billig-Skills keinen Vorteil bringen. | langen Kämpfen, DoT |
| **Vigil** | Reaction-Skills kosten keine Heat mehr, ihr Cooldown verdoppelt sich. Die Rotation wird nie angezapft. | defensiven Builds |
| **Ignition** | Kämpfe starten mit voller Heat, der erste Rotationsdurchlauf kostet nichts. | Burst, Cooling-Waffen |
| **Lingering Flame** | Jeder Skill-Treffer frischt die Dauer aller Ailments auf dem Gegner auf (Anteil der Dauer als Stellschraube, z. B. 50 %). | DoT-Builds |
| **Ember Ward** | Jeder Skill gibt einen Schild in Höhe von X % der gezahlten Heat, max. 20 % Max Life, zerfällt langsam. | Tank, Sustain |

Verworfen: Overflow (Heat-Leiste bis 150, bringt ohne Sparen kaum etwas), Flashpoint (Auto-Crit bei voller Leiste, entweder gratis oder gleich wie Echo), Catalyst (Trigger-Affixe).

✅ Der normale Slot Modifier mit 20 % Gratis-Wiederholung heißt jetzt **Reverb**, damit der Capstone Echo heißen kann (30.09.2026).

---

## Entscheidungen (28.09.2026)

- Nur Cost abziehen ✅
- Types: Attack, Spell, Buff, Curse ✅
- Battle Plan komplett übernommen: Rotation + Reaction Slots, Zielkorridor 4 + 2, Slot Modifiers, Freischaltung über 10 Prestiges ✅
- Skill Level über Ränge im Node + Item-Boni ✅
- Trigger Threshold pro Slot ✅

## Offene Fragen (Stand vor den Entscheidungen)

1. **Nur Cost abziehen** (Rest bleibt, meine Empfehlung) oder **Leiste auf 0** nach jedem Skill?
2. **Attack vs. Spell** als Unterscheidung: ja oder nein?
3. **Skill Level über Ränge im Node** (mehrere Punkte in einen Skill) plus Item-Boni: passt das?
