# Item System – Entwurf v1

Stand: 28.09.2026. Baut auf `stat-liste-v2.md` und `klassen-varianten.md` auf.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

---

## 1. Slots 💡

| Slot | Inhalt | Schwerpunkt der Affixe |
|---|---|---|
| **Main Hand** | Waffe | offensiv, bestimmt Range |
| **Off Hand** | Shield, Quiver, Focus | je nach Typ |
| **Helm** | Armor | defensiv, Resistances |
| **Body Armor** | Armor | defensiv, Life |
| **Gloves** | Armor | offensiv/defensiv gemischt, Attack Speed, Crit |
| **Boots** | Armor | defensiv, Evasion, Starting Heat |
| **Belt** | Armor | Life, Tenacity |
| **Amulet** | Jewelry | alles, bevorzugt Trigger-Affixe |
| **Ring ×2** | Jewelry | alles, bevorzugt Trigger-Affixe |

**10 Slots = 10 Save Tokens bis zum Spielende.** Nach 10 Durchgängen (10 Prestiges) ist alles gesichert, danach folgt nur noch das Finale The Last Ember (siehe GDD, Zählweise). Für den PoC reichen evtl. 5 Slots (Weapon, Off Hand, Body Armor, Amulet, Ring).

**Off Hand und Zweihänder:** Keine Zweihänder, die den Off-Hand-Slot blockieren, sonst wäre ein Save Token dort wertlos. Stattdessen passt die Off Hand zur Waffe:
- **Shield** → Block (Melee)
- **Quiver** → Projektil-Affixe, Attack Speed (Bow, Crossbow)
- **Focus** → Elemental Damage, Heat (Wand, Staff)

---

## 2. Waffen = Range + Spielgefühl 💡

Die Waffe bestimmt die Range (✅) und evtl. das Heat-Verhalten (❓).

| Waffe | Range | Implicit | Heat 💡 |
|---|---|---|---|
| **Sword** | Melee | ausgewogen, +Attack Speed | Cooling |
| **Axe** | Melee | hoher Schaden, +Bleed Chance | Cooling |
| **Mace** | Melee | +Stun Chance, Sunder | Cooling |
| **Dagger** | Melee | +Crit Chance, +Poison Chance | Cooling |
| **Bow** | Ranged | Physical, schnell | Steady |
| **Crossbow** | Ranged | langsam, große Treffer | Steady |
| **Wand** | Ranged | Elemental, schnell | Warming |
| **Staff** | Ranged | Elemental, langsam, +Heat Gain | Warming |

Elemental Melee (Spellblade, Hexblade) entsteht über Affixe und Skill Tree auf einer Melee-Waffe, nicht über einen eigenen Waffentyp.

---

## 3. Base Items 💡

Jedes Item hat eine **Base**, die unabhängig von der Rarity zählt (D2-Prinzip):
- **Basiswerte:** Weapon Damage + Attack Speed bzw. Armor / Evasion / Block
- **Implicit:** fester Bonus des Basistyps (z. B. Dagger: +5 % Crit Chance)
- **Max. Sockets:** wie viele Sockets die Base haben kann
- **Attribute Requirement** ❓ (z. B. Axe braucht Strength) – gibt Attributen einen Wert auch für Nicht-Nutzer

---

## 4. Item Tier und Item Level 💡

✅ (30.09.2026, Thread "Prestige-Pflicht") Beide Werte hängen am **Monsterlevel**:

| Wert | Ergibt sich aus | Bestimmt |
|---|---|---|
| **Item Level** | **Monsterlevel** des Gegners, der es droppt | welche Affix-Stufen innerhalb des Tiers rollen können |
| **Item Tier** (T1, T2, …) | **Item Level** (1–10 = T1, 11–20 = T2, …, 91–100 = T10) | Basiswerte und Wertebereich der Affixe |

- Da das Monsterlevel pro Durchgang in einem höheren Band liegt, steigt das Tier weiterhin mit jedem Durchgang.
- Act 1 liegt unter dem Cap des vorherigen Durchgangs und droppt deshalb noch das alte Tier (mit hohen Affix-Stufen). Gut zum Neu-Ausrüsten nach dem Prestige, das neue Tier gibt es ab Act 2.
- Ein gesichertes Item aus Tier 2 ist im dritten Durchgang noch gut, im fünften veraltet.

