# Weapon Mastery v2: Pfade mit Gabelungen, Precision und Mighty Hits

Stand 13.10.2026 · ✅ von Timo angenommen (13.10.), noch nichts umgesetzt · gehört zu `neuausrichtung-v1.md` (Abschnitt 3)
Ersetzt bei Annahme die Pfad-Inhalte aus `weapon-mastery-baeume-v1.md`. Refine, Heat Forms, Innate Forms, Attunements und
Echoes bleiben, wie sie sind (mit den neuen Zahlen aus Abschnitt 1).
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen. Zahlen sind Startwerte für die Balance-CLI.

**Timo (13.10.):** Die Änderungen an der Weapon Mastery gefallen ihm ✅. Precision und Damage Range sollen mehr wert sein
(Idee: Range 20–200 %, vier statt drei Stufen, kein Zwang). Frage: Lohnt sich Glancing Damage, oder nimmt man dann nicht
lieber direkt Precision?

---

## 1. Precision und Damage Range: von versteckten Prozenten zu echten Spielstilen

### 1.1 Was die Nodes heute wirklich tun

| Node | Wirkung heute | entspricht |
|---|---|---|
| Steady Hand (Min +10 %) | Durchschnitt +5 % | ~+5 % Damage |
| Full Swing (Max +15 %) | Durchschnitt +7,5 % | ~+7,5 % Damage |
| Precision (+5 %) | bei 75 %: Schaden ×0,875 → ×0,9 | ~+3 % Damage, etwas mehr Trigger |
| Glancing Damage (Vorschlag aus v1) | bei 75 % Precision: +10 % × 25 % | **~+2,5 % Damage, sinkt mit jeder Precision** |

Der Schaden würfelt gleichmäßig zwischen Min und Max. Eine breitere Range mit gleichem Durchschnitt ändert über einen
Kampf praktisch nichts. **Range-Nodes sind heute Damage % mit anderem Namen.**

**Antwort auf Timos Frage:** Nein, Glancing Damage ist keine sinnvolle Investition. Es wird mit jedem Punkt Precision
schwächer und konkurriert mit ihr. Ich **streiche es**. Glancing Blows bekommen stattdessen **Mechanik**
(Heat, Sunder, Ripostes) in den Pfaden, die bewusst mit niedriger Precision spielen.

### 1.2 Neu: Mighty Hits 💡

Damit die Range spürbar wird, braucht sie eine **Schwelle**, an der etwas passiert:

> **Mighty Hit:** Ein sauberer Treffer, der **125 % Weapon Damage oder mehr** würfelt. Er bekommt einen eigenen Look
> (später) und ist eine Bedingung für Nodes, Trigger und Keystones („Mighty Hits always Bleed“).

Jetzt hat jede Stellschraube eine eigene Rolle:

| Wert | Was er tut | Spielgefühl |
|---|---|---|
| **Precision** | weniger Glancing Blows, sicherere Trigger | „Ich treffe immer sauber“ |
| **Damage Range Max** | mehr und größere Mighty Hits | „Jeder fünfte Schlag ist ein Hammer“ |
| **Damage Range Min** | weniger schwache Würfe, höherer Durchschnitt | „Konstant hart“ |

### 1.3 Neue Grund-Ranges (Timos Idee, angepasst)

Die Ranges werden deutlich breiter, und der **Durchschnitt bleibt bei allen Waffen gleich** (Weapon Damage wird
entsprechend skaliert). So unterscheidet die Range den **Stil**, nicht die Stärke.

