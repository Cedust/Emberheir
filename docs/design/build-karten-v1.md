# Build-Karten v1 (Inhalts-Übersicht)

Stand: Balancing-Neustart Schritt 7 (20.10.2026). Eine Karte pro Autopilot-Build: was der Build will, welche Heirloom-,
Ash-Tree- und Battle-Plan-Wahl er trifft, welche Affixe er sucht und wie er sich in der Messung schlägt. Die Karten sind
die Inhalts-Übersicht zu `game-design-document-v2.md` (Abschnitt 5) und die Testfälle der Balance-CLI
(`tools/balance`, Builds in `packages/content/src/build-plans.ts`).

**Messung:** Act-Autopilot bis Run 7, Seeds 41 und 51 mit je 2 Läufen (4 Läufe pro Build und Mastery). Zahl = Versuche
im neuesten Act, Mittel über Act 1–7; in Klammern die Spielzeit bis Ende Run 7 (Kampfsekunden + 12 s pro Kampf + 90 s
pro Reise). „hängt“ = ein Seed mit einem Lauf, der irgendwo 30 Versuche brauchte. Ziel: 3–5 Versuche, jede Klasse etwa
gleich. Rohdaten: `/mnt/project-files/design/notes/balancing-neustart/act7-schritt7-roh.txt`.

```sh
npm run balance -- --act 7 --weapon sword --build sword-edge --mastery ravager --runs 2 --seed 41 --newest 1
```

## Übersicht

| Klasse | Versuche | Masteries |
|---|---|---|
| Cinderguard | 3,9 | Vanquisher 4,0 · Berserker 3,7 · Ravager 4,0 |
| Ashstrider | 4,2 | Deadeye 4,4 · Skirmisher 4,6 · Trickster 3,7 |
| Emberseer | 3,5 | Archmage 3,3 · Spellweaver 4,1 · Warlock 3,1 |

| Build | Versuche (Mittel der 3 Masteries) |
|---|---|
| Sword · Edge | 2,5 |
| Sword · Thunder | 4,1 |
| Sword · Winter | 3,7 |
| Axe · Butcher | 4,4 |
| Axe · Blaze | 3,1 |
| Axe · Glacier | 4,3 |
| Mace · Quake | 4,1 |
| Mace · Forge | 4,2 |
| Mace · Stormwall | 4,5 |
| Bow · Toxin | 5,3 |
| Bow · Fire Arrows | 4,0 |
| Bow · Storm | 3,1 |
| Crossbow · Venom Bolts | 4,8 |
| Crossbow · Incendiary | 4,8 |
| Crossbow · Frost | 4,1 |
| Dagger · Venom | 3,9 |
| Dagger · Cutthroat | 3,4 |
| Dagger · Static | 4,7 |
| Wand · Starfall | 2,7 |
| Wand · Storm | 4,7 |
| Wand · Rime | 2,5 |
| Staff · Hollow | 3,5 |
| Staff · Smolder | 3,8 |
| Staff · Glacial | 3,8 |

| Waffe | Schaden | Angriffe/s | Klasse |
|---|---|---|---|
| Sword | 13–20 | 0,9 | Cinderguard |
| Axe | 14–25 | 0,75 | Cinderguard |
| Mace | 18–27 | 0,6 | Cinderguard |
| Bow | 15–24 | 0,8 | Ashstrider |
| Crossbow | 21–32 | 0,5 | Ashstrider |
| Dagger | 11–17 | 1,1 | Ashstrider |
| Wand | 12–19 | 0,9 | Emberseer |
| Staff | 15–25 | 0,65 | Emberseer |

## Cinderguard

Alle Cinderguard-Builds: Attribute STR > VIT > AGI; Defense über Armor (STR) und Block; Reaction-Slot Iron Bastion bei
50 % Life; Heat-Form Cooling. Messung wie oben.

### Sword · Edge (Physical, Bleed)
- **Ziel:** Bleed aus Crits stapeln, Rend löst ihn ein. Der sicherste Einstieg.
- **Heirloom:** Edge, Keystone Deep Cuts, Innate Rising Strike (gibt halbe Heat zurück).
- **Ash Tree:** Rend → Flayer → Cleave → Iron Bastion → Exsanguinate → Final Mercy → Brutal Force → Colossus.
- **Battle Plan:** Rising Strike · Mastery-Skill · Rend.
- **Wunsch-Affixe:** Crit Chance, Bleed Chance, Ailment Effect, Physical Damage %, Armor, Life.
- **Runen:** Crit- und Bleed-Runen, eine Life-Rune.
- **Stark:** hoher Bleed, Schild. **Schwach:** schwache Gegner mit hoher Armor bremsen den ersten Treffer.
- **Messung:** Vanquisher 2,4 (6,0 h) · Berserker 3,0 (7,9 h) · Ravager 2,2 (6,3 h).

