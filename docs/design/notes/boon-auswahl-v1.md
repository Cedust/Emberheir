# Boon-Auswahl verbessern – Bestandsaufnahme und Vorschlag (v1, 2026-11-02)

Screenshots von heute (1080p): `heute-shrine-dark.png`, `heute-shrine-light.png`, `heute-boon-panel-tooltip.png`
(alle in diesem Ordner).

## 1. Wie die Wahl heute aussieht

- Ember Shrine nach Stage 5 und 10, nach Elites (nicht auf Elite-Knoten), beim Event Cursed Spark und im Finale
  nach jedem Echo: **1 aus 3 Boons**. Im Wildfire und beim Wandern hinter dem Warden's Gate gibt es keine.
- Jede Karte: Family (Farbe) + Grade (Spark/Flame/Blaze als kleines Wort), Raute mit **Slot-Icon**, Name,
  eine Zeile Effekt, unten Slot-Name (Strike/Skill/Heat/Reaction/Trigger/Passive) und Rang-Rauten I-III.
- Links das Boons-Panel: Rauten mit Rang, Effekt nur per Hover.

**Regeln, die der Spieler nicht sieht:**
- Strike, Skill, Heat und Reaction halten **nur einen Boon**. Ein neuer ersetzt den alten (Rang weg).
- Trigger und Passive **stapeln** beliebig.
- Denselben Boon nochmal nehmen = **Rang +1** (bis III, jeder Rang +50 % vom Grundwert). Der bessere Grade bleibt.

**Probleme:**
1. "replaces Kindled Strikes" steht **unter** der Karte, winzig und dunkel auf dem Hintergrund: praktisch unsichtbar
   (Screenshot hell, unter Frostbite und Cold Heart).
2. Beim Rang-Up steht nur der neue Wert (+26 %), nicht was man schon hat (+20 % → +26 %).
3. Ob ein Slot exklusiv ist, steht nirgends. "Strike" und "Passive" sehen gleich aus.
4. Das Icon zeigt den Slot, nicht den Boon: alle Passives sind ein Schild, alle Strikes ein Blitz. Im Panel kann man
   seine Boons nicht auseinanderhalten, ohne jeden einzeln zu hovern.
5. Keine Verbindung zwischen Karte und Panel: man sieht nicht, welcher eigene Boon betroffen ist.

## 2. Alle Boons (69)

7 Families × 8 + 7 Fusion + 6 Stolen. Werte = Rang I, Spark. ✓ = sinnvoll, ⚠ = ändern.

### Hearth (immer offen)
| Boon | Slot | Effekt | |
|---|---|---|---|
| Second Wind | Reaction | Unter 35 % Life: heilt 15 % (1× pro Kampf) | ✓ |
| Hearthguard | Reaction | Kampfstart: Barrier 10 % Life | ✓ |
| Banked Coals | Heat | Start mit 30 Heat | ✓ |
| Warm Hands | Heat | Alle 4 s: 5 Heat | ✓ |
| Old Nan's Broth | Passive | +1,5 % Lifesteal | ✓ |
| Weathered | Passive | +6 % All Resistance | ✓ |
| Slow Embers | Trigger | Alle 5 s: heilt 2 % | ✓ |
| Ember Ward | Trigger | Treffer erhalten: 20 %, Barrier 5 % (4 s CD) | ⚠ schwach |

### Ash (Gorrak, Physical)
| Crushing Blow | Strike | Jeder 4. Angriff: Extra-Treffer mit 80 % Waffenschaden | ✓ |
|---|---|---|---|
| Sundering Weight | Strike | Default Attack +20 % | ✓ |
| Ashen Momentum | Skill | Skills: +5 % Physical, 5× | ✓ |
| Smouldering Rage | Heat | Treffer erhalten: 5 Heat | ✓ |
| Brutality | Passive | +10 % Physical Damage | ✓ |
| Grit | Passive | Reflektiert 12 % erhaltener Treffer | ✓ (ist eigentlich ein Trigger) |
| Stagger | Trigger | Crit: 40 %, 0,5 s Stun (6 s CD) | ⚠ kaum spürbar |
| Last Stand | Reaction | Unter 50 % Life: +25 % Physical (8 s) | ✓ |

