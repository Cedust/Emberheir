# Gegner-Skill-Icons: Prompts (v1, 2026-10-26)

Thread "Gegner-Skill-Icons prüfen". Die 28 Enemy Skills zeigen im Battle HUD noch Code-Platzhalter: kleine Symbole auf
einem farbigen Kästchen in der Gegner-Plakette (`hud-enemy-skills`, 18 px). Die Boss-Telegraphs stehen außerdem als
Name im Wind-up-Balken. Ihre Arena-Effekte (`SKILL_FX`) bleiben Code.

Gebraucht werden **3 Sheets mit 28 Icons**, nach Acts sortiert. Jedes Sheet ist ein transparentes PNG, so groß wie das
Tool kann, Icons in klaren Reihen mit viel Abstand.

**Stil-Referenz:** an jedes Sheet `art/icons/skill-sheet-c-v1.png` anhängen (die gemalten Hero-Skills), damit beide
Sorten zusammenpassen.

**Unterschied zu den Hero-Skills:** Gegner-Skills sind wilder und dreckiger: Krallen, rostige Waffen, rohe Natur,
und jeder trägt das Material seines Acts (siehe Tabelle). Keine ganzen Tiere und keine Gesichter, nur Teile wie Pfoten,
Krallen oder eine Zunge. Die **Boss-Telegraphs** (mit ★) sind die Momente, auf die man reagieren muss: größer,
wuchtiger, mit einem starken Glühen in Warnfarbe.

| Act | Material |
|---|---|
| 1 Ashen Fields | graue Asche, Glut |
| 2 Rotwood | Moos, Pilze, kränkliches Gelbgrün (nicht eklig: kein Schleim, keine Löcher) |
| 3 Ember Wastes | glänzend schwarzer Basalt mit Lava-Adern, weißgoldene Glut |
| 4 Frost Peaks | klares Gletschereis, Raureif, blasses Eisblau |
| 5 Storm Spires | gelbweiße Blitze, rauchig-violettes Sturmglas, Grünspan-Kupfer |
| 6 Void Rift | sternenschwarzes Indigo mit dünnen Magenta-Violett-Rändern, Porzellan-Risse |
| 7 Emberfall | bleiche Asche wie verbranntes Papier, goldorange Glut von innen |

| Datei | Inhalt |
|---|---|
| `art/icons/enemy-skill-sheet-a-v1.png` | Ashen Fields und Rotwood (9) |
| `art/icons/enemy-skill-sheet-b-v1.png` | Ember Wastes, Frost Peaks, Storm Spires ohne Boss (10) |
| `art/icons/enemy-skill-sheet-c-v1.png` | Storm-Herald-Telegraph, Void Rift, Harvester (9) |

---

## Sheet A: Ashen Fields und Rotwood (9)

| # | Skill (id) | Wer | Motiv |
|---|---|---|---|
| 1 | Heavy Swing (`heavy-swing`) | viele Brutes | ein rostiges schweres Hackmesser im weiten Abwärtsbogen, dicke graue Ascheschleppe |
| 2 | Quick Cuts (`quick-cuts`) | Ashen Prowler, Rift Stalker | zwei kleine grobe Messer gekreuzt, drei kurze Schnittstreifen |
| 3 | Cinder Spit (`cinder-spit`) | Cinder Caster | ein glühender Glut-Batzen fliegt zur Seite, Funken und Glutstropfen hinter sich |
| 4 | ★ Slam (`gorrak-slam`) | Gorrak | ein riesiger Steinhammer-Kopf schlägt in den Boden, aus dem Riss-Ring bricht Glut |
| 5 | Rake (`rake`) | Rotwood Stalker, Harrow Hound | drei gebogene Krallen reißen nach unten, drei rote Wundstreifen |
| 6 | Blight Spit (`blight-spit`) | Blight Spitter | drei kleine gelbgrüne Fäulnis-Kugeln in einer Reihe, leichter violetter Dunst |
| 7 | Moss Mend (`moss-mend`) | Mossbound Warden | Moos wächst über einen Riss in Rinde und schließt ihn, sanftes grünes Heil-Leuchten |
| 8 | Rot Spray (`rot-spray`) | Mother of Rot | ein Bovist platzt auf, ein Fächer aus gelbgrün-violetten Sporen sprüht heraus |
| 9 | ★ Devour (`devour`) | Mother of Rot | eine lange Krötenzunge rollt sich um einen leuchtenden Pilz, grünes Heil-Leuchten |

