# Klassen v2: Klassenwahl, Charakter-Slots, Vorschau, Titel (Konzept, 2026-10-05)

Ausgangslage: Variante A (klassenlos, 3 Achsen) aus `klassen-varianten.md`, Archetypen aus `notes/build-archetypen.md`,
Prestige-Äste mit Vertiefen und Resonanz aus `skilltree-v2.md`. Heute wählt man im Title Screen nur die erste Waffe (Sword oder Fire Wand).
Markierung: ✅ entschieden · 💡 Vorschlag · ❓ offen. Zahlen sind Startwerte für die Balance-CLI.

**Timo, 2026-10-05:** Elemental-Melee-Klasse (Spellblade) gestrichen ✅ · Class Traits ja ✅ · Namen und Titel passen ✅ ·
kurzer malerischer Text (2–3 Sätze) neben der Vorschau ✅ · **Klasse ist fix, kein Klassenwechsel** ✅ ·
stattdessen **mehrere Charakter-Slots** im Startbildschirm wie in Diablo ✅.

---

## 1. Grundidee ✅

**Die Klasse ist ein Startpunkt und eine Identität, kein Käfig.** Der klassenlose Kern bleibt: Jedes Item, jeder Ast, jede Waffe
bleibt für jede Klasse nutzbar, kein Loot wird für die eigene Klasse wertlos. Die Klasse ist fest an den Charakter gebunden und legt fest:

| Baustein | Was | Wirkung |
| --- | --- | --- |
| **Start-Kit** | 1–2 Waffen zur Wahl, dazu Start Skill und passende Off Hand | Abschnitt 3 und 4 |
| **Start-Attribute** | wie in D2 je Klasse anders verteilt (Summe bleibt 36) | erste Item-Anforderungen passen zur Klasse |
| **Class Trait** | ein kleiner, fester Bonus (etwa 2 Skill Points wert) | gilt mit jeder Waffe |
| **Aussehen** | eigener Körper/Silhouette, Waffe und Off Hand wechseln sichtbar | Basis für Timos KI-Charakter-Assets |
| **Empfohlene Pfade** | 3 Prestige-Äste pro Klasse | Markierung im Bloodline-Schritt |
| **Titel** | Klassenname, später Titel nach dem Haupt-Ast | Character View, Charakter-Auswahl, Legacy |

Elemental mit Melee-Waffe bleibt als Hybrid-Build möglich (Spells haben eigenen Schaden), bekommt aber keine eigene Klasse.

---

## 2. Die Klassen

| Klasse | Achsen | Start-Waffen | Basis-Ast | Start-Attribute (STR/DEX/AGI/INT/WIS/VIT) | Class Trait | Empfohlene Pfade |
| --- | --- | --- | --- | --- | --- | --- |
| **Warrior** | Physical · Melee · Direct | Sword, Mace | Might | 9 / 5 / 6 / 4 / 4 / 8 | **Iron Blood**: +10 % Life | Duelist, Warden, Tactician |
| **Reaver** | Physical · Melee · Over Time | Axe, Dagger | Rupture | 8 / 7 / 7 / 4 / 4 / 6 | **Bloodletter**: +15 % Bleed und Poison Damage | Butcher, Venomancer, Duelist |
| **Hunter** | Physical · Ranged | Bow, Crossbow | Might / Rupture | 6 / 9 / 8 / 4 / 4 / 5 | **Keen Eye**: +5 % Crit Chance | Marksman, Venomancer, Tactician |
| **Sorcerer** | Elemental · Ranged · Direct | Fire Wand | Arcana | 4 / 5 / 6 / 9 / 7 / 5 | **Spark**: +10 Starting Heat | Stormcaller, Frostbinder, Tactician |
| **Warlock** | Elemental · Ranged · Over Time | Staff | Affliction | 4 / 5 / 5 / 8 / 9 / 5 | **Lingering**: +15 % Ailment Duration | Pyromancer, Void Lord, Venomancer |

Warden und Tactician (Core) passen zu allem; jede Klasse bekommt höchstens einen davon als Empfehlung.

**Klassentexte** (in-game, Englisch, 2–3 Sätze: womit die Klasse kämpft und gewinnt, ohne Zahlen) 💡 v2 (v1 war Timo zu malerisch):

- **Warrior**: *Fights up close with Sword or Mace and wins through brute force: heavy direct hits, thick armor and a shield to take the blows. Keep swinging, or the Heat cools down.*
- **Reaver**: *Fights up close with Axe or Dagger and wins with dirty tricks: every cut bleeds, every stab poisons. The wounds do the killing while the Reaver keeps striking.*
- **Hunter**: *Fights from range with Bow or Crossbow. Bolts punch through armor in single heavy shots, arrows leave bleeding and poisoned wounds. Patient, precise, deadly on a critical hit.*
- **Sorcerer**: *Fights from range with a Wand and wins with raw elements: fire, frost and lightning in big, sudden bursts. The Heat builds on its own, so the next spell is always coming.*
- **Warlock**: *Fights from range with a Staff and wins with curses: lingering fire, creeping Void and slow decay. The longer the fight lasts, the surer the enemy dies.*

