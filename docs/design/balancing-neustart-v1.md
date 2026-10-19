# Balancing-Neustart v1: Bestandsaufnahme und Plan (2026-10-19)

Thread „Balancing-Neustart“ (Timo, 19.10.2026). Stand: `main` nach PR #69 (Klassengerüst v1).
Ziel: klare Übersicht über den Spielinhalt, gesundes Balancing, spaßiges Gameplay. Alte Festlegungen werden bewusst
hinterfragt.

Detail-Inventare (Englisch, Tabellen mit Code-Stellen) im Ordner `notes/balancing-neustart/`:
`inventar-classes-heirloom.md` · `inventar-masteries-tree.md` · `inventar-skills-items.md` ·
`inventar-combat-enemies.md` · `inventar-builds.md` · Messwerte `messung-2026-10-19.md`.

Markierung: 💡 Vorschlag · ❓ Frage an Timo.

---

## 0. Kurzfassung

1. **Im Mittel sieht es fair aus, im Einzelnen nicht.** Klassen brauchen 22.9 / 21.4 / 18.8 Versuche (Summe der
   neuesten Acts 1–7). Einzelne Build-Mastery-Paare liegen aber zwischen **8.5 und 39** Versuchen (×4.6), der DPS am
   Dummy zwischen 17k und 173k (×10), ein normaler Kampf in Act 7 dauert 4 bis 47 Sekunden.
2. **Power Creep ist da, und er hat eine Ursache:** Es gibt keine feste Schadensformel mit begrenzten Töpfen. Ein Treffer
   multipliziert rund **17 einzelne Faktoren**, jede neue Fähigkeit hat einen weiteren dazugebracht. Ash-Tree-Boni
   multiplizieren sich untereinander, gleiche Runen im Ash Tree auch (9× Dusk = ×3.5). DoTs erben jeden Treffer-Faktor
   und bekommen dann noch 4 eigene obendrauf.
3. **Die Monster rennen hinterher.** Gegen den stärkeren Helden kamen immer neue Schichten dazu: Level-Kurve (selbst eine
   Anpassung an eine alte Anpassung) × Run Pressure × Wall × Kampflänge × Boss Life × endgameBoss. Der Harvester hat
   ×5451 Life. Mehrere Schichten heben sich gegenseitig auf.
4. **Unser Messgerät schielt.** Der Autopilot nimmt nie einen Keystone, nutzt nur 3 Skills, teilt sich bei Cinderguard
   und Ashstrider einen Ash-Tree-Bausatz für fast alle Builds und trägt teils einen Heirloom-Keystone, der zum Path nicht
   passt. Mehrere Fixes der letzten Tage (z. B. Smolder-Buff) haben Zahlen an der falschen Stelle gedreht.
5. **Zu viele Sonderregeln für den Überblick:** 38 CombatRules, ~110 WeaponRules, 18 Perks, 10 Wege für „erzwungener
   Crit“, 5 Wege für „wende zusätzlich ein Ailment an“, 3 verschiedene Formeln für „DoT auf einmal auszahlen“.

💡 **Vorschlag:** nicht weiter an Einzelzahlen drehen, sondern in 7 Schritten neu aufbauen: erst das Messgerät ehrlich
machen, dann eine feste Schadensformel mit Budget, dann die Monster aus diesem Budget ableiten, dann **Klasse für
Klasse** jeden Build mit einer Build-Karte neu einstellen (Abschnitt 7).

---

## 1. Was heute im Spiel ist

