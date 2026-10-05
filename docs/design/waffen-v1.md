# Waffen – Entwurf v1

Stand: 29.09.2026. Schärft `item-system-v1.md` Abschnitt 2 und die offene Frage zum Heat-Verhalten.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

---

## 1. Was eine Waffe ausmacht 💡

Jede Waffe hat drei Bausteine:

1. **Default Attack** (Timos Idee): Die Basic Attack gehört zur Waffe, mit eigenem Namen, Tempo und Effekt. Sie ist das, was man im Kampf am häufigsten sieht, und damit das stärkste Spielgefühl einer Waffe.
2. **Implicit**: ein fester Stat-Bonus auf jeder Waffe dieses Typs.
3. **Heat-Verhalten**: wie die Leiste lädt.

Skill Tree und Legendary Powers können die Default Attack verändern (z. B. "Your Slash hits twice against Burning enemies"). Damit wird die Basic Attack selbst zum Build-Baustein.

---

## 2. Bestandsaufnahme der 8 Waffen

Vorher war die Identität teils nur "schnell/langsam". Ziel: Jede Waffe besetzt genau ein Archetyp-Feld (Damage Type × Range × Delivery), sodass keine überflüssig ist.

| Waffe | Archetyp-Feld | Urteil |
|---|---|---|
| **Sword** | Physical · Melee · Direct | bleibt, war "ausgewogen" = blass → bekommt Konter-Identität |
| **Axe** | Physical · Melee · Over Time (Bleed) | bleibt, klar |
| **Mace** | Physical · Melee · Direct (Kontrolle) | bleibt, klar (Stun, Sunder) |
| **Dagger** | Physical · Melee · Over Time (Poison) + Crit | bleibt, klar |
| **Bow** | Physical · Ranged · Over Time (Bleed/Poison) | geschärft: vorher nur "schnell" |
| **Crossbow** | Physical · Ranged · Direct | geschärft: große Treffer + Armor Penetration |
| **Wand** | Elemental · Ranged · Direct | bleibt, Element hängt am Base Item |
| **Staff** | Elemental · Ranged · Over Time (Burn/Corruption) | geschärft: vorher nur "langsam" |

**Fehlt eine?** Elemental Melee (Spellblade, Hexblade) hat keine eigene Waffe. Das bleibt bewusst so ✅: Es entsteht über Affixe und Tree auf einer Melee-Waffe. **Ersetzbar?** Keine. Nach der Schärfung hat jede ein eigenes Feld. Mace und Sword teilen sich Physical Melee Direct, aber mit klar anderem Fokus (Kontrolle vs. Konter).

**Sunder** ✅ (vorher auch "Armor Break"): Debuff auf dem Gegner, jeder Treffer senkt seine Armor um einige Prozent, stapelt bis zu einem Maximum, läuft nach einigen Sekunden ohne neue Treffer aus. Unterschied zu **Physical Penetration**: Penetration ist ein Stat des Angreifers, wirkt sofort pro Treffer und verändert den Gegner nicht.

---

## 3. Waffenliste mit Default Attack 💡

| Waffe | Default Attack | Tempo | Implicit | Heat |
|---|---|---|---|---|
| **Sword** | **Slash**: solider Treffer. Wirst du getroffen, 15 % Chance auf einen sofortigen Konter-Slash (Riposte) | mittel | +Block Chance oder +Evasion | Cooling |
| **Axe** | **Hack**: 25 % Bleed Chance | mittel-langsam | +Physical Damage % | Cooling |
| **Mace** | **Smash**: baut Stagger auf, jeder 4. Treffer stunnt kurz (0,5 s) | langsam | +Sunder Chance | Cooling |
| **Dagger** | **Stab**: sehr schnell, 20 % Poison Chance | sehr schnell | +Crit Chance | Cooling |
| **Bow** | **Shoot**: schnell, 15 % Chance auf Bleed oder Poison (je nach Pfeil-Affix) | schnell | +Ailment Chance | Steady |
| **Crossbow** | **Bolt**: sehr langsam, ignoriert 20 % Armor | sehr langsam | +Physical Penetration | Steady |
| **Wand** | **Spark**: schnell, Element vom Base Item (Fire/Cold/Lightning/Void Wand) | schnell | +Elemental Damage % | Warming |
| **Staff** | **Channel**: langsam, 30 % Chance auf das Ailment seines Elements | langsam | +Ailment Duration | Warming |

Alle Zahlen sind Startwerte für die Balance-CLI.

