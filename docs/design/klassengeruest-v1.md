# Klassengerüst v1: Klassen, Heirloom, Masteries, Ash Tree (Konzept, 2026-10-18)

Thread „Klassengerüst“ (Timo, 18.10.2026). Fasst alle Entscheidungen zusammen. Ersetzt beim Umbau:
`klassen-v2.md` (5 Klassen, Klassenpfade), `waffe-als-system-v1.md` und `weapon-mastery-baeume-v1.md` (Paths),
`attribute-v1.md` (Attribut-Effekte), Region-Aufbau aus `level-v2.md`, Warden/Tactician aus `skilltree-v2.md`.
Herleitung und verworfene Ideen: `notes/klassengeruest-ansaetze-v1.md`, `notes/klassengeruest-ansatz4-v1.md`,
`notes/klassengeruest-builds-v1.md`.
Markierung: ✅ entschieden (Timo) · 💡 Vorschlag/Startwert · ❓ offen. Zahlen sind Startwerte für die Balance-CLI.

---

## 1. Grundgedanke ✅

Vorher bestimmten Klasse, Waffe, Weapon-Mastery-Path und Prestige Path alle gleichzeitig Damage Type und Ailment. Man
wählte dasselbe mehrfach, der Weg war vorgezeichnet. Neu beantwortet **jede Ebene genau eine Frage**:

| Ebene | Frage | Wann | Endgültig? |
|---|---|---|---|
| **Klasse** | Wer bin ich? (Attribut, Waffen-Familie, Fokus, Trait) | Erstellung | ja |
| **Waffe** | Welches Werkzeug? (Tempo, Rhythmus, Innate) | Erstellung | ja |
| **Heirloom-Path** | **Womit** kämpfe ich? (Damage Type + Ailment) | erster Punkt im Path | Reset bei Kaelen |
| **Mastery** | **Wie** kämpfe ich? (Burst, Tempo, Ailment) + Titel | erster Harvest | ja |
| **Ash Tree** | Womit stütze und schütze ich das? (Skills, Verteidigung, Heat, Keystones) | laufend | Respec gegen Gold |

Alte Spielstände werden **nicht** übernommen ✅ (Dev-Umgebung, alles wird gelöscht).

## 2. Die drei Klassen ✅

| | **Cinderguard** | **Ashstrider** | **Emberseer** |
|---|---|---|---|
| Hauptattribut | STR | DEX | INT |
| Waffen | Sword, Axe, Mace | Bow, Crossbow, Dagger | Wand, Staff |
| Fokus | starke Angriffe | Crit | Ailments |
| Kern-Ailment | Bleed (Physical), Stun (Mace) | Poison (Physical), Bleed nur Dagger | Corruption (Void), **kein Physical** |
| Class Trait | **Fury** | **Hunter's Mark** | **Overcharge** |

Ersetzt Warrior, Reaver, Hunter, Sorcerer, Warlock. Off Hands bleiben Items für alle; Start-Off-Hand 💡: Cinderguard
Round Shield, Ashstrider Quiver, Emberseer Ember Focus.

**Klassentexte** 💡 (sagen, womit die Klasse gewinnt):
- *Cinderguard:* Fights up close with Sword, Axe or Mace. Every blow lands harder than the last.
- *Ashstrider:* Fights with Bow, Crossbow or Dagger. Finds the weak spot and strikes it, again and again.
- *Emberseer:* Fights with Wand or Staff. Every spell feeds the next, until the charge breaks loose.

### Class Traits ✅
| Klasse | Trait | Wirkung |
|---|---|---|
| Cinderguard | **Fury** | Jeder Hit in Folge +2 % Schaden, bis +20 %. Fällt vorerst nicht ab; startet in jedem Kampf bei 0. |
| Ashstrider | **Hunter's Mark** | Angriffe auf einen Gegner, der eins deiner Ailments trägt, haben +10 % Precision (Timo 2026-10-19, vorher +10 % Crit Chance). |
| Emberseer | **Overcharge** | Jeder Skill gibt 1 Charge. Bei 3 Charges entlädt sich eine Nova im Element deines Heirloom-Paths: 150 % Weapon Damage, setzt ihr Ailment immer. |

