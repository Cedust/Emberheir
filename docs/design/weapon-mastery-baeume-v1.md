# Weapon Mastery: die 8 Bäume (Entwurf v1, 2026-10-08)

Gehört zu `waffe-als-system-v1.md` (Grundsystem, Entscheidungen). Hier stehen die Inhalte: gemeinsamer Aufbau, Startwerte,
pro Waffe 3 Pfade, 3 Innate Forms, 4 Keystones, dazu die Echoes.
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen. Alle Zahlen sind Startwerte für die Balance-CLI.

---

## 1. Gemeinsamer Aufbau 💡

Jeder Baum hat denselben Grundriss, damit man sich bei jeder Klasse sofort zurechtfindet. Unterschiedlich sind Zahlen, Pfade und Namen.

```
                         Keystone-Ring (1 aus 4, ab 12 ausgegebenen Punkten)
                                         |
          Pfad A (8 Nodes)          Pfad B (8 Nodes)          Pfad C (8 Nodes)
                     \                    |                    /
   Heat Form (1 aus 4, ab Rank 3) —— Refine (11 Nodes) —— Innate Form (1 aus 3, ab Rank 5)
                                          |
                                      die Waffe
```

| Teil | Nodes | Punkte zum Ausbau |
| --- | --- | --- |
| Refine | 11 | 11 |
| Heat Form | 4 (1 wählbar) | 1 |
| Innate Form | 3 (1 wählbar) | 1 |
| 3 Pfade | 3 × 8 (je 6 Minor + 2 Notable) | 24 |
| Keystone | 4 (1 wählbar) | 1 |
| **Summe** | **49** | **38** |

Am Ende hat man **20 Punkte**, also gut die Hälfte des Möglichen: Pflicht gibt es keine, und zwei Spieler mit derselben Waffe
unterscheiden sich in Refine-Gewichtung, Pfaden, Heat Form, Innate Form, Keystone und Echo.

### Refine (bei allen gleich, 11 Nodes)

| Node | Ränge | Wirkung je Rang |
| --- | --- | --- |
| **Steady Hand** | 3 | Min der Damage Range +10 Prozentpunkte |
| **Full Swing** | 3 | Max der Damage Range +15 Prozentpunkte |
| **Precision** | 3 | Precision +5 Prozentpunkte |
| **Balance** | 2 | +6 % Attack Speed |

Grenzen: Min höchstens 100 %, Max höchstens 200 %, Precision höchstens 95 %. Weapon Damage selbst steigt automatisch pro Rank ✅.

Pfad-Nodes und Notables setzen einen Punkt im Refine voraus (Pfade hängen am Refine-Ring), aber keinen bestimmten.

### Weapon Rank, Punkte und Güte

Pro Rank 1 Punkt. Die Waffe sammelt dieselbe XP wie der Held. Rank Cap pro Run, damit früh schon etwas passiert:

| Run | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Level Cap | 5 | 15 | 30 | 50 | 75 | 105 | 140 |
| **Rank Cap** | 4 | 7 | 10 | 13 | 16 | 18 | 20 |

Güte ✅: **Crude** Rank 0–3 · **Honed** 4–7 · **Tempered** 8–11 · **Ascendant** 12–15 · **Exalted** 16–20.
Damit wählt man die Heat Form im ersten Run, die Innate Form im zweiten und den Keystone frühestens im vierten (12 Punkte).

### Heat Forms (bei allen gleich)

Start Steady ✅, Wahl ab Rank 3 ✅, ohne Empfehlung ✅. Die vier Formen stehen in `waffe-als-system-v1.md` Abschnitt 3.

---

## 2. Startwerte 💡

Attack Speed und Default Attack bleiben wie heute (`waffen-v1.md`, Playtest 2). Neu sind Range und Precision.

| Waffe | Klasse | Precision | Damage Range | Charakter |
| --- | --- | --- | --- | --- |
| Dagger | Reaver | 80 % | 50–100 % | trifft fast immer, kleine Streuung |
| Sword | Warrior | 75 % | 40–110 % | der Maßstab |
| Bow | Hunter | 75 % | 40–110 % | wie das Sword, auf Distanz |
| Axe | Reaver | 70 % | 40–120 % | etwas wilder |
| Wand | Sorcerer | 70 % | 40–110 % | |
| Mace | Warrior | 65 % | 50–120 % | schwer, aber wuchtig |
| Staff | Warlock | 65 % | 50–110 % | Schaden kommt über Ailments |
| Crossbow | Hunter | 60 % | 60–130 % | selten sauber, dann aber hart |