### Sword · Thunder (Lightning, Shock)
- **Ziel:** Shock stapeln, damit jeder Treffer mehr macht. Flowing Blade für Tempo.
- **Heirloom:** Thunder, Keystone Flowing Blade, Innate Rising Strike (Lightning).
- **Ash Tree:** Crushing Blow → Storm Strike → Thunderhead → Storm Weaver → Brutal Force → Flurry → Iron Bastion → Colossus → Final Mercy → Unbroken → Execute.
- **Battle Plan:** Rising Strike · Mastery-Skill · Storm Strike.
- **Wunsch-Affixe:** Lightning Damage %, Shock Chance, Attack Speed, Crit Chance, Armor, Lightning Resistance.
- **Runen:** Lightning- und Speed-Runen.
- **Stark:** Shock macht jeden Folgetreffer stärker. **Schwach:** Gegner mit Lightning Resistance.
- **Messung:** Vanquisher 3,6 (7,2 h) · Berserker 4,1 (8,0 h) · Ravager 4,6 (8,3 h).

### Sword · Winter (Cold, Chill)
- **Ziel:** Parieren und kontern (Perfect Parry), Chill bremst den Gegner.
- **Heirloom:** Winter, Keystone Perfect Parry, Innate Rising Strike (Cold).
- **Ash Tree:** wie Thunder, aber Frost Strike → Glacier → Deep Freeze.
- **Battle Plan:** Rising Strike · Mastery-Skill · Frost Strike.
- **Wunsch-Affixe:** Cold Damage %, Chill Effect, Block, Evasion, Armor, Life.
- **Runen:** Cold- und Defense-Runen.
- **Stark:** sehr sicher gegen schnelle Gegner. **Schwach:** langsamste Kämpfe der Sword-Builds.
- **Messung:** Vanquisher 3,2 (8,4 h) · Berserker 3,6 (9,9 h) · Ravager 4,3 (10,6 h).


### Axe · Butcher (Physical, Bleed)
- **Ziel:** Bleed läuft, Rampage wird mit jedem Tick stärker. Für lange Kämpfe gebaut.
- **Heirloom:** Butcher, Keystone Rampage, Innate Gutting Lacerate (150 %, Bleed 60 % stärker).
- **Ash Tree:** wie Sword Edge.
- **Battle Plan:** Gutting Lacerate · Mastery-Skill · Rend.
- **Wunsch-Affixe:** Bleed Chance, Ailment Effect, Lifesteal, Life, Armor, Block.
- **Runen:** Bleed- und Life-Runen.
- **Stark:** Bosse (Rampage wächst). **Schwach:** die ersten Sekunden jedes Kampfes.
- **Messung:** Vanquisher 5,7 (8,8 h) · Berserker 4,4 (9,0 h) · Ravager 3,1 (6,7 h).

### Axe · Blaze (Fire, Burn)
- **Ziel:** Burn setzen, Executioner beendet den Kampf unter 25 % Life.
- **Heirloom:** Blaze, Keystone Executioner, Innate Gutting Lacerate (Fire).
- **Ash Tree:** Crushing Blow → Searing Blow → Firestarter → Pyroclasm → Brutal Force → Flurry → Iron Bastion → Colossus → Final Mercy → Unbroken → Execute.
- **Battle Plan:** Gutting Lacerate · Mastery-Skill · Searing Blow.
- **Wunsch-Affixe:** Fire Damage %, Burn Chance, Ailment Effect, Crit Chance, Life, Fire Resistance.
- **Runen:** Fire- und Burn-Runen.
- **Stark:** stärkster Axe-Build, schnelle Kämpfe. **Schwach:** Fire-resistente Gegner (Act 3).
- **Messung:** Vanquisher 2,8 (6,7 h) · Berserker 3,0 (7,6 h) · Ravager 3,4 (7,1 h).

