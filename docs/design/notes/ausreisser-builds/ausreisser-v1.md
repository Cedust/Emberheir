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