| Waffe | Precision | Range heute | Range neu | Chance auf Mighty Hit (Start) | Stil |
|---|---|---|---|---|---|
| Dagger | 80 % | 50–100 % | 60–110 % | 0 % | präzise, nie wuchtig |
| Bow | 75 % | 40–110 % | 40–130 % | 6 % | sauber, selten wuchtig |
| Sword | 75 % | 40–110 % | 40–140 % | 15 % | der Maßstab |
| Wand | 70 % | 40–110 % | 40–130 % | 6 % | |
| Staff | 65 % | 50–110 % | 50–120 % | 0 % | Schaden über Ailments |
| Mace | 65 % | 50–120 % | 50–160 % | 32 % | schwer und wuchtig |
| Axe | 70 % | 40–120 % | 20–180 % | 34 % | wild (Timos 20–200 %, fast ganz) |
| Crossbow | 60 % | 60–130 % | 60–180 % | 46 % | selten sauber, dann gewaltig |

### 1.4 Refine-Nodes

Drei Stufen reichen, weil mit Parry und den Gabelungen neue Nodes ins Budget von ~20 Punkten drängen. Dafür ist jede
Stufe **deutlich spürbarer**:

| Node | Ränge | heute pro Rang | neu pro Rang | Grenze |
|---|---|---|---|---|
| Steady Hand | 3 | Min +10 % | Min **+15 %** | Min höchstens 100 % |
| Full Swing | 3 | Max +15 % | Max **+25 %** | Max höchstens 220 % |
| Precision | 3 | +5 % | +5 % (bleibt) | 95 % |
| Balance | 2 | +6 % Attack Speed | bleibt | – |

Beispiel Axe (Grund 20–180 %, Durchschnitt 100 %, 34 % Mighty Hits):

| Ausbau | Range | Durchschnitt | Mighty Hits | gut für |
|---|---|---|---|---|
| Full Swing 3/3 | 20–220 % | 120 % | 48 %, sehr groß | Cleave, **Bleed** (Bleed behält den stärksten Treffer) |
| Steady Hand 3/3 | 65–180 % | 122 % | 48 %, kleiner | **Poison**, Flurry (jeder Treffer zählt gleich, keine schwachen Würfe) |

Beide heben den Schaden ähnlich, aber für **verschiedene Builds**. Das ist eine echte Wahl statt einer Addition.

### 1.5 Parry (neuer waffeneigener Wert) 💡

> **Parry:** Chance, dass ein gegnerischer **Angriff** (kein Spell) zu einem Glancing Blow wird (halber Schaden, löst bei
> Gegner keine Trigger aus).

Parry ist Defense, die es **nur über die Waffe** gibt. Evasion weicht ganz aus (Gear, AGI), Block stoppt 50 % (Shield),
Parry halbiert (Mastery). Höchstens 30 %.

---

## 2. Grundriss eines Pfads (unverändert aus `neuausrichtung-v1.md`)

```
Technik I (3 Ränge)  →  Gabel 1 (A ◇ B)  →  Technik II (3 Ränge)  →  Gabel 2 (C ◇ D)  →  Pfad-Meister
```

- **9 Punkte** für einen vollen Pfad. Budget ~20 Punkte: ein voller Pfad und ein halber, oder zwei Pfade bis zur ersten
  Gabel, dazu Refine und Formen.
- Die drei Pfade einer Waffe folgen einem Muster:
  1. **Ailment- oder Schadens-Pfad** (das, womit die Klasse tötet),
  2. **Mechanik-Pfad** (das Besondere dieser Waffe: Konter, Stun, Mighty Hits, Pfeile …),
  3. **Tempo- oder Schutz-Pfad** (Heat, Speed, Defense).
- Der **Pfad-Meister** verbindet die Waffe mit einem anderen System: Gear (Trigger), Battle Plan, Ailments oder Attribute.
- Werte in Technik-Nodes sind nur Werte, die es **ausschließlich** an der Waffe gibt (Precision, Range, Parry,
  Sunder, Stun, Extra-Attack Damage, Innate Damage/Cost, Ailment-Wirkung der Waffe, Heat per Hit).

---

## 3. Die 24 Pfade

Format pro Pfad: **Build-Idee** · Technik I · Gabel 1 · Technik II · Gabel 2 · Meister.

### 3.1 Sword (Warrior) – „Der Duellant“

