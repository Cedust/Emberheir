# Ausreißer-Builds und Pflaster – Befund und Vorschläge (v1, 2026-11-04)

Auftrag (Timo 2026-11-04): Die Ausreißer-Builds an ihrer Ursache angehen und gezielt nach Pflastern suchen, die
durch allgemeinere, fürs Spiel gesündere Regeln ersetzt werden können. Erst Vorschläge, dann bauen.

Messung: `--act 7 --generations 7 --build all --runs 1 --newest 1`, 8 Seeds (31–101), Stand nach PR #160.
Dazu Sonden über jeden Boss-Kampf im neuesten Act (4 Seeds): Tempo (Gegner-Life pro Sekunde), Crit, Block,
Glancing, Ausweichen, DoT-Anteil, Heilung nach Quelle.

## 1. Befund: Builds statt Klassen

Versuche pro neuem Act, Act 2 / 3 / 4 (8 Seeds):

| Build | A2 | A3 | A4 | Boss-Siege A2–4 | Tempo am Boss |
|---|---|---|---|---|---|
| Staff Hollow | 1,0 | 1,1 | 1,0 | 100 % | 1,85 |
| Wand Starfall | 1,2 | 2,0 | 1,0 | 80 % | 1,65 |
| andere Emberseer | 1,5–2,8 | 1,8–2,6 | 1,4–4,6 | 43–57 % | 0,82–1,33 |
| Sword Edge, Axe Butcher, Dagger Cutthroat | 1,8–4,0 | 1,4–1,8 | 1,2–2,0 | 60–67 % | 0,86–1,39 |
| Bow (alle drei Pfade) | 5,1–7,0 | 8,8–10,1 | 3,6–6,9 | 13–30 % | 0,90–0,99 |
| Crossbow (alle drei Pfade) | 2,0–3,8 | 3,1–5,0 | 2,5–3,8 | 30–35 % | 0,87–1,18 |
| Kälte-Pfade (Axe Glacier, Sword Winter, Crossbow Frost) | 3,2–5,9 | 4,4–5,4 | 2,5–7,2 | 27–35 % | 0,87–1,09 |

Tempo = Prozent der Boss-Life pro Sekunde. Der Klassen-Abstand der Emberseer in Act 2–4 kommt vor allem von
Staff Hollow und Wand Starfall, der hohe Ashstrider-Wert vor allem von den drei Bow-Builds.

### Ursache A: der Void-Pfad im Ash Tree

- **Staff Hollow und Wand Starfall spielen im Autopilot beide denselben Void-Pfad** (`build-plans.ts`: Starfall
  hat den Stil `void`, nicht seinen Crit-Spark-Pfad). 61–69 % ihres Boss-Schadens sind Corruption.
- Corruption wächst mit jedem Tick (+25 % bis ×4), Collapse schlägt bei vollem Wachstum vier Sekunden auf einmal
  zu und fällt auf halbes Wachstum zurück. In langen Kämpfen grob 50 % des Treffers pro Sekunde (Burn 22 %).
- **Test „Collapse fällt auf 0“:** Staff Hollow 1,57 → 2,48, Wand Starfall 1,48 → 1,71, aber Emberseer Act 7
  4,8 → 7,0. Corruption allein ist es nicht; gleich stark kürzen macht das Spätspiel wieder kaputt.
- **Messfehler:** Wand Starfall wird gar nicht als Starfall gemessen. Zwei von sechs Emberseer-Builds sind
  derselbe Void-Build, das verzerrt den Klassenschnitt.

### Ursache B: Bow und Crossbow an Bossen

- In normalen Kämpfen töten Bow und Crossbow so schnell wie die anderen (Act 3: 4,2–5,0 % pro Sekunde, Mitte 5).
- An Bossen fallen sie zurück (0,87–1,18 gegen Mitte 1,15; Bow Fire Arrows am Cinder Tyrant 0,62).
- Ausweichen und Block der Bosse spielen kaum eine Rolle (unter 1 % bzw. 0–2 %). Noch offen: Was an Bossen
  anders ist (Telegraph-Pausen, Steady Heat, Hooked Arrow, Burst-Skills, Rüstung der Bosse).

### Ursache C: Kälte-Pfade

Fünf von sechs Kälte-Builds töten Bosse langsam (0,82–1,09) und sterben öfter. Chill bremst den Gegner, gleicht
den fehlenden Schaden aber nicht aus. Noch offen: wie viel Schaden Chill den Builds wirklich erspart.

## 2. Tests ohne Wirkung (zum Nachlesen)