### Rot (Mother of Rot, Physical)
| Festering Edge | Strike | Angriffe: 30 % Poison | ✓ |
|---|---|---|---|
| Serrated Edge | Strike | Angriffe: 20 % Bleed | ✓ |
| Blighted Rite | Skill | Skills: 30 % Poison | ✓ |
| Blood Rush | Heat | Crit: 6 Heat | ✓ |
| Fester | Passive | Ailments +15 % Schaden | ✓ |
| Bloodfeast | Passive | Heilt 1,5 % des Ailment-Schadens | ✓ |
| Open Wounds | Trigger | Crit: 30 % Bleed | ✓ |
| Grave Hunger | Reaction | Unter 40 % Life: +6 % Lifesteal (8 s) | ✓ |

### Cinder (Cinder Tyrant, Fire)
| Kindled Strikes | Strike | Angriffe: 30 % Burn | ✓ |
|---|---|---|---|
| Searing Rite | Skill | Skills: 30 % Burn | ✓ |
| Fire Within | Heat | Skills kosten 15 % weniger Heat | ✓ |
| Stoked Pyre | Passive | +10 % Elemental Damage | ✓ |
| Melt | Passive | +7 % Elemental Penetration | ✓ |
| Flashover | Trigger | Alle 6 s: Extra-Treffer mit 80 % Waffenschaden | ✓ |
| **Wildfire** | Trigger | Crit: +5 % Attack Speed, 3× | ⚠ Name kollidiert mit dem Endgame **Wildfire I-X** |
| Blazing Defiance | Reaction | Unter 30 % Life: +30 % Elemental (8 s) | ✓ |

### Rime (Rime Warden, Cold)
| Frostbite | Strike | Angriffe: 30 % Chill | ✓ |
|---|---|---|---|
| Frost Rite | Skill | Skills: Barrier 3 % | ✓ |
| **Cold Heart** | Heat | Heat kühlt nicht mehr ab | ⚠ Rang II/III tun nichts, wird trotzdem wieder angeboten |
| **Shatter** | Passive | +4 % Crit Chance | ⚠ Name kollidiert mit der Rime-Warden-Mechanik Shatter |
| Ice Wall | Passive | +5 % Block | ✓ (nur gegen Physical) |
| Permafrost | Passive | +15 % Ailment Effect | ✓ |
| Frost Nip | Trigger | Treffer erhalten: 25 % Chill | ✓ |
| Ice Shell | Reaction | Gegner holt aus: Barrier 12 % | ✓ |

### Storm (Storm Herald, Lightning)
| Static Echo | Strike | Jeder 3. Angriff: 30 % nochmal | ✓ |
|---|---|---|---|
| Overload | Skill | Skills: 30 % Shock | ✓ |
| Charged Air | Heat | +12 % Heat Gain | ✓ |
| Quickening | Passive | +6 % Attack Speed | ✓ |
| Blur | Passive | +4 % Evasion | ✓ |
| Conductor | Passive | +8 % Shock-Chance | ✓ |
| Lightning Reflexes | Trigger | Ausweichen: 25 % Gegenschlag | ✓ (Evasion-Builds) |
| Sidestep | Reaction | Gegner holt aus: +30 % Evasion (3 s) | ✓ |

### Void (Voidborn Maw, Void)
| Hollow Touch | Strike | Angriffe: 30 % Corrupt | ✓ |
|---|---|---|---|
| Gathering Dark | Skill | Skills: +5 % Elemental, 5× | ✓ |
| Void Siphon | Heat | Treffer: 30 %, 4 Heat (1 s CD) | ✓ |
| Hollow Mark | Passive | +15 % Schaden unter 30 % Gegner-Life | ✓ |
| Creeping Void | Passive | +8 % Corrupt-Chance | ✓ |
| Null Ward | Passive | +10 % Tenacity | ✓ |
| Void Mirror | Trigger | Treffer erhalten: 25 %, reflektiert 30 % | ✓ |
| Event Horizon | Reaction | Unter 30 % Life: Barrier 20 % | ✓ |

