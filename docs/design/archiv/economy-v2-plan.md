# Economy v2 – Messung und Plan vor dem Release (03.11.2026)

Frage (Timo): Stimmt die Economy vor dem Release? Nicht zu viel Währung, die man nie ausgeben kann, aber auch
nicht zu rar. Respecs teuer und nach investierten Punkten. Preise müssen den Nutzen rechtfertigen (Tier Upgrade
darf sehr teuer sein). Stand `main` 015d647.

## Kurzurteil

**Nein, noch nicht.** Auch ein Spieler, der *alles* sinnvoll ausgibt, sitzt am Ende von Run 7 auf
**~2,8 h Acorns, ~6 h Ash und ~12 h Ember Coal** Einkommen. Gleichzeitig sind die Preise für das, was man
bekommt, zu billig: ein Temper bringt im Schnitt **~2 % Stärke für ~1,5 Minuten Einkommen**, ein kompletter
Ash-Tree-Respec kostet **~4 Minuten**. Gut sind Phoenix Feathers, Runes und Cinderglass.

Die Ursache: Seit #108 rechnen die Preise in „Kämpfen wert“ (richtig), aber die Faktoren sind aus der Zeit
geraten, und drei Senken haben keinen echten Bedarf (Reforge, Gamble) oder keine Obergrenze nach oben
(Temper ist pro Item immer gleich billig).

## Neues Messwerkzeug

Die alte Economy-Tabelle hat nur den neuesten Act gezählt und einen „eifrigen Crafter“ angenommen. Neu:

- **Kassenbuch** (`tools/balance/src/ledger.ts`): jede Änderung am Wallet wird mit Quelle oder Senke gebucht
  (Kampf normal/Elite/Gatekeeper/Boss/Thief, Loot-Salvage, Bounty, Kartenknoten, jeder Craft, Draught,
  Crucible, Respecs), pro Run, Last Ember und Wildfire-Stufe, mit Wallet am Ende. Es stimmt auf die Münze
  (Abgleich Start + Ein − Aus = Ende, Spalte `drift` = 0).
- **Min-Maxer** (`tools/balance/src/crafter.ts`, `--craft 1`): der Autopilot craftet im Camp wie ein
  eifriger Spieler, der den Wert jedes Crafts kennt, aber nicht die Würfel: Upgrade mit jedem Feather, Temper
  und Reforge, wenn der *erwartete* Gewinn ≥ 0,3 % Stärke ist (Probewürfe auf anderen Würfeln, nie der
  echte Wurf), Gamble bei Marisha mit übrigen Acorns. Er notiert, wie viel Stärke (dps × effektive Life)
  jeder Craft gekauft hat.
- Aufruf: `npm run balance -- --act 7 --generations 7 --wildfire 10 --build <id> --runs 1 --craft 1 --economy 1`

Messung: 6 Builds (sword-edge, axe-butcher, bow-toxin, dagger-cutthroat, wand-starfall, staff-smolder) ×
Seeds 31/32, alle 7 Runs + Last Ember + Wildfire I–X, einmal ohne Crafting (Autopilot wie bisher), einmal mit
Min-Maxer. Rohdaten: `messung-ohne-crafting.txt`, `messung-min-maxer.txt`.

## Ergebnis (Min-Maxer, Mittel)

| Run | Spielzeit | Acorns ein / ausgegeben | Ash ein / ausgegeben | Coal ein / ausgegeben | Feathers ein / ausgegeben | Wallet am Ende |
|---|---|---|---|---|---|---|
| 1 | 50 min | 1.370 / 1 % | 1.150 / 0 % | 55 / 5 % | 4 / 15 % | 1,4k Acorns · 1,1k Ash · 52 Coal |
| 2 | 58 min | 5.270 / 52 % | 4.900 / 75 % | 100 / 6 % | 8 / 117 % | 3,9k · 2,4k · 146 |
| 3 | 58 min | 8.280 / 66 % | 8.070 / 56 % | 100 / 4 % | 9 / 102 % | 6,7k · 5,9k · 242 |
| 4 | 100 min | 23.400 / 50 % | 26.400 / 25 % | 247 / 1 % | 16 / 81 % | 18k · 26k · 488 |
| 5 | 114 min | 35.000 / 74 % | 42.000 / 22 % | 189 / 3 % | 20 / 91 % | 27k · 58k · 670 |
| 6 | 126 min | 46.500 / 58 % | 57.400 / 15 % | 216 / 3 % | 19 / 62 % | 47k · 107k · 879 |
| 7 | 158 min | 62.100 / 69 % | 73.300 / 15 % | 252 / 2 % | 21 / 70 % | **66k · 169k · 1.127** |
| Wildfire X | – | – | – | – | – | **233k · 376k · 1.493** |