```
A sprite sheet of 9 game skill icons for a 2D fantasy video game, arranged in 3 neat rows of 3 with lots of empty space between them, transparent background (real transparency, not a checkerboard pattern), all seen straight from the front. Each icon is one single free-standing motif that shows an action of a MONSTER, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details. Monster skills look wilder and rougher than hero skills: crude rusty weapons, claws, raw nature.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right:
1. A crude rusty heavy cleaver swinging down in a wide arc, a thick trail of grey ash behind it and small ash flakes flying.
2. Two small crude rusty knives crossed, three short sharp white slash streaks across them, showing quick cuts.
3. A glowing orange lump of cinder spit flying sideways, a trail of sparks and dripping embers behind it.
Middle row, left to right:
4. BOSS ATTACK, bigger and more dramatic than the others: a huge stone maul head smashing down into the ground, a ring of cracked dark earth around it with bright orange embers and fire bursting out of the cracks, a strong red-orange warning glow.
5. Three curved dark animal claws tearing downward, three red wound streaks and a few blood drops behind them.
6. Three small round globs of sickly yellow-green rot in a row, dripping a little, wrapped in a faint violet haze.
Bottom row, left to right:
7. A piece of cracked tree bark with soft green moss growing over the crack and closing it, a gentle green healing glow and two small leaves.
8. A round puffball mushroom bursting open, a wide fan of yellow-green and violet spores spraying out of it.
9. BOSS MOVE, bigger and more dramatic than the others: a long pink toad tongue curling around a big glowing mushroom, pulling it in, a strong green healing glow around it.

Do NOT include: any text, letters, numbers or runes; any whole creature, character, hand or face; any background, scenery or cast shadow; slime, holes or gross details; photorealism; plastic or modern look.
```

---

## Sheet B: Ember Wastes, Frost Peaks, Storm Spires (10)

| # | Skill (id) | Wer | Motiv |
|---|---|---|---|
| 1 | Flame Dash (`flame-dash`) | Cinder Imp | ein Feuerstreif rast zur Seite, drei kleine brennende Kratzer entlang |
| 2 | Fireball (`fireball`) | Flame Caller, Cinder Tyrant, Ember Wraith | ein großer runder Feuerball mit weißglühendem Kern und Flammenschweif |
| 3 | Obsidian Shell (`obsidian-shell`) | Obsidian Guard, Cinder Knight | ein glänzend schwarzer Käferpanzer aus Basalt mit Lava-Adern |
| 4 | ★ Eruption (`eruption`) | Cinder Tyrant | Basaltboden bricht auf, eine Lava-Fontäne schießt hoch |
| 5 | Pounce (`pounce`) | Frost Fox | eine Pfote mit Eiskrallen springt nach vorn, Frost-Schleppe |
| 6 | Ice Bolt (`ice-bolt`) | Rime Witch, Rime Warden | ein spitzer eisblauer Eiszapfen fliegt schräg, Frostnebel hinter sich |
| 7 | Glacial Mend (`glacial-mend`) | Frost Warden | ein gesprungener Gletschereis-Block, der Riss schließt sich mit Raureif |
| 8 | ★ Avalanche (`avalanche`) | Rime Warden | eine Wand aus Schnee und Eisbrocken stürzt herab |
| 9 | Arc Dash (`arc-dash`) | Storm Sprite | ein gelbweißer Zickzack-Blitz rast zur Seite, drei Funkenstöße |
| 10 | Forked Bolt (`forked-bolt`) | Storm Caller, Storm Herald | ein Blitz gabelt sich dreimal, jeder Ast kleiner, Sturmglas-Splitter |

```
A sprite sheet of 10 game skill icons for a 2D fantasy video game, arranged in 2 neat rows of 5 with lots of empty space between them, transparent background (real transparency, not a checkerboard pattern), all seen straight from the front. Each icon is one single free-standing motif that shows an action of a MONSTER, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details. Monster skills look wilder and rougher than hero skills: claws, raw elements, crude power.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right:
1. A streak of fire dashing sideways, three small burning claw scratches along its path.
2. A big round fireball with a swirling white-hot core and a flaming tail behind it.
3. A glossy black basalt beetle shell plate, molten orange veins glowing in its cracks, hard and protective.
4. BOSS ATTACK, bigger and more dramatic than the others: black basalt ground bursting open, a tall fountain of lava and fire shooting up, glowing rock chunks flying, a strong red-orange warning glow.
5. An animal paw with sharp pale ice claws lunging forward, a trail of frost mist and small ice crystals behind it.
Bottom row, left to right:
6. A sharp pale blue icicle bolt flying diagonally, a trail of frost mist behind it.
7. A cracked block of clear glacier ice, the crack closing up with white hoarfrost, a soft icy blue healing glow.
8. BOSS ATTACK, bigger and more dramatic than the others: a towering wall of snow and ice chunks crashing down, a frost burst where it hits, a strong icy white warning glow.
9. A crackling yellow-white lightning streak dashing sideways in a zigzag, three small spark bursts along it.
10. A lightning bolt splitting into three forks, each fork smaller than the one before, small smoky violet glass shards around it.

Do NOT include: any text, letters, numbers or runes; any whole creature, character, hand or face; any background, scenery or cast shadow; photorealism; plastic or modern look.
```