„Deine Ailments“ = alle Ailments, die du gerade auf dem Gegner hast, egal woher. Kein Trait fasst die Heat an (dafür gibt
es die Heat Forms). Arena 💡: Glut-Aura wächst mit Fury · Zielmarke über dem Gegner bei Hunter's Mark · drei Funken um
den Helden, die als Nova explodieren.

### Start-Attribute ✅ (14 Punkte + 6 frei bei Erstellung, max. 7)
| | STR | DEX | AGI | INT | WIS | VIT |
|---|---|---|---|---|---|---|
| Cinderguard | **5** | 1 | 2 | 1 | 2 | 3 |
| Ashstrider | 1 | **5** | 3 | 1 | 1 | 3 |
| Emberseer | 1 | 1 | 1 | **5** | 3 | 3 |

## 3. Attribute ✅

**Hauptattribut = Schaden der eigenen Klasse + eine Verteidigungsschicht** (D4-Prinzip beim Schaden, PoE-Prinzip bei der
Verteidigung). Damage Type entscheidet nur der Heirloom-Path.

| Attribut | für die eigene Klasse | für alle, pro Punkt |
|---|---|---|
| STR | +8 % Damage (Cinderguard), jeder Damage Type | +6 % Armor |
| DEX | +8 % Damage (Ashstrider) | **+2 % Evasion** (vorher AGI) |
| INT | +8 % Damage (Emberseer) | +8 % Barrier |
| AGI | – | +3 % Attack Speed, **+1,5 % Crit Chance** (vorher DEX) |
| WIS | – | +6 % Heat Gain, +5 % Ailment Effect, **+4 % Trigger Chance** (vorher DEX) |
| VIT | – | +6 % Life, +3 % Tenacity |

Damage gilt für alles, was der Held tut: Default Attack, Innate, Skills, Trait-Nova und die Ailments daraus.
Evasion-Regel bleibt (weicht Angriffen aus, der Held deflectet Spells mit derselben Chance), sitzt jetzt nur bei DEX.

**Breakpoint Perks** (4 / 7 / 10) wandern mit ihrem Effekt; Perks der Hauptattribute wirken mit jedem Damage Type:
| | 4 | 7 | 10 |
|---|---|---|---|
| STR | Armorbreaker (Crits geben Sunder; Sunder senkt Armor **und** Resistance) | Stoneguard | Titan |
| DEX | Quick Reflexes | Ember Dance | True Shot |
| INT | Attuned (+10 % Penetration, alle Typen) | Surge (+10 % Ailment Chance, alle) | Spellfire |
| AGI | Hawkeye | Opportunist | Double Time |
| WIS | Inner Fire | Afterglow | Clarity |
| VIT | Second Breath | Thick Skin | Undying |

**Gear und Ash Tree** behalten *Physical Damage %*, *Elemental Damage %*, *Physical / Elemental Penetration* und die
sechs einzelnen Ailment Chances ✅ (die Ailment-Übersicht in den Offense-Stats bleibt). Sie bauen den Typ aus. Regel 💡:
Physical- und Elemental-Affixe kommen gleich oft und gleich stark vor, auch bei Uniques und Runewords.

## 4. Heirloom (ersetzt „Weapon Mastery“) ✅

Die Waffe ist das Erbstück des Heirs: fest ab Erstellung, geht durch jedes Prestige mit. Tab bei Kaelen: **Heirloom**.
Rank, Güte (*Crude … Exalted*), Heat Forms (ab Rank 3, frei), Innate Forms, ein Keystone, Echoes bleiben als Bausteine.