---

## 3. Start Skills als Innate der Waffe ✅

Jeder Waffentyp bringt einen eigenen Skill als **Innate** mit (Timo, 2026-10-05). Er steht im Waffen-Tooltip, nicht im Skill Tree.

| Klasse | Waffe | Innate | Status |
| --- | --- | --- | --- |
| Warrior | Sword | **Power Strike** (220 % Weapon Damage) | vorhanden, wandert aus dem Baum |
| Warrior | Mace | **Skull Crack**: 180 % Weapon Damage, stunnt 0,5 s | neu ✅ |
| Reaver | Axe | **Lacerate** (100 %, blutet immer) | vorhanden, wandert aus dem Baum |
| Reaver | Dagger | **Venom Coat** (8 s jeder Treffer poisont) | vorhanden, wandert aus dem Baum |
| Hunter | Bow | **Barbed Arrow**: 100 % Weapon Damage, Bleed oder Poison | neu ✅ |
| Hunter | Crossbow | **Heavy Bolt**: 240 % Weapon Damage, ignoriert 30 % Armor | neu ✅ |
| Sorcerer | Fire Wand | **Firebolt** (Fire-Hit, 25 % Burn) | vorhanden, wandert aus dem Baum |
| Warlock | Staff | **Void Bolt** (Void-Hit, 50 % Corruption) | vorhanden (war nie im Baum) |

**Regel im Battle Plan** 💡: Der Innate ist ein normaler Skill in der Bibliothek, solange eine Waffe dieses Typs ausgerüstet ist.
Liegt er in einem Slot und man wechselt den Waffentyp, übernimmt der Slot den Innate der neuen Waffe (der Slot ist als „Innate“ markiert).
Neue Charaktere starten wie heute mit dem Innate im ersten Rotation Slot. Ränge/Skill-Level des Innate kommen nur über Items.

**Ersatz im Skill Tree** 💡: Vier Skill-Nodes sind heute Start Skills. Sie bekommen neue Skills an derselben Stelle (gleiche Kosten-Klasse, gleicher Ast-Fokus):

| Ast | raus (jetzt Innate) | rein | Wirkung (Startwert) | Heat |
| --- | --- | --- | --- | --- |
| Might | Power Strike | **Crushing Blow** | 170 % Weapon Damage, Sunder | 30 |
| Arcana | Firebolt | **Ice Lance** | Cold-Hit, Chill immer (gibt es schon in der Sim, wird bisher nirgends benutzt) | 35 |
| Rupture | Lacerate | **Serrated Edge** | 8 s lang blutet jeder Treffer (Gegenstück zu Venom Coat) | 40 |
| Rupture | Venom Coat | **Envenom** | 80 % Weapon Damage, setzt 2 Poison-Stacks | 30 |

Affliction ändert sich nicht (Immolate und Corrupt sind keine Innates). Neue Skills bekommen eigene Arena-Effekte.
Bestehende Spielstände: Wer Power Strike, Firebolt, Lacerate oder Venom Coat im Baum gelernt hat, bekommt die Node automatisch als den Ersatz-Skill (gleiche Node-ID, keine Punkte verloren).

--- | --- | --- | --- |
| Warrior | Sword | Power Strike (220 % Weapon Damage) | bleibt |
| Warrior | Mace | Power Strike | **Skull Crack**: 180 % Weapon Damage, stunnt 0,5 s |
| Reaver | Axe | Lacerate (100 %, blutet immer) | bleibt |
| Reaver | Dagger | Venom Coat (8 s jeder Treffer poisont) | bleibt |
| Hunter | Bow | Lacerate | **Barbed Arrow**: 100 % Weapon Damage, Bleed oder Poison |
| Hunter | Crossbow | Power Strike | **Heavy Bolt**: 240 % Weapon Damage, ignoriert 30 % Armor |
| Sorcerer | Fire Wand | Firebolt (Fire-Hit, 25 % Burn) | bleibt |
| Warlock | Staff | Void Bolt (Void-Hit, 50 % Corruption) | bleibt |

Jeder neue Skill bekommt einen eigenen Arena-Effekt (PixiJS-Regel).

---

## 4. Off Hands pro Waffe ✅