Ohne Crafting (Autopilot wie bisher) gibt er nur ~35 % Acorns und ~5 % Ash aus, Coal und Feathers gar nicht;
Ende Run 7: 130k Acorns, 217k Ash, 1.209 Coal, 99 Feathers.

**Woher es kommt:** Acorns zu ~45 % aus normalen Kämpfen, ~30 % Elites, ~20 % Bosse. Ash zu **~50 % aus
Loot-Salvage** (nicht gewählte Karten), der Rest aus Kämpfen. Coal zu ~40 % Elites, ~35 % Bosse, ~15 %
Bounty-Caches. Feathers ~70 % Bosse.

**Was eine Münze kauft** (Run 7, Einkommen ~2,2 Kills Acorns und ~5 Kills Ash pro Minute):

| Craft | Preis heute | ≈ Minuten Einkommen | Stärke pro Craft (gemessen) |
|---|---|---|---|
| Temper | 1 Kill Acorns + 6 Kills Ash | ~1,5 min | **~2 %** (30 pro Run gemacht, mehr wäre gegangen) |
| Upgrade (+1 Tier) | 1 Feather + 1 Kill Acorns × Tier | ~4 min + 1 Feather | **3–6 %** (der stärkste Craft) |
| Reforge | 1 Ember Coal | ~40 s Coal | 2–5 %, aber nur ~5× pro Run lohnend |
| Gamble (Marisha) | ~6 Kills Acorns | ~3 min | **~0 %** (fast nie besser als das Getragene) |
| Ash-Tree-Respec (100 Punkte) | 8 Kills | **~4 min** | – |
| Ashborn-Reset | 2.000 Acorns fest | ~5 min | – |

Wichtig für die Balance: **Crafting macht das Spiel heute viel leichter.** Der Min-Maxer stirbt in Run 7 im
Schnitt 1,4× statt 5,6×, in Run 5–6 fast nie. Die Act-Balance (Versuche pro Act) ist ohne Crafting gemessen.
Billiges Min-Maxing hebelt also die Wände aus; Timos Regel „Wände durch Min-Maxing“ braucht Min-Maxing, das
Zeit kostet.

## Was daran schadet

1. **Ash ist bedeutungslos.** Selbst der Min-Maxer gibt ab Run 4 nur 15–25 % aus. Temper ist die einzige große
   Senke und kostet pro Item immer gleich wenig, also ist nach ein paar Camp-Besuchen jedes Item fertig.
2. **Ember Coal hat fast keinen Bedarf.** Reforge würfelt alle Werte neu und lohnt sich nur bei schlechten
   Items; 2 % der Coal werden je ausgegeben. 1.100+ Coal am Ende sind eine tote Zahl im UI.
3. **Respecs sind ein Klick.** 8 Kills für 100 Skill Points, egal wie viel investiert ist. Der Build ist keine
   Entscheidung, sondern ein Vorschlag.
4. **Marisha (Camp-Gamble) ist eine tote Taste**, seit ihre Odds auf Karten-Niveau sind (E3c). Sie frisst
   Acorns und bringt fast nie etwas.
5. **Tier Upgrade ist zu billig für seinen Nutzen.** Der Feather ist knapp (gut), aber der Acorn-Teil ist
   Kleingeld; das stärkste Werkzeug im Spiel kostet ein paar Minuten.

## Vorschlag

Leitregeln (so würde ich die Economy führen):

- **Jede Währung hat eine Aufgabe.** Acorns = Entscheidungen (Respec, Upgrade, Draught, Runes, Marisha),
  Ash = Feinschliff (Temper, Socket, Crucible), Ember Coal = Reforge und Kindle, Feathers = Tier.
