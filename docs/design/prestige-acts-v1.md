# Prestige schaltet Acts frei (Vorschlag v1)

**Stand:** 02.10.2026 · **Status:** ✅ angenommen von Timo (02.10.2026), mit Claudes Defaults: Ascension für 8–10, The Harvest als Szene, Trigger Codex · Thread "Prestige-Alternativen"
Idee von Timo, ausgearbeitet von Claude. Ersetzt bei Annahme die Abschnitte *Prestige*, *Zählweise* und *Level-Band* im GDD.

---

## 1. Kurzfassung

Die Welt wächst mit jedem Prestige. Im ersten Durchgang gibt es nur Act 1. Fällt Gorrak, kommt der Ashen Harvester und verbrennt alles (Prestige 1). Danach beginnt man wieder in Act 1, aber hinter Gorrak geht es jetzt weiter nach Act 2. Jeder Durchgang ist **einen Act länger** als der vorige, bis in Durchgang 7 die ganze Welt offen ist und man dem Harvester zum ersten Mal wirklich gegenübersteht.

Das ist im Kern **Diablo 2 Progression** (Act für Act, später härtere Schwierigkeit), mit dem Prestige als Taktgeber obendrauf.

## 2. Warum das das Problem anpackt

Das Problem heute: Nach dem Prestige stehen 9 von 10 Slots leer, und vor einem liegen 100 Stages mit höherem Monsterlevel. Der Verlust ist riesig und der Weg zurück lang.

Mit freigeschalteten Acts:
- **Der Verlust ist proportional.** Nach Durchgang 1 verliert man 15 Stages Gear, nicht 100. Der erste Reset tut fast nicht weh und lehrt das System.
- **Bekannte Acts sind die Regear-Strecke.** Die alten Acts kommen vor dem neuen Act und dienen als Rampe: Man kennt Gegner und Boss, sammelt Loot auf aktuellem Item Level und ist beim neuen Act wieder ausgerüstet.
- **Die Front ist immer nur ein Act.** Wirklich unbekannt und schwer ist nur der neue Act am Ende. Das gibt jedem Durchgang ein klares Ziel ("diesmal Rotwood").
- **Schneller Einstieg.** Das erste Prestige kommt nach ca. einer Stunde statt nach 100 Stages. Spieler sehen das Kernsystem früh.

**Ehrlicher Hinweis:** Die Act-Freischaltung allein heilt das "nackt nach dem Prestige" nicht. Der PoC spielt sich heute schon wie Durchgang 1 dieses Modells (Prestige nach Gorrak), und gerade der Wiedereinstieg in Act 1 war schwer. Der entscheidende Hebel ist der **Startpunkt der Level-Kurve** (Abschnitt 4): Jeder Durchgang beginnt deutlich unter dem Level des Helden.

## 3. Ablauf der Durchgänge

| Durchgang | Acts | Stages | Ende des Durchgangs |
| --- | --- | --- | --- |
| 1 | 1 | 15 | Gorrak fällt → The Harvest (Szene) → Prestige 1 |
| 2 | 1–2 | 30 | Mother of Rot fällt → The Harvest → Prestige 2 |
| 3 | 1–3 | 45 | Cinder Tyrant → Prestige 3 |
| 4 | 1–4 | 60 | Rime Warden → Prestige 4 |
| 5 | 1–5 | 75 | Storm Herald → Prestige 5 |
| 6 | 1–6 | 90 | Voidborn Maw → Prestige 6 |
| 7 | 1–7 | 100 | **Erster echter Kampf gegen den Ashen Harvester** → Prestige 7 |
| 8–10 | 1–7 | je 100 | **Ascension:** ganze Welt, höheres Level-Band, Harvester mit neuer Form → Prestige 8–10 |

Danach wie bisher das Finale **The Last Ember** mit allen 10 Seals.

- **Gesamtlänge:** ca. 715 Stages bis zum Finale (heute 1000). Kürzer am Anfang, gleich lang am Ende.
- **Ascension (8–10)** ist das D2-Gegenstück zu Nightmare/Hell: dieselbe Welt, härter, mit den besten Drops (Legendary, Uniques, hohe Item Tiers). Hier wird gefarmt.

### The Harvest (Durchgänge 1–6)
- Fällt der Boss des neuesten Acts, erscheint der Harvester. Kurze Szene, kein Kampf: Er erntet die Glut, alles brennt, der Heir erwacht bei Old Nan.
- Der Heir reißt dabei eine Glut an sich: **+1 Harvester's Ember** wie bisher.
- Wie bisher Pflicht und ohne Warnung: Wer noch farmen will, macht vorher Retreat oder Revisit Act.
- Story: Der Harvester erntet, sobald die Glut reif ist. Jedes Mal kommt der Heir weiter, bevor er ihn einholt. In Durchgang 7 ist der Heir zum ersten Mal stark genug, ihn am Ende der Welt zu stellen.

### Was jedes Prestige weiter bringt (unverändert)
+1 Seal, +1 Harvester's Ember, +1 Skill-Tree-Ast, +1 Battle-Plan-Upgrade, Salvage Dust, Level Cap +20. **Neu:** +1 Act (bis Durchgang 7).

## 4. Level-Kurve: der eigentliche Fix