### Fusion (nur wenn man beide Families hat)
| Iron Hearth | Ash+Hearth | Kampfstart: +25 % Attack Speed (6 s) | ✓ |
|---|---|---|---|
| **Fever** | Rot+Cinder | Burn macht auch Poison | ⚠ Rang II/III tun nichts |
| Steam Burst | Cinder+Rime | Crit: Dampfstoß, Extra-Treffer mit 120 % Waffenschaden (4 s CD) | ✓ |
| **Galvanic Rot** | Rot+Storm | Shock macht auch Bleed | ⚠ Rang II/III tun nichts |
| Hailstorm | Rime+Storm | Alle 5 s: Hagelkorn, Extra-Treffer mit 100 % Waffenschaden | ✓ |
| **Black Hearth** | Hearth+Void | Heilt 3 % des Ailment-Schadens | ⚠ nur ein großer Bloodfeast |
| **Molten Edge** | Ash+Cinder | Default Attack +30 % | ⚠ nur ein großer Sundering Weight |

### Stolen (immer Blaze, max Rang II, halb so häufig)
Stolen Might / Aim / Insight / Grace / Calm / Heart: +1 STR/DEX/INT/AGI/WIS/VIT pro Rang. ✓

### Größeres Problem: die "passende Family"
Das Angebot bevorzugt Families, die zum Schadenstyp der Waffe passen (≈70 %). Seit der Sorcerer kein Fire mehr hat,
macht **keine** Heldenwaffe Fire (Sword, Axe, Dagger, Bow, Crossbow, Mace = Physical, Wand = Lightning,
Staff = Void). Cinder wird also für niemanden bevorzugt, Ash und Rot für sechs von acht Waffen. Die Burn-Boons
funktionieren aber mit jeder Waffe. Ob die Cold-Attunement der Wand Rime bevorzugt, prüfe ich beim Bau.

## 3. Vorschlag: neue Shrine-Karte und Boon-Board

### 3.1 Die Karte sagt in einer Zeile, was passiert
Oben auf jeder Karte ein farbiges Band (innerhalb der Karte, gut lesbar):

| Fall | Band | Unten auf der Karte |
|---|---|---|
| Neu, Slot frei oder stapelnd | grün **NEW** | nichts extra |
| Hab ich schon | gold **RANK II → III** | Wert vorher → nachher: `+20 % → +26 % Physical Damage` |
| Slot belegt | rot **REPLACES** + Mini-Raute des alten Boons | alter Effekt durchgestrichen: ~~Banked Coals: Start with 30 Heat~~ |

Tooltip auf dem Band (Spielstil, wenig Text): "Strike: you hold only one. The new one takes its place."

### 3.2 Hover verbindet Karte und eigene Boons
Hover über eine Karte lässt im Boons-Panel den betroffenen Boon aufleuchten: **rot** (wird ersetzt) oder
**gold** (steigt im Rang). Beim Klick: kurze Animation, die alte Raute zerfällt zu Asche bzw. der Rang-Pip füllt sich.

### 3.3 Boons-Panel wird ein kleines Board
- Oben **4 feste Sockel**: Strike, Skill, Heat, Reaction. Leere Sockel sind sichtbar (man sieht, was frei ist),
  Reaction ist gesperrt, bis der Reaction-Slot frei ist.
- Darunter alle stapelnden Boons (heute Trigger + Passive) ohne Unterteilung.
- Im Battle-HUD bleibt die Status Rail wie sie ist.

### 3.4 Eigenes Icon pro Boon (optional, später)
Heute zeigt die Raute den Slot. Sofort machbar: die schon gemalten Stat-/Ailment-Icons in der Family-Raute
(Brutality = Physical-Icon, Kindled Strikes = Burn-Icon usw.). Ein eigenes gemaltes Boon-Sheet wäre ein eigener
Art-Schritt (der Icon-Thread für Wahlkarten läuft gerade, daher nicht hier).

## 4. Vorschlag: Boons aufräumen
1. **Kein leerer Rang:** Cold Heart, Fever, Galvanic Rot bekommen max Rang I (werden nicht mehr erneut angeboten).
2. **Umbenennen:** Wildfire → *Spreading Flames*, Shatter → *Keen Frost* (IDs bleiben, Saves laufen weiter).
3. **Fusionen sollen Neues tun:** Molten Edge → "Default Attack: # % chance to Burn **and** Bleed";
   Black Hearth → "Ailment healing above full Life becomes Barrier". (Ideen, Werte per Balance-Lauf.)
4. **Schwache Trigger anheben:** Stagger (Stun 1 s, 60 %), Ember Ward (35 %, 3 s CD). Nur nach Messung.
5. **Slot-Namen:** Trigger und Passive verschmelzen für den Spieler zu einem Wort ("Boon"), nur die 4 exklusiven
   Slots haben einen Namen.