| Test (Emberseer, 8 Seeds) | A2 | A3 | A4 | A7 | alle |
|---|---|---|---|---|---|
| Stand | 1,6 | 1,9 | 2,0 | 5,3 | 2,42 |
| Barrier bleibt zwischen Stages leer | 1,7 | 1,9 | 2,0 | 4,7 | 2,34 |
| Barrier fängt nur 50 % jedes Treffers | 2,0 | 1,9 | 2,8 | 4,5 | 2,78 |
| Corruption: Collapse fällt auf 0 | 1,5 | 2,4 | 2,1 | 7,0 | 2,76 |

Der Gear-Faktor im Endgame-Budget (Emberseer ×5,9, andere ×2,3–2,7) schwankt pro Seed stark (dieselben Builds
×2,1–5,9) und ist kein Emberseer-Sonderfall.

## 3. Pflaster-Inventur

Gesucht: Zahlen, die eine andere Zahl ausgleichen, statt selbst eine Regel zu sein.

| Stelle | Was | Urteil |
|---|---|---|
| `actPressure` 0,93 (Life und Schaden) | Ausgleich, als die Acts ihre Boons verloren | **Pflaster.** Gehört in `MONSTER_TABLE` bzw. `stageKinds`, nicht als eigener Faktor obendrauf. |
| `wall.boss` firstRun 2,6 / later 5,25 Schaden | Boss-Wand im neuesten Act, zweimal per Messung nachgestellt | **Pflaster-Kette.** Boss-Schaden ×5,25 × Boss-Faktor 0,75 × actPressure: drei Faktoren für eine Frage. |
| `wildfire.early` +12 % Life / +18 % Schaden | Wildfire I–IV zu leicht | **Pflaster.** Die Tier-Kurve selbst (Start bei I) ist zu flach. |
| `wildfire.boss` 0,6 / 3,3 und `finale` 3,8 | Boss- und Finale-Druck, 3,3 → 3,8 nach Boon-Entfernung | Teils Pflaster (Boon-Ausgleich). |
| Harvester `damage: 0.4` | Sechs Boss-Echos auf einmal, pauschal gedämpft | **Pflaster.** Besser: weniger Echos gleichzeitig schadensstark (pro Phase eins), dann ohne Faktor. |
| Cinder Tyrant Enrage +30 % (vorher +50 %) | Nach Todesanteil gestellt | Normale Feinabstimmung, kein Pflaster. |
| `spellDamagePerSkillLevel` = Attacken | Kommentar „Emberseer töteten 40 % schneller“ | Heute gleich wie Attacken, also eine Regel. Kommentar veraltet. |
| `heavyHitCap` 35 % | Kein Heavy-Treffer über 35 % von Life + Barrier | Regel (keine One-Shots), behalten. |

## 4. Vorschläge (Reihenfolge)

1. **Messung reparieren:** Wand Starfall spielt seinen eigenen Crit-Spark-Pfad statt des Void-Pfads. Erst danach
   ist der Emberseer-Schnitt echt. Ohne Spielwirkung.
2. **Void-Pfad an der Ursache:** Knoten für Knoten messen (Hollow Crown, Entropy, Hungering Void, Pact of Ash,
   Soul Harvest), welcher die doppelte Kill-Geschwindigkeit bringt, und dort ansetzen statt an Corruption selbst.
3. **Bow und Crossbow an Bossen:** genau messen, was an Bossen fehlt, dann an der Waffe ansetzen (Innate,
   Heat-Fluss), nicht an den Bossen.
4. **Chill:** messen, wie viel Schaden Chill erspart, und Chill so stellen, dass Kälte-Pfade über Schutz statt
   über Schaden mithalten.
5. **Faktor-Kette aufräumen:** `actPressure`, `wildfire.early` und den Boon-Ausgleich im Finale in die
   Grundkurven (`MONSTER_TABLE`, Wildfire-Tierkurve) einrechnen, so dass jede Stage-Art genau einen Faktor hat.
   Harvester ohne Pauschalfaktor über seine Phasen. Danach alles neu messen.

Jeder Schritt wird mit 8 Seeds gemessen und vor dem Einbau gezeigt.

## 5. Stand nach Schritt 1–4 (2026-11-04)

**Korrektur:** Starfall ist laut Heirloom ein Void-Pfad („Void · Corruption, Crits“). Der Autopilot spielt ihn richtig;
der „Messfehler“ aus Abschnitt 4 war keiner.