**Regel 💡:** Das Monsterlevel steigt über **alle Stages des Durchgangs gleichmäßig** vom Startlevel bis zum neuen Level Cap.
- **Startlevel** = Level Cap des vorigen Durchgangs **− 10**. Die ersten Stages sind damit klar unter dem Helden: Level, Attribute und Skill Tree tragen, das Gear wächst nach.
- **Endlevel** = neues Level Cap (+20 pro Prestige, bleibt wie entschieden), erreicht am Boss des neuesten Acts.

| Durchgang | Held startet mit | Act 1 Stage 1 | Boss am Ende |
| --- | --- | --- | --- |
| 1 | Level 1 | 1 | Gorrak, Level 20 |
| 2 | Level 20 | 10 | Mother of Rot, Level 40 |
| 4 | Level 60 | 50 | Rime Warden, Level 80 |
| 7 | Level 120 | 110 | Harvester, Level 140 |
| 10 | Level 180 | 170 | Harvester, Level 200 |

Damit sind alte Acts nie trivial (sie skalieren mit), geben XP und Loot auf aktuellem Item Level, und die ersten 3–5 Stages sind ein bewusst leichtes Regear-Fenster. Das ersetzt die bisherige Regel "Act 1 knapp unter dem alten Cap, Acts 2–7 im neuen Band".

**Dazu:** Rarity nach Act-Stufe (Act + Prestige) bleibt. In Durchgang 2 droppt Act 1 damit schon Rare, ab Durchgang 3 Epic. Das beschleunigt das Regear genau dort, wo es fehlt.

## 5. Trigger Codex

Der einfache Affix Codex war zu flach. Ersetzt durch den **Trigger Codex**: Conditions und Effects einzeln sammeln, mit Mastery pro Item Tier, gezielt farmen über Heimat-Acts und Quarry. Details: `trigger-codex-v1.md`.

## 6. Was sich an bestehenden Entscheidungen ändert

| Bisher | Neu |
| --- | --- |
| Jeder Durchgang = 100 Stages | Durchgang n = n Acts (bis 7), danach 100 |
| Prestige nach Harvester-Sieg | Durchgänge 1–6: nach dem Boss des neuesten Acts; ab 7: nach Harvester-Sieg |
| Act 1 Level knapp unter altem Cap, Acts 2–7 im neuen Band | Ein Band pro Durchgang, gleichmäßig über alle Stages, Start = altes Cap − 10 |
| Jedes Prestige gibt jedem Boss eine neue Fähigkeit | Bleibt. Neue Acts kommen ohne Extra-Fähigkeit, ältere Bosse haben dann schon welche |
| Finale nach 10 Prestiges | Bleibt |

Bleibt unverändert: 10 Slots = 10 Seals, Stash brennt, Level und Punkte bleiben, Cap 20/+20, Death Rule, Retreat/Revisit Act, Keystones über Harvester's Ember.

**Für die Umsetzung (Roadmap M7–M10):** Der PoC prestigiert schon nach Gorrak. Neu wäre: Acts hinter dem Prestige-Zähler sperren, das Level-Band nach Abschnitt 4 rechnen und The Harvest als Szene nach dem Boss des neuesten Acts. M10 (Harvester + volles Prestige) wird eher kleiner, M7 (Act 2) muss die Sperre kennen.

## 7. Alternativen (outside the box)

**A. Harvester's Wound.** Der Harvester ist ab Durchgang 1 ein echter Kampf, den man nicht gewinnen muss: Man kämpft, bis man stirbt oder er flieht, und der Schaden bleibt. Seine Life-Leiste ist über alle Durchgänge **persistent**. Jeder Durchgang ritzt eine Wunde, beim 10. Mal fällt er. Kombinierbar mit der Act-Freischaltung (statt Szene ein Kampf). Risiko: schwer zu balancen, weil starke Spieler ihn zu früh töten könnten (Lösung: Schaden pro Durchgang gedeckelt).

**B. Ember Capacity statt fester Seals.** Statt "1 Slot pro Prestige" bekommt man **Kapazität**: Normal kostet 1, Magic 2, Rare 3, Epic 4, Legendary 5. Früh kann man z. B. drei Magic Items oder ein Rare retten, später alles. Mehr Entscheidungen beim Prestige, Endziel bleibt "alles gesichert". Risiko: komplexer zu erklären, kollidiert mit der Regel "minimaler Text".

**C. 7 statt 10 Durchgänge.** Act-Freischaltung ohne Ascension: Die Prestiges 5–7 geben je 2 Seals, Finale nach Durchgang 7. Kürzeres Spiel (415 Stages), aber weniger D2-Farmphase und weniger Prestige-Belohnungen (Äste, Battle Plan) zu verteilen.

## 8. Empfehlung

Timos Konzept annehmen, mit **Ascension für 8–10**, der **Level-Kurve aus Abschnitt 4** und dem **Trigger Codex**. Alternative A als Idee für später notieren: Sie macht den Harvester zum roten Faden, ist aber kein Muss.

### Offene Fragen an Timo
1. Durchgänge 8–10 als Ascension (Empfehlung) oder 7 Durchgänge mit Doppel-Seals (C)?
2. The Harvest in 1–6 als Szene (Empfehlung) oder als Kampf mit persistenter Wunde (A)?
3. Trigger Codex mit aufnehmen? (siehe `trigger-codex-v1.md`)