**Jede Waffe hat genau drei Paths = drei Builds.** Der erste Punkt in einem Path legt Damage Type und Ailment fest;
eine Waffe kann nur ihre drei (ein Sword nie Void). Wechsel über den Heirloom-Reset bei Kaelen. Reihenfolge ✅: Kern der
Klasse, dann Fire → Lightning → Cold.

| Klasse | Waffe | Path 1 (Kern) | Path 2 | Path 3 |
|---|---|---|---|---|
| Cinderguard | Sword | Physical · Bleed | Lightning · Shock | Cold · Chill |
| | Axe | Physical · Bleed | Fire · Burn | Cold · Chill |
| | Mace | Physical · **Stun** | Fire · Burn | Lightning · Shock |
| Ashstrider | Bow | Physical · Poison | Fire · Burn | Lightning · Shock |
| | Crossbow | Physical · Poison | Fire · Burn | Cold · Chill |
| | Dagger | Physical · Poison | Physical · Bleed | Lightning · Shock |
| Emberseer | Wand | Void · Corruption | Lightning · Shock | Cold · Chill |
| | Staff | Void · Corruption | Fire · Burn | Cold · Chill |

Fire 5 · Lightning 5 · Cold 5 · Void 2 · Physical 7 = 24 Builds.

Charakter eines Builds kommt vom Ailment: Bleed, Poison, Burn, Corruption = Zermürbung · Shock = Burst · Chill = Kontrolle ·
Stun = Kontrolle mit Wucht. Jeder Build hat Direct und DoT zugleich (DoTs richten sich nach dem auslösenden Hit).

💡 Mace-Stun-Build braucht einen Hebel gegen Bosse (Bosse nehmen Stuns halb so lang, `bossStunTaken`), z. B. Sunder-Stacks
während des Stuns.
💡 Infusion wandelt den Hit der Waffe (Default Attack, Innate) in den Path-Typ um, wie heute die Attunement bei Wand/Staff.
Jeder Infusion-Typ bekommt einen eigenen Look an der Waffe (brennende Klinge, Blitze an der Mace, Frostdunst, Void-Rauch).

## 5. Masteries ✅ (ersetzen die Prestige Paths)

Eine Mastery verstärkt einen **Kampfstil**, quer zu allen drei Builds der Waffe. Für jede Klasse dieselben drei Achsen:

| Achse | verstärkt | Cinderguard | Ashstrider | Emberseer |
|---|---|---|---|---|
| **Burst** | große Treffer, Skills, Heat ausgeben, Crit als Auslöser | **Vanquisher** | **Deadeye** | **Archmage** |
| **Tempo** | viele schnelle Treffer, Default Attack, On-Hit | **Berserker** | **Skirmisher** | **Spellweaver** |
| **Ailment** | Chance, Stärke, Dauer aller Ailments (auch Shock, Chill, Stun) | **Ravager** | **Trickster** | **Warlock** |

**Ablauf** ✅: 7 Harvests = 7 Picks.
- 1. Harvest: **Haupt-Mastery** wählen (Tier I) → Titel, Mastery-Skill, Mastery-Keystone.
- Jeder weitere Harvest: Haupt-Mastery eine Stufe tiefer **oder** Tier I einer anderen Mastery der eigenen Klasse
  (nie tiefer, Last-Epoch-Prinzip).
- 💡 Ergibt: Haupt-Mastery Tier I–V + Tier I der beiden anderen = 7. Entscheidung = Reihenfolge und welche Nodes man
  pro Stufe mit Skill Points kauft.
- Jede Stufe öffnet neue Nodes am Ast der Mastery im Ash Tree.
- **Warden und Tactician entfallen** ✅; ihr Inhalt wandert in den Ash Tree (Abschnitt 6).
- Titel = Name der Haupt-Mastery (*Ravager*, *Skirmisher* …). 💡 *Bloodletter* und *Lingering* (alte Traits) werden
  Boni der Ailment-Masteries.

Beispiele: Lightning Sword + Vanquisher (Shock aufbauen, dann großer Power Strike) · Poison Dagger + Trickster
(Gift-Stapler) · Void Wand + Spellweaver (viele schnelle Corruption-Bolts) · Fire Crossbow + Deadeye (schwerer Bolt,
großer Burn).

