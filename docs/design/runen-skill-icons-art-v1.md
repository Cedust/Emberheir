# Runes und Skills: gemalte Icons (v1, 2026-10-26)

Heute zeichnet der Code beide noch selbst: die **Runes** als dunklen Stein mit einem SVG-Zeichen (`ui/RuneArt.tsx`),
die **Skills** als weißes Platzhalter-Symbol auf einer farbigen Fassung (`game/battle/skills.ts`), viele Skills teilen
sich dabei dasselbe Symbol (z. B. sieben Mal der Blitz), die neun Mastery-Skills haben gar kein eigenes.

Gebraucht werden **6 Sheets mit 49 Icons**: 1 Rune-Sheet (8) und 5 Skill-Sheets (41). Jedes Sheet ist ein transparentes
PNG, so groß wie das Tool kann, Icons in klaren Reihen mit viel Abstand (wie bei den anderen Sheets).

**Stil-Referenz:** an jedes Sheet `art/icons/element-ailment-sheet-v1.png` anhängen (freistehende Effekt-Icons, gleicher
Strich). Die Skill-Icons dürfen den Element-Icons nicht zum Verwechseln ähnlich sehen, deshalb zeigt jedes eine
**Handlung** (Schlag, Riss, Flug), nicht nur das Element.

**Innate Forms** (z. B. Cleaving Strike, Shock Lance, Rift Bolt) bekommen kein eigenes Bild: sie zeigen das Icon ihres
Innates. Das hält es bei 49 statt 73 Icons, und die Form liest sich trotzdem als „mein Waffen-Skill“.

Ablage (alle in `art/icons/`):

| Datei | Inhalt |
|---|---|
| `rune-sheet-v1.png` | 8 Runes |
| `skill-sheet-a-v1.png` | Steel, Blood, Iron Bastion, Rally (8) |
| `skill-sheet-b-v1.png` | Venom und Flame (7) |
| `skill-sheet-c-v1.png` | Storm, Frost, Void (9) |
| `skill-sheet-d-v1.png` | die 9 Mastery-Skills |
| `skill-sheet-e-v1.png` | die Weapon Innates (8) |

Jeder Prompt unten ist komplett (Stil-Absatz und „Do NOT include“ sind schon drin), einfach so einfügen.

---

## Rune-Sheet (8)

Alle acht sind **derselbe dunkle, flache Stein** (wie heute), nur das eingeritzte Zeichen und seine Glut-Farbe ändern
sich. Reihenfolge = Rang, niedrigster zuerst.

| # | Rune | Zeichen | Farbe |
|---|---|---|---|
| 1 | Bark | ein kleiner Baum: senkrechter Strich mit zwei Ästen nach oben | blasses Aschweiß |
| 2 | Moss | ein Keimling mit zwei runden Blättern | Moosgrün |
| 3 | Thorn | ein Zweig mit drei Dornen | Blutrot |
| 4 | Venom | ein Tropfen, der aus einem V fällt | Giftgelbgrün |
| 5 | Ember | eine kleine Flamme | Glutorange |
| 6 | Rime | ein sechsstrahliger Eisstern | Eisblau |
| 7 | Volt | ein Zickzack-Blitz | Gelb |
| 8 | Dusk | eine Mondsichel | Violett |

```
A sprite sheet of 8 game icons for a 2D fantasy video game, arranged in 2 neat rows of 4 with lots of empty space between them, transparent background, all seen perfectly straight from the front. Each icon is one single free-standing object. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details.
All 8 icons are the SAME rune stone: a flat, smooth, dark charcoal-grey stone with seven soft corners, slightly polished, with one simple symbol carved deep into its face. The carved symbol glows from inside in its own color, with a soft glow of that color around the carving. Only the symbol and its glow color change from icon to icon; stone shape, size and color stay identical.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right:
1. Symbol: a tiny tree, one straight vertical line with two short branches angled upward. Glow: pale ash white.
2. Symbol: a small sprout with two round leaves. Glow: fresh moss green.
3. Symbol: a short twig with three sharp thorns. Glow: blood red.
4. Symbol: a V shape with a single drop falling from its point. Glow: acid yellow-green.
Bottom row, left to right:
5. Symbol: a small flame. Glow: ember orange.
6. Symbol: a six-pointed ice star. Glow: icy light blue.
7. Symbol: a zigzag lightning bolt. Glow: bright yellow.
8. Symbol: a crescent moon. Glow: violet.

Do NOT include: any text, letters or numbers; any character, animal or face; any background, scenery or cast shadow; perspective or tilt; photorealism; plastic or modern look.
```