---

## 3. Die Bäume

Pro Waffe: drei Pfade (Thema, zwei Notables; die 6 Minor Nodes sind kleine Zahlen in Richtung des Pfads),
drei Innate Forms und vier Keystones. Jeder Keystone hat einen Vorteil, einen Nachteil und das **Form-Wort** für den Waffennamen.

### Sword (Warrior) · Default Attack *Slash* · Innate *Power Strike*

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Riposte** | Konter | **Counterweight**: Riposte trifft immer sauber und setzt Sunder · **Read the Blow**: nach Evade oder Block ist der nächste Slash ein sicherer Crit |
| **Edge** | Präzision, Crit, Bleed | **Keen Edge**: saubere Crits lassen bluten · **Measured Cut**: +10 % Precision, Min +10 |
| **Tempo** | Rhythmus, Heat | **Rhythm**: jeder 3. Slash gibt 10 Heat · **Unbroken Flow**: +3 % Attack Speed pro sauberem Treffer in Folge (max. 5), ein Glancing Blow setzt zurück |

Innate Forms: **Cleaving Strike** (+80 % Schaden, +10 Heat-Kosten) · **Rising Strike** (sauberer Treffer gibt die halbe Heat zurück) · **Sundering Strike** (3 Sunder-Stacks auf einmal)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Perfect Parry** | Block und Evade lösen Riposte aus | −10 % Attack Speed | Parrying Blade |
| **Deep Cuts** | Crits verdoppeln den laufenden Bleed | Min der Range −20 | Bleeding Edge |
| **Flowing Blade** | Heat kühlt nicht ab, solange jeder Slash sauber trifft | Glancing Blows kosten 10 Heat | Dancing Blade |
| **Final Verdict** | +50 % Schaden gegen Gegner unter 30 % Life | −15 % Schaden darüber | Verdict Blade |

### Mace (Warrior) · *Smash* · *Skull Crack*

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Crush** | Sunder, Rüstung brechen | **Armor Breaker**: +3 maximale Sunder-Stacks · **Shatter**: +25 % Schaden gegen Gegner mit vollem Sunder |
| **Quake** | Stagger, Stun | **Heavy Head**: jeder 3. statt jeder 4. Smash stunnt · **Aftershock**: gestunnte Gegner nehmen +20 % Schaden |
| **Bulwark** | Block mit Schild | **Iron Rhythm**: Block gibt 10 Heat · **Hold the Line**: +8 % Block Chance, +15 Armor |

Innate Forms: **Concussion** (Stun 1 s statt 0,5 s, −30 % Schaden) · **Bone Breaker** (setzt 3 Sunder-Stacks) · **Thunder Crack** (wird zum Lightning-Hit, Shock immer)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Earthshaker** | Stuns dauern doppelt so lang, gestunnte Gegner laden keine Heat | −15 % Attack Speed | Quaking Maul |
| **Anvil** | keine Glancing Blows mehr | keine Crits mehr | Anvil |
| **Siege** | +100 % Schaden gegen Gegner mit vollem Sunder | Min der Range −30 | Siege Hammer |
| **Bastion** | Block Chance verdoppelt | −20 % Schaden | Bastion Mace |

### Axe (Reaver) · *Hack* · *Lacerate*

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Butcher** | Bleed-Stärke | **Open Wounds**: +30 % Bleed Damage · **Blood Scent**: +15 % Attack Speed gegen blutende Gegner |
| **Frenzy** | Tempo bei wenig Life | **Berserk**: unter 50 % Life +20 % Attack Speed · **Bloodrush**: Bleed-Ticks geben je 2 Heat |
| **Cleave** | große Einzeltreffer | **Overhead Chop**: Max der Range +30 · **Headsplitter**: Treffer im oberen Viertel der Range critten immer |

Innate Forms: **Gutting Lacerate** (Bleed +60 %) · **Rending Lacerate** (setzt Bleed doppelt, je halb so stark, länger) · **Hemorrhage** (lässt den laufenden Bleed sofort zur Hälfte platzen)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Bloodbath** | Bleed läuft nicht aus, solange du triffst | −10 % Precision | Bloodbath Axe |
| **Rampage** | jeder Bleed-Tick gibt +1 % Schaden, stapelt bis zum Kampfende | startet jeden Kampf mit −20 % Schaden | Rampage Axe |
| **Executioner** | saubere Hacks gegen Gegner unter 25 % Life +100 % Schaden | Crit Chance −5 % | Headsman's Axe |
| **Gore** | Max der Range +60 | Min der Range sinkt auf 20 % | Gore Cleaver |