### Axe · Glacier (Cold, Chill)
- **Ziel:** Chill bremst, Gore reißt den Gegner auf.
- **Heirloom:** Glacier, Keystone Gore, Innate Gutting Lacerate (Cold).
- **Ash Tree:** wie Sword Winter.
- **Battle Plan:** Gutting Lacerate · Mastery-Skill · Frost Strike.
- **Wunsch-Affixe:** Cold Damage %, Chill Effect, Lifesteal, Life, Armor.
- **Runen:** Cold- und Life-Runen.
- **Stark:** Kontrolle über schnelle Gegner. **Schwach:** Act 4 (Frost), Gegner sind Cold-fest.
- **Messung:** Vanquisher 5,1 (11,8 h) · Berserker 3,5 (9,2 h) · Ravager 4,3 (10,1 h).

### Mace · Quake (Physical, Stun)
- **Ziel:** Stun und Sunder, Siege zerschlägt Rüstung.
- **Heirloom:** Quake, Keystone Siege, Innate Bone Breaker (Stun, 3 Sunder).
- **Ash Tree:** Crushing Blow → Brutal Force → Flurry → Iron Bastion → Colossus → Final Mercy → Coup de Grace → Unbroken → Execute.
- **Battle Plan:** Bone Breaker · Mastery-Skill · Crushing Blow.
- **Wunsch-Affixe:** Physical Damage %, Armor Penetration, Stun Duration, Block, Armor, Life.
- **Runen:** Physical- und Block-Runen.
- **Stark:** Gegner kommen kaum zum Zug, sehr gleichmäßig. **Schwach:** wenig Schaden gegen Stun-feste Bosse.
- **Messung:** Vanquisher 4,1 (10,7 h) · Berserker 3,2 (9,4 h) · Ravager 5,1 (11,2 h).

### Mace · Forge (Fire, Burn)
- **Ziel:** schwere Fire-Schläge, Burn als Nachglühen.
- **Heirloom:** Forge, Keystone Siege, Innate Bone Breaker (Fire).
- **Ash Tree:** wie Axe Blaze.
- **Battle Plan:** Bone Breaker · Mastery-Skill · Searing Blow.
- **Wunsch-Affixe:** Fire Damage %, Burn Chance, Crit Chance, Block, Armor, Fire Resistance.
- **Runen:** Fire-Runen.
- **Stark:** höchste Dummy-DPS mit Ravager. **Schwach:** Act 4 (Frost), Act 2.
- **Messung:** Vanquisher 4,5 (9,8 h) · Berserker 4,1 (9,4 h) · Ravager 4,1 (8,4 h).

### Mace · Stormwall (Lightning, Shock)
- **Ziel:** Der Wall: Block und Bastion, Shock macht den Gegner weich.
- **Heirloom:** Stormwall, Keystone Bastion, Innate Bone Breaker (Lightning).
- **Ash Tree:** wie Sword Thunder.
- **Battle Plan:** Bone Breaker · Mastery-Skill · Storm Strike.
- **Wunsch-Affixe:** Block, Armor, Life, Lightning Damage %, Shock Chance, Lightning Resistance.
- **Runen:** Block- und Lightning-Runen.
- **Stark:** der zäheste Build. **Schwach:** Act 2 und Act 4, vor allem mit Ravager.
- **Messung:** Vanquisher 4,4 (9,4 h) · Berserker 3,9 (10,0 h, hängt 1×) · Ravager 5,2 (10,9 h).

## Ashstrider

Alle Ashstrider-Builds: Attribute DEX > AGI > VIT; Defense über Evasion (DEX) und Deflect; Reaction-Slot Iron Bastion
bei 50 % Life; Off Hand Quiver (Dagger: Blood Talisman); Steady Heat (Dagger: Cooling). Messung wie oben.

### Bow · Toxin (Physical, Poison)
- **Ziel:** Poison-Stapel aufbauen, Toxic Burst verdoppelt sie.
- **Heirloom:** Toxin, Keystone Marked Prey, Innate Hooked Arrow.
- **Ash Tree:** Envenom → Venom Heart → Toxic Burst → Creeping Death → Slow Death → Wither → Leeching Rot → Iron Bastion.
- **Battle Plan:** Hooked Arrow · Mastery-Skill · Toxic Burst.
- **Wunsch-Affixe:** Poison Chance, Ailment Effect, Attack Speed, Evasion, Life.
- **Runen:** Poison- und Speed-Runen.
- **Stark:** Trickster, lange Bosskämpfe. **Schwach:** Deadeye und Skirmisher in Act 5 und 7.
- **Messung:** Deadeye 5,8 (11,9 h) · Skirmisher 6,4 (12,2 h) · Trickster 3,8 (8,8 h).

