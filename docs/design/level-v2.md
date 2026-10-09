# Level v2: Level als Farm-Hebel, Skill Points aus Fortschritt

Stand: 09.10.2026 (v1.2, von Timo angenommen, umgesetzt), Thread "Level und Skillpunkte trennen".
Spielbegriffe englisch, Erklärungen deutsch. Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen

Baut auf: `attribute-v1.md` (Attribute kommen nicht mehr aus dem Level ✅), `waffe-als-system-v1.md` und
`weapon-mastery-baeume-v1.md` (Weapon Rank, Mastery Points), `prestige-acts-v1.md` (Durchgänge, Level-Band).
Ersetzt bei Annahme: GDD Abschnitt "Level", Level Cap aus Playtest 2 (5 pro Act, 140), Skill Points pro Level,
Aufbau des Grundbaums aus `skilltree-v2.md` (Netz statt Äste).

---

## 1. Problem heute

| Heute (Code, 08.10.2026) | Folge |
|---|---|
| Level Cap = 5 × gespielte Acts: **5, 15, 30, 50, 75, 105, 140** | krumme Zahlen, weil die Durchgänge ungleich lang sind und 1 Level = 1 Skill Point sein soll |
| Level Cap = **Monster Level des Bosses** | man kann den Boss **nicht überleveln**. Farmen vor einer Wand bringt höchstens die paar Level bis zum Cap |
| Level gibt: 1 Skill Point, 2 Attributpunkte, **+12 Life flach** | bei Level 100 sind +12 Life unter 1 %. Das Level selbst macht fast nicht stärker |
| Weapon Damage wächst in **Rank-Sprüngen** (21 Stufen) | dazwischen bringen Level keinen Schaden |
| Monster werden pro Monster Level **8–20 % stärker** (früh), später ca. 3 % | ein Level Vorsprung des Helden gleicht kaum etwas aus |

Kurz: Das Level ist heute **Zähler für Skill Points**, nicht Kraft. Darum kann es keine Wand brechen.

## 2. Leitidee 💡

**Drei Fortschritts-Spuren mit je einer klaren Aufgabe.**

| Spur | Woher | Was sie bringt | Gefühl |
|---|---|---|---|
| **Level** | XP, also **Farmen** | Life und Damage, sonst nichts | "Farmen bringt immer was", der sichere Hebel gegen eine Wand (D3 Paragon) |
| **Skill Points, Mastery Points, Attribute** | **Fortschritt** (Acts, Durchgänge, Prestige) | Build, Entscheidungen | "Ich komme weiter, mein Build wächst" |
| **Gear** | Loot | Build und Kraft | der Glücks-Hebel |

Wer an einer Wand hängt, hat also zwei Hebel: **sicher, aber langsam** über das Level, **schnell, aber Glückssache** über Gear.
Der Build selbst (Punkte) wächst nur, wenn man vorankommt. So bleibt der Baum planbar und das Level darf frei wachsen.

## 3. Was das Level braucht, damit es eine Wand bricht

Fünf Bedingungen. Heute ist keine davon ganz erfüllt.

1. **Luft über der Wand.** Das Level Cap muss **über** dem Monster Level des Bosses liegen. Heute ist es gleich hoch.
   → Cap = Boss-Level **+ 10** (Abschnitt 4).
2. **Spürbare Kraft pro Level, unabhängig vom Build.** Jedes Level muss Life **und** Damage geben, und zwar prozentual,
   damit es auch bei Level 80 zählt. Ziel: **+5 Level Vorsprung ≈ +40 % Kampfkraft** (Abschnitt 5).
3. **Gegner skalieren nie mit dem Helden.** Monster Level hängt nur an Stage und Durchgang (ist heute schon so ✅).
   Kein Level-Scaling der Gegner wie in Oblivion, sonst ist Farmen sinnlos.
4. **XP fließt an der Wand.** Die Stages vor dem Boss müssen genug XP geben, auch wenn man schon etwas drüber ist.
   Ziel: **+5 Level an einer Wand in ca. 30–40 Minuten** Farmen (Abschnitt 6). Tod kostet keine XP (wie heute ✅).
5. **Man sieht den Abstand.** Level des Helden und des Gegners nebeneinander, farbig (D2-Stil): rot = Gegner deutlich
   drüber, weiß = gleich, grau = darunter. Der Spieler merkt, dass er "noch 3 Level" braucht, ohne Text (Abschnitt 9).

