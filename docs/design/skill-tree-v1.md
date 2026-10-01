# Skill Tree – Entwurf v1

Stand: 28.09.2026. Baut auf `stat-liste-v2.md`, `klassen-varianten.md` und `item-system-v1.md` auf.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

## Was schon feststeht ✅

- Keine festen Klassen. Die Build-Richtung entsteht aus Waffe (Range), Skill Tree (Damage Type) und Skills/Affixen (Delivery).
- Jedes Level gibt Skillpunkte (und Attributpunkte).
- Level und Skillpunkte bleiben beim Tod **und beim Prestige** ✅ (geändert 30.09.2026). Level Cap 10 im ersten Durchgang, dann +10 pro Prestige (Level 100 am Ende). Skillpunkte werden nur beim Trainer im Camp verteilt.
- Der Tree wächst mit jedem Prestige. Der Spieler wählt selbst, welcher neue Ast freigeschaltet wird.

---

## 1. Aufbau: Core + vier Grundäste 💡

Ein gemeinsamer Tree für alle (ähnlich Path of Exile, aber deutlich kleiner). In der Mitte der **Core**, davon gehen vier **Grundäste** ab. Sie folgen den Achsen Damage Type × Delivery:

```
            [Might]                    [Arcana]
      Physical · Direct          Elemental · Direct
                  \                  /
                   \                /
                     [   CORE   ]
                   /                \
                  /                  \
     [Rupture]                         [Affliction]
   Physical · Over Time            Elemental · Over Time
   (Bleed, Poison)                 (Burn, Corruption)
```

| Ast | Schwerpunkt | Typische Nodes |
|---|---|---|
| **Core** | allgemein, Defensive | Life, Armor, Evasion, Resistances, Tenacity, Heat Gain |
| **Might** | Physical Direct | Physical Damage, Attack Speed, Crit Chance, Stun |
| **Rupture** | Physical Over Time | Bleed, Poison, Ailment Duration, Poison Stacks |
| **Arcana** | Elemental Direct | Fire/Cold/Lightning/Void Damage, Chill, Shock, Projectile-Trigger |
| **Affliction** | Elemental Over Time | Burn, Corruption, Ailment Duration, Debuffs |

**Range steckt nicht in eigenen Ästen**, sondern in bedingten Nodes innerhalb jedes Astes, z. B. "While wielding a Melee Weapon: +10 % Armor" oder "With a Ranged Weapon: +1 Projectile on Every 4th Attack". So passt jeder Ast zu Melee und Ranged, und die Waffe bleibt der Entscheider.

Benachbarte Äste teilen sich Übergangs-Nodes. Zwischen Might und Arcana entsteht so der **Spellblade**-Pfad, zwischen Rupture und Affliction ein reiner **DoT**-Pfad.

---

## 2. Node-Typen 💡

| Typ | Beschreibung | Beispiel |
|---|---|---|
| **Minor** | kleiner Stat-Bonus, verbindet Nodes | +5 % Fire Damage |
| **Notable** | stärkerer, thematischer Bonus | "Burn lasts 20 % longer and reduces enemy healing by an additional 15 %" |
| **Skill** | schaltet einen aktiven Skill für die Rotation frei | "Fireball – 40 Heat" |
| **Keystone** | regelverändernd mit Nachteil, max. 1–2 pro Build | siehe unten |

**Keystone-Beispiele** (Crit Damage bleibt fix bei 150 %, deshalb verändern Keystones Regeln statt Zahlen):
- **Blood Price:** Your Crits always apply Bleed. Your Crit Chance is halved.
- **Slow Rot:** Poison no longer expires, but you can apply at most 5 stacks.
- **Glass Focus:** Heat no longer cools down. You take 20 % more damage.
- **Void Pact:** Corruption ramps up twice as fast. You cannot Lifesteal.
- **Stalwart:** Block also applies to Elemental Damage. −30 % Attack Speed.