| Ebene | Umfang | Anmerkung |
|---|---|---|
| Klassen | 3 (Cinderguard STR, Ashstrider DEX, Emberseer INT) | je ein Class Trait |
| Waffen (Heirloom) | 8, je 3 Paths = **24 Builds** | Path = Damage Type + Ailment; 9 Punkte pro Path, max. 20 Punkte |
| Heirloom-Extras | Refine (11 Punkte), 3 Heat Forms, 3 Innate Forms und 4 Keystones je Waffe, 7 Echoes | ~110 eigene Regeln |
| Masteries | 9 (3 je Klasse: Burst / Tempo / Ailment), je 24 Nodes, Tier I–V | 216 Nodes |
| Ash Tree | 223 Nodes: 7 Kronen-Regionen, Stamm, Wurzeln, 14 Keystones, 9 Rune Sockets | 100 Skill Points am Ende von Run 7, davon ~70 für Masteries |
| Skills | 8 Innates, 21 Ash-Tree-Skills, 9 Mastery-Skills, 3 tote (Feint, Piercing Shot, Plague Cloud) | keine Cooldowns, nur Heat |
| Items | ~30 Stat-Affixe, 15 Trigger-Affixe, 5 Raritäten, Greater Affix | Schaden-% sind ein gemeinsamer Topf (gesund) |
| Runen | 8 Runen, 10 Runenwörter | Runen-Effekt im Ash Tree ohne Doppel-Sperre |
| Legendary | 26 Powers (3 extra im Crucible), 21 Uniques, 13 Boss-Trophäen | |
| Lauf-Boni | Boons (bis ×3.2 skaliert), Omens, Draughts, Trigger Codex, Ashborn, Lineage | |
| Kampfregeln | 38 CombatRules, ~110 WeaponRules, 18 Breakpoint Perks, 6 Capstones | |

### 1.1 Klassen

| | Cinderguard | Ashstrider | Emberseer |
|---|---|---|---|
| Waffen | Sword, Axe, Mace | Bow, Crossbow, Dagger | Wand, Staff |
| Trait | **Fury**: +2 % je Hit, bis +20 % (wirkt praktisch immer) | **Hunter's Mark**: +10 % Precision gegen Gegner mit deinem Ailment (≈ +5 % Schaden, 0 bei Precision 100 %) | **Overcharge**: jeder 3. Skill → Nova 150 % Weapon Damage, setzt Ailment (≈ +15–25 %) |
| Masteries | Vanquisher / Berserker / Ravager | Deadeye / Skirmisher / Trickster | Archmage / Spellweaver / Warlock |

