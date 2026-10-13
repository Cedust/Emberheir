# Ailments v2: klare Identität, eingebauter Payoff, Ailment Effect statt Duration

Stand 13.10.2026 · ✅ von Timo angenommen (13.10.), noch nichts umgesetzt · gehört zu `neuausrichtung-v1.md`
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen. Zahlen sind Startwerte für die Balance-CLI.

**Timos Fragen (13.10.):** Sind die Ailments cool, macht jedes Spaß, hat jedes eine klare Identität? DoTs brauchen länger
als direkter Schaden: Brauchen wir mehr Burst-Nodes, damit DoT in einem 1v1-Auto-Battler nicht abschreckt? Ist Ailment
Duration als Wert und als Wisdom-Bonus sinnvoll, oder gibt es Besseres?

---

## 1. Wie die Ailments heute rechnen (`packages/sim/src/combat/ailments.ts`)

| Ailment | Schaden / Wirkung | Dauer | Erneut gesetzt | Gesamt pro Treffer |
|---|---|---|---|---|
| **Bleed** (Physical) | 50 % des Treffers pro s | 3 s | frischt auf, **behält den stärkeren** | 150 % |
| **Poison** (Physical) | 17 % des Treffers pro s **pro Stack** | 5 s | **neuer Stack**, bis 20 | 85 % pro Stack |
| **Burn** (Fire) | 25 % pro s, halbiert Heilung des Gegners | 4 s | frischt auf, behält den stärkeren | 100 % |
| **Corruption** (Void) | 10 % pro s, +25 % pro Tick bis ×4 (12 Ticks) | 6 s | frischt auf, **behält das Wachstum** | wächst mit der Zeit |
| **Chill** (Cold) | −30 % Attack Speed und Heat Gain | 2 s | frischt auf | – |
| **Shock** (Lightning) | +20 % erlittener Schaden | 3 s | frischt auf | – |

Payoffs (aus DoT wird sofortiger Schaden), die es schon gibt:

| Ailment | Payoff | Quelle |
|---|---|---|
| Bleed | **Rend** (löst 150 % des Rests ein, heilt 15 %), **Hemorrhage** (Innate Form) | Web, Axe |
| Poison | **Toxic Burst** (verdoppelt, Überlauf platzt), **Toxic Bloom** (Keystone) | Web, Dagger |
| Corruption | **Corrupt** / Void Lance (springen im Wachstum vor) | Web, Staff |
| alle DoTs | **Soul Harvest** (4 s aller DoTs sofort, heilt 25 %) | Web |
| Burn | **keiner** | – |

## 2. Bewertung

### 2.1 Was gut ist

- **Poison** hat eine klare Identität (stapeln, viele Treffer) und mit dem Überlauf seit PR #27 auch ein gutes Ende.
- **Bleed** ist eindeutig: kurz, stark, mag große Treffer. Rend ist ein befriedigender Payoff.
- **Corruption** ist die einzige DoT mit Spannungsbogen („je länger, desto tödlicher“). Das passt perfekt zum Warlock.
- **Chill** und **Shock** sind sauber getrennt: Kontrolle gegen Verstärkung.

### 2.2 Was nicht trägt

1. **Drei DoTs haben dieselbe Form.** Bleed, Burn und Corruption frischen auf und behalten den stärkeren Wert. In einem
   Kampf, in dem man ständig trifft, läuft jede davon einfach dauerhaft mit „x % des besten Treffers pro Sekunde“.
2. **Burn ist ein schwächerer Bleed.** 100 % statt 150 % pro Treffer. Seine Besonderheit (halbe Heilung) zählt nur gegen
   Gegner, die heilen. Und Burn hat als einzige DoT **keinen Payoff**.