---

## Skill-Sheets: gemeinsamer Stil

Alle fünf Skill-Prompts teilen denselben Kopf und Fuß, damit die Sheets zusammenpassen. Die Skill-Icons sitzen später
in den runden und eckigen Fassungen der Battle-Plan-Leiste (22 bis 32 Pixel), daher: wenige, große Formen.

## Sheet A: Steel, Blood und Stamm (8)

| # | Skill | Motiv |
|---|---|---|
| 1 | Flurry | eine kurze Klinge mit vier blassen Nachbildern hinter sich (schnelle Hiebe) |
| 2 | Execute | eine schwere Henkersklinge, die senkrecht nach unten fährt; unter der Spitze ein roter Riss |
| 3 | Crushing Blow | ein Brustpanzer, der unter einem Aufprall eingedellt wird und reißt (Sunder) |
| 4 | Rend | eine Hakenklinge reißt nach oben, ein großer Schwall Blutstropfen fliegt von der Schneide |
| 5 | Serrated Edge | eine Klinge mit Sägezähnen, an den Zähnen glüht Blut |
| 6 | Cleave | ein breiter halbmondförmiger Hieb-Bogen, der durch die Luft schneidet, rote Spur an der Innenkante |
| 7 | Iron Bastion | ein hoher eiserner Turmschild mit blassblauem Schimmer am Rand (Barrier) |
| 8 | Rally | ein kleines Kriegshorn aus Walnussholz mit Messingringen, aus dem Glutfunken stieben |

```
A sprite sheet of 8 game skill icons for a 2D fantasy video game, arranged in 2 neat rows of 4 with lots of empty space between them, transparent background, all seen straight from the front. Each icon is one single free-standing motif that shows an action, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right:
1. A short steel blade slashing sideways with four pale ghost copies of itself fanned out behind it, showing very fast strikes.
2. A heavy broad headsman's blade plunging straight down, a glowing red crack splitting open under its tip.
3. A dented iron breastplate caving in under a heavy white impact flash, cracks running across it and small iron splinters flying.
4. A hooked jagged blade ripping upward, a big burst of red blood drops spraying off its edge.
Bottom row, left to right:
5. A steel sword blade with a saw-toothed edge, bright red blood glowing along the teeth.
6. A wide crescent-shaped sweeping slash arc of white steel light cutting through the air, a red trail along its inner edge.
7. A tall iron tower shield with rivets, wrapped in a soft pale blue protective shimmer around its rim.
8. A small curved war horn of walnut wood with brass bands, a burst of orange ember sparks blowing out of its bell.

Do NOT include: any text, letters, numbers or runes; any character, hand, animal or face; any background, scenery or cast shadow; photorealism; plastic or modern look.
```

## Sheet B: Venom und Flame (7)

| # | Skill | Motiv |
|---|---|---|
| 1 | Envenom | zwei schlanke gebogene Messer über Kreuz, von beiden tropft grünes Gift (auch das Dagger-Innate) |
| 2 | Wither | eine verwelkte, hängende Blume, Blütenblätter fallen, ein fahlgrüner Fluch-Rauchring darum |
| 3 | Toxic Burst | eine runde grüne Giftblase, die in einem Spritzer zerplatzt |
| 4 | Immolate | ein rotglühender Kohlebrocken bricht auf, drei kleine Feuerbälle springen heraus (Combust ×3) |
| 5 | Meteor | ein brennender Fels fällt schräg von oben rechts, mit langem Feuerschweif |
| 6 | Inferno | eine hohe Feuersäule, die sich wie ein Wirbelsturm dreht |
| 7 | Searing Blow | ein orange glühender Schmiedehammer, hinter ihm ein feuriger Schlagbogen |