### Dagger (Reaver) · *Stab* · *Venom Coat*

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Venom** | Poison-Stacks | **Virulence**: +3 maximale Poison-Stacks · **Seeping**: Poison läuft 30 % länger |
| **Assassin** | Crit | **Find the Gap**: +8 % Crit Chance · **Twist the Blade**: Crits setzen 2 Poison-Stacks |
| **Flurry** | Tempo | **Quick Hands**: +12 % Attack Speed · **Double Stab**: 15 % Chance, sofort ein zweites Mal zu stechen |

Innate Forms: **Virulent Coat** (+1 Stack pro Treffer, 6 s statt 8 s) · **Paralytic Coat** (Poison verlangsamt den Gegner um 15 %) · **Lingering Coat** (12 s, Poison +20 %)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Thousand Cuts** | +40 % Attack Speed | Max der Range sinkt auf 80 % | Needle |
| **Assassinate** | der erste saubere Treffer jedes Kampfs crittet mit +200 % | −10 % Attack Speed | Assassin's Dirk |
| **Toxic Bloom** | bei 10 Poison-Stacks platzen alle für 150 % ihres Restschadens | danach 3 s kein Poison | Venom Fang |
| **Shadowstep** | nach einem Evade ist der nächste Stab sauber und crittet | −20 % Life | Shadow Kris |

### Bow (Hunter) · *Shoot* · *Barbed Arrow*

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Barbs** | Bleed | **Serrated Heads**: Bleed Chance +15 % · **Bloodtrail**: blutende Gegner nehmen +10 % Schaden von Pfeilen |
| **Toxin** | Poison | **Dipped Arrows**: Poison Chance +15 % · **Festering**: jeder Poison-Stack senkt die Armor des Gegners um 2 % |
| **Volley** | mehrere Pfeile | **Split Shot**: 20 % Chance auf einen zweiten Pfeil (60 % Schaden) · **Steady Aim**: +10 % Precision, wenn du 3 s nicht getroffen wurdest |

Innate Forms: **Hooked Arrow** (Bleed garantiert, +30 %) · **Toxic Arrow** (Poison garantiert, 2 Stacks) · **Split Arrow** (drei Pfeile zu je 50 %)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Rain of Arrows** | Split Shot wird zu 3 Pfeilen | jeder Pfeil −25 % Schaden | Storm Bow |
| **Patient Draw** | jeder Schuss +1 % Schaden pro Sekunde seit dem letzten Skill (max. +30 %) | −15 % Attack Speed | Longbow |
| **Hunter's Mark** | der erste saubere Treffer markiert den Gegner: +20 % Schaden für den ganzen Kampf | Glancing Blows bis dahin 0 Schaden | Marking Bow |
| **Wild Shot** | Max der Range +80 | −15 % Precision | Wild Bow |

### Crossbow (Hunter) · *Bolt* · *Heavy Bolt*

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Pierce** | Armor Penetration | **Bodkin**: Bolt ignoriert 35 % statt 20 % Armor · **Through and Through**: saubere Treffer setzen Sunder |
| **Payload** | große Treffer, Crit | **Heavy Draw**: Max der Range +30 · **Killshot**: Crits +50 % Schaden |
| **Reload** | Tempo, Heat | **Quick Crank**: +10 % Attack Speed · **Loaded Spring**: jeder Glancing Blow gibt 10 Heat |

Innate Forms: **Ballista Bolt** (+60 % Schaden, ignoriert 50 % Armor) · **Explosive Bolt** (Fire-Hit, Burn) · **Pinning Bolt** (stunnt 0,7 s)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Deadeye** | jeder 5. Bolt ist sauber und crittet | Crit Chance sonst halbiert | Deadeye Arbalest |
| **Siege Engine** | +60 % Schaden | −30 % Attack Speed | Siege Arbalest |
| **Repeater** | +50 % Attack Speed | −30 % Schaden | Repeater |
| **Harpoon** | getroffene Gegner laden 25 % weniger Heat | Max der Range −20 | Harpoon |

### Wand (Sorcerer) · *Spark* · *Firebolt*