### Bow · Fire Arrows (Fire, Burn)
- **Ziel:** Burn auf jedem Pfeil, Searing Blow setzt ihn sicher.
- **Heirloom:** Fire Arrows, Keystone Marked Prey, Innate Hooked Arrow (Fire).
- **Ash Tree:** Searing Blow → Firestarter → Pyroclasm → Final Mercy → Ghost Step → Iron Bastion.
- **Battle Plan:** Hooked Arrow · Mastery-Skill · Searing Blow.
- **Wunsch-Affixe:** Fire Damage %, Burn Chance, Ailment Effect, Crit Chance, Fire Resistance.
- **Runen:** Fire- und Burn-Runen.
- **Stark:** Deadeye und Trickster. **Schwach:** Act 3 (Fire), Skirmisher in Act 7.
- **Messung:** Deadeye 4,0 (8,9 h) · Skirmisher 4,7 (9,3 h) · Trickster 3,4 (8,4 h).

### Bow · Storm (Lightning, Shock)
- **Ziel:** viele Pfeile (Split Shot, Hailstorm), Shock macht jeden weiteren stärker.
- **Heirloom:** Storm, Keystone Hailstorm, Innate Hooked Arrow (Lightning).
- **Ash Tree:** Storm Strike → Thunderhead → Storm Weaver → Final Mercy → Ghost Step → Iron Bastion.
- **Battle Plan:** Hooked Arrow · Mastery-Skill · Storm Strike.
- **Wunsch-Affixe:** Lightning Damage %, Shock Chance, Attack Speed, Crit Chance, Lightning Resistance.
- **Runen:** Lightning- und Speed-Runen.
- **Stark:** der leichteste Ashstrider-Build. **Schwach:** Gegner mit Lightning Resistance.
- **Messung:** Deadeye 3,7 (7,8 h) · Skirmisher 2,5 (6,2 h) · Trickster 3,3 (7,2 h).

### Crossbow · Venom Bolts (Physical, Poison)
- **Ziel:** Bolzen durch die Rüstung, Sunder stapeln, Siege Engine löst sie aus.
- **Heirloom:** Venom Bolts, Keystone Siege Engine, Innate Ballista Bolt.
- **Ash Tree:** wie Bow Toxin.
- **Battle Plan:** Ballista Bolt · Mastery-Skill · Toxic Burst.
- **Wunsch-Affixe:** Physical Penetration, Poison Chance, Ailment Effect, Evasion, Life.
- **Runen:** Physical- und Poison-Runen.
- **Stark:** gepanzerte Gegner. **Schwach:** schnelle Gegner zwischen zwei Bolzen.
- **Messung:** Deadeye 4,9 (9,9 h, hängt 1×) · Skirmisher 5,8 (12,2 h) · Trickster 3,8 (9,1 h).

### Crossbow · Incendiary (Fire, Burn)
- **Ziel:** Mighty-Bolzen, das Innate ist immer Mighty, Burn als Nachglühen.
- **Heirloom:** Incendiary, Keystone Repeater, Innate Ballista Bolt (Fire).
- **Ash Tree:** wie Bow Fire Arrows.
- **Battle Plan:** Ballista Bolt · Mastery-Skill · Searing Blow.
- **Wunsch-Affixe:** Fire Damage %, Burn Chance, Crit Chance, Evasion, Fire Resistance.
- **Runen:** Fire-Runen.
- **Stark:** höchste Dummy-DPS mit Trickster. **Schwach:** mit Skirmisher in Act 7.
- **Messung:** Deadeye 4,8 (8,5 h) · Skirmisher 6,7 (10,2 h, hängt 1×) · Trickster 2,8 (6,7 h).

### Crossbow · Frost (Cold, Chill)
- **Ziel:** Chill bremst den Gegner, Drum Magazine schießt nach jedem Skill schneller.
- **Heirloom:** Frost, Keystone Repeater, Innate Ballista Bolt (Cold).
- **Ash Tree:** Frost Strike → Glacier → Deep Freeze → Final Mercy → Ghost Step → Iron Bastion.
- **Battle Plan:** Ballista Bolt · Mastery-Skill · Frost Strike.
- **Wunsch-Affixe:** Cold Damage %, Chill Effect, Attack Speed, Evasion, Cold Resistance.
- **Runen:** Cold- und Speed-Runen.
- **Stark:** sicher gegen schnelle Gegner. **Schwach:** Act 4 (Frost).
- **Messung:** Deadeye 4,3 (10,3 h) · Skirmisher 3,9 (9,6 h) · Trickster 4,0 (10,1 h).