```
A sprite sheet of 7 game skill icons for a 2D fantasy video game, arranged in 2 neat rows (3 on top, 4 below) with lots of empty space between them, transparent background, all seen straight from the front. Each icon is one single free-standing motif that shows an action, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right:
1. Two slim curved knives crossed over each other, bright green poison dripping from both blades.
2. A withered drooping flower with grey-green petals falling off, a thin ring of sickly green curse smoke circling around it.
3. A round bright green poison bubble bursting open in a splash of green droplets.
Bottom row, left to right:
4. A red-hot glowing lump of coal cracking open, three small fireballs bursting out of it.
5. A flaming rock falling diagonally from the top right toward the bottom left, a long fire trail behind it.
6. A tall roaring pillar of fire twisting like a tornado.
7. A blacksmith's hammer glowing orange-hot, a fiery curved strike arc trailing behind it.

Do NOT include: any text, letters, numbers or runes; any character, hand, animal or face; any background, scenery or cast shadow; photorealism; plastic or modern look.
```

## Sheet C: Storm, Frost und Void (9)

| # | Skill | Motiv |
|---|---|---|
| 1 | Storm Strike | drei kurze parallele Hiebe, die von gelben Blitzen knistern |
| 2 | Chain Lightning | ein Blitz, der sich in drei Äste gabelt, jeder endet in einem Funken |
| 3 | Thunderstrike | ein riesiger Blitz schlägt aus einer kleinen dunklen Gewitterwolke herab |
| 4 | Ice Lance | ein langer spitzer Eisspeer fliegt schräg, Frostglitzer dahinter |
| 5 | Frost Strike | eine Stahlklinge in dicken blauen Eiskristallen |
| 6 | Frost Nova | ein Ring aus gezackten Eisstacheln bricht aus einer hellen kalten Mitte |
| 7 | Corrupt | eine schwarzviolette Ranke windet sich aus einem dunklen Riss im Boden |
| 8 | Soul Harvest | eine kleine Sichel zieht einen Strom violetter Irrlichter zu sich |
| 9 | Void Rift | ein gezackter Riss in der Luft, violett glühende Ränder, innen tiefschwarz |

```
A sprite sheet of 9 game skill icons for a 2D fantasy video game, arranged in 3 neat rows of 3 with lots of empty space between them, transparent background, all seen straight from the front. Each icon is one single free-standing motif that shows an action, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right (yellow lightning):
1. Three short parallel diagonal slash streaks crackling with bright yellow lightning.
2. A yellow lightning bolt that splits into three forks, each fork ending in a small bright spark.
3. A huge yellow lightning bolt striking straight down out of a small dark storm cloud.
Middle row, left to right (icy blue):
4. A long sharp spear of clear blue ice flying diagonally upward to the right, frost sparkles trailing behind it.
5. A steel sword blade encased in thick jagged blue ice crystals.
6. A ring of jagged blue ice spikes bursting outward from a bright white cold center.
Bottom row, left to right (dark violet):
7. A black-violet tendril curling up out of a small dark crack, glowing violet veins along it.
8. A small curved sickle with a dark handle, a stream of glowing violet wisps flowing into its blade.
9. A jagged vertical tear in the air, its edges glowing violet, deep black inside.

Do NOT include: any text, letters, numbers or runes; any character, hand, animal or face; any background, scenery or cast shadow; photorealism; plastic or modern look.
```

## Sheet D: Mastery-Skills (9)

Diese Skills nehmen das Element und Ailment der Waffe an, also **kein Element in der Farbe**: Stahl, Messing und
Glutgold (die Farbe von Emberheir selbst). Reihe = Klasse.

| # | Mastery | Skill | Motiv |
|---|---|---|---|
| 1 | Vanquisher | Earthsplitter | ein schwerer Schlag reißt den Boden in einer langen glühenden Spalte auf |
| 2 | Berserker | Rampage | ein eiserner Panzerhandschuh, fünf schnelle Bewegungsstreifen dahinter |
| 3 | Ravager | Rupture | ein Eisendorn bricht durch einen gespaltenen Stein, Glut in den Rissen |
| 4 | Deadeye | Deadly Aim | ein einzelner gefiederter Pfeil fliegt gerade, lange weiße Spur, Spitze glüht golden |
| 5 | Skirmisher | Hit and Run | ein Paar leichte Lederstiefel mit Windwirbeln und einem kurzen Hiebstreifen |
| 6 | Trickster | Dirty Trick | ein kleiner Stoffbeutel schleudert eine Staubwolke und Krähenfüße |
| 7 | Archmage | Arcane Blast | eine helle Zauberkugel explodiert mit einer ringförmigen Druckwelle |
| 8 | Spellweaver | Spell Volley | drei kleine leuchtende Zauberbolzen fliegen als enger Fächer |
| 9 | Warlock | Malediction | eine dunkle, krumme Kerze mit schiefer Flamme, Fluchrauch kringelt sich hoch |