- **Preis = Nutzen, gemessen in Minuten Einkommen.** Kleine Verbesserung = Minuten, große = Viertelstunden.
- **Ziel:** Der Min-Maxer gibt ab Run 3 **70–90 %** jeder Währung aus, das Wallet am Ende eines Runs ist nie
  mehr als ~1 h Einkommen. Ein normaler Spieler hat dann etwas Polster, aber keine toten Zahlen.
- Alles bleibt in „Kills auf Level“ (`killPrice`), damit Einkommen und Preis mit dem Level mitwachsen.

**W1 Respec nach investierten Punkten** (Timo): Preis = investierte Punkte × Kills pro Punkt, auf dem Boss-Level
des Runs. Einzelnes Vergessen kostet dasselbe pro Punkt (kein Rabatt für den Komplett-Respec).

| System | Punkte max | Kills pro Punkt | Komplett-Respec Run 7 | ≈ Einkommen |
|---|---|---|---|---|
| Ash Tree | ~100 | 1 | ~18.000 Acorns | ~45 min |
| Heirloom (Mastery) | 20 | 4 | ~14.500 | ~35 min |
| Attribute | ~20 | 4 | ~14.500 | ~35 min |
| Ashborn | bis 100 | 1 (Level 100) | bis ~20.000 | bis ~50 min |
| Capstone-Wechsel | – | 5 Kills fest | ~900 | ~2 min |

Früh bleibt es billig, weil wenig investiert ist (Run 1, ~15 Ash-Tree-Punkte: ~15 Kills ≈ 12 min).

**W2 Temper wird pro Item teurer** (wie Enchant in Diablo 3): der n-te Temper auf demselben Item kostet
n × 4 Kills Ash (Acorns fallen weg, Temper ist Ash-Arbeit). Der 1. Temper ist billiger als heute, ein perfekt
gerolltes Item kostet viel Ash. So wird Ash nie wertlos, und Min-Maxing kostet Zeit. Der Zähler gehört zum Item
(Save-Bump).

**W3 Tier Upgrade wird teuer:** 1 Feather + Acorns von **3 Kills × neues Tier** auf dem Item Level (T10: 30 Kills
≈ 14 min). Feathers bleiben die Grenze, Acorns machen es zur Entscheidung, welches Item hochgeht.

**W4 Ember Coal auf Bedarf schrumpfen:** Bosse 4–6 → **1–2**, Elites 1–2 → **1 zu 30 %**, normale Gegner keine
mehr; Bounty-Caches bleiben. Ziel ~40–60 Coal pro Run spät statt 250. Dazu wird auch Reforge pro Item teurer
(n-ter Reforge = n Coal), damit Würfeln auf ein perfektes Item eine echte Wette bleibt.

**W5 Ash-Zufluss kalibrieren:** nach W2 so einstellen, dass der Min-Maxer in Run 7 70–90 % ausgibt. Erster
Hebel ist die Ash pro Kill (heute ~ein Drittel der Ash), Salvage bleibt (Loot → Crafting ist das gute Gefühl).

**W6 Marisha (Timo 03.11.2026: so gewählt):** heute wertlos. Neu: sie würfelt wie die **Karte eines
Elites** (statt eines normalen Gegners) auf dem höchsten Item Level des Acts, Preis ~10 Kills, **Vorrat 3 pro
Camp-Besuch**. Dann ist sie eine echte, begrenzte Acorn-Senke und schlägt die Kämpfe trotzdem nicht.

**W7 bleibt:** Phoenix Feathers (knapp, 60–100 % genutzt), Runes (~100 %), Cinderglass (~100 %), Draught-Preis.

**W8 Messen:** nach dem Umbau Economy und Act-Balance **mit Min-Maxer** neu messen (`--craft 1`). Erwartung:
mehr Tode als heute mit Crafting, weil Perfektion nicht mehr gratis ist, aber weniger als ohne Crafting. Falls
die Wände dann zu hart werden, ist das ein Signal für die Act-Balance, nicht für die Preise.

## Nicht gemessen