## 4. Max Level 100 und Level Cap pro Durchgang ✅ (Timo, 08.10.2026)

**Max Level: 100.** Rund, und das Level hängt nicht mehr an der Zahl der Skill Points.

Das Monster Level des Bosses am Ende jedes Durchgangs bekommt ebenfalls runde Zahlen. Das Level Cap liegt immer
**10 Level darüber**. Diese 10 Level sind der Farm-Puffer.

| Durchgang | Acts | Monster Level (Band) | **Boss** | **Level Cap** |
|---|---|---|---|---|
| 1 | 1 | 1–10 | Gorrak **10** | **20** |
| 2 | 2 | 10–20 | Mother of Rot **20** | **30** |
| 3 | 3 | 20–30 | **30** | **40** |
| 4 | 4 | 30–45 | **45** | **55** |
| 5 | 5 | 45–60 | **60** | **70** |
| 6 | 6 | 60–75 | **75** | **85** |
| 7 | 7 | 75–90 | Harvester **90** | **100** |

- Wer normal durchspielt, steht am Boss etwa auf **Boss-Level** (wie heute: "ein paar Level darunter oder gleich").
- Wer an einer Wand hängt, kann bis zu **10 Level** drüber farmen. Das ist der Paragon-Gedanke, mit Deckel pro Durchgang,
  damit man den Durchgang nicht komplett trivialisiert.
- Start-Band eines Durchgangs = Boss-Level des vorigen (wie heute). Das Regear-Fenster am Anfang bleibt.
- **The Last Ember** gibt keine Level (wie entschieden). Wer dort hängt, farmt Act 7 bis Level 100.

Die genaue Kraftkurve der Monster pro Level (`monsterLevelScaling`) wird für 1–90 neu gerechnet und mit der Balance-CLI
eingestellt. Die Zahlen im Band sind nur Beschriftung, die Härte kommt aus der Kurve und der Run Pressure.

## 5. Was ein Level gibt 💡

Nur noch zwei Dinge, dafür spürbar:

| pro Level | Wert (Startwert für die Balance-CLI) | Level 1 → 100 |
|---|---|---|
| **Base Life** | **×1,04** (also +4 %, multiplikativ) | 100 → ca. 4.800 |
| **Weapon Damage** | **×1,03** (+3 %, multiplikativ) | ×19 |

- Zusammen ca. **+7 % Kampfkraft pro Level**. 5 Level Vorsprung = 1,07⁵ ≈ **+40 %**. Das reicht für eine Wand, an der man
  knapp verliert (Boss hat noch ein Viertel Life). Eine Wand, an der man nach der Hälfte stirbt, braucht dazu Gear.
- **Monster wachsen pro Monster Level etwas schneller** (Richtwert ca. +9 % Kampfkraft). Wer nur levelt und nie Gear
  wechselt, fällt also langsam zurück. Das Level ist Puffer, nicht Ersatz für den Build.
- Prozentual statt flach, damit Life aus Level, aus Vitality (+6 %/Punkt, `attribute-v1.md`) und aus Gear sauber
  zusammenspielen.
- Kein Skill Point, kein Attributpunkt.