Neu: **Attunement** (1 aus 3, im Refine, Respec möglich): Spark und Innate machen Fire, Cold oder Lightning Damage.
Der Innate heißt entsprechend *Firebolt*, *Frostbolt* oder *Shockbolt*. Start Fire. Das ersetzt die Element-Bases der Wand.

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Pyre** | Burn | **Kindle**: Burn Chance +20 % · **Wildfire**: Burn springt bei Ablauf einmal neu an (halbe Stärke) |
| **Rime** | Chill, Kontrolle | **Bitter Cold**: Chill verlangsamt 10 % stärker · **Shatterpoint**: Crits gegen gechillte Gegner +40 % |
| **Storm** | Shock, Crit | **Static**: Shock Chance +20 % · **Arc**: Crits geben 8 Heat |

Pfade passen zu einem Element, wirken aber mit jedem (Kindle gibt auch einer Cold Wand Burn Chance).

Innate Forms: **Lance** (ein Bolt, +70 % Schaden, +10 Heat-Kosten) · **Barrage** (drei Bolts zu je 45 %) · **Seeking Bolt** (immer sauber)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Prism** | Spark wechselt reihum durch alle drei Elemente und setzt jedes Ailment | −15 % Schaden | Prism Wand |
| **Glass Cannon** | +40 % Elemental Damage | −25 % Life | Glass Wand |
| **Focused Will** | keine Glancing Blows | −20 % Attack Speed | Scepter |
| **Wild Magic** | 20 % Chance auf einen doppelten Spark | 10 % Chance, dass ein Spark verpufft | Chaos Wand |

### Staff (Warlock) · *Channel* · *Void Bolt*

Attunement wie bei der Wand, aber **Fire oder Void** (Burn oder Corruption). Start Void.

| Pfad | Thema | Notables |
| --- | --- | --- |
| **Smolder** | Burn | **Slow Burn**: Burn läuft 40 % länger · **Cinders**: Burn senkt die Heilung des Gegners noch einmal um 25 % |
| **Hollow** | Corruption | **Deepening Dark**: Corruption steigt 30 % schneller · **Grasp**: unter Corruption verlieren Gegner 10 % ihrer Heat |
| **Channel** | Heat, Dauer | **Long Breath**: +20 % Ailment Duration · **Overflow**: über 80 Heat kostet der nächste Skill 15 % weniger |

Innate Forms: **Void Lance** (+60 % Schaden, Corruption garantiert) · **Rift Bolt** (setzt Corruption und Burn) · **Draining Bolt** (heilt um 15 % des Schadens)

| Keystone | Vorteil | Nachteil | Form-Wort |
| --- | --- | --- | --- |
| **Endless Night** | Corruption läuft nie aus | Direct-Schaden −30 % | Nightstaff |
| **Pyre** | Burn stapelt bis 3 statt aufzufrischen | Burn-Dauer −40 % | Pyre Staff |
| **Siphon** | Ailment-Ticks heilen um 5 % ihres Schadens | −15 % Ailment Damage | Siphon Staff |
| **Eclipse** | jedes Ailment auf dem Gegner gibt +10 % Schaden | Channel setzt selbst keine Ailments mehr | Eclipse Staff |

---

## 4. Echoes ✅ (Namen und Wirkung 💡)

Der erste Sieg über einen Act-Boss gibt sein Echo. Jeder weitere Sieg über denselben Boss in einem späteren Run hebt das Echo
um eine Stufe (I bis VII). Man trägt eines, Wechsel bei Kaelen. Der Echo-Name wird der Beiname der Waffe (*of …*).

| Boss | Echo | Wirkung (Stufe I) | Farbe in der Arena |
| --- | --- | --- | --- |
| Gorrak (Act 1) | **Ashfall Wrath** | jeder 5. erlittene Treffer: Gegenschlag für 200 % Weapon Damage | Aschgrau, Funkenregen |
| Mother of Rot (Act 2) | **Whispering Brood** | Bleed, Poison, Burn und Corruption +30 % | Moosgrün, Sporen |
| Cinder Tyrant (Act 3) | **Crowned Cinder** | unter 30 % Life +50 % Attack Speed für 6 s | Glutrot, Krone aus Flammen |
| Rime Warden (Act 4) | **Winter's Last Breath** | jeder 10. Angriff ist eine Lawine für 300 % Weapon Damage | Eisblau, Frostnebel |
| Storm Herald (Act 5) | **First Thunder** | jeder saubere Crit ruft einen Blitz | Weißgold, Funkenbögen |
| Voidborn Maw (Act 6) | **Hollow Hunger** | Ailments heilen um 10 % ihres Schadens | Violett, Leere-Schlieren |
| Ashen Harvester (Act 7) | **Stolen Dawn** | +60 % Schaden gegen Gegner unter 35 % Life | Bernstein, Morgenlicht |