### Dagger · Venom (Physical, Poison)
- **Ziel:** Virulent Coat vergiftet jeden Stich, Toxic Bloom lässt volle Stapel platzen.
- **Heirloom:** Venom, Keystone Toxic Bloom, Innate Virulent Coat.
- **Ash Tree:** wie Bow Toxin.
- **Battle Plan:** Virulent Coat · Mastery-Skill · Toxic Burst.
- **Wunsch-Affixe:** Poison Chance, Ailment Effect, Attack Speed, Lifesteal, Evasion.
- **Runen:** Poison- und Speed-Runen.
- **Stark:** Trickster. **Schwach:** Deadeye in Act 7.
- **Messung:** Deadeye 4,7 (11,3 h, hängt 1×) · Skirmisher 3,8 (9,8 h) · Trickster 3,2 (8,1 h).

### Dagger · Cutthroat (Physical, Bleed)
- **Ziel:** Crits setzen Bleed, Rend löst ihn ein; Assassinate eröffnet jeden Kampf.
- **Heirloom:** Cutthroat, Keystone Assassinate, Innate Virulent Coat.
- **Ash Tree:** Rend → Flayer → Exsanguinate → Final Mercy → Ghost Step → Iron Bastion.
- **Battle Plan:** Virulent Coat · Mastery-Skill · Rend.
- **Wunsch-Affixe:** Crit Chance, Bleed Chance, Ailment Effect, Attack Speed, Evasion.
- **Runen:** Crit- und Bleed-Runen.
- **Stark:** der gleichmäßigste Build über alle Masteries. **Schwach:** Gegner mit hoher Armor.
- **Messung:** Deadeye 3,2 (9,4 h) · Skirmisher 3,0 (8,8 h) · Trickster 3,9 (11,4 h).

### Dagger · Static (Lightning, Shock)
- **Ziel:** Doppelstiche, die immer Shocken; Vanishing Act nach Evades.
- **Heirloom:** Static, Keystone Vanishing Act, Innate Virulent Coat (Lightning).
- **Ash Tree:** wie Bow Storm.
- **Battle Plan:** Virulent Coat · Mastery-Skill · Storm Strike.
- **Wunsch-Affixe:** Attack Speed, Lightning Damage %, Shock Chance, Evasion, Lightning Resistance.
- **Runen:** Speed- und Lightning-Runen.
- **Stark:** gleichmäßig über die Masteries. **Schwach:** Act 5 (Lightning-feste Gegner).
- **Messung:** Deadeye 4,6 (10,2 h) · Skirmisher 4,7 (8,9 h, hängt 1×) · Trickster 4,9 (11,8 h, hängt 1×).

## Emberseer

Alle Emberseer-Builds: Attribute INT > VIT > WIS; Defense über Barrier (INT); Reaction-Slot Iron Bastion bei
50 % Life; Heat-Form Warming. Messung wie oben.
Wand-Innate: Barrage (3 Bolts à 45 %, benannt nach dem Path: Void/Shock/Frost Barrage).

### Wand · Starfall (Void, Corruption, Crits)
- **Ziel:** Skills laden den Spark, der Spark crittet; Corruption wächst nebenher.
- **Heirloom:** Starfall, Keystone Wild Magic, Innate Void Barrage.
- **Ash Tree:** Corrupt → Mastery → Hollow Crown → Void Rift → Iron Bastion → Entropy → Hungering Void → Pact of Ash → Soul Harvest → Heart of Winter.
- **Battle Plan:** Void Barrage · Mastery-Skill · Void Rift.
- **Wunsch-Affixe:** Crit Chance, Void Damage %, Ailment Effect, Barrier, Life.
- **Runen:** Crit- und Void-Runen.
- **Stark:** gleichmäßig in allen Acts. **Schwach:** Void-feste Gegner in Act 6.
- **Messung:** Archmage 2,4 (5,2 h) · Spellweaver 3,3 (6,8 h) · Warlock 2,4 (5,3 h).