Kindle (der Autopilot kindelt nicht), echte Spieler-Gewohnheiten (Playtest), Hunts-Acorns (klein).

## Umgesetzt und neu gemessen (03.11.2026)

Timo hat W1–W8 freigegeben („Passt“). Umgesetzt wie oben, plus bei W5 ein anderer Hebel als geplant:

- **W5 Ash:** Ash pro Kill ist zugleich die Preis-Einheit (`killPrice`), sie zu senken senkt also auch alle
  Preise. Die eigentliche Ursache der Flut war Salvage: Ash pro Item verdoppelte sich je Rarity
  (2/4/8/16/32 × Tier), und spät ist fast alles Epic/Legendary. Neu **2/3/4/6/8 × Tier**.
- **W4 nachgeschärft:** Elites geben Ember Coal nur noch zu **15 %**, der Elite-Hunt-Bounty **2–3** statt 4–6,
  der n-te Reforge kostet **2 × n** Coal.

Min-Maxer (`--craft 1`), 6 Builds × Seeds 31/32, Mittel. „vorher“ = mit W1–W4 und W6, aber vor W5 (auf main lagen nach Run 7 sogar 169.000 Ash und 1.127 Coal im Wallet):

| | vorher | nachher |
|---|---|---|
| Ash ausgegeben Run 4 / 5 / 6 / 7 | 57 / 53 / 45 / 33 % | 70 / 63 / 43 / 60 % |
| Ash im Wallet nach Run 7 | 1.286 Kills (~4 h Einkommen) | 651 Kills |
| Ember Coal ausgegeben Run 7 | 49 % (vor W4: 2 %) | 97 % |
| Ember Coal im Wallet nach Run 7 | 371 (vor W4: 1.127) | 176 |
| Acorns ausgegeben Run 4–7 | 68–112 % | 71–109 % |
| Acorns im Wallet nach Run 7 | 59 Kills | 80 Kills |
| Feathers ausgegeben Run 4–7 | 62–93 % | 52–86 % |
| Tode Run 1–7 (Summe) | 4,9 | 3,3 |
| Spielzeit Run 1–7 | 667 min | 665 min |

Urteil: Acorns, Feathers, Runes, Cinderglass und jetzt Ember Coal werden ausgegeben. Ash liegt im Mittel
knapp unter dem Ziel (Run 6–7: 43–60 % statt 70–90 %), der Überschuss ist aber halbiert; im Wildfire wächst
er langsam weiter (~900 Kills nach Wildfire X), dort ist Temper die offene Senke. Die Tode schwanken mit nur
12 Spielen stark; die Act-Balance wird weiter ohne Crafting gemessen.

Offen: Messung auf dem Boon-Umbau (Thread „Boon-Auswahl verbessern“) wiederholen, wenn beide PRs gemerged sind.

## Nachtrag: Upgrade kostet auch Ash (Timo 03.11.2026)

Nach Run 7 lagen noch 58.000 Ash (~3 h Einkommen) herum, weil Temper die einzige echte Senke war. Timo
wählte: **Tier Upgrade = 1 Feather + Acorns von 3 Kills × neues Tier + Ash von 4 Kills × neues Tier.**

Min-Maxer, gleiche 12 Spiele:

| | ohne Upgrade-Ash | mit Upgrade-Ash |
|---|---|---|
| Ash ausgegeben Run 4 / 5 / 6 / 7 | 70 / 63 / 43 / 60 % | 84 / 99 / 87 / 99 % |
| Ash im Wallet nach Run 7 | 58.554 (651 Kills) | 10.063 (112 Kills, ~30 min Einkommen) |
| Upgrades pro Run 4–7 | 11–17 | 12–15 |
| Tode Run 1–7 (Summe) | 3,3 | 5,0 |

Damit trifft Ash das Ziel (70–90 %+, Rest unter 1 h). Salvage musste nicht weiter sinken. Offen: In
Wildfire VIII–X wächst Ash wieder (Rest ~600 Kills nach Wildfire X), vermutlich weil die Items dort weitgehend ausgebaut sind (nicht einzeln geprüft); das ist
der Endgame-Grind und kein Release-Blocker. Die Tode schwanken mit 12 Spielen um ±1.