Heute gibt es drei Off Hands: **Round Shield** (alle Melee-Waffen), **Ember Focus** (Fire Wand, Staff), **Quiver** (Bow, Crossbow).
Jede Waffe hat also eine passende Off Hand, aber Warrior und Reaver teilen sich das Schild, Sorcerer und Warlock den Focus.
Vorschlag: zwei neue Off Hands, damit jede Klasse eine eigene hat (gut für Aussehen und Item-Gefühl). Alle bleiben für jede Klasse tragbar.

| Klasse | Off Hand | passt zu | Implicit | Status |
| --- | --- | --- | --- | --- |
| Warrior | Round Shield | Melee | Block Chance, Armor | vorhanden |
| Reaver | **Blood Talisman** | Melee | +Bleed/Poison Chance | neu |
| Hunter | Quiver | Bow, Crossbow | Attack Speed, Crit Chance | vorhanden |
| Sorcerer | Ember Focus | Wand, Staff | Elemental Damage, Heat Gain | vorhanden |
| Warlock | **Grimoire** | Wand, Staff | +Ailment Duration, +Corruption/Burn Chance | neu |

Jeder Charakter startet mit der Off Hand seiner Klasse (Normal).

---

## 5. Charakter-Slots statt Klassenwechsel ✅

Die Klasse ist fix. Wer etwas anderes spielen will, legt einen neuen Charakter an, wie in Diablo.

**Title Screen → Character Select:**
- **6 Slots** ✅ (mehr als Klassen, also auch zwei Charaktere derselben Klasse möglich).
- Jeder Slot als Karte: Klassenbild, Name, Titel, Generation, Level, aktueller Act. Klick = auswählen, **Play** = weiter.
- Leerer Slot: **New Heir** → Klassenwahl (Abschnitt 6).
- **Delete** mit Bestätigung (Name eintippen wie in D2, weil es nicht rückgängig zu machen ist).
- Name: beim Anlegen ein zufälliger Vorschlag passend zur Klasse, änderbar.

**Was pro Charakter gespeichert wird:** alles (Items, Stash, Baum, Battle Plan, Codex, Prestige, Legacy).
Global bleiben nur Settings. Jeder Charakter ist also eine eigene Blutlinie.

**Bestehender Spielstand:** wird Slot 1; Klasse aus der Start-Waffe abgeleitet (Sword → Warrior, Fire Wand → Sorcerer), Attribute nicht nachträglich verschoben.

---

## 6. Klassenwahl und Vorschau 💡

Ersetzt „Choose your first weapon“.

- Oben eine Reihe aus 5 Klassen-Karten: Charakterbild (bis zur KI-Art: Silhouette + Waffe), Name, 3 Achsen-Icons
  (Physical/Elemental, Melee/Ranged, Direct/Over Time), Heat-Icon (Cooling/Steady/Warming).
- Darunter die gewählte Klasse groß:
  - **Live-Vorschau in PixiJS** (links): Die Klasse kämpft in einer Schleife gegen einen Act-1-Gegner, mit echter Sim und echten
    Arena-Effekten (fester Seed). Klick auf eine Start-Waffe wechselt die Vorschau.
  - **„Glimpse“-Umschalter**: derselbe Kampf mit einem fertigen späten Build des ersten eigenen Pfads (z. B. Warrior als Blademaster).
  - **Klassentext** (rechts, 2–3 Sätze, Abschnitt 2), darunter Trait als eine Zeile und die 4 Klassenpfade als Icons
    (Hover zeigt den Titel, den man damit bekommt).
  - Namensfeld und Button **Begin**.

Der Glimpse-Build ist ein fester Datensatz in `content` (Level, Items, Baum, Battle Plan), kein echter Spielstand.

---

## 7. Titel: Name ändert sich mit dem Pfad ✅

**Regel:**
1. Vor dem ersten Prestige heißt man wie die Klasse: *Warrior*.
2. Danach bestimmt der **Haupt-Ast** den Titel: der Prestige-Ast mit den meisten Stufen. Bei Gleichstand bleibt der bisherige Titel.
3. Jeder der 4 Klassenpfade gibt einen **eigenen Titel**. Nur alte Spielstände, die vor den Klassenpfaden einen fremden Ast genommen haben, bekommen den Klassennamen mit einem **Beinamen**: *Warrior of the Storm*.

| Klasse | Pfad → Titel | | | |
| --- | --- | --- | --- | --- |
| Warrior | Duelist → **Blademaster** | Butcher → **Headsman** | Warden → **Ironclad** | Tactician → **Warlord** |
| Reaver | Butcher → **Ravager** | Venomancer → **Viper** | Duelist → **Cutthroat** | Tactician → **Shadowblade** |
| Hunter | Marksman → **Deadeye** | Venomancer → **Stalker** | Warden → **Sentinel** | Tactician → **Ranger** |
| Sorcerer | Stormcaller → **Tempest** | Frostbinder → **Rimeweaver** | Warden → **Battlemage** | Tactician → **Archmage** |
| Warlock | Pyromancer → **Ashcaller** | Void Lord → **Nightbinder** | Warden → **Gravewarden** | Tactician → **Hexmaster** |