## 6. Ash Tree (ersetzt „Skill Tree“) ✅

Tab bei Kaelen: **Ash Tree**. Aufgabe: **stützt und schützt** den Build, den Heirloom und Mastery gewählt haben.

| Teil | Inhalt |
|---|---|
| **Krone** | eine Region pro Damage Type mit Ailment: *Steel* (Physical, Stun), *Blood* (Bleed), *Venom* (Poison), *Flame* (Burn), *Storm* (Shock), *Frost* (Chill), *Void* (Corruption). Skills für den Battle Plan liegen hier |
| **Stamm** | Verteidigung für alle: Armor, Evasion, Barrier, Life, Resistances, Block (aus Warden: Block, Reflect, *Iron Bastion*, *Juggernaut*) |
| **Wurzeln** | Heat und Rotation: Starting Heat, Heat Gain, Heat-Refund, Skill-Kosten, Reactions (aus Tactician: *Rally*, *Grand Strategy*). Die Zahl der Battle-Plan-Slots bleibt an der Leiter |
| **Mastery-Äste** | wachsen an der passenden Stelle mit jeder Stufe (Abschnitt 5) |
| **Keystones** | Regelbrecher, teils weit draußen; Limit wie heute über Harvester's Ember |

- **Keine Region ist gesperrt** ✅. Die Philosophie trägt der Heirloom: Ailment-Nodes verstärken nur Ailments, die man
  setzt („Your Poisons …“), also nützen fremde Nodes einfach nichts. Kleine Mischformen über Gear und Skills mit festem
  Typ sind erlaubt ✅.
- Klassen-Startpunkt am Stamm neben dem Kern: Cinderguard bei *Steel/Blood*, Ashstrider bei *Venom*, Emberseer bei *Void*.
- Nachbar-Regionen ergeben Mischformen. 100 Skill Points, Wege kosten Punkte, Gabelungen wie in `level-v2.md`.

## 7. Umbenennungen ✅
- Gegner *Ashen Skirmisher* → **Ashen Prowler** (interne Archetype-Id `skirmisher` bleibt).
- Unique *The Heirloom Grips* → **Grips of the First Heir**.
- Bow-Keystone *Hunter's Mark* bekommt beim Heirloom-Umbau einen neuen Namen.

## 8. Offene Punkte ❓
1. Fury: ob und wann sie abfällt (vorerst nie).
2. Ashstrider-Fokus Crit, aber Crit Chance pro Punkt sitzt bei AGI: reicht Hunter's Mark plus AGI 3 beim Start, oder
   braucht der Ashstrider mehr Crit-Stützen in Mastery/Ash Tree? Wird mit der Balance-CLI geprüft.
3. Inhalte im Detail (je im eigenen Schritt): Nodes der 24 Heirloom-Paths, Innates/Innate Forms pro Path, Nodes der
   9 Masteries, Regionen und Skills des Ash Trees.

---

## 9. Umsetzungsplan 💡

Großer Umbau, darum in Schritten mit je eigenem PR. Jeder Schritt hält `npm run check` und die E2E-Tests grün und lässt
das Spiel spielbar. Vor jedem Schritt mit Inhalten (2–4) kommt eine kurze Detail-Liste zur Abnahme.