| Pfad | Build-Idee |
|---|---|
| **Riposte** | Shield-Warrior, der durch Konter tötet: blocken, parieren, zurückschlagen |
| **Edge** | sauberer Präzisions-Fechter mit Crit und Bleed |
| **Tempo** | Skill-Warrior: Rhythmus aus Heat, Innate und Battle Plan |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Riposte | +4 % Parry | **Counterweight**: Ripostes treffen sauber, +1 Sunder ◇ **Read the Blow**: nach Block/Evade/Parry ist der nächste Treffer ein sauberer Crit | +20 % Extra-Attack Damage | **Perfect Timing**: Parry löst eine Riposte aus (1 s Cooldown) ◇ **Iron Wall**: Block und Parry geben 8 Heat | **Master of the Counter**: Ripostes können Trigger-Affixe auslösen |
| Edge | +3 % Precision | **Keen Edge**: Crits bluten ◇ **Clean Line**: 5 saubere Treffer in Folge, der nächste +100 % | +12 % Bleed-Wirkung des Swords | **Hamstring**: Bleed senkt Gegner-Attack-Speed um 10 % ◇ **Deep Wound**: Bleed aus Crits ×1,5 | **Master of the Edge**: keine Glancing Blows mehr, Precision über 100 % wird zu Crit Chance |
| Tempo | +8 % Heat per Hit | **Rhythm**: jeder 3. Slash +10 Heat ◇ **Unbroken Flow**: +3 % Attack Speed pro sauberem Treffer in Folge (bis 5) | +10 % Innate Damage | **Building Edge**: Innate kostet 5 Heat weniger pro sauberem Treffer seit dem letzten Skill ◇ **Steady Breath**: Glancing Blows kühlen nicht ab | **Master of Tempo**: Rotation Slot 1 wird nach jedem Innate gratis wiederholt (1× pro 8 s) |

### 3.2 Mace (Warrior) – „Der Brecher“

| Pfad | Build-Idee |
|---|---|
| **Crush** | Rüstung zerschlagen: Sunder stapeln und einlösen |
| **Quake** | Kontrolle: Stuns, Telegraphs unterbrechen |
| **Bulwark** | Shield-Tank: Block wird zu Heat und Schaden |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Crush | +8 % Sunder-Chance pro sauberem Treffer | **Armor Breaker**: +3 max Sunder ◇ **Rupture Plate**: bei vollem Sunder löst der nächste Mighty Hit alle Stacks für je 25 % Weapon Damage aus | +1 % Armor-Senkung pro Sunder-Stack | **Shatter**: +25 % Schaden bei vollem Sunder ◇ **Crumble**: Sunder hält bis Kampfende, −2 max Stacks | **Master of Crush**: Sunder senkt auch Block und Evasion des Gegners |
| Quake | +10 % Stun-Dauer | **Heavy Head**: jeder 3. Smash staggert ◇ **Aftershock**: gestunnte Gegner nehmen +20 % Schaden | +15 % Max der Damage Range | **Earthbreaker**: Mighty Hits stunnen 0,3 s ◇ **Interrupt**: ein Stun während eines Telegraphs bricht die Heavy Attack ab (10 s Cooldown) | **Master of Quake**: Reaction Slots kosten keine Heat, solange der Gegner gestunnt ist |
| Bulwark | +2 % Block Chance | **Iron Rhythm**: Block gibt 10 Heat ◇ **Shield Slam**: Block löst einen Treffer für 60 % Weapon Damage aus | +5 % geblockter Anteil | **Hold the Line**: +8 % Block, +10 % Armor ◇ **Braced**: nach einem Block 2 s lang −30 % erlittener Schaden | **Master of the Wall**: geblockter Schaden sammelt sich, der nächste Innate trifft mit 50 % davon zusätzlich |

### 3.3 Axe (Reaver) – „Der Schlächter“