### Wand · Storm (Lightning, Shock)
- **Ziel:** Shock stapeln, dann wird jeder Spell stärker; Chain Lightning verteilt ihn.
- **Heirloom:** Storm, Keystone Wild Magic, Innate Shock Barrage.
- **Ash Tree:** Corrupt → Mastery → Chain Lightning → Thunderhead → Thunderstrike → Iron Bastion → Storm Weaver → Arcane Conduit.
- **Battle Plan:** Shock Barrage · Mastery-Skill · Chain Lightning.
- **Wunsch-Affixe:** Lightning Damage %, Shock Chance, Cast/Attack Speed, Barrier, Lightning Resistance.
- **Runen:** Lightning-Runen.
- **Stark:** Archmage. **Schwach:** Spellweaver in Act 6/7, Shock ist kein DoT zum Einlösen.
- **Messung:** Archmage 3,8 (8,1 h, hängt 1×) · Spellweaver 6,0 (9,7 h) · Warlock 4,2 (8,5 h).

### Wand · Rime (Cold, Chill)
- **Ziel:** Chill und Freeze bremsen den Gegner, Frost Nova friert ihn kurz ein.
- **Heirloom:** Rime, Keystone Prism, Innate Frost Barrage.
- **Ash Tree:** Ice Lance → Mastery → Glacier → Frost Nova → Iron Bastion → Heart of Winter → Arcane Conduit → Deep Freeze.
- **Battle Plan:** Frost Barrage · Mastery-Skill · Frost Nova.
- **Wunsch-Affixe:** Cold Damage %, Chill Effect, Barrier, Life, Cold Resistance.
- **Runen:** Cold- und Barrier-Runen.
- **Stark:** der leichteste Build, sehr sicher. **Schwach:** Act 4 (Frost, Cold-feste Gegner).
- **Messung:** Archmage 2,1 (8,1 h) · Spellweaver 2,5 (9,1 h) · Warlock 2,8 (10,6 h).

Staff-Innate: Void Lance (60 % mehr, setzt immer Corruption); Smolder spielt Rift Bolt (setzt Corruption und Burn).

### Staff · Hollow (Void, Corruption)
- **Ziel:** eine lange, wachsende Corruption; Endless Night lässt sie 3× so lang laufen.
- **Heirloom:** Hollow, Keystone Endless Night, Innate Void Lance.
- **Ash Tree:** wie Wand Starfall.
- **Battle Plan:** Void Lance · Mastery-Skill · Void Rift.
- **Wunsch-Affixe:** Ailment Effect, Void Damage %, Corruption Chance, Barrier, Life.
- **Runen:** Void- und Ailment-Runen.
- **Stark:** Bosse (Corruption wächst). **Schwach:** Act 7, die ersten Sekunden jedes Kampfes.
- **Messung:** Archmage 3,2 (5,3 h) · Spellweaver 4,8 (8,0 h) · Warlock 2,6 (5,8 h).

### Staff · Smolder (Fire, Burn)
- **Ziel:** Burn und Corruption zugleich (Master of Smolder), Fire-Treffer zünden den Burn.
- **Heirloom:** Smolder, Keystone Pyre, Forks Cinders und Ashen Veil, Innate Rift Bolt.
- **Ash Tree:** Corrupt → Mastery → Immolate → Firestarter → Meteor → Iron Bastion → Pyroclasm → Inferno → Cinder Heart → Arcane Conduit.
- **Battle Plan:** Rift Bolt · Mastery-Skill · Inferno.
- **Wunsch-Affixe:** Fire Damage %, Burn Chance, Ailment Effect, Barrier, Fire Resistance.
- **Runen:** Fire- und Burn-Runen.
- **Stark:** Warlock (lange Burns, Combust). **Schwach:** Archmage in Act 6/7 (hängt), Act 4–6 mit Spellweaver.
- **Messung:** Archmage 4,8 (9,1 h, hängt 2×) · Spellweaver 4,2 (7,3 h) · Warlock 2,4 (5,5 h).

### Staff · Glacial (Cold, Chill, Skills)
- **Ziel:** Skill-Spam mit Echoing Chant, Eclipse belohnt viele Ailments auf dem Gegner.
- **Heirloom:** Glacial, Keystone Eclipse, Innate Frost Lance.
- **Ash Tree:** wie Wand Rime.
- **Battle Plan:** Frost Lance · Mastery-Skill · Frost Nova.
- **Wunsch-Affixe:** Cold Damage %, Heat Gain, Chill Effect, Barrier, Life.
- **Runen:** Cold- und Heat-Runen.
- **Stark:** Archmage. **Schwach:** Act 4 (Frost), langsam (9–11 h).
- **Messung:** Archmage 3,6 (9,2 h) · Spellweaver 3,8 (11,0 h) · Warlock 3,9 (11,4 h).