| # | Schritt | Inhalt | Ergebnis |
|---|---|---|---|
| 1 | **Drei Klassen + Attribute** | `classes.ts` auf Cinderguard/Ashstrider/Emberseer (Waffen-Familien, Start-Attribute, Start-Off-Hands, Texte); Attribut-Effekte und Perks neu (`stats.ts`, `perks.ts`); Class Traits Fury, Hunter's Mark, Overcharge (Sim + Unit-Tests + Arena-Effekte); Save-Version hoch, alte Saves verworfen; Umbenennungen; Klassenauswahl und Character Sheet angepasst. Die Waffenbäume bleiben vorerst wie sie sind | spielbar mit 3 Klassen |
| 2 | **Heirloom** | System umbenennen (Tab, Texte, Code-Namen); 8 Bäume mit je 3 Build-Paths, Path legt Damage Type + Ailment fest (Attunement verallgemeinert, Mace-Stun als Ailment-Ersatz); Innates/Innate Forms/Keystones neu verteilt; Infusion-Looks an der Waffe in der Arena | 24 Builds spielbar |
| 3 | **Masteries** | 9 Masteries statt 10 Prestige Paths (Warden/Tactician raus); Harvest-Ablauf (Haupt-Mastery beim 1. Harvest, Tier I–V, andere Mastery Tier I); Titel; Mastery-Emblem und Aura | Prestige mit neuem Kern |
| 4 | **Ash Tree neu** | Regionen Steel/Blood/Venom/Flame/Storm/Frost/Void in der Krone, Verteidigung im Stamm, Heat in den Wurzeln; Klassen-Startpunkte; Warden/Tactician-Inhalte eingebaut; Skills neu verortet; Tab „Ash Tree“ | Baum passt zum Gerüst |
| 5 | **Balance** | Autopilot für alle 24 Builds × 3 Masteries; Fairness pro Klasse und Act (Life-Verlust, Versuche); Gear-Parität Physical/Elemental, Uniques/Runewords; Finale und Wildfire neu messen | faire Klassen |
| 6 | **Art und Aufräumen** | 3 Klassen-Icons und Klassen-Bilder (Timo generiert), 9 Mastery-Embleme, gemalte Infusion-Effekte falls gewünscht; GDD v2 und Design-Docs aktualisieren, alte Docs ins Archiv | fertig |

Schritt 1 und 2 sind am engsten verzahnt; 3 und 4 können nach 2 parallel laufen. Balance (5) läuft nach jedem Schritt
grob mit, gründlich erst am Ende.

---

## 10. Umsetzung ✅ (18.10., ein Branch, ein PR)

Timo wollte alle Schritte am Stück ohne Detail-Abnahmen, Fragen erst am Ende. Darum sind die Inhalte erste Entwürfe:

| # | Commit | Stand |
|---|---|---|
| 1 | `feat(sim): three classes …` | Cinderguard/Ashstrider/Emberseer, Main Attribute (+8 % Damage), Fury/Hunter's Mark/Overcharge mit Arena-Looks, Save-Version hoch, alte Saves verworfen |
| 2 | `feat(sim): Heirloom …` | 8 Bäume × 3 Paths; der Path setzt Damage Type + Ailment, Infusion-Look an der Waffe |
| 3 | `feat(content): nine Masteries …` | Vanquisher/Berserker/Ravager, Deadeye/Skirmisher/Trickster, Archmage/Spellweaver/Warlock; Haupt-Mastery beim 1. Harvest, Tier I–V |
| 4 | `feat(content): Ash Tree …` | Krone mit 7 Element-Regionen, Stamm (Defense, ex Warden), Wurzeln (Heat, ex Tactician); 21 Skills, 13 Keystones, 9 Rune Sockets |
| 5 | `feat(balance): …` | 24 Autopilot-Builds × 3 Masteries; Monster-Resistance 30 → 10 %, Act-Element 30/40 → 20/25 % |
| 6 | `docs: …` | GDD v2, alte Klassen-/Baum-Docs ins Archiv |

Balance-Stand (Summe der Anläufe über die sieben neuesten Acts, `--mastery all --runs 2 --seed 41`):
Cinderguard 27,1, Ashstrider 24,3, Emberseer 18,5 (vorher 43,7 / 36,4 / 32,3).

Offen für Timo: Emberseer am leichtesten, Cinderguard-Axt und Cold/Lightning in Act 4 am schwersten; Klassen-Icons und
Mastery-Embleme sind noch geliehene Art; im Code heißen Mastery und Ash-Tree-Regionen intern weiter `branch`.