```
A sprite sheet of 9 game skill icons for a 2D fantasy video game, arranged in 3 neat rows of 3 with lots of empty space between them, transparent background, all seen straight from the front. Each icon is one single free-standing motif that shows an action, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same level of detail and same line weight. Do not copy the objects in it.
Color rule for ALL 9 icons: no fire, ice, lightning, poison or void colors. Only steel grey, aged brass, warm walnut brown and a golden-white ember glow.
Light from the top left.

Top row, left to right:
1. A heavy blow splitting the ground: a long jagged fissure cracking open in a slab of stone, golden ember light glowing inside the crack.
2. A clenched iron gauntlet punching forward with five fast motion streaks behind it.
3. A sharp iron spike bursting up through a cracked stone, golden ember light glowing in the cracks.
Middle row, left to right:
4. A single feathered arrow flying perfectly straight to the right, a long white streak behind it, its tip glowing bright gold.
5. A pair of light leather boots in mid-leap with white wind swirls around them and one short curved slash streak.
6. A small cloth pouch flinging out a puff of grey dust and a few small iron caltrops.
Bottom row, left to right:
7. A bright golden-white magic sphere exploding, a thin ring-shaped shockwave spreading around it.
8. Three small glowing golden-white magic bolts flying side by side in a tight fan.
9. A crooked dark candle with a slanted golden flame, a thin curl of grey curse smoke rising from it.

Do NOT include: any text, letters, numbers or runes; any character, hand, animal or face; any background, scenery or cast shadow; photorealism; plastic or modern look.
```

## Sheet E: Weapon Innates (8)

Das Dagger-Innate (Envenom) ist schon auf Sheet B. Frostbolt ist der Wand-Innate nach Cold Attunement.

| # | Waffe | Innate | Motiv |
|---|---|---|---|
| 1 | Sword | Power Strike | ein Schwert in einem mächtigen Bogen, dahinter ein großer weißer Schwungstreifen |
| 2 | Axe | Lacerate | ein tiefer gezackter Riss in der Luft, aus dem Blut tropft |
| 3 | Mace | Skull Crack | ein runder eiserner Streitkolbenkopf schlägt nach unten, großer Knack-Blitz mit Funken |
| 4 | Bow | Barbed Arrow | ein Pfeil mit grausamer Widerhakenspitze, an einem Haken ein roter, am anderen ein grüner Tropfen |
| 5 | Crossbow | Heavy Bolt | ein kurzer dicker Armbrustbolzen mit schwerer Keilspitze, Tempolinien dahinter |
| 6 | Wand | Shockbolt | eine kleine knisternde gelbe Blitzkugel mit kurzer Funkenspur |
| 7 | Wand (Cold) | Frostbolt | eine kleine wirbelnde Frostkugel mit kurzer Schneespur |
| 8 | Staff | Void Orb | eine langsam schwebende dunkelviolette Kugel mit glänzendem Rand, ein kleines Irrlicht kreist um sie |

```
A sprite sheet of 8 game skill icons for a 2D fantasy video game, arranged in 2 neat rows of 4 with lots of empty space between them, transparent background, all seen straight from the front. Each icon is one single free-standing motif that shows an action, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right:
1. A steel sword swung in a powerful wide arc, a big curved white motion streak sweeping behind it.
2. A deep jagged tear slashed through the air, red blood dripping from its lower edge.
3. A round iron mace head with flanges smashing downward into a big white crack-burst with small sparks.
4. An arrow with a cruel barbed iron head, one red drop hanging from one barb and one green drop from the other.
Bottom row, left to right:
5. A short thick crossbow bolt with a heavy wedge-shaped iron head flying to the right, speed lines behind it.
6. A small crackling ball of yellow lightning flying to the right with a short spark trail.
7. A small swirling ball of blue frost flying to the right with a short trail of snowflakes.
8. A slowly floating sphere of dark violet energy with a glossy bright rim, one small glowing wisp circling around it.

Do NOT include: any text, letters, numbers or runes; any character, hand, animal or face; any background, scenery or cast shadow; photorealism; plastic or modern look.
```