**Weapon Damage pro Level statt pro Rank** ✅ (Timo, 08.10.2026): Heute steigt Weapon Damage in Rank-Sprüngen (Timo: "Weapon Damage auto
per Rank"). Neu: Der Schaden wächst **gleichmäßig mit dem Level**, der **Weapon Rank** bringt weiter
**Mastery Points und Güte** (Crude → Exalted). Grund: Sonst bringen die 10 Farm-Level über der Wand keinen Schaden, und das
"jedes Level zählt"-Gefühl fehlt zwischen den Ranks. Für den Spieler ändert sich fast nichts: Die Waffe wird mit dem
Helden stärker, die Güte springt wie bisher.

**Weapon Rank** bleibt an den Fortschritt gebunden: **Rank Cap pro Durchgang 4 / 7 / 10 / 13 / 16 / 18 / 20** wie
entschieden. Die Rank-Tabelle wird auf die neuen Boss-Level gelegt (Rank 4 bei Level 10, Rank 20 bei Level 90). Über
der Wand farmen gibt also mehr Schaden, aber keine extra Mastery Points.

## 6. XP-Kurve 💡

- Wie heute: ca. **8 Kämpfe pro Level** auf gleichem Monster Level, Elites ×3, Bosse ×6.
- **Über dem Gegner:** −10 % XP pro Level, mindestens 10 % (wie heute). An einer Wand bedeutet das grob:
  Level +1 ≈ 9 Kämpfe, +3 ≈ 11, +5 ≈ 16. **+5 Level ≈ 50 Kämpfe ≈ 30–40 Minuten.** Das ist "mehr farmen", aber kein Grind.
- **Unter dem Gegner:** +5 % pro Level, höchstens doppelt (wie heute). Wer zurückliegt, holt schnell auf.
- Am Level Cap ist die XP-Leiste voll und glüht, XP verfällt (kein Speichern auf Vorrat).

## 7. Skill Points: woher, und wie viele ✅ Waymarks (Timo, 08.10.2026)

### Woher: genau 100 Punkte ✅ (Timo, 08.10.2026)

Skill Points kommen aus **Fortschritt**, nicht aus XP. Drei Quellen, zusammen genau **100**:

| Quelle | Punkte | Wann |
|---|---|---|
| **Start** | 2 | Innate-Skill gleich ausbauen, erste Node |
| **Waymark** ✅ | 28 × 3 = **84** | **erster Sieg auf Stage 5, 10 und 15** (Boss) eines Acts, **in jedem Durchgang** neu. Die Karawane schlägt dort ein Zeichen in den Boden, kurzer Funken-Moment |
| **The Harvest** | 7 × 2 = **14** | jedes Prestige, zusammen mit den 2 Attributpunkten (`attribute-v1.md`). Das Prestige wird damit der große Build-Moment |

- 28 = alle Acts aller Durchgänge (1 + 2 + … + 7). Alte Acts zählen in jedem Durchgang neu, die Regear-Strecke bringt
  also auch Punkte.
- Farmen (Revisit Act, Retreat, Wiederholen nach einem Tod) gibt **keine** Punkte. Die Menge ist fest und planbar.

| nach Durchgang | 1 | 2 | 3 | 4 | 5 | 6 | 7 (Finale) |
|---|---|---|---|---|---|---|---|
| Skill Points | 7 | 15 | 26 | 40 | 57 | 77 | **100** |

### Der Baum wird viel größer als das Budget ✅ (Richtung Path of Exile, Timo 08.10.2026)

**Ziel:** Mit 100 Punkten bekommt man am Ende **etwa 35–40 % des Baums**. Zwei Spieler derselben Klasse teilen am Ende
**weniger als die Hälfte** ihrer Nodes. Heute ist es umgekehrt: Senke ca. 180 bei 140 Punkten, man hat fast alles.

| | Heute | Neu |
|---|---|---|
| Skill Points am Ende | 140 | **100** |
| Senke pro Klasse | ca. 180 | **ca. 260** (Netz ca. 180 + 4 Klassenpfade ca. 76) |
| Anteil, den man bekommt | ca. 75 % | **ca. 38 %** |

Die Senke allein reicht nicht. Ein großer Baum mit einem offensichtlich besten Weg führt wieder zum gleichen Build. Darum
bekommt der Baum Struktur, die echte Entscheidungen erzwingt:

1. **Ein Netz statt vier Äste.** Might, Arcana, Rupture und Affliction werden **Regionen** auf einem Ring und gehen
   über **Brücken-Regionen** ineinander über (z. B. Might + Rupture = Crit und Bleed, Arcana + Affliction = Elemental
   Ailments). Hybrid-Builds entstehen damit im Baum und nicht nur über Gear.
2. **Jede Klasse hat ihren eigenen Startpunkt** auf dem Ring (wie in PoE): Warrior bei Might, Sorcerer bei Arcana,
   Reaver zwischen Might und Rupture, Hunter zwischen Rupture und Might auf der Fernkampf-Seite, Warlock bei Affliction.
   Alles ist erreichbar, aber weit weg kostet Weg.
3. **Wege kosten Punkte.** Nodes sind nur über Nachbarn erreichbar. Kleine **Weg-Nodes** (+4 % von etwas) verbinden die
   Cluster. Ein Cluster auf der anderen Seite des Rings kostet einige Punkte Anreise. Das ist die Kern-Entscheidung von PoE:
   tief in der eigenen Region oder weit reisen für ein starkes Notable.
4. **Cluster mit Notable-Spitze.** Ca. **24 Cluster** à 3–5 Punkte, jeder endet in einem Notable, das den Spielstil ändert
   (z. B. "Bleeds explodieren beim Tod", "Chill stapelt bis Freeze"). Mit 100 Punkten erreicht man **10–12 davon**.
5. **Gabelungen.** An ca. **8 Stellen** stehen zwei Notables nebeneinander, man kann nur **eins** davon lernen
   (z. B. *Bloodlust*: Bleed länger **oder** *Hemorrhage*: Bleed stärker, aber kürzer). Gleicher Weg, anderer Build.
6. **Mehr Skills im Baum, als der Battle Plan fasst.** Ca. 18 Skill-Nodes, der Battle Plan nutzt am Ende höchstens
   4 Rotation + 2 Reaction. Welche Skills man lernt, ist schon eine Build-Entscheidung.
7. **Keystones:** ca. 12 im Netz + 1 pro Klassenpfad. Man hat nur **7 Harvester's Ember** ✅, also höchstens 7 Keystones,
   und die liegen weit auseinander.
8. **Klassenpfade (Prestige)** bleiben wie in `klassen-v2.md`: 4 Pfade × 3 Stufen = 12 Schritte, man macht 7. Kosten
   neu **8 / 5 / 6** Skill Points. Typisch fließen **40–50 Punkte** in Pfade und **50–60** ins Netz. Wer tief in einen
   Pfad geht, hat weniger fürs Netz, und umgekehrt.

**Weniger Füllmaterial:** Flache Life-Minors fallen weg, Life kommt jetzt vom Level und von Vitality. Weg-Nodes und
Minors geben Prozente, die zu ihrer Region passen.

**Zusammen mit den anderen Spuren:** Gleiche Klasse, aber anderer Startpunkt im Netz, andere Gabelungen, andere
7 Keystones, anderer Weapon-Mastery-Keystone (1 aus einem Ring), andere Heat Form, andere Attribut-Breakpoints. Das ergibt
für dieselbe Klasse sehr unterschiedliche Helden.

**Prüfung mit der Balance-CLI:** Pro Klasse mindestens **3 deutlich verschiedene Autopilot-Builds** (aus
`notes/build-archetypen.md`), die alle den Harvester schaffen. Schafft es nur einer, hat der Baum einen "besten Weg"
und wird nachgebessert.

**Respec:** siehe Leitplanken unten.

**UI:** Der zoombare Pixi-Baum (Skill Tree v2) trägt das Netz. Neu nötig: **Pfad-Vorschau beim Hover** (zeigt den Weg und
was er kostet) und gesperrte Gabelungs-Partner als zerbrochenes Siegel. Lernen bleibt ein Funkenstoß entlang der Linie.

### Leitplanken: groß wie PoE, Spielgefühl wie Diablo ✅ (Timo, 08.10.2026)

Der Baum schafft Möglichkeiten und Entscheidungen. Er hält nicht die Hand, und ein schwacher Baum darf sich auch
schwach anfühlen. Regeln für den Bau der Inhalte:

1. **Meist kurze Wege, vereinzelt weite.** Normale Cluster liegen 1–3 Punkte auseinander. Einige starke Ziele (vor allem
   Keystones und besondere Notables) liegen bewusst **weit draußen**, 6–10 Punkte Anreise. Die Frage
   "Nehme ich den weiten Weg für den Keystone in Kauf?" ist gewollt.
2. **Keine leeren Nodes.** Weg-Nodes geben immer einen kleinen, passenden Bonus. Nachteile gibt es nur bei Keystones.
3. **Gabelungen sind echte Entscheidungen:** zwei unterschiedliche Spielweisen, keine offensichtlich richtige Seite.
4. **Fehler kosten.** Ein schwacher Baum ist schwächer, dafür gibt es Respec:
   - Respec beim Trainer gegen **Gold, mäßig teuer**: einzelne Nodes oder alles, Preis wächst mit dem Durchgang
     (Startwert: alles zurücksetzen ≈ Gold aus einem halben Act). Auch Gabelungen lassen sich so umstellen.
   - Ein Prestige-Schritt (Klassenpfad) bleibt permanent, die Punkte darin nicht (wie `skilltree-v2.md`).
5. **Keine Führung.** Kein Glimmen für empfohlene Nodes, kein geführter Anfang. Die Klasse startet an ihrem Punkt im
   Netz, der Rest ist offen. Die Pfad-Vorschau beim Hover zeigt nur Weg und Kosten.

## 8. Alle Spuren zusammen

| | Heute (Ende) | Neu (Ende) | Quelle neu |
|---|---|---|---|
| Max Level | 140 | **100** ✅ | XP |
| Skill Points | 140 | **100** | Start, Waymarks, The Harvest |
| Attributpunkte | ca. 314 | **ca. 34** ✅ | Erstellung + The Harvest |
| Mastery Points | 20 | 20 ✅ | Weapon Rank (Fortschritt) |

Das Level ist der eine Balken, der beim Farmen immer läuft. Alles, was den Build formt, kommt aus Fortschritt, und es ist
immer deutlich weniger da, als man nehmen könnte.

## 9. UI und Look 💡

- **Level-Up** bleibt ein Moment: Glutring um den Otter, Life Orb füllt sich sichtbar höher (Base Life wächst), kurzer
  Funkenregen an der Waffe. Kein Punkte-Badge mehr, weil das Level keine Punkte gibt.
- **Waymark:** eigenes Symbol auf der Act-Karte (3 pro Act, leer / glühend). Neuer Skill Point = Badge bei Kaelen wie heute.
- **Gegner-Level** im Enemy Frame neben dem Namen, Farbe nach Abstand zum Helden. Beim Boss zusätzlich ein dezenter
  Glut-Rand, wenn man **drüber** ist ("du bist bereit"), ohne Text.
- **Level Cap des Durchgangs** als Kerbe an der XP-Leiste.
- Arena (PixiJS-Regel): Je weiter man über dem Gegner steht, desto ruhiger und heller die Glut um den Helden; liegt man
  deutlich darunter, flackert sie. Rein visuell, respektiert `prefers-reduced-motion`.

## 10. Bestehende Spielstände 💡

- **Level:** wird auf die neue Skala gelegt, stückweise zwischen alten Caps und neuen Boss-Leveln
  (z. B. alt 15 → neu 20, alt 50 → neu 45, alt 140 → neu 90).
- **Skill Points:** werden aus den schon erreichten Waymarks berechnet (alle Prestiges + aktueller Durchgang).
  Der Baum wird einmal komplett zurückgesetzt (Prestige-Äste und Stufen bleiben, nur die Punkte darin kommen zurück).
- Weapon Rank, Attribute (eigene Migration in `attribute-v1.md`), Items bleiben.

## 11. Alternativen (nicht empfohlen)

- **Skill Points weiter aus Level, 1 pro Level (100 bei Level 100).** Rund, aber Farmen würde wieder den Build
  vergrößern, und das Cap wäre wieder an die Punkte gekoppelt.
- **Vier Äste behalten, nur größer machen.** Mehr Nodes ohne Wegkosten und Gabelungen führen wieder zum gleichen
  "besten" Build, nur später.
- **Kein Cap pro Durchgang, nur 100 global** (wie D3 ohne Deckel). Ein Spieler könnte Durchgang 1 auf Level 40 farmen und
  die nächsten zwei Durchgänge überrollen. Der +10-Deckel hält den Farm-Puffer fair.
- **Echtes Paragon nach Level 100** (endlos kleine Boni). Erst sinnvoll, wenn es einen Endlos-Modus nach dem Finale gibt.
  Als Idee für später notiert.

## 12. Entscheidungen

1. ✅ Max Level 100, Level Cap = Boss-Level + 10 (20, 30, 40, 55, 70, 85, 100).
2. ✅ Weapon Damage pro Level statt pro Rank. Rank gibt weiter Mastery Points und Güte.
3. ✅ Skill Points aus Waymarks statt aus dem Level.
4. ✅ Genau **100 Skill Points**: 2 Start + 84 Waymarks + 14 aus The Harvest.
5. ✅ Skill Tree als **Netz mit Klassen-Startpunkten** statt vier Äste, ca. 260 Punkte Senke, man bekommt ca. 38 %.
6. ✅ **Gabelungen** (zwei Notables, nur eins lernbar).
7. ✅ **Spielgefühl wie Diablo:** keine Führung, meist kurze Wege, vereinzelt weite Wege zu Keystones (6–10 Punkte),
   ein schwacher Baum darf bestrafen, Respec mäßig teuer (Abschnitt 7).
8. 💡 Feinwerte (Life/Damage pro Level, Monster-Kurve, Node-Werte) mit der Balance-CLI bei der Umsetzung.