| Pfad | Build-Idee |
|---|---|
| **Butcher** | Bleed-Reaver: blutende Wunden und Rend |
| **Frenzy** | Berserker: je weniger Life, desto schneller, mit Sustain |
| **Cleave** | Mighty Hits: riesige Einzelschläge mit Crit |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Butcher | +12 % Bleed-Wirkung der Axe | **Open Wounds**: Bleed +30 % ◇ **Blood Scent**: +15 % Attack Speed gegen Blutende | +4 % Bleed Chance | **Bloodrush**: jeder Bleed-Tick gibt 2 Heat ◇ **Ragged Cut**: Mighty Hits frischen Bleed mit 150 % auf | **Master Butcher**: Rend und Hemorrhage lösen nur die Hälfte des Bleeds ein, der Rest läuft weiter |
| Frenzy | +1 % Lifesteal | **Berserk**: +20 % Attack Speed unter 50 % Life ◇ **Thirst**: Lifesteal ×2 unter 30 % Life | +4 % Attack Speed unter 50 % Life | **Deathwish**: unter 30 % Life +30 % Schaden ◇ **Second Skin**: 1× pro Kampf unter 30 % Life: heilt 20 % | **Master of Frenzy**: Bleed-Ticks heilen um 3 % ihres Schadens |
| Cleave | +25 % Max der Damage Range | **Overhead Chop**: Mighty Hits +30 % Schaden ◇ **Headsplitter**: Mighty Hits critten immer | +8 % Mighty-Hit-Schaden | **Executioner's Swing**: Mighty Hits gegen Gegner unter 30 % Life +50 % ◇ **Splitting Blow**: Mighty Hits setzen 2 Sunder | **Master of Cleave**: Mighty Hits würfeln Trigger-Affixe zweimal |

### 3.4 Dagger (Reaver) – „Der Giftmischer“

| Pfad | Build-Idee |
|---|---|
| **Venom** | Poison stapeln und überlaufen lassen |
| **Assassin** | erster Schlag, Crit aus Lücken, Evade-Konter |
| **Flurry** | Geschwindigkeit und Extra-Stiche |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Venom | +12 % Poison-Wirkung des Daggers | **Virulence**: +3 max Poison-Stacks ◇ **Seeping**: Poison hält 30 % länger | +4 % Poison Chance | **Corrosive**: jeder Stack −1 % Gegner-Armor ◇ **Numbing**: ab 10 Stacks −10 % Gegner-Attack-Speed | **Master of Venom**: bei vollen Stacks platzen alle für 100 % ihres Rests (eingebauter Toxic Bloom, schwächer) |
| Assassin | +3 % Precision | **Find the Gap**: +25 % Crit Chance auf den ersten Treffer nach einem Skill ◇ **Twist the Blade**: Crits setzen 2 Poison-Stacks | +10 % Schaden gegen Gegner im Telegraph | **Shadowstep**: nach einem Evade ist der nächste Stich ein sauberer Crit ◇ **Ambush**: in den ersten 3 s des Kampfes crittet jeder Treffer | **Master Assassin**: Crits geben 5 Heat |
| Flurry | +5 % Chance auf Double Stab | **Quick Hands**: +12 % Attack Speed ◇ **Nimble Feet**: +8 % Evasion | +15 % Extra-Attack Damage | **Thousand Needles**: Extra-Stiche poisonen immer ◇ **Whirl**: 5 Stiche in 2 s machen den nächsten Innate gratis | **Master of Flurry**: Extra-Stiche können Trigger-Affixe auslösen |

### 3.5 Bow (Hunter) – „Der Jäger“