---

## Sheet C: Storm Herald, Void Rift, Ashen Harvester (9)

| # | Skill (id) | Wer | Motiv |
|---|---|---|---|
| 1 | ★ Thunderclap (`thunderclap`) | Storm Herald | dunkle Sturmwolke, ein dicker Blitz hämmert herab, Schockwellen-Ring |
| 2 | Void Lance (`void-lance`) | Void Seer | eine lange dünne Lanze aus sternenschwarzer Leere mit Magenta-Rändern |
| 3 | Hex (`hex`) | Gloom Weaver | ein Knoten aus dunklen Schattenfäden mit violettem Glimmen |
| 4 | Consume (`consume`) | Voidborn Maw | ein Leere-Strudel saugt violette Funken ein |
| 5 | ★ Rift Snap (`rift-snap`) | Voidborn Maw | zwei gezackte Ränder eines Sternen-Risses schnappen zu wie Kiefer |
| 6 | Soul Reap (`soul-reap`) | Ashen Harvester | ein Halbmond-Schwung aus grauem Feuer, bleiche Ascheschwaden |
| 7 | ★ Harvest Swing (`harvest-swing`) | Ashen Harvester (Phase 1) | eine riesige Glut-Sensenklinge schwingt, violette Spur |
| 8 | ★ Ashfall (`ashfall`) | Ashen Harvester (Phase 2) | ein Regen aus brennenden Ascheflocken, dazwischen blaue Frostglitzer |
| 9 | ★ The Last Harvest (`last-harvest`) | Ashen Harvester (Phase 3) | ein sterbender goldener Stern in einem Aschestrudel, violett-schwarze Blitze schlagen heraus |

```
A sprite sheet of 9 game skill icons for a 2D fantasy video game, arranged in 3 neat rows of 3 with lots of empty space between them, transparent background (real transparency, not a checkerboard pattern), all seen straight from the front. Each icon is one single free-standing motif that shows an action of a MONSTER, no medallion, frame or button around it. The shapes must stay readable at a very small size: simple strong silhouettes, high contrast, few details. Monster skills look darker and more menacing than hero skills.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same saturated glowing colors, same level of detail and same line weight. Do not copy the objects in it.
Light from the top left.

Top row, left to right:
1. BOSS ATTACK, bigger and more dramatic than the others: a heavy dark storm cloud, a thick yellow-white lightning bolt hammering straight down out of it, a round shockwave ring of light where it strikes, a strong yellow warning glow.
2. A long thin lance made of starry black-indigo void, thin glowing magenta-violet edges, flying diagonally.
3. A twisted knot of dark gloom threads, like a cursed ball of spider silk, a sickly violet glow inside it and a few loose threads hanging down.
Middle row, left to right:
4. A small swirling vortex of starry black void, pulling in a stream of tiny violet sparks.
5. BOSS ATTACK, bigger and more dramatic than the others: two jagged edges of a starry black void rift snapping shut like huge jaws, a bright magenta-violet flash between them, small porcelain-like shards flying.
6. A crescent-shaped sweep of grey fire, pale ash wisps peeling off its edge.
Bottom row, left to right:
7. BOSS ATTACK, bigger and more dramatic than the others: a huge curved scythe blade glowing with embers, sweeping in a wide arc, a violet void trail behind it.
8. BOSS ATTACK, bigger and more dramatic than the others: a heavy rain of burning ash flakes and embers falling diagonally, small pale blue frost glints mixed in, a strong orange warning glow.
9. FINAL BOSS ATTACK, the most dramatic icon of the sheet: a dying golden star at the center of a swirling vortex of pale ash, violet-black lightning bolts lashing out of it in all directions.

Do NOT include: any text, letters, numbers or runes; any whole creature, character, hand or face; any background, scenery or cast shadow; photorealism; plastic or modern look.
```

---

## Einbau (nach dem Upload)

- Ausschneiden mit demselben Werkzeug wie bei den Hero-Skills (`tools/art/cut_skills.py`) nach
  `apps/web/src/assets/skills/<skillId>.webp`. Die Hero- und die Enemy-IDs überschneiden sich nicht.
  Ist ein Schachbrett eingebacken, hilft `tools/art/key_checker.py`.
- `skillIcon` in `game/battle/skills.ts` liefert das Bild auch für Enemy Skills. Damit zeigen es die Skill-Chips auf
  der Gegner-Plakette.
- Der Wind-up-Balken eines Boss-Telegraphs (`rhythm-hold heavy`) zeigt das Icon vor dem Namen.