**1. Build-Prüfung (alle 24, Run 3 und Run 7, Seed 31).** Pfad, Mastery, Keystone und Ash-Tree-Region passen zu
jedem Heirloom-Pfad. Attribute und Gear wählt der Autopilot nach Schaden × effektivem Life (Min-Maxer); er nimmt
auch fremde Ailment-Chancen mit (z. B. Burn auf Bow Toxin), weil sie Schaden bringen. Zwei echte Fehler, beide im
Build-Plan behoben (`build-plans.ts`, nur Autopilot und Cheat Panel):
- 11 Builds ließen einen Rotation-Slot leer, bis ihr Hauptskill erreicht war (Elementar-Cinderguards bis etwa Run 4
  ohne dritten Skill, obwohl Crushing Blow gelernt war; Emberseer Storm/Smolder mit gelerntem, aber unbenutztem
  Corrupt; Kälte-Caster mit unbenutzter Ice Lance; Gift-Ashstrider mit unbenutztem Envenom). Die Rotation listet
  jetzt nach den Hauptskills die früh gelernten Skills.
- Bow und Crossbow blieben auf der Heat Form Steady, alle Nahkämpfer nehmen Cooling (+25 % Heat pro Treffer).
  Sie nehmen jetzt auch Cooling.

Wirkung (8 Seeds, alle Builds): Cinderguard 3,41 → 3,35, Ashstrider 3,60 → 3,75, Emberseer 2,42 → 2,53. Im
Rauschen; einzelne Build-Zellen schwanken auch mit 8 Seeds um ±3 Versuche.

**2. Void / Emberseer.** Kein einzelner Void-Knoten ist schuld (jeder bringt unter 8 %). 54–73 % des Schadens ist
Corruption aus großen Spell-Treffern (Void Rift, Malediction). Zwei Tests, Corruption zu schwächen:

| Test | E A2 | E A3 | E A4 | E A7 | E alle |
|---|---|---|---|---|---|
| Stand | 1,6 | 2,0 | 1,7 | 5,4 | 2,53 |
| Collapse fällt auf 0 | 1,5 | 2,4 | 2,1 | 7,0 | 2,76 |
| Wachstum 15 % statt 25 % pro Tick | 1,9 | 2,4 | 2,1 | 6,5 | 3,02 |

Beide machen Act 2–4 kaum schwerer, Act 7 deutlich. Grund (Schaden gegen die Puppe, Seed 41):

| | Run 3 | Run 7 | Wachstum |
|---|---|---|---|
| Emberseer | 1,1–1,5 k | 37–46 k | ×31–39 |
| Nahkampf (Sword, Axe, Mace) | 0,7–0,9 k | 20–25 k | ×24–32 |
| Bow / Crossbow | 0,46–0,76 k | 32–61 k | ×60–81 |

Die Klassen haben verschiedene Kurvenformen: Emberseer früh stark und spät Mittelfeld (mit dem dünnsten Schutz),
Bogen früh schwach und spät am stärksten. Monster wachsen für alle gleich (`MONSTER_TABLE`, gemessen am Median aller
Builds). Wer schwächt, verschiebt die ganze Kurve; die Form bleibt. Das gehört zu Punkt 5.

**3. Bow / Crossbow.** Früh am wenigsten Heat (9–13 pro Sekunde, Nahkampf 13–16, Caster 20–32), also am wenigsten
Skills. Mit Cooling (siehe 1.) etwas besser, aber im Rauschen.

**4. Chill.** Chill bremst nur Angriffe und Heat, nicht die Telegraph-Angriffe und Auren der Bosse (Eruption,
Avalanche, Fire Aura). Test „Chill bremst alles, was der Gegner tut“ (nicht eingebaut):

| Klasse | A1 | A2 | A3 | A4 | A5 | A6 | A7 | alle |
|---|---|---|---|---|---|---|---|---|
| Cinderguard | 2,7 | 3,7 | 4,3 | 2,4 | 2,7 | 6,5 | 3,2 | 3,64 (3,35) |
| Ashstrider | 3,1 | 4,1 | 5,9 | 4,1 | 3,5 | 1,7 | 3,4 | 3,71 (3,75) |
| Emberseer | 2,0 | 1,5 | 2,0 | 1,7 | 3,0 | 1,8 | 3,4 | 2,20 (2,53) |

Act 7 wird für alle leichter (Harvester-Tode 89 → 48), Emberseer am meisten (viele ihrer Builds kühlen). Die Regel wäre genre-üblich (Cold Snap aus der Mastery bliebe ein Bonus obendrauf), macht aber Emberseer noch leichter. Nur zusammen mit Punkt 5 sinnvoll.