Keystones können auch das **Heat-Verhalten** der Waffe umstellen (Cooling/Steady/Warming). So wird die offene Frage aus der Stat-Liste zu einer Build-Entscheidung.

---

## 3. Prestige-Äste 💡

Bei jedem Prestige wählt man **einen neuen Ast** aus einem Pool. Jeder Prestige-Ast hängt an einem Grundast und vertieft ihn:

| Prestige-Ast | hängt an | Thema |
|---|---|---|
| **Duelist** | Might | Melee-Crit, Konter "On Block" |
| **Marksman** | Might | Ranged, Every Nth Attack, Projektile |
| **Butcher** | Rupture | Bleed-Explosionen, Bleed bei hohem Schaden |
| **Venomancer** | Rupture | Poison-Stacks, Poison verbreitet Debuffs |
| **Stormcaller** | Arcana | Lightning, Shock, Kettenblitze |
| **Frostbinder** | Arcana | Chill, Kontrolle, Barrier |
| **Pyromancer** | Affliction | Burn, Anti-Heal |
| **Void Lord** | Affliction | Corruption, lange Kämpfe |
| **Warden** | Core | Block, Thorns, Armor |
| **Tactician** | Core | Rotation und Heat: Starting Heat, Rotation-Tricks (z. B. "skip a skill you can't afford") |

- Ein Prestige-Ast hat ca. **10 Nodes** ✅ (passend zu 10 Skillpunkten pro Durchgang), davon 1 eigener Skill und 1 eigener Keystone.
- Freigeschaltete Äste bleiben dauerhaft. Nach 10 Prestiges hat man 10 von z. B. 12–14 Ästen.
- Die Punkte bleiben beim Prestige. Welche Äste man tatsächlich nutzt, ändert man per Respec beim Trainer.

---

## 4. Größenordnung 💡

- Grund-Tree (Core + 4 Äste): ca. **60 Nodes** ✅ (verkleinert 30.09.2026). Die meisten sind Minor-Nodes.
- Skillpunkte: 1 pro Level, Level bleiben beim Prestige ✅. Cap 10, dann +10 pro Prestige → am Ende ca. 100 Punkte bei ca. 160 Nodes (gut 60 %). Man muss sich also spezialisieren.
- **Keystones** kosten **Harvester's Ember** ✅, ein Material vom Ashen Harvester (1 pro Sieg über ihn, also 1 pro Prestige). Ersetzt die Keystone Points auf Level 10/25/40. Im ersten Durchgang kein Keystone.
- Skill Slots sind **keine Nodes** ✅, sondern dauerhafte Upgrades außerhalb des Trees. Vorschlag 💡: Slot 1 von Beginn an, Slot 2 nach dem 1. Prestige, Slot 3 nach dem 3. Prestige.

**Für den PoC:** nur Core + 2 Grundäste (z. B. Might und Arcana), ca. 30 Nodes, 1 Keystone pro Ast.

---

## Entscheidungen (28.09.2026)

- Aktive Skills kommen aus Skill-Nodes im Tree; Items verstärken sie nur ("+1 to Fire Skills") ✅
- Prestige-Ast frei wählbar ✅, gewählt direkt im Prestige-Ablauf (Schritt "Inheritance"), nicht bei Kaelen ✅ (01.10.2026)
- Respec innerhalb eines Durchgangs möglich ✅ (Details, z. B. Kosten, offen)
- Skill Slots sind dauerhafte Upgrades (z. B. über Prestige), keine Nodes ✅

## Offene Fragen (Stand vor den Entscheidungen)

1. **Woher kommen aktive Skills?** Vorschlag: über Skill-Nodes im Tree. Items können sie mit "+1 to Fire Skills" verstärken (D2-Prinzip), aber nicht freischalten.
2. **Prestige-Ast frei wählen oder 1 aus 3 angeboten bekommen?** Frei ist planbarer, 1 aus 3 bringt Abwechslung.
3. **Respec:** Soll man Punkte innerhalb eines Durchgangs umverteilen können, z. B. gegen Währung bei einer Camp-Persona?