| Pfad | Build-Idee |
|---|---|
| **Barbs** | Bleed aus der Ferne |
| **Toxin** | Poison-Bogen mit eigenem Sustain |
| **Volley** | mehr Pfeile, sehr präzise |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Barbs | +12 % Bleed-Wirkung des Bows | **Serrated Heads**: +15 % Bleed Chance ◇ **Bloodtrail**: +10 % Schaden gegen Blutende | +4 % Bleed Chance | **Hooked Rend**: Barbed Arrow löst 50 % des Bleeds sofort ein ◇ **Bleeding Out**: Bleed +50 % unter 50 % Gegner-Life | **Master of Barbs**: Pfeile auf blutende Gegner geben 3 Heat |
| Toxin | +4 % Poison Chance | **Dipped Arrows**: +15 % Poison Chance ◇ **Festering**: jeder Stack ignoriert 2 % Armor, Ailments heilen 3 % | +1 max Poison-Stack | **Toxic Cascade**: jeder 10. Pfeil lässt die Hälfte der Stacks platzen ◇ **Lingering Cloud**: Poison-Ticks Chillen mit 10 % Chance | **Master of Toxin**: platzende Stacks heilen um 10 % ihres Schadens |
| Volley | +5 % Chance auf Split Shot | **Split Shot**: Zweitpfeil 60 % ◇ **Steady Aim**: +10 % Precision, wenn 3 s nicht getroffen | +15 % Extra-Attack Damage | **Rain of Arrows**: jeder 6. Schuss drei Pfeile ◇ **Dead Center**: bei Precision über 90 % Extra-Pfeile +25 % | **Master of Volley**: Extra-Pfeile können Trigger-Affixe auslösen |

### 3.6 Crossbow (Hunter) – „Der Belagerer“

| Pfad | Build-Idee |
|---|---|
| **Pierce** | Rüstung durchschlagen, Sunder |
| **Payload** | Mighty Hits: seltene, gewaltige Bolzen |
| **Reload** | niedrige Precision mit Absicht: Glancing Blows werden Heat und Bolzen |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Pierce | +3 % Physical Penetration | **Bodkin**: +15 % Penetration ◇ **Through and Through**: saubere Treffer setzen Sunder | +1 % Armor-Senkung pro Sunder | **Armor Shred**: Crits zerstören 20 % der Gegner-Barrier ◇ **Impale**: saubere Treffer speichern 20 % ihres Schadens, der nächste Heavy Bolt löst alles aus | **Master of Pierce**: Penetration wirkt auch auf Resistances (Explosive Bolt, Hybrid) |
| Payload | +25 % Max der Damage Range | **Heavy Draw**: Mighty Hits +30 % ◇ **Killshot**: Crits ignorieren 50 % Armor | +8 % Mighty-Hit-Schaden | **Deadeye**: jeder 5. Bolzen trifft sauber und crittet ◇ **Recoil**: Mighty Hits nehmen dem Gegner 15 Heat | **Master of Payload**: der Heavy Bolt ist immer ein Mighty Hit |
| Reload | +8 % Heat per Hit | **Quick Crank**: +10 % Attack Speed ◇ **Loaded Spring**: Glancing Blows geben 10 Heat | −4 Heat Cost des Innate | **Drum Magazine**: nach einem Skill 3 s +30 % Attack Speed ◇ **Spring Trap**: jeder 5. Glancing Blow feuert einen Gratis-Bolzen | **Master of Reload**: Rotation Slot 1 kostet 20 % weniger Heat |

### 3.7 Wand (Sorcerer) – „Die Elemente“

Die Attunement (Fire/Cold/Lightning) bleibt. Jeder Pfad gehört zu einem Element, passt aber zu jeder Attunement, weil
die Skills im Web andere Elemente bringen. Der Pfad „Pyre“ heißt neu **Blaze** (Pyre ist auch ein Staff-Keystone).