## 6. Heat Form pro Build (2026-11-05, Timos Frage)

Jeder Build hat alle sieben Runs einmal mit jeder Heat Form gespielt (8 Seeds, Versuche pro neuestem Act,
Runs 2-7; die Form gibt es ab Weapon Rank 3, Run 1 ist also gleich). Einzelne Builds rauschen um etwa ±0,8.

| Klasse      | Steady | Warming | Cooling | Smoldering |
| ----------- | -----: | ------: | ------: | ---------: |
| Cinderguard |   3,91 |    3,38 |    3,35 |       5,06 |
| Ashstrider  |   3,85 |    3,90 |    3,75 |       5,24 |
| Emberseer   |   3,16 |    2,53 |    3,52 |       4,38 |

- Jede Klasse nutzt schon ihre beste Form (Nahkampf und Fernkampf Cooling, Caster Warming).
- Das Waffentempo entscheidet es nicht: Heat per Hit ist 12 / Grund-Angriffe pro Sekunde, auf Steady
  bekommt also jede Waffe etwa 12 Heat/s, wie bei Warming. Hit-Forms ziehen erst mit Attack Speed und
  Skill-Treffern davon.
- Klarer Abstand bei einem Build: Fire Arrows Bow (Cooling 7,16, Warming 5,27). Grenzfälle: Forge Mace
  (Warming 3,79 statt 4,62), Frost Crossbow (Steady 3,12 statt 3,89).
- Smoldering ist nie die beste Form und kostet etwa +1,4 Versuche: ein Treffer gibt 1 Heat pro 1 %
  verlorenem Life (die meisten Treffer 3-8 %), ausgewichene, geblockte und Barrier-Treffer geben nichts,
  eigene Treffer nur 30 %.
- Cooling schlägt Steady fast immer: es verliert nur 1 Heat pro Sekunde für +25 % Heat per Hit.
  Zwei der vier Forms sind also keine echte Wahl (eine Designfrage, kein Fix im Build-Plan).

### Smoldering neu (Timo 2026-11-05)

Jeder Default Attack des Gegners gibt 12 Heat / sein Grundtempo (also etwa 12 Heat/s), auch geblockt
oder ausgewichen; eigene Treffer weiter 30 %. Nur Cooling bekommt noch Heat aus erlittenem Schaden.
Alle Builds auf Smoldering, 8 Seeds, Versuche pro neuestem Act:

| Klasse      | Smoldering alt | Smoldering neu | beste Form |
| ----------- | -------------: | -------------: | ---------: |
| Cinderguard |           5,06 |           4,89 |       3,35 |
| Ashstrider  |           5,24 |           3,75 |       3,75 |
| Emberseer   |           4,38 |           3,85 |       2,53 |

Ashstrider liegt jetzt gleichauf mit Cooling; Toxin Bow (3,71 statt 4,55), Venom Bolts Crossbow und
Venom Dagger sind mit Smoldering am besten. Cold-Builds (Glacier Axe 9,1, Winter Sword 7,8) verlieren:
Chill bremst die Angriffe des Gegners und damit die Heat. Das ist ein ehrlicher Zielkonflikt, kein Fehler.

### Cooling neu (Timo 2026-11-05) und Form pro Build

Cooling verliert 10 % der aktuellen Heat pro Sekunde (statt 1 Heat/s). Alle Builds auf Cooling: C 4,01,
A 3,75, E 3,97 (vorher 3,35 / 3,75 / 3,52). Danach nimmt jeder Build die Form, mit der er am besten
abschneidet: Steady 6 Builds (Thunder Sword, Quake Mace, Frost Crossbow, Static Dagger, Rime und
Starfall Wand), Warming 10, Cooling 5, Smoldering 3 (Toxin Bow, Venom Bolts Crossbow, Venom Dagger).
Jede Form ist damit für einige Builds die beste.

Kontrollmessung mit diesen Forms (8 Seeds, Versuche pro neuestem Act, davor in Klammern):

| Klasse      |   A1 |   A2 |   A3 |   A4 |   A5 |   A6 |   A7 |    alle     |
| ----------- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :---------: |
| Cinderguard |  2,6 |  3,6 |  3,7 |  2,4 |  2,1 |  4,4 |  3,8 | 3,22 (3,35) |
| Ashstrider  |  2,9 |  3,5 |  5,1 |  3,1 |  3,8 |  1,5 |  3,3 | 3,31 (3,75) |
| Emberseer   |  2,0 |  1,8 |  2,4 |  1,7 |  2,2 |  2,0 |  5,6 | 2,51 (2,53) |