Die Wirkungen sind die heutigen Boss-Trophäen (`legendary.ts`), damit die Arbeit daran nicht verloren geht. Stufen skalieren die Zahl
(z. B. Whispering Brood +30 % → +60 % auf Stufe VII).

Beispielname am Ende: *Exalted Parrying Blade of Ashfall Wrath*.

---

## 5. Weitere Ideen zur Individualisierung 💡 (Brainstorm 2026-10-08)

Timo: "Ich hab das Gefühl, wir haben etwas zu wenige Nodes." Mehr Tiefe muss nicht mehr Nodes heißen. Ideen, nach Empfehlung sortiert:

| # | Idee | Wie | Hälfte | Empfehlung |
| --- | --- | --- | --- | --- |
| 1 | **Feats** | Nodes, die man nicht mit Punkten kauft, sondern durch Taten freischaltet: *100 Ripostes*, *einen Boss ohne Glancing Blow besiegen*, *10 Bleeds gleichzeitig*. Danach kosten sie normal einen Punkt. Pro Waffe ca. 8–10 | Master (du lernst) | ⭐ sehr RPG, macht das "selbst lernen" spürbar, Langzeitziele |
| 2 | **Weapon Parts** | Die Waffe besteht aus 3 Teilen: **Blade/Head**, **Hilt/Grip**, **Pommel/Charm-Knauf**. Pro Teil 3–4 Varianten (z. B. Serrated Blade: +Bleed, −Min; Wrapped Grip: +Precision; Heavy Pommel: +Stun). Varianten schaltet man bei Bossen/Acts frei, Wechsel bei Kaelen | Refine (die Waffe) | ⭐ macht das Verfeinern greifbar und ist sichtbar am Waffen-Sprite |
| 3 | **Awakening pro Prestige** | Nach jedem Harvester-Sieg wählt die Waffe 1 aus 3 großen Veränderungen (z. B. "Slash hits twice", "Glancing Blows apply Sunder"). 7 Awakenings bis zum Finale | beides | ⭐ bindet die Waffe an den Prestige-Loop, jeder Run verändert sie |
| 4 | **Combo String** | Die Default Attack wird eine Kette aus 3 Schlägen (Sword: Slash, Slash, Thrust). Jeder Schritt der Kette kann per Node ausgetauscht werden (Thrust → Pommel Strike: stunnt) | Master | stark fürs Spielgefühl, aber Sim-Umbau der Default Attack |
| 5 | **Slayer** | Die Waffe merkt sich Gegner-Familien: nach X Kills gegen Rotwood-Bestien +Schaden gegen sie. Eine Art Bestiarium | Master | nett, aber passive Zahlen |
| 6 | **Weight** | Ein Regler leicht ↔ schwer: Attack Speed gegen Schaden und Stun, in 5 Stufen, frei verstellbar | Refine | einfach, aber eher eine Zahl als ein Erlebnis |
| 7 | **Stances** | 2 Haltungen (Offensive/Defensive), Wechsel per Bedingung wie ein Reaction Slot | Master | überschneidet sich mit dem Battle Plan |

**Zur Node-Menge:** Feats (+8–10) und Weapon Parts (3 Teile × 3–4 Varianten) machen den Baum größer, ohne mehr Pflicht-Punkte.
Alternativ einfach Pfade auf 12 Nodes verlängern (Baum ~60, Punkte 24), Verhältnis bleibt.

---

## 6. Offene Punkte ❓

1. Passen Pfade, Innate Forms und Keystones pro Waffe? Welche gefallen dir nicht?
2. **Attunement** für Wand (Fire/Cold/Lightning) und Staff (Fire/Void) statt Element-Bases: ja?
3. Rank Cap pro Run (4, 7, 10, 13, 16, 18, 20) und 20 Punkte am Ende von 38 möglichen: passt die Menge?
4. Echo-Namen und Wirkungen.

---

## 7. Optik des Weapon-Mastery-Screens 💡 (2026-10-08)

Timo: Alternative Optik mit der gemalten Waffe im Fokus. Drei Varianten:

**A · Sternbild um die Waffe.** Klassischer Baum wie der Skill Tree (Kreise, Linien, Zoom), aber in der Mitte liegt groß die gemalte
Waffe auf dunklem Grund. Die drei Pfade strahlen wie Sternbilder von ihr weg. Vertraut, gut lesbar, wenig Neues.