| Pfad | Build-Idee |
|---|---|
| **Blaze** | Fire: Burn setzen und mit Fire-Treffern einlösen |
| **Rime** | Cold: Kontrolle, Chill bis zum Freeze |
| **Storm** | Lightning: Shock und Crit-Ketten |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Blaze | +12 % Burn-Wirkung der Wand | **Kindle**: +20 % Burn Chance ◇ **Wildfire**: Burn +30 % | +4 % Burn Chance | **Flare**: Flashpoint (siehe `ailments-v2.md`) löst 50 % statt 25 % aus ◇ **Smother**: brennende Gegner heilen gar nicht | **Master of Flame**: jeder Burn-Tick gibt 2 Heat |
| Rime | +10 % Chill-Wirkung | **Bitter Cold**: Chill hält 40 % länger ◇ **Shatterpoint**: +25 % Schaden gegen Chilled | +4 % Chill Chance | **Frozen Solid**: 3 Chills in 6 s frieren 1 s ein ◇ **Cold Snap**: Telegraphs Chilled Gegner brauchen 30 % länger | **Master of Rime**: Chill während eines Telegraphs verschiebt die Heavy Attack um 1 s |
| Storm | +10 % Shock-Wirkung | **Static Field**: +20 % Shock Chance ◇ **Arc**: jeder Crit gibt 8 Heat | +3 % Precision | **Arc Chain**: Crits gegen Shocked springen für 30 % nach ◇ **Static Build**: Shock stapelt bis 3 | **Master of Storm**: solange Shock läuft, kosten Skills 10 % weniger |

### 3.8 Staff (Warlock) – „Das lange Sterben“

| Pfad | Build-Idee |
|---|---|
| **Smolder** | Burn, lang und schwer, Hybrid mit Corruption |
| **Hollow** | Corruption: wachsen lassen, Collapse auslösen |
| **Channel** | Heat und Skills: der Stab als Fokus |

| Pfad | Technik I | Gabel 1 | Technik II | Gabel 2 | Meister |
|---|---|---|---|---|---|
| Smolder | +12 % Burn-Wirkung des Staffs | **Slow Burn**: Burn hält 40 % länger ◇ **Cinders**: Burn +25 % | +4 % Burn Chance | **Pyroclast**: alle 4 s Flashpoint ohne Fire-Treffer ◇ **Ashen Veil**: brennende Gegner machen 10 % weniger Schaden | **Master of Smolder**: Burn und Corruption auf demselben Gegner: beide +20 % |
| Hollow | +1 Ramp-Schritt pro 3 Ticks | **Deepening Dark**: Corruption +30 % ◇ **Grasp**: Corrupted Gegner −10 % Heat Gain | +4 % Corruption Chance | **Collapse Deeper**: Collapse (siehe `ailments-v2.md`) trifft mit 6 statt 4 s ◇ **Void Hunger**: Corruption heilt 3 % | **Master of the Hollow**: Corruption startet 4 Schritte weiter |
| Channel | +5 % Heat Gain | **Overflow**: über 80 Heat kosten Skills 15 % weniger ◇ **Deep Breath**: +20 Starting Heat | +8 % Skill Damage | **Echoing Chant**: jeder 3. Skill wiederholt sich mit 30 % ◇ **Siphon Ember**: Skills heilen 2 % Life pro 10 Heat Cost | **Master of Channel**: Reaction Slots kosten 25 % weniger |

---

## 4. Keystones

Bleiben je 4 pro Waffe, 1 wählbar. Zahlen-Tauschs werden durch Regeln ersetzt (`neuausrichtung-v1.md` 3.5):
Siege Engine, Repeater, Glass Cannon, Thousand Cuts. Gore und Wild Shot nutzen künftig Mighty Hits
(z. B. Gore: „Mighty Hits deal double damage. Damage Range minimum is 10 %.“).

## 5. Entscheidungen

Alle Punkte ✅ (Timo, 13.10.):

1. Mighty Hit ab 125 % Weapon Damage, und die neuen Ranges mit gleichem Durchschnitt?
2. Parry als Defense nur über die Waffe (max. 30 %)?
3. Glancing Damage gestrichen, stattdessen Glancing-Mechaniken (Reload, Tempo)?
4. Wand-Pfad „Pyre“ → „Blaze“?