3. **Ailment Duration ist für fast alle Builds wertlos.**

   | Ailment | Was mehr Dauer bringt |
   |---|---|
   | Bleed, Burn | nichts, solange man öfter als alle 3–4 s trifft (fast immer) |
   | Corruption | wenig: hält das Wachstum über Lücken, die selten sind |
   | Poison | **mehr Schaden**, aber nur bis zur Stack-Grenze |
   | Chill, Shock | mehr Laufzeit, nur bei niedriger Chance spürbar |

   Trotzdem ist sie der häufigste Wert im Web (19 Nodes), in den Prestige-Ästen (10), auf Items und auf **Wisdom**.
   Für die meisten Spieler sind das Fallen.
4. **DoT fühlt sich in einem 1v1 langsamer an**, auch wenn die Zahlen gleich sind:
   - Der Schaden kommt **nach** dem Treffer. Man sieht kleine Zahlen statt eines großen Treffers.
   - DoT löst **keine Trigger** aus und heilt nicht über Lifesteal (gewollt, aber es fehlt dann Sustain).
   - Corruption braucht 12 s, bis sie stark ist. Bei normalen Kämpfen von 10–15 s kommt sie nie dort an.

## 3. Vorschlag

### 3.1 Jede DoT bekommt eine eigene Form und einen eingebauten Payoff 💡

| Ailment | Identität (ein Satz) | Form | Eingebauter Payoff (für alle, ohne Node) |
|---|---|---|---|
| **Bleed** | „Große Wunden“ | stark, kurz, behält den stärksten Treffer | **Mighty Hits** frischen Bleed mit 150 % auf (siehe `weapon-mastery-v2.md`); Rend bleibt |
| **Poison** | „Tausend Stiche“ | Stacks, skaliert mit Trefferzahl | **Überlauf**: jeder Stack über der Grenze platzt sofort (heute nur mit Toxic Burst, künftig immer) |
| **Burn** | „Glut, die zündet“ | dauerhaft, halbiert Heilung | **Flashpoint** (neu): ein Fire-**Treffer** auf einen brennenden Gegner löst sofort 25 % des restlichen Burns aus, der Burn läuft weiter |
| **Corruption** | „Je länger, desto tödlicher“ | wächst pro Tick | **Collapse** (neu): bei vollem Wachstum bricht sie zusammen, trifft sofort mit 4 s ihres Schadens und fällt auf halbes Wachstum zurück |
| **Chill** | „Kontrolle“ | verlangsamt | **Freeze** (über Rime-Pfad und Nodes): 3 Chills in 6 s frieren 1 s ein |
| **Shock** | „Verstärker“ | mehr erlittener Schaden | Shock **stapelt bis 3** (je +10 %, zusammen +30 %), damit Lightning einen Aufbau hat |

So hat jede DoT einen sichtbaren Moment: Bleed bei Mighty Hits, Poison beim Überlauf, Burn bei jedem Fire-Treffer,
Corruption beim Collapse. Burn wird damit die DoT für **Fire-Hybride** (Sorcerer mit Firebolt, Explosive Bolt), Corruption
bleibt die DoT für **lange Kämpfe** (Warlock).

### 3.2 Mehr Payoffs? Ja, aber gezielt 💡

Timos Gefühl stimmt: DoT braucht Burst-Momente. Neben den eingebauten Payoffs (3.1) bekommt **jede DoT genau einen**
starken Payoff-Skill und einen Payoff-Pfad in der Mastery. Mehr nicht, sonst wird DoT ein Burst-Build mit Umweg.

| Ailment | Payoff-Skill (Web) | Payoff in der Mastery |
|---|---|---|
| Bleed | Rend (bleibt) | Axe Butcher, Bow Barbs (Hooked Rend) |
| Poison | Toxic Burst (bleibt) | Dagger Venom, Bow Toxin (Toxic Cascade) |
| Burn | **Immolate** wird zum Payoff: Fire-Treffer + Flashpoint ×3 | Wand Blaze, Staff Smolder (Pyroclast) |
| Corruption | Corrupt (bleibt, springt im Wachstum) | Staff Hollow (Collapse Deeper) |
| alle | Soul Harvest (bleibt) | – |