Cinderguard und Ashstrider liegen jetzt gleichauf; Emberseer bleibt die leichteste Klasse (Punkt 5).

## 7. Punkt 5 gebaut: Faktor-Kette aufgeräumt (2026-11-05, Timo: Option A)

Vorschlag und Optionen: `punkt5-vorschlag-v1.md` (Projektordner). Timo wählte A: nur aufräumen, die Schwierigkeit
bleibt, Emberseer wird dadurch nicht fairer.

Ein Gegner nimmt jetzt nur noch: Monster Level (`MONSTER_TABLE`) × Stage-Art (`stageKinds`) × den Faktor seines Orts
(Wand im neuesten Act, Finale oder Wildfire-Stufe).

- **`actPressure` 0,93 entfällt:** steckt in jeder Stage-Art (normal Life 1,3 / Schaden 0,93, Elite 1,86 / 0,93,
  Gatekeeper 2,05 / 0,93, Boss 2,8 / 0,7). Finale (Life 0,54, Schaden 4,1) und Wildfire wurden passend angehoben,
  weil sie die 0,93 vorher nicht hatten.
- **Wildfire:** eine Zeile pro Stufe (`wildfire.pressure`) statt Grundrate × Steilrate × Vorsprung (`early` entfällt).
  Die Zahlen sind dieselben; sichtbar wird, dass V weniger Faktor hat als IV (sein höheres Monster Level gleicht es aus).
- **Harvester:** Jede Phase endet mit ihren Echos (neuer Baustein `aboveLife` an Triggern und Telegraphs, mit Test):
  Harvest Swing nur Phase 1, Ashfall und Ash Aura nur Phase 2, The Last Harvest Phase 3. Er trifft wie ein Boss
  nach dem anderen statt wie sechs auf einmal; sein Schaden steigt dafür von 0,4 auf 0,5.
- Die Boss-Wand (`wall.boss`) bleibt: Sie ist die Regel „der neueste Act ist schwerer“, kein Ausgleich.

Messung (8 Seeds 31–101, `--act 7 --generations 7 --build all --runs 1 --newest 1`, Versuche pro neuestem Act):

| Stand | C A1–A7 | C alle | A A1–A7 | A alle | E A1–A7 | E alle |
|---|---|---|---|---|---|---|
| main (PR #161) | 2,6 3,6 3,7 2,4 2,1 4,5 3,8 | 3,23 | 2,9 3,5 5,1 3,1 3,8 1,5 3,3 | 3,31 | 2,0 1,8 2,4 1,7 2,2 2,0 5,6 | 2,51 |
| Phasen, Schaden 0,4 | 2,7 3,5 3,4 2,3 2,1 4,3 3,7 | 3,14 | 2,9 3,6 5,3 3,5 3,3 1,4 2,6 | 3,24 | 2,0 1,8 2,5 1,7 2,4 1,9 4,3 | 2,35 |
| **Phasen, Schaden 0,5** | 2,7 3,5 3,4 2,3 2,1 4,3 4,2 | **3,21** | 2,9 3,6 5,3 3,5 3,3 1,4 3,2 | **3,32** | 2,0 1,8 2,5 1,7 2,4 1,9 5,4 | **2,51** |
| Phasen, Schaden 0,55 | … 5,1 | 3,35 | … 3,9 | 3,41 | … 6,1 | 2,61 |

Act 1–6 bleiben im Rauschen gleich. Tode am Harvester: main 190, Phasen mit 0,4 nur 109, mit 0,5 219.

Finale und Wildfire (`--wildfire 10 --build all --runs 2`, Seeds 31 und 41):

| | Finale C / A / E (alle) | Wildfire I–VII | VIII geschafft | X geschafft |
|---|---|---|---|---|
| main | 3,1 / 2,5 / 4,5 (3,2) | 1,6 2,6 2,2 2,1 3,7 2,7 1,6 | 54 von 94 | 11 von 25 |
| neu | 2,7 / 2,6 / 3,5 (2,9) | 1,4 2,4 2,1 2,0 4,1 2,6 2,0 | 46 von 93 | 7 von 25 |

Mit zwei Seeds rauscht das Finale um etwa ±0,4 (derselbe Code gab einmal 3,6); I–VII sind gleich.
Emberseer bleibt die leichteste Klasse in Act 1–6 (offen, siehe `punkt5-vorschlag-v1.md` Option B).