**Upgrade eines gesicherten Items ✅ (Mechanik 💡):** Mit einer Währung (Arbeitsname **Ascension Shard**) hebt man ein Item um ein Tier an. Basiswerte und Affixe werden auf das neue Tier skaliert, die **Roll-Qualität bleibt erhalten**: Ein Affix, das im oberen Drittel seines Bereichs gerollt hat, bleibt dort. So lohnen sich perfekte Rolls langfristig.

---

## 5. Rarities ✅ (Details 💡)

| Rarity | Stat-Affixe | Trigger-Affixe | Besonderheit |
|---|---|---|---|
| **Normal** | 0 | 0 | Sockets, einzige Basis für Runewords |
| **Magic** | 1–2, höhere Werte | selten 1 | früh stark, später Nische |
| **Rare** | 3–4 | 0–1 | Arbeitstier |
| **Epic** | 4–5 | garantiert 1, max. 2 | erste echte Build-Bausteine |
| **Legendary** | 3–4 | 1 | + feste **Legendary Power** (build-definierend) |
| **Unique** ❓ | fest | fest | handgebaut, später ergänzen |

---

## 6. Affixe 💡

Drei Arten:
- **Stat Affix:** Zahlenwerte aus der Stat-Liste (Damage %, Life, Resistance …)
- **Trigger Affix:** Condition → Chance → Effect → Internal Cooldown
- **Legendary Power:** regelverändernd, nur auf Legendary (z. B. "Your Burn also applies Corruption", "Evasion also grants Heat")

**Affix-Pools:**
- Pro Slot eigener Pool (siehe Tabelle Slots). Waffen rollen offensiv, Rüstung defensiv, Jewelry alles.
- Gewichtung nach Base: Ein Dagger rollt öfter Crit- und Poison-Affixe, ein Staff öfter Elemental.
- Jedes Affix hat **Affix-Stufen**, freigeschaltet über Item Level.
- Kein Affix doppelt auf einem Item.

---

## 7. Sockets & Runes ✅ (Details 💡)

- Runes droppen einzeln und haben eine eigene Seltenheit.
- Jede Rune gibt gesockelt einen kleinen Einzelbonus (je nach Slot unterschiedlich, wie D2).
- Die **richtige Rune-Reihenfolge** in einem **Normal**-Item mit **exakt passender Socket-Zahl** ergibt ein **Runeword** mit festen, starken Effekten.
- Gefundene Runewords werden in einem **Runeword Codex** dauerhaft festgehalten.
- Runes sind nicht wieder entfernbar ❓ (macht Entscheidungen bedeutsam).

---

## 8. Loot-Fluss im Run ❓

Zwei Möglichkeiten:
- **A: Alles aufsammeln.** Jeder Sieg droppt 1–3 Items in ein kleines Inventar. Mehr D2-Gefühl, mehr Verwaltung.
- **B: 1 aus 3 wählen.** Nach jedem Sieg drei Items zur Auswahl. Schneller, typisch Auto-Battler/Rogue-Lite, jede Wahl ist eine Entscheidung.

💡 Empfehlung: **B**, ggf. mit Bossen, die mehr droppen.

---

## Entscheidungen (28.09.2026)

- 10 Slots ✅
- Loot: 1 aus 3 wählen ✅
- Reroll-Währungen: ja ✅
- Uniques: später ✅
- Attribute Requirements: ja ✅
- Crafting und Upgrades nur in Camps (alle 15 Stages, Blacksmith) ✅

## Offene Fragen (Stand vor den Entscheidungen)

1. Passen **10 Slots** (= 10 Prestiges bis zum Ende)?
2. Loot-Fluss: **alles aufsammeln** oder **1 aus 3**?
3. Crafting: Nur die Upgrade-Währung oder auch Reroll-Währungen (wie PoE Orbs)?
4. Uniques jetzt oder später?
5. Attribute Requirements auf Items: ja oder nein?
