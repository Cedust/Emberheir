# Sorcerer ohne Fire – Konzept v1

Stand 2026-10-17. Timo hat Variante A gewählt; umgesetzt (Abschnitt 6 nennt, was beim Bauen anders wurde). Grundlage: auftrag-sorcerer-ohne-fire.md und der Code auf `main`.

## 1. Wo der Crit heute beim Sorcerer steckt

Kurz vorweg, weil es die Frage "überschneidet sich der Crit-Path mit Frost?" beantwortet: **Im Frost-Teil steckt
kein Crit.** Rime (Wand) und Frostbinder (Class Path) sind reine Chill-/Barrier-Pfade. Der Crit hängt komplett am
**Lightning**-Teil, und zwar in allen drei Systemen:

| System | Crit-Teile heute |
| --- | --- |
| Wand Mastery, Path **Storm** ("Shock, Crits") | Focus (+3 % Precision), **Arc** (jeder Crit gibt 8 Heat), **Arc Chain** (Crits gegen Geschockte springen über) |
| Class Path **Stormcaller** | **Overload** (Crits schocken), **Galvanize** (+8 % Crit Chance gegen Geschockte) |
| Skill Web, Arcana | **Tempest** (+12 % Crit Chance gegen Geschockte) |

Dazu kommt: Crit ist schon die Identität des **Hunter** (Keen Eye, Keen Lineage, Marksman) und taucht beim Duelist
und bei der Dagger (Find the Gap, Ambush) auf. Ein Crit-Path für den Sorcerer muss also anders critten als der Hunter.

Feste Regeln, die gelten bleiben: Crit Damage ist fest 150 % (Ausnahmen nur über Keystones); Techniken der Weapon
Mastery geben nur waffen-eigene Werte, rohe Crit Chance gehört dem Gear (und DEX); jedes Innate gibt Heat aus.

## 2. Fire raus (gilt für alle Varianten)

- **Attunement der Wand:** nur noch **Lightning** (neuer Start) und **Cold**. Lightning passt zur Storm Lineage und zu
  "plötzlichen Bursts". Fire bleibt beim Warlock (Staff-Attunement, Pyromancer).
- **Innate:** Firebolt wird zum neutralen **Bolt**, der wie heute nach Attunement heißt: *Shockbolt* (Start) oder
  *Frostbolt*. Die Forms heißen entsprechend Shock Lance / Frost Lance usw. Werte und Heat-Kosten bleiben.
- **Path Blaze** (Burn) fällt weg, an seine Stelle tritt der neue Path (Abschnitt 3).
- **Keystone Prism:** wechselt nur noch zwischen Cold und Lightning; dafür −10 % statt −15 % Schaden.
- **IDs:** `fire-wand` → `wand`, `firebolt` → `bolt` (Save-Migration, Abschnitt 5). Off Hand **Ember Focus** bleibt
  (Ember ist das Weltthema, kein Fire-Versprechen; sie passt auch zur Staff).
- **Klassentext neu:** "Fights from range with a Wand and wins with frost and lightning in big, sudden bursts. Every
  skill charges the next Spark, and the Heat builds on its own, so the next spell is always coming."
- **Skill Web bleibt offen:** Meteor, Pyroclasm und Firestarter liegen auf der Brücke zum Warlock und bleiben für alle
  Klassen nutzbar. Der Sorcerer verspricht sie nur nicht mehr.
- **Arena:** Firebolt-Look, Feuer-Tönung des Wand-Steins und Blaze-Runen entfallen; der neue Path bekommt einen
  eigenen Look (Abschnitt 3).

## 3. Variante A (Empfehlung): Path "Arcane" mit Crit-Fokus, Storm ohne Crits

Der Crit wandert aus Storm in einen eigenen, **element-neutralen** Path. Storm wird reiner Shock-Path. So gibt es
drei klar getrennte Pfade: **Rime** = Kontrolle (Chill), **Storm** = Schaden über Shock-Stacks, **Arcane** = Burst
über Crits. Arcane wirkt mit beiden Attunements gleich gut.

**Abgrenzung zum Hunter:** Der Hunter crittet nach *Timing* (erster Treffer, Treffer ins Ausholen). Der Sorcerer
crittet nach *Rhythmus*: Skill → geladener Spark (Class Trait) → Crit. Das macht den Path zum Sorcerer-eigenen.

### Arcane (neu, ersetzt Blaze) · Thema "Crits, Burst"

| Teil | Node | Wirkung |
| --- | --- | --- |
| Technik I (3 Ränge) | **Focus** | +3 % Precision pro Rang (kommt aus Storm; nur saubere Treffer critten) |
| Gabel 1 | **Flashpoint** | Dein geladener Spark (nach einem Skill) ist immer ein sauberer Crit. |
| | **Critical Mass** | Jeder Spark ohne Crit gibt +6 % Crit Chance bis zum nächsten Crit. |
| Technik II (3 Ränge) | **Amplify** | +8 % Innate Damage pro Rang |
| Gabel 2 | **Arc** | Jeder Crit gibt 8 Heat. (kommt aus Storm) |
| | **Overwhelm** | Crits ignorieren 25 % der Elemental Resistance des Gegners. |
| Meister | **Master of the Arcane** | Crittet ein Skill, lädt er deinen Spark für zwei Default Attacks statt einen. |

Look in der Arena: Crits des Sorcerers bekommen einen eigenen weiß-violetten Lichtriss mit kurzem Kamera-Ruck,
der geladene Spark ein sichtbares Glimmen am Wand-Kopf.

### Storm ohne Crits · Thema "Shock"