---

## 4. Heat-Verhalten ✅

| Verhalten | Waffen | Laden | Eigenheit |
|---|---|---|---|
| **Cooling** | Melee | durch eigene Hits; erlittene Treffer nur mit **Heat from Hits Taken** aus dem Skill Tree ✅ | kühlt ständig ab, **1 Heat pro Sekunde**, ohne Wartezeit ✅ (Timo, 05.10.2026) |
| **Steady** | Bow, Crossbow | durch eigene Hits (nicht durch erlittene Treffer) | verfällt nie, keine Sonderregel. Der neutrale Standard |
| **Warming** | Wand, Staff | pro Sekunde, unabhängig von Attack Speed | gleichmäßig und berechenbar |

Im Schnitt laden alle drei gleich schnell, sie unterscheiden sich im Rhythmus. Die Leiste geht für alle von 0 bis 100.

**Heat from Hits Taken ist kein Default mehr** ✅ (Timo, 05.10.2026): Der Held bekommt durch Treffer des Gegners erst Heat, wenn er es skillt. Might-Cluster ab Kindling (Core), nur mit Melee-Waffe: **Battle Scars** (Notable, schaltet es frei: 100 %), **Grudge** (+50 %), **Unbroken** (Notable, +50 %, +10 Armor). Zusammen 200 %, also bis 20 Heat pro Treffer: ein eigener Build für Tanks. Gegner behalten die Regel.

**Heat per Hit** ✅: kein Implicit, sondern ein fester **Grundwert des Waffentyps** (steht im Tooltip wie Damage und Attacks per Second). Er wird so gesetzt, dass jede Waffe bei ihrem Basis-Tempo gleich viel Heat pro Sekunde lädt:

`Heat per Hit = Ziel-Rate / Basis-Attacks per Second` (Ziel-Rate z. B. 12 pro Sekunde)

| Waffe | Basis-Attacks/s | Heat per Hit |
|---|---|---|
| Dagger | 2,0 | 6 |
| Sword | 1,2 | 10 |
| Mace | 0,8 | 15 |
| Crossbow | 0,6 | 20 |

**Heat from Hits Taken** ✅ (nur Cooling, beim Held nur über den Skill Tree, siehe oben): kein Waffenwert. **1 Heat pro 1 % Max Life Schaden**, höchstens 10 pro Treffer. Geblockte und ausgewichene Treffer geben nichts (dafür gibt es Trigger wie "On Block: +15 Heat"). So zählt, wie hart man getroffen wird, nicht wie oft: Ein schneller, schwacher Gegner füttert die Leiste nicht übermäßig. Später veränderbar über Nodes und Affixe, z. B. "+50 % Heat from Hits Taken" (Warden, Duelist).

Wer Attack Speed über den Basiswert hinaus erhöht, lädt schneller, weil der Wert pro Hit gleich bleibt. Warming (Wand, Staff) lädt einfach 12 pro Sekunde. Werte sind Startwerte für die Balance-CLI.

**Trigger Threshold nutzt jeder Build ✅.** Der Unterschied liegt darin, wie sicher das Sparen ist:
- **Cooling:** Sparen kostet: die Leiste kühlt ständig um 1 Heat pro Sekunde ab.
- **Steady:** Sparen ist sicher. Dafür lädt die Leiste nicht durch erlittene Treffer, also etwas langsamer als bei Melee unter Druck.
- **Warming:** Sparen ist planbar, aber ohne Extra-Bonus.

---

## 5. Attack Speed und Caster ✅

- **Keine Cast Time.** Skills ersetzen weiterhin die nächste Basic Attack. Ein zweites Zeitsystem nur für Caster wäre schwer lesbar und doppelt zu balancen.
- **Ein Stat für alle:** Attack Speed beschleunigt die Default Attack jeder Waffe, auch Spark und Channel.
- Für Caster bringt Attack Speed also mehr Default-Attack-Schaden und mehr On-Hit-Trigger, aber **keine schnellere Heat** (Warming lädt pro Sekunde). Ihr Heat-Stat ist **Heat Gain** (Wisdom).
- Dadurch hat Agility für Caster einen Wert, ist aber nicht Pflicht. Für Melee und Ranged ist Attack Speed doppelt wertvoll (Schaden und Heat).

---

## 6. PoC

Sword (Slash, Cooling) und Wand (Spark, Warming), also die beiden gegensätzlichsten Varianten. Fallback, falls es zu komplex wirkt: ein Heat-Verhalten für alle.