---

## Einbau (nach dem Upload)

- `tools/art/cut_runes.py` → `apps/web/src/assets/runes/<runeId>.webp`; `RuneStone` in `ui/RuneArt.tsx` zeigt das Bild
  statt des SVG (die Farb-Punkte in den Sockets bleiben).
- `tools/art/cut_skills.py` → `apps/web/src/assets/skills/<skillId>.webp`; `skillIcon` in `game/battle/skills.ts` liefert
  das Bild für Battle-Leiste, Battle Plan und Run Cards. Innate Forms zeigen das Bild ihres Innates; Gegner-
  Skills behalten die Platzhalter.

---

## Sheet F: Default Attacks (8, Nachtrag 2026-10-26)

Jede Waffe hat ihren Grundangriff (Default Attack), der links in der Kampfleiste und im Battle Plan steht. Bis dieses
Sheet da ist, zeigt der Slot die gemalte Waffe. Die Default Attacks sind die schlichtesten Angriffe im Spiel, also
**ruhiger als die Skills**: Waffe plus eine kurze Bewegungslinie, keine Element-Farbe (Wand und Staff wechseln ihr
Element per Attunement), nur Stahl, Holz, Messing und ein kleines weiß-goldenes Aufblitzen.

Datei: `art/icons/attack-sheet-v1.png`

| # | Waffe | Default Attack | Motiv |
|---|---|---|---|
| 1 | Sword | Slash | ein kurzes Schwert, quer darüber eine einzelne saubere weiße Hieblinie |
| 2 | Axe | Hack | eine Handaxt hackt schräg nach unten, kurze Bewegungslinie, zwei Holzspäne fliegen |
| 3 | Mace | Smash | ein Streitkolben mit Flanschen, unter dem Kopf drei kurze Aufprall-Striche |
| 4 | Dagger | Stab | ein Dolch sticht nach rechts, dünne gerade Tempolinien dahinter |
| 5 | Bow | Shoot | ein kurzer gespannter Bogen, ein Pfeil verlässt gerade die Sehne |
| 6 | Crossbow | Bolt | eine kleine Armbrust von der Seite, ein Bolzen fliegt nach rechts heraus |
| 7 | Wand | Spark | ein schlanker Holzstab, an der Spitze ein kleiner heller Funke |
| 8 | Staff | Channel | das obere Ende eines Holzstabs mit einer Kugel, aus der ein dünner heller Strahl nach rechts fließt |

```
A sprite sheet of 8 game skill icons for a 2D fantasy video game, arranged in 2 neat rows of 4 with lots of empty space between them, transparent background (real transparency, not a checkerboard pattern), all seen straight from the front. Each icon is one single free-standing motif: a weapon doing a simple basic attack, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details. These are the plainest attacks in the game: calm, small motion effects only.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same level of detail and same line weight. Do not copy the objects in it.
Color rule for ALL 8 icons: no fire, ice, lightning, poison or void colors. Only steel grey, warm walnut wood, aged brass, leather and a small white-gold flash.
Light from the top left.

Top row, left to right:
1. A short steel sword pointing up to the right, one single clean white slash line crossing in front of it.
2. A small hand axe chopping diagonally downward, one short curved motion line behind it and two small wood chips flying.
3. A flanged iron mace pointing down, three short white impact strokes under its head.
4. A dagger thrusting to the right, thin straight white speed lines behind it.
Bottom row, left to right:
5. A short wooden bow at full draw, seen from the side, an arrow just leaving the string to the right.
6. A small wooden crossbow seen from the side, a short bolt flying out of it to the right with a thin speed line.
7. A slim wooden wand with a brass band, pointing up to the right, a small bright white-gold spark at its tip.
8. The top end of a wooden staff with a smooth round crystal orb, a thin bright white-gold beam streaming out of the orb to the right.

Do NOT include: any text, letters, numbers or runes; any character, hand, animal or face; any background, scenery or cast shadow; a checkerboard pattern; photorealism; plastic or modern look.
```