| Teil | heute | neu |
| --- | --- | --- |
| Technik I | Static (+10 % Shock-Wirkung) | bleibt |
| Technik I b | Focus (+3 % Precision) | **Charge**: +4 % Shock Chance (wie Hoarfrost bei Rime) |
| Gabel 1 | Static Field / **Arc** | Static Field / **Conduction**: jeder neue Shock-Stack gibt 4 Heat |
| Gabel 2 | **Arc Chain** / Static Build | **Arc Chain**: Treffer gegen 3 Shock-Stacks springen für 30 % über / Static Build |
| Meister | Master of Storm | bleibt |

**Stormcaller und Tempest:** Ich würde sie so lassen. Sie sind ein anderes System (Class Path, Skill Web) und machen
"Lightning + Arcane" zu einer guten Kombination, ohne dass Arcane selbst Lightning braucht. Wer Cold + Arcane spielt,
hat mit Frostbinder einen eigenen Weg. Wenn du den Crit ganz aus Lightning heraus willst, ginge Overload → "Dein
Spark schockt für 2 Stacks" und Galvanize → "+10 % Schaden gegen Geschockte".

## 4. Alternativen, falls dir Crit zu nah an Storm oder am Hunter ist

**B · Path "Echo" (Spark-Rhythmus, kein Crit).** Der Path verstärkt den Class Trait: Technik Innate Damage und Innate
Cost; Notables wie "der geladene Spark trifft zweimal", "der Spark wiederholt 30 % des letzten Skills", Meister
"jeder 3. Skill wird doppelt gewirkt". Sehr eigen, aber nah am Slot Modifier Reverb und am Keystone Wild Magic.

**C · Path "Surge" (Heat-Burst).** Das Innate wird mit voller Heat stärker: "ab 80 Heat +40 % Innate Damage", "volle
Heat: nächster Skill kostet nichts". Passt zu "Heat baut sich von allein auf", überschneidet sich aber mit dem
Keystone Arcane Conduit, dem Slot Modifier Overcharge und dem Channel der Staff.

**Warum A:** Timos Idee, klar getrennt von Rime und Storm, und der Rhythmus über Spark grenzt ihn vom Hunter ab. B
und C bauen Dinge nach, die es an anderer Stelle schon gibt.

## 5. Alte Saves, Balance, Doku

- **Migration** (SAVE_VERSION +1): Fire Attunement → Lightning; alle Blaze-Punkte und bei Variante A die Punkte in
  Storm-Notables, die sich ändern, gehen zurück (frei neu verteilbar). Waffen-ID `fire-wand` → `wand` auch im Shared
  Stash (Ember Focus `fitsWeapons`). Battle Plans mit `firebolt` und seinen Forms bekommen die neuen IDs.
- **Balance:** Der Autopilot-Build "fire" des Sorcerers wird zum Build "arcane" (Cold-Attunement + Arcane +
  Frostbinder, damit die drei Builds verschieden bleiben). Danach `npm run balance` für alle drei Sorcerer-Builds
  bis Act 7 und Wildfire; Ziel wie immer: ähnlicher Life-Verlust pro Act wie die anderen Klassen.
- **Neue Bausteine in `sim`** (mit Unit Tests): "geladener Spark ist ein sicherer Crit", "Crit Chance baut sich bis zum
  Crit auf", "Crits ignorieren Elemental Resistance", "Spark für zwei Attacks laden", "Shock-Stack gibt Heat",
  "Arc Chain ab 3 Stacks".
- Danach Game Design Document, weapon-mastery-baeume-v1.md und klassen-v2.md nachziehen.

## 6. Umsetzung (2026-10-17)

Abweichungen vom Konzept, beim Bauen entschieden:

- **Overwhelm:** "Crits haben +20 % Elemental Penetration" statt "ignorieren 25 % der Resistance" (Penetration zieht im
  Spiel feste Prozentpunkte ab, 20 ist schon kräftig).
- **Arc Chain:** springt jetzt bei jedem Treffer gegen 3 Shock-Stacks über, daher 15 % statt 30 % des Schadens.
- **Migration:** Storm gibt alle Punkte zurück (nicht nur die geänderten Notables), Blaze ebenso.
- **Autopilot "arcane":** Lightning + Arcane (Flashpoint, Arc) + Tactician zuerst; "frost" spielt jetzt mit Cold-
  Attunement, "storm" mit Lightning. Vorher hatten alle drei Sorcerer-Builds unbemerkt Fire-Attunement.

**Balance** (`--act 7 --build all --runs 3 --seed 31 --newest 1`, Versuche im jeweils neuesten Act, Summe Act 1-7,
Mittel pro Build):

| Klasse | vorher | nachher |
| --- | --- | --- |
| Warrior | 27,7 | 27,7 |
| Reaver | 23,2 | 23,2 |
| Hunter | 22,2 | 22,2 |
| Warlock | 17,9 | 17,9 |
| **Sorcerer** | **14,4** | **17,1** |

Sorcerer-Builds: storm 17,4 → 27,0, frost 14,1 → 24,3 (davon 16 Versuche in Act 4: Cold gegen den Rime Warden; ein
Spieler wechselt die Attunement dort kostenlos auf Lightning, der Autopilot nicht), fire 26,0 → arcane 17,0. Der
Sorcerer war vorher die leichteste Klasse und liegt jetzt im Feld der anderen. Finale und Wildfire nicht neu gemessen.

**Umbenannt (2026-10-18):** Der Path heißt **Starfall** statt Arcane (zu nah an der Skill-Web-Region Arcana, in der
der Sorcerer startet); der Meister heißt Master of Starfall, der Autopilot-Build "starfall".