6. **Passende Family:** statt nur Schadenstyp der Waffe auch die Ailments/Elemente, die der Build schon nutzt
   (Burn-Skills im Plan → Cinder passt). Oder die Bevorzugung ganz weglassen. Muss mit dem Autopilot gemessen werden.

Punkte 3, 4 und 6 ändern Balance; vorher und nachher wird mit `npm run balance -- --act 7 --build all` gemessen.

## 5. Weniger Boons (Timo 2026-11-02: Option C + Anzahl reduzieren)

**Neue Regel, die man in einem Satz erklären kann:** jede Family hat **einen Boon pro festem Slot**
(Strike, Skill, Heat, Reaction) und **einen Signature-Boon, der stapelt**. Hearth hat keinen Strike/Skill,
dafür drei stapelnde. Wer also einen Strike einer anderen Family nimmt, tauscht immer genau diesen einen.

69 → **49** Boons (Hearth 6 nach dem Balance-Check, siehe 6; sechs Warden-Families je 5, 7 Fusion, 6 Stolen).

| Family | Strike | Skill | Heat | Reaction | stapelt | fällt weg |
|---|---|---|---|---|---|---|
| Hearth | – | – | Banked Coals | Second Wind | Old Nan's Broth, Weathered, Slow Embers | Hearthguard, Warm Hands, Ember Ward |
| Ash | Crushing Blow | Ashen Momentum | Smouldering Rage | Last Stand | Brutality | Sundering Weight, Grit, Stagger |
| Rot | Serrated Edge | Blighted Rite | Blood Rush | Grave Hunger | Fester | Festering Edge, Bloodfeast, Open Wounds |
| Cinder | Kindled Strikes | Searing Rite | Fire Within | Blazing Defiance | Stoked Pyre | Melt, Flashover, Wildfire |
| Rime | Frostbite | Frost Rite | Cold Heart | Ice Shell | Permafrost | Shatter, Ice Wall, Frost Nip |
| Storm | Static Echo | Overload | Charged Air | Sidestep | Quickening | Blur, Conductor, Lightning Reflexes |
| Void | Hollow Touch | Gathering Dark | Void Siphon | Event Horizon | Hollow Mark | Creeping Void, Null Ward, Void Mirror |

Warum diese: weg fallen Doppelungen (zweiter Bleed/Poison/Corrupt/Shock-Boon, zweiter Reflect, zweiter
"alle X s ein Treffer" neben Hailstorm, zweite Barrier am Kampfstart), reine Gear-Stats (Crit, Block, Evasion,
Tenacity, Penetration) und die schwachen Trigger. Die Namenskonflikte Wildfire/Shatter verschwinden mit.

**Fusionen bleiben alle 7.** Weil Sundering Weight und Bloodfeast wegfallen, sind Molten Edge und Black Hearth
keine Kopien mehr. Fever, Galvanic Rot und Cold Heart bekommen max Rang I.

**Folgen:**
- Weniger Auswahl = öfter Rang-Ups (wie Hades), Builds werden pro Run klarer.
- Laufende Saves: wer einen gestrichenen Boon hält, bekommt beim Laden den Boon desselben Slots seiner Family
  (Save-Migration). Am Prestige verbrennen Boons ohnehin.
- Family-Bevorzugung nach Build (Punkt 4.6) und neue Balance-Messung vorher/nachher gehören dazu.

## 6. Balance-Check beim Bau (2026-11-02)

Gemessen mit `--act 7 --build all --runs 1`, Seeds 31 und 41, vorher (main) und nachher.
- Erster Stand: Staff (Emberseer) in Act 7 deutlich schwerer (Hollow 3,3 → 15 Anläufe, 4 Seeds).
  Ursache 1: Ember Ward und Hearthguard fehlten, Barrier ist die Defense der Caster (der Autopilot hatte Ember Ward
  auf Rang III). Ursache 2: die Build-Regel zählte auch einzelne Gear-Procs (ein Ring mit Burn-Trigger), dadurch
  bekam der Staff Brutality und Static Echo statt Hearth.
- Fix: **Ember Ward bleibt** (Hearth hat vier stapelnde, 49 Boons). Die Build-Regel zählt nur Waffe
  (mit Ailment/Attunement) und Skills im Battle Plan.
- Danach Staff Act 7 (4 Seeds): vorher 4,6 / nachher 4,2 Anläufe.