**Beinamen:** Duelist *of the Blade* · Marksman *of the Hunt* · Butcher *of Blood* · Venomancer *of Venom* · Stormcaller *of the Storm* ·
Frostbinder *of Frost* · Pyromancer *of Flame* · Void Lord *of the Void* · Warden *of Iron* · Tactician *of Command*.

**Anzeige:** Character View (unter dem Namen, mit Klassen-Emblem), Character Select, Legacy (jede Generation mit Titel),
Bloodline-Schritt (Ast-Karte zeigt *→ Blademaster*, wenn sie den Titel ändern würde). Titelwechsel nach dem Prestige mit kurzem
Glut-Effekt am Emblem (respektiert `prefers-reduced-motion`).

---

## 8. Prestige: Klassenpfade ✅ (Timo 2026-10-06)

Weil die Klasse fest ist, wächst jede Klasse nur auf ihren **4 Klassenpfaden**: 2 eigene thematische Äste plus die beiden
Core-Äste **Warden** (Verteidigung) und **Tactician** (Heat, Rotation), die zu jeder Klasse passen. Ausnahme: Der Reaver
nimmt Duelist statt Warden (Dolch-Crits, kein Schild; Timo 2026-10-06). Der Bloodline-Schritt zeigt nur
diese 4 (neu nehmen oder vertiefen). 4 Äste × 3 Stufen = 12 Plätze für 7 Picks, die Build-Wahl bleibt echt.

| Klasse | Eigene Äste | Core |
| --- | --- | --- |
| Warrior | Duelist, Butcher | Warden, Tactician |
| Reaver | Butcher, Venomancer, Duelist | Tactician |
| Hunter | Marksman, Venomancer | Warden, Tactician |
| Sorcerer | Stormcaller, Frostbinder | Warden, Tactician |
| Warlock | Pyromancer, Void Lord | Warden, Tactician |

**Resonanz entfällt** (`skilltree-v2.md`): Mit festen Klassenpfaden wäre sie ein automatischer Bonus ohne Entscheidung.
Ausrüstung bleibt frei: ein Warrior darf einen Wand tragen, hat aber keinen Pfad dafür. Wer einen anderen Build will, legt einen
neuen Charakter an. Alte Spielstände behalten bereits genommene fremde Äste, können sie aber nicht weiter vertiefen.

---

## 9. Aussehen und Charakter-Assets 💡

Ein Körper pro Klasse, Waffe/Off Hand weiter austauschbar. Vorgabe für Timos KI-Bilder (gleicher Stil, Blick nach rechts, ohne Waffe im Grundbild):

| Klasse | Silhouette | Farbe/Material | Merkmal |
| --- | --- | --- | --- |
| Warrior | breit, schwere Schultern | Stahl, Rostrot | Halbhelm, Kettenhemd unter Wappenrock |
| Reaver | sehnig, vorgebeugt | dunkles Leder, Blutrot | Kapuze, Riemen, Narben |
| Hunter | schlank, aufrecht | Waldgrün, Braun | Umhang, Köcher am Rücken |
| Sorcerer | schmal, aufrecht | Tiefblau, Gold | Robe mit hohem Kragen, Glut-Runen |
| Warlock | gebeugt, verhüllt | Violett, Aschgrau | zerschlissene Robe, Asche am Saum |

Optional später: Aura nach Haupt-Ast in der Arena.

---

## 10. Daten und Save 💡

- `content`: `CLASSES` mit `id`, `name`, `weapons`, `offHand`, `startingAttributes`, `trait`, `branches`, `titles`, `text`,
  `glimpse`; `BRANCH_EPITHETS`; neue Innates (Skull Crack, Barbed Arrow, Heavy Bolt) als `innateSkill` am Waffentyp, Ersatz-Skills im Baum (Crushing Blow, Serrated Edge, Envenom; Ice Lance aktiviert), Off Hands (Blood Talisman, Grimoire).
  `starterWeapons` entfällt.
- `sim`: `newGame(data, { seed, classId, starterWeapon, name })`, `hero.classId` im Save, Trait als Stat-Modifier, `heroTitle(state)`
  als reine Funktion. Alles mit Unit-Tests.
- `web`: Save-Slots in `storage.ts` (ein Key pro Slot plus Slot-Liste, PR-Previews weiter getrennt), Character Select, Klassenwahl.
- Balance-CLI: `--class warrior`.

---

## 11. Offene Punkte ❓

1. Klassentexte v2 und die vier Ersatz-Skills im Baum: passen sie?
2. Danach Umsetzung (Skill Tree v2, PR #15, ist gemergt).