**B · Anatomie der Waffe (Empfehlung, kombiniert mit A).** Die Waffe liegt groß und schräg in der Bildmitte, angestrahlt von der Glut
einer Esse unter ihr. Die Nodes sind **Stellen an der Waffe**:
- Refine sitzt auf den Teilen: **Full Swing** auf der Klinge/dem Kopf, **Steady Hand** auf der Hohlkehle, **Precision** am Griff,
  **Balance** an Parierstange/Knauf. Jeder Rang schleift sichtbar: Kante wird heller, Grat schärfer.
- **Heat Form** ist die Esse darunter: vier Feuer-Farben (Steady ruhig gelb, Cooling blau-weiß flackernd, Warming tief orange
  pulsierend, Smoldering dunkelrote Glut mit Rauch). Die Wahl färbt das Feuer und die Glut auf der Waffe.
- **Innate Form** ist eine eingravierte Rune auf der Klinge, die drei Formen sind drei Runen-Siegel.
- **Keystone** ist der Stein im Knauf: vier Fassungen im Halbkreis, ab 12 Punkten glühen sie, der gewählte Stein wird eingesetzt.
- Die **drei Pfade** wachsen als **glühende Gravur-Linien** (Filigran) von der Waffe nach außen ins Dunkel, Notables sind
  größere Ornamente. Gelernte Linien brennen sich mit einem Funkenlauf ein.
- **Echo** ist eine Aura/ein Geist um die Waffe in der Echo-Farbe.
- Unten ein **Namensschild** (*Ascendant Parrying Blade of Ashfall Wrath*) und die **Rank-Leiste als Temperatur-Anzeige**
  (Crude → Exalted, Metall des Rahmens wechselt von Eisen zu Gold).
- Lernen = Hammerschlag: kurzes Einzoomen, Funkenregen, dumpfer Klang, die Stelle glüht nach.

**C · Schmiede-Diorama.** Amboss, Esse, Werkzeuge an der Wand; jedes Werkzeug öffnet einen Teil (Schleifstein = Refine,
Blasebalg = Heat Form, Gravierstichel = Pfade). Sehr stimmungsvoll, aber mehr Klicks und Pfade sind schlecht zu überblicken.

Alles in PixiJS (Kamera, Partikel, Blend Modes). Die Waffe ist bis zu Timos KI-Bildern code-gezeichnet und später austauschbar
(ein Bild pro Waffentyp, Hotspot-Positionen als Daten).

---

## 8. Umsetzung (2026-10-08, Thread „Waffe als eigenes System")

Gebaut: Variante **B · Anatomie** (Kaelen → Tab *Weapon Mastery*). Die Waffe ist code-gemalt (`apps/web/src/game/camp/weaponArt.ts`),
die Positionen der Nodes stehen als Daten im Content (`MASTERY_LAYOUT`), ein späteres KI-Bild kann die gemalte Waffe ersetzen.
Abweichungen von diesem Entwurf: Rank-Leiste und Namensschild sitzen **oben**, Lernen ist ein Hammerschlag ohne Zoom und ohne Klang.

**Waffenschaden pro Rank:** wächst wie `1 + (Level − 1) / 16` (Balance-CLI: mit /10 waren Kämpfe ab Run 2 rund 30 % kürzer als vorher).

**Vereinfachte Notables** (die Sim kann die Originalidee noch nicht 1:1, Ersatz mit ähnlichem Gefühl):

| Notable | Umgesetzt als |
| --- | --- |
| Wildfire | Burn +30 % Schaden |
| Bitter Cold | Chill hält 40 % länger |
| Shatterpoint | +25 % Schaden gegen Chilled |
| Cinders, Deepening Dark | mehr Ailment-Schaden |
| Grasp | Gegner gewinnt 10 % weniger Heat |
| Killshot | Crits ignorieren 50 % Armor |
| Rain of Arrows | jeder Treffer zwei Extra-Pfeile mit 40 %, dafür −25 % Schaden |
| Wild Magic | „Fizzle" = −10 % Precision |
| Pyre (Staff) | Burn +60 % Schaden, −40 % Dauer |
| Endless Night | Corruption hält zehnmal so lange |
| Hemorrhage | verbraucht Bleed komplett |
| Draining Bolt | heilt 4 % Life |
| Venom Coat (Forms) | Formen ändern Dauer und Kosten |
| Paralytic | +50 % Chill-Chance |
| Concussion | 126 % Schaden, 1 s Stun |
| Barrage | 3 × 45 % |
| Heirloom Blade / Avalanche Bow | heißen *Heirloom Grips* / *Avalanche Grips* |