Hauptattribut: +8 % auf allen Schaden der eigenen Klasse je Punkt (+80 % bei 10). Die Traits sind ungleich stark
(Fury ×1.2 fest, Hunter's Mark ≈ ×1.05 bedingt).

### 1.2 Die 24 Heirloom-Paths

| Waffe | Path 1 | Path 2 | Path 3 |
|---|---|---|---|
| Sword | Edge (Physical · Bleed) | Thunder (Lightning · Shock) | Winter (Cold · Chill, Parry/Riposte) |
| Axe | Butcher (Physical · Bleed) | Blaze (Fire · Burn, niedrige Life) | Glacier (Cold · Chill, Mighty Hits) |
| Mace | Quake (Physical · Stun) | Forge (Fire · Burn, Sunder) | Stormwall (Lightning · Shock, Block) |
| Bow | Toxin (Physical · Poison) | Fire Arrows (Fire · Burn) | Storm (Lightning · Shock, Extra-Pfeile) |
| Crossbow | Venom Bolts (Physical · Poison) | Incendiary (Fire · Burn) | Frost (Cold · Chill) |
| Dagger | Venom (Physical · Poison) | Cutthroat (Physical · Bleed, Crit) | Static (Lightning · Shock) |
| Wand | Starfall (Void · Corruption, Crit) | Storm (Lightning · Shock) | Rime (Cold · Chill) |
| Staff | Hollow (Void · Corruption) | Smolder (Fire · Burn) | Glacial (Cold · Chill) |

Schaden eines voll ausgebauten Paths schwankt von ≈ ×1.0 (Axe Blaze, Staff Glacial, Mace Stormwall) bis ≈ ×2 auf das
eigene Ailment (Axe Butcher, Bow Fire Arrows, Staff Hollow/Smolder). **Refine** (gleich für alle Waffen) bringt mit
6 Punkten ×1.3 bis ×1.7 auf jeden Treffer und ist damit stärker als jeder Path.

### 1.3 Masteries

| Achse | Cinderguard | Ashstrider | Emberseer | Kern |
|---|---|---|---|---|
| Burst | Vanquisher | Deadeye | Archmage | Skill-Schaden; Mastery-Skill zahlt alle DoTs mit 150 % aus (Cash In) |
| Tempo | Berserker | Skirmisher | Spellweaver | Default Attack ×1.7, jede 3./4. Aktion doppelt (Spellweaver: auch Skills, gratis) |
| Ailment | Ravager | Trickster | Warlock | DoT ×1.6–2.1, längere Ailments |

Ausreißer: Archmage +90 % Skill-Schaden (Geschwister +65 / +15), Warlock DoT ×2.1 mit Lingering schon in Tier I
(Geschwister ×1.6), Skirmisher ist auf Schaden ein schwächerer Berserker und nimmt +10 % Schaden.

### 1.4 Ash Tree

Krone mit 7 Regionen (Steel, Blood, Venom, Flame, Storm, Frost, Void), Stamm (Verteidigung), Wurzeln (Heat). Die
Regionen sind unterschiedlich viel wert: das stärkste Bündel Bedingungs-Boni liegt bei Blood ×2.3, Roots ×2.0 und
Steel ×2.0, bei Void, Flame und Stamm nur ×1.1–1.25. Roots *Unbroken* (×1.4 ab 50 Heat) ist laut Text nur für
Nahkampf, wirkt aber im Code für alle Waffen (Bug).

---

## 2. Wie ein Treffer heute rechnet (vereinfacht)

```
Waffen-Wurf (Level ×1.03 je Stufe, Refine-Range)
 × Skill-Faktor
 × ~17 einzelne „more“-Faktoren, alle miteinander multipliziert:
     Execute · hitDamage · Chill-Bonus · Crescendo · Fury · Heirloom-Topf · Opener · Skill-Schaden ·
     JEDER Ash-Tree-Bedingungsbonus einzeln · Slow Death · Braced · Mighty/Clean Line ...
 × Crit (fest ×1.5)
 × (1 + alle „increased %“ aus Gear, Attribut, Boons)        ← der einzige gemeinsame Topf
 × Armor oder Resistance
DoT = dieser fertige Treffer × Ailment-Rate
 × (1 + Ailment Effect) × dotDamage (Produkt aus bis zu 6 Quellen) × Ailment-spezifisch × Lingering × Flüche
```

Folgen:
- Jede neue „X % more“-Fähigkeit wirkt multiplikativ mit allen anderen. Darum wächst die Gesamtstärke schneller als jede
  einzelne Zahl vermuten lässt. Geschätzt: ein ausgebauter Hit-Build ≈ ×650 auf Skills, gebraucht werden ≈ ×23
  (gegen Monster gleichen Levels) bis ×90 (Boss, Wildfire V).
- DoT-Builds zählen jeden Treffer-Bonus doppelt. Gemessen: Ailment-Builds machen am Ende **72–95 %** ihres Schadens
  über DoTs, alle anderen **75–97 %** über Skill-Treffer. Die Default Attack fällt bei allen auf 1–12 %. Das Heirloom,
  eigentlich das Herz jedes Builds, schlägt spät kaum noch zu.
- Heat-Kosten haben keine Untergrenze (6 Reduktionen → 19 % Kosten ≈ 5× mehr Skills), Skills haben keine Cooldowns.

---

## 3. Die Test-Builds: wie sie gebaut werden

**Wie der Autopilot spielt:** Für jede Entscheidung (Loot, Attribute, Runen, Crucible, Draught) nimmt er, was
„ln(Dummy-DPS) + ln(effektive Life)“ am meisten hebt. Kein Build hat eigene Wunsch-Affixe oder Wunsch-Runen; er nimmt,
was am Dummy misst. Im Ash Tree füllt er eine feste Liste von Zielen, dann die nächsten Nodes (Verteidigung zuerst).
Masteries: Ailment-Mastery zuerst bei Bleed/Poison/Void, sonst Burst; Tempo ist nie Haupt-Mastery. Reaction ist bei
allen 24 Builds Iron Bastion bei 50 % Life.

**Was er nie tut:** Keystones nehmen (weder Ash Tree noch Mastery), mehr als 3 Skills nutzen, gezielt farmen,
zurückziehen, Reforge/Temper/Kindle. Werte wie Parry, Block, „nach Evade“ und niedrige Life zählen am Dummy nichts.

**Bausätze:** 24 Pläne entstehen aus nur 8 Ash-Tree-Bausätzen. 7 von 9 Cinderguard-Builds teilen den Steel-Bausatz,
6 von 9 Ashstrider-Builds den Blood-Bausatz (ein Feuer-Bogen wirft also Cleave und Rend mit Bleed). Nur der Emberseer
lernt Skills seines eigenen Elements. Das erklärt einen Teil seines DPS-Vorsprungs.

| Build | Klasse | Ziel (Siegbedingung) | DPS-Probe | Versuche Ø (bestes / schlechtestes Mastery) | Auffällig |
|---|---|---|---|---|---|
| sword-edge | CG | Crits mit hoher Precision stapeln große Bleeds, Final Verdict unter 30 % | 35k | 18.2 (15.5 / 21) | |
| sword-thunder | CG | Rising Strike oft wirken, Arcs bei 3 Shock | 36k | 26.2 (23.5 / 28.5) | Element-Notables erst als letzte Ziele |
| sword-winter | CG | Parry → Riposte, Chill bremst | **17k** | 29.3 (24.5 / 32) | Ash Tree stützt Parry gar nicht |
| axe-butcher | CG | Bleed + Rampage wachsen in langen Kämpfen | 21k | 30.7 (25 / 35) | |
| axe-blaze | CG | bei niedriger Life kämpfen, Burn heilt | 27k | 23.0 (20 / 25.5) | Keystone Rampage braucht Bleed: −20 % |
| axe-glacier | CG | große Mighty Hits + Chill | 46k | 29.0 (26 / 32) | gleicher Rampage-Fehler; hängt in Run 4 |
| mace-quake | CG | Stun-Lock + volle Sunder → Siege | 72k | 15.0 (13 / 18) | |
| mace-forge | CG | volle Sunder, Siege verdoppelt jeden Hit | **94k** | 16.0 (15 / 16.5) | |
| mace-stormwall | CG | Block trägt Shock-Zermürbung | 47k | 18.8 (17 / 20) | Block-Wert am Dummy unsichtbar |
| bow-toxin | AS | Poison stapeln, Cascade zündet | 59k | 19.3 (17 / 21) | |
| bow-fire-arrows | AS | Burn + Bleed, Deadly Aim zahlt aus | 65k | 28.5 (**13** / **39**) | Mastery-Wahl ändert alles |
| bow-storm | AS | Pfeil-Menge + Cash In | **100k** | 27.3 (21 / 38) | zwei Extra-Pfeil-Quellen in einem Path |
| crossbow-venom-bolts | AS | Armor-durchschlagende Poison-Stacks | 67k | 22.7 (15.5 / 27.5) | |
| crossbow-incendiary | AS | Mighty Ballista Bolts + Burn | 74k | 19.0 (14 / 28.5) | Ballista Bolt 380 % statt 240 % |
| crossbow-frost | AS | Attack Speed + Chill | 55k | 20.0 (15 / 23) | |
| dagger-venom | AS | wiederholte 10-Stack-Toxic-Bloom-Bursts | 43k | 23.0 (19.5 / 29) | |
| dagger-cutthroat | AS | Crit-Bleeds | 34k | 16.5 (12 / 22) | Keystone Toxic Bloom ohne Poison = tot |
| dagger-static | AS | schnelle Stiche + Shock | 56k | 15.8 (12.5 / 21) | Toxic Bloom auch hier tot |
| wand-starfall | ES | Corruption-Ramp + Crit-Sparks | **173k** | **13.7** (8.5 / 18) | stärkster Build |
| wand-storm | ES | Shock-verstärkte Blitz-Spells | 153k | 19.3 (14 / 22) | |
| wand-rime | ES | Chill/Freeze-Kontrolle | 71k | 14.2 (9.5 / 16.5) | |
| staff-hollow | ES | dauerhafte riesige Corruption | 107k | 18.0 (14.5 / 23.5) | Act-7-Kämpfe 4–15 s |
| staff-smolder | ES | Burn + Combust | 54k | 25.8 (15 / 36.5) | Keystone Endless Night passt nicht (−30 %) |
| staff-glacial | ES | Skill-Spam | **50k** | 21.8 (13 / 31) | Endless Night auch hier tot |

DPS-Probe: Cheat-Endstand (Level 100, zufälliges Epic-Gear, 1 Seed), 30 s gegen den Dummy. Versuche: 2 Läufe, Seed 41,
Summe der neuesten Acts 1–7, Mittel über die 3 Masteries. Beides grob. Einzelwerte in `messung-2026-10-19.md`.

---

## 4. Befund: wo es ungesund ist

| # | Ursache | Woran man es sieht |
|---|---|---|
| B1 | **Keine Schadensformel mit Budget.** ~17 Faktoren multiplizieren sich, jede Ebene darf „more“ geben, Ash-Tree-Boni und Runen multiplizieren untereinander. | DPS ×10 zwischen Builds; 9 gleiche Runen = ×3.5; Heat-Schwellen-Boni aus 5 Quellen = ×2.9 ab 80 Heat |
| B2 | **DoTs zählen doppelt.** Sie erben jeden Treffer-Bonus (inkl. Crit, Execute) und haben eigene Töpfe darüber. | Ailment-Builds 72–95 % DoT; Warlock-Mastery 13.8 Versuche vs. Deadeye 24.0 |
| B3 | **Monster-Seite ist Ausgleich auf Ausgleich.** Level-Kurve teilt eine alte Helden-Kurve heraus, darauf Run Pressure, Wall (Run 1→2: 1.8 → 9), Kampflänge, Boss Life, endgameBoss (veraltet). | Harvester ×5451 Life; Boss-Life bekommt 2× „länger“, dann Schaden ×0.9 „weil länger“; Heavy Hit Cap greift fast immer |
| B4 | **Messgerät schielt.** Keine Keystones, 3 Skills, geteilte Bausätze, path-blinde Heirloom-Keystones, Dummy sieht keine Reaktiv-Werte. | Fixes an falscher Stelle (Smolder-Zahlen statt passendem Keystone); Tempo-Masteries nie Haupt-Mastery getestet |
| B5 | **Zu viele Einzelregeln.** ~110 WeaponRules, je eine Code-Verzweigung; gleiche Idee mehrfach. | 10 Arten „erzwungener Crit“, 5 Arten „extra Ailment“, 3 DoT-Auszahl-Formeln |
| B6 | **Identität verschwimmt.** Waffe und Default Attack tragen spät kaum; elementare Nahkampf-/Bogen-Builds haben keine eigenen Element-Skills; einige Paths machen fast keinen Schaden. | Default Attack 1–12 %; Smolder (Feuer-DoT) nur 8 % DoT; Axe Blaze / Staff Glacial ≈ ×1.0 |
| B7 | **Globale Regeln für eine Klasse gedreht.** | Barrier-Recharge wegen Emberseer; Monster-Resistance 10→20→30→10 % in 4 Tagen; Bosse Stun ×0.5, dann Mace-Sonderregeln dagegen |

---

## 5. Regeln, die wir hinterfragen

| Regel heute | Problem | 💡 Vorschlag |
|---|---|---|
| Ash-Tree-Bedingungsboni („X % more, wenn …“) multiplizieren sich | Hauptquelle Power Creep | **Ein gemeinsamer Topf „more“, additiv**. Ein Build hat dann z. B. „+120 % more“ statt ×3.9 |
| Jede Ebene darf eigene „more“-Faktoren haben | niemand sieht den echten Multiplikator | **Feste Töpfe**: Increased (Gear/Attribute), More (Tree/Mastery/Heirloom, additiv), Crit ×1.5, Skill-Faktor. Nichts außerhalb |
| DoT aus dem fertigen Treffer (inkl. Crit, Execute, alle „more“) | doppelt gezählt | DoT aus Treffer **vor** Crit und „more“; DoTs haben ihren eigenen, gleich großen Topf |
| Gleiche Rune in allen 9 Sockets | ×3.5 | jede Rune nur einmal im Ash Tree |
| Heat-Kosten ohne Untergrenze, Skills ohne Cooldown | ×5 Skills | Kosten mindestens 50 % |
| Refine erhöht den mittleren Wurf um ×1.3–1.7 | stärkstes Paket im Spiel | Range ändern ohne den Mittelwert zu heben (nur Streuung) |
| Class Traits frei bemessen | Fury ×1.2 vs. Hunter's Mark ×1.05 | gleiches Budget je Trait (≈ +15 %) |
| Ein Heirloom-Keystone je Waffe im Test-Build | passt bei 3 Builds nicht | Keystone je Path (Datenfehler, kein Balancing) |
| Monster-Level-Kurve aus alter Playtest-Kurve abgeleitet | versteckte Altlast | **eine explizite Tabelle** je Monster Level, aus dem Helden-Budget berechnet |
| Kampflänge × Boss Life × Boss-Schaden 0.9 × endgameBoss | heben sich auf | ein Faktor je Stage-Art (normal / Elite / Gatekeeper / Boss), endgameBoss weg |
| Wall-Stärke je Run einzeln (1.8, 9, 7.6, 9, 8.8, 7.8, 8) | Sprung Run 1→2, mehrfach nachgestellt | glatte Kurve aus einer Formel |
| Barrier-Recharge 3 s / 10 % (für Emberseer verschärft) | globale Regel für eine Klasse | Neu einstellen, wenn die Klassen-Budgets stehen |
| Bosse nehmen Stun ×0.5, Mace bekommt Sonderregeln zurück | Ausgleich auf Ausgleich | eine Regel: Bosse haben Stun-Widerstand, der mit jedem Stun steigt; Sonderregeln weg |
| Viele Einzelregeln je Node | Überblick weg | **Baukasten**: jede Node aus einer kleinen Liste von Effekt-Arten (z. B. 15–20) |

Bleibt 💡 (gesund): Crit fest ×1.5 · Increased % als ein Topf · Execute „nur der stärkste zählt“ · Lifesteal nur aus
eigenen Treffern · Evasion/Deflect-Regel · Heavy Hit Cap als Sicherheitsnetz · keine Belohnung für Tode.

---

## 6. Was „gesund“ heißt (Zielwerte für die Messung)

| Messgröße | Ziel 💡 | heute |
|---|---|---|
| Versuche je neuem Act (guter Build) | 6–8 (beschlossen 2026-10-12) | 2–14 je Act |
| Streuung der Builds einer Klasse | ±20 % um den Klassen-Mittelwert | ×2.7 (Cinderguard 13–35) |
| Streuung der Masteries | ±15 % | Warlock 13.8 bis Deadeye 24.0 |
| Kampfdauer Act 7 normal / Boss | 15–30 s / 45–90 s | 4–47 s / 11–111 s |
| Anteil Default Attack + Innate am Schaden | ≥ 30 % (die Waffe ist das Herz) | 1–12 % |
| DoT-Anteil bei Ailment-Builds | 50–70 % | 72–95 % |
| Endstärke gegenüber Monster gleichen Levels | ein Budget, das wir vorher festlegen | geschätzt ×650 statt ×23 |

---

## 7. Neuaufbau-Plan in Schritten 💡

Jeder Schritt ist ein eigener PR, hält `npm run check` und E2E grün und kommt vorher kurz zur Abnahme.

| # | Schritt | Inhalt | Ergebnis |
|---|---|---|---|
| 1 | **Ehrliches Messgerät** | Autopilot nimmt Keystones (Ash Tree, Mastery, Heirloom passend zum Path), nutzt alle Battle-Plan-Slots, jede Klasse lernt die Skills ihres Elements, Tempo-Masteries als Haupt-Mastery messbar. Neuer **Budget-Bericht** in der Balance-CLI: je Build Schaden aufgeteilt nach Töpfen, Anteil Default Attack / Skills / DoT, Kampfdauer gegen Zielwerte. **Ändert kein Balancing.** | eine Basis, der wir glauben |
| 2 | **Schadensformel mit festen Töpfen** | Sim: Treffer = Basis × (1 + Increased) × (1 + More) × Crit × Skill-Faktor; DoT aus Treffer vor Crit/More mit eigenem Topf; Runen einmalig; Heat-Untergrenze; bestehende Nodes in die neuen Töpfe übersetzen; doppelte Regeln zusammenlegen (ein „extra Ailment“, ein „erzwungener Crit“, eine DoT-Auszahlung) | Stärke ist lesbar, Creep strukturell gestoppt |
| 3 | **Monster aus dem Budget** | Budget je Run festlegen (z. B. „Run n: Held hat ×X aus Gear, ×Y aus Baum“); daraus eine Monster-Tabelle je Level; ein Faktor je Stage-Art; Walls als glatte Kurve; endgameBoss, doppelte Boss-Faktoren und alte Kurven-Reste weg | Monster folgen einer Regel, nicht dem letzten Fix |
| 4 | **Cinderguard neu** | Pro Build eine **Build-Karte** (Ziel, Heirloom-Path, Mastery, Ash-Tree-Nodes, Wunsch-Affixe, Runen, Battle Plan, Stärken/Schwächen). Trait, 9 Paths, 3 Masteries, Steel/Blood-Region in den Baukasten übersetzen, schwache Paths (Blaze, Stormwall) mit eigener Rolle, Elemente bekommen eigene Skills. Messen gegen Zielwerte | 9 faire Builds + Übersicht |
| 5 | **Ashstrider neu** | wie 4; Hunter's Mark auf Trait-Budget, Crit-Thema stützen, Blood-Bausatz durch eigene Element-Wege ersetzen | 9 faire Builds |
| 6 | **Emberseer neu** | wie 4; Warlock/Archmage-Ausreißer, Twin Cast, Cash In im neuen Topf-System neu bewerten | 6 faire Builds |
| 7 | **Gemeinsame Systeme + Endgame** | Items, Runenwörter, Powers, Boons, Ashborn auf das Budget; tote Inhalte raus; Finale und Wildfire messen; GDD und Build-Karten als Inhalts-Übersicht | fertig |

Reihenfolge-Logik: Ohne Schritt 1 messen wir weiter schief. Ohne Schritt 2 erzeugt jede Klassen-Änderung wieder neuen
Creep. Schritt 3 muss direkt nach 2 kommen, weil das Spiel nach 2 deutlich leichter wird (die Helden verlieren viel
Multiplikator). Danach Klasse für Klasse, so wie Timo es vorgeschlagen hat.

---

## 8. Fragen an Timo ❓

| # | Frage | 💡 Empfehlung |
|---|---|---|
| F1 | Plan in dieser Reihenfolge (Messgerät → Formel → Monster → Klasse für Klasse → Rest)? | Ja |
| F2 | Alle „more“-Boni aus Ash Tree, Mastery und Heirloom in **einen** additiven Topf? (Zahlen auf Karten bleiben „X % more“, sie addieren sich nur) | Ja |
| F3 | DoTs aus dem Treffer **vor** Crit und „more“ berechnen und ihnen einen eigenen gleich großen Topf geben? | Ja |
| F4 | Jede Rune nur einmal im Ash Tree? | Ja |
| F5 | Darf der Umbau Nodes und Paths streichen, die nur für eine Ausnahme existieren (Ziel: Baukasten statt ~110 Einzelregeln)? | Ja |
| F6 | Spielt die Waffe (Default Attack + Innate) auch spät eine tragende Rolle (≥ 30 % des Schadens)? | Ja |