Dazu die **Heilung über DoT** aus genau diesen Payoffs (Regel: Lifesteal nur für Treffer, DoT-Heilung nur aus DoT-Nodes ✅).
Jede DoT hat damit eine eigene Sustain-Quelle: Rend, Toxin-Meister, Smother/Siphon, Void Hunger.

### 3.3 Ailment Duration wird zu **Ailment Effect** 💡

| | heute | neu |
|---|---|---|
| Wert | Ailment Duration (+% Dauer) | **Ailment Effect** (+% Wirkung) |
| wirkt auf | Dauer aller Ailments | Schaden von Bleed, Poison, Burn, Corruption **und** Stärke von Chill (Verlangsamung) und Shock (Bonus-Schaden) |
| hilft | fast nur Poison | **jedem** Ailment-Build, auch dem Shock- oder Chill-Sorcerer |
| Quellen | Wisdom, Gear, 19 Web-Nodes, 10 Prestige-Nodes, Mastery | Wisdom, Gear (Off Hand, Gloves, Amulet), einige Web-Notables |

- Chill und Shock bekommen eine **Obergrenze** (Chill höchstens −50 %, Shock höchstens +50 % mit allen Stacks), damit Ailment
  Effect sie nicht ins Absurde treibt.
- **Dauer** bleibt als **Regel** auf einzelnen Nodes, wo sie eine Build-Idee ist: Seeping (Poison), Slow Burn (Burn),
  Bitter Cold (Chill), Endless Night (Corruption).
- **Tenacity** (Defense) bleibt unverändert: Sie kürzt Ailments auf dem Helden, und dort ist Dauer wichtig.
- **Save-Migration:** Items mit Ailment Duration bekommen Ailment Effect mit demselben Roll-Anteil.

### 3.4 Wisdom 💡

| | heute | neu |
|---|---|---|
| pro Punkt | +6 % Heat Gain, +6 % Ailment Duration | +6 % Heat Gain, **+5 % Ailment Effect** |
| Perk 4 | Inner Fire: +10 Starting Heat | bleibt |
| Perk 7 | Afterglow: Skills geben 10 % Heat zurück | bleibt |
| Perk 10 | Clarity: +1 Stack bzw. +1 s | **Clarity**: deine Payoffs (Rend, Überlauf, Flashpoint, Collapse, Freeze) sind 25 % stärker |

Wisdom wird damit das Attribut für **„Skills und Ailments“**, gleich gut für alle fünf Klassen mit Ailment-Builds.

### 3.5 DoT im 1v1 sichtbar machen (für später, siehe `merkliste-spaeter.md`)

- **Doom-Anzeige:** Die Life-Leiste des Gegners zeigt den Schaden, den die laufenden DoTs noch machen werden, als
  schraffierten Teil. So sieht man den Treffer eines DoT-Builds sofort, nicht erst über Sekunden.
- Payoffs (Flashpoint, Collapse, Überlauf) bekommen große, eigene Effekte, weil sie die „Treffer“ eines DoT-Builds sind.

### 3.6 Längere Kämpfe helfen DoT

Mit der längeren Kampfdauer aus `neuausrichtung-v1.md` 5.5 (normal 20–30 s, Boss 60–100 s) erreicht Corruption ihr volles
Wachstum auch in normalen Kämpfen, und DoT-Builds sind nicht mehr im Nachteil, weil der Gegner stirbt, bevor sie wirken.

## 4. Entscheidungen

Alle Punkte ✅ (Timo, 13.10.):

1. Eingebaute Payoffs für alle: Überlauf (Poison), Flashpoint (Burn), Collapse (Corruption)?
2. Ailment Duration → **Ailment Effect** auf Items, Wisdom und im Web?
3. Shock stapelt bis 3?
4. Wisdom-Perk Clarity wird „Payoffs +25 %“?
