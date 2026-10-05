# Skill Tree v2: Vertiefen, Resonanz, wachsender Baum (Konzept, 2026-10-05)

Ersetzt den Prestige-Teil von `skill-tree-v1.md` und die separate Ansicht „Prestige Branches“ bei Kaelen.
Herleitung: `notes/build-archetypen.md`, `notes/prestige-fokus-optionen.md` (im Projektordner). Zahlen sind Startwerte für die Balance-CLI.

## 1. Regeln

**Prestige-Wahl (Bloodline-Schritt):** Jedes Prestige ist genau eine von zwei Wahlen:
- **Neuer Ast**: einer der 10 Prestige-Äste, Stufe I (wie heute: 10 Nodes, Keystone).
- **Vertiefen**: ein eigener Ast eine Stufe höher (I → II → III). Pro Prestige höchstens eine Stufe, Stufe III also frühestens 2 Prestiges nach Stufe I.

**Was eine Vertiefung bringt:**
1. Einen **neuen Abschnitt** mit 3 Nodes, der außen an den Ast wächst (Minor mit 2 Rängen, Notable, Minor mit 2 Rängen). Kein Nachskillen des alten Wegs.
2. **+1 Max-Rang** auf alle Minor-Nodes des Asts aus den früheren Stufen.
3. Den **Keystone eine Stufe höher**: I → Greater → Supreme. Stärkerer Vorteil, gleicher Nachteil. Kostet wie ein Keystone 1 Harvester's Ember.

**Kosten:** Nur Minor-Nodes bekommen den Extra-Rang. Neuer Ast 16 Skill Points + 1 Ember; Stufe II ca. 10 Skill Points
(5 Minor +1 Rang, 3 neue Nodes = 5) + 1 Ember; Stufe III ca. 12 (7 Minor +1 Rang, 3 neue Nodes = 5) + 1 Ember.
Ein Ast auf III kostet 38 Punkte, drei Äste auf I kosten 48: Fokus ist etwas günstiger, die Differenz geht in den Basis-Baum.

**Resonanz:** ein einzelner Ast schafft höchstens 3; 4 und 6 belohnen, beide Prestige-Äste eines Basis-Asts zu vertiefen. Gezählt werden alle Stufen der Prestige-Äste, die am selben Basis-Ast hängen
(Might: Duelist, Marksman · Rupture: Butcher, Venomancer · Arcana: Stormcaller, Frostbinder ·
Affliction: Pyromancer, Void Lord · Core: Warden, Tactician).

| Resonanz | Wirkung |
| --- | --- |
| 2 | Themen-Bonus des Basis-Asts (Tabelle unten) |
| 4 | Nachteil des Basis-Keystones halbiert |
| 6 | Vorteil des Basis-Keystones +50 % (bzw. Zusatzeffekt) |

| Basis-Ast | Resonanz 2 | Resonanz 4 | Resonanz 6 |
| --- | --- | --- | --- |
| Might | +10 % Physical Damage | Glass Focus: +10 % statt +20 % Damage Taken | Glass Focus: zusätzlich +10 % Heat Gain |
| Arcana | +10 % Elemental Damage | Arcane Conduit: Default Attack −25 % statt −50 % | Arcane Conduit: Skills −40 % statt −30 % Heat |
| Rupture | +15 % Ailment Duration | Blood Price: Crit Chance ×0,75 statt ×0,5 | Blood Price: Crit-Bleeds ×1,5 |
| Affliction | +15 % Ailment Duration | Slow Death: Default Attack −15 % statt −30 % | Slow Death: Ailments +75 % statt +50 % |
| Core | +10 % Life | +10 Starting Heat | −10 % Damage Taken |

Max. 7 Stufen gesamt, also z. B. Butcher I–III + Venomancer I–III = Rupture-Resonanz 6, plus ein freier Pick.

## 2. Inhalt der Vertiefungen (Stufe II / III)

Format: Minor · Notable · Minor · Keystone-Stufe. Nutzt nur vorhandene Bausteine (Trigger, Combat Rules).

| Ast | Stufe II | Stufe III |
| --- | --- | --- |
| **Duelist** | Blade Edge (+3 % Crit/Rang) · **Counterstance** (ersetzt Riposte: 200 % Weapon Damage, Cooldown 0,5 s) · Light Feet (+3 % Evasion/Rang) · Greater Blade Dancer: Crit ×1,75 | Fencer's Grace (+4 % Attack Speed/Rang) · **Flourish** (Crits: +10 % Phys. Damage für 3 s, bis 3×) · Cold Steel (+5 % Phys. Penetration/Rang) · Supreme Blade Dancer: Crit ×2 |
| **Marksman** | Long Draw (+6 % Phys. Damage/Rang) · **Hail of Arrows** (ersetzt Volley: jeder 3. Angriff) · Fletcher's Eye (+3 % Crit/Rang) · Greater Patient Hunter: Default Attack +55 % | Rapid Nock (+4 % Attack Speed/Rang) · **Kill Shot** (+40 % Schaden unter 35 % Gegner-Life) · Broadhead (+4 % Bleed Chance/Rang) · Supreme Patient Hunter: Default Attack +70 % |
| **Butcher** | Rending (+5 % Bleed Chance/Rang) · **Gash** (Crits bluten immer) · Iron Gut (+20 Armor/Rang) · Greater Exsanguinate: +55 % unter 35 % Life | Carver (+8 % Phys. Damage/Rang) · **Bloodbath** (ersetzt Hemorrhage: jeder 2. Angriff blutet) · Leech (+2 % Lifesteal/Rang) · Supreme Exsanguinate: +70 % unter 40 % Life |
| **Venomancer** | Neurotoxin (+5 % Poison Chance/Rang) · **Festering** (alle 5 s ein Poison) · Viper Blood (+5 % Tenacity/Rang) · Greater Plaguebearer: DoT +40 %, heilt 6 % | Corrosive (+10 % Ailment Duration/Rang) · **Pandemic** (Skills poisonen immer) · Fang Speed (+4 % Attack Speed/Rang) · Supreme Plaguebearer: DoT +50 %, heilt 8 % |
| **Stormcaller** | Charge (+6 % Elem. Damage/Rang) · **Chain Reaction** (Treffer: 15 % Chance auf Extra-Hit 80 %) · Grounding (+8 % Lightning Res/Rang) · Greater Eye of the Storm: Default Attack nur −10 % | Ionize (+3 % Elem. Penetration/Rang) · **Thunderhead** (ersetzt Storm Surge: alle 4 statt 6 s) · Static Field (+5 % Shock Chance/Rang) · Supreme Eye of the Storm: zusätzlich Corruption → Shock |
| **Frostbinder** | Hoarfrost Edge (+6 % Elem. Damage/Rang) · **Glacial Prison** (jeder 5. Angriff: 0,5 s Stun) · Frozen Blood (+5 % Tenacity/Rang) · Greater Winter's Grasp: Default Attack nur −10 % | Deep Cold (+10 % Ailment Duration/Rang) · **Cryo Shell** (ersetzt Frost Armor: 25 % Barrier) · Rimecraft (+5 % Chill Chance/Rang) · Supreme Winter's Grasp: zusätzlich Bleed → Chill |
| **Pyromancer** | Stoke (+5 % Burn Chance/Rang) · **Firestorm** (ersetzt Wildfire: 60 %) · Cinder Skin (+4 % All Res/Rang) · Greater Pyre: Ailments +35 % | Kindler (+6 Starting Heat/Rang) · **Conflagration** (Treffer: 20 % Chance auf Burn) · Blaze (+6 % Elem. Damage/Rang) · Supreme Pyre: Ailments +45 % |
| **Void Lord** | Umbra (+4 % Corruption Chance/Rang) · **Singularity** (ersetzt Entropy: alle 3 s) · Void Ward (+4 % All Res/Rang) · Greater Event Horizon: DoT +30 %, heilt 10 % | Abyssal (+6 % Elem. Damage/Rang) · **Hunger** (ersetzt Devour Light: 5 % Heal) · Night Eternal (+10 % Ailment Duration/Rang) · Supreme Event Horizon: DoT +40 %, heilt 12 % |
| **Warden** | Bastion (+3 % Block/Rang) · **Shield Wall** (Block: Barrier 5 % max Life, Cooldown 2 s) · Reinforced (+20 Armor/Rang) · Greater Juggernaut: −20 % Damage Taken | Stoneheart (+20 Life/Rang) · **Vengeance** (ersetzt Retaliation: 50 %, Grenze 5 %) · Rampart (+3 % Block/Rang) · Supreme Juggernaut: −25 % Damage Taken |
| **Tactician** | Foresight (+5 Starting Heat/Rang) · **Second Wind** (einmal pro Kampf unter 40 % Life: +40 Heat) · Cadence (+5 % Heat Gain/Rang) · Greater Grand Strategy: Skills −25 % Heat | Precision (+3 % Trigger Chance/Rang) · **Masterplan** (ersetzt Refund: 40 % Chance) · Quickstep (+4 % Attack Speed/Rang) · Supreme Grand Strategy: Skills −30 % Heat |

Alles mit vorhandenen Sim-Bausteinen; neu in der Sim sind nur Ast-Stufen, `replaces` (eine Node ersetzt Trigger/Regeln einer anderen), Regeln auf normalen Nodes und Resonanz (mit Unit-Tests).

## 3. UI: neuer Skilltree (PixiJS)

**Grundsatz:** ein einziger Baum. Basis-Baum in der Mitte, gewählte Prestige-Äste wachsen an ihrem Anker-Node nach außen,
jede Vertiefung setzt einen Abschnitt weiter außen an. Nicht gewählte Äste sind unsichtbar. Der Baum wird mit jedem Prestige sichtbar größer.

**Technik:** PixiJS v8 (schon im Projekt), eigene Kamera oder `pixi-viewport`. Tooltips, Punkte-Anzeige, Confirm/Undo bleiben React-Overlays.
Layout in Stage-Pixeln wie der Rest (`Stage.tsx`), also gleich auf 1080p und 4K.

**Bedienung:**
- Ziehen = verschieben, Mausrad/Pinch = Zoom (ca. 0,35× bis 2×), mit Trägheit.
- Buttons: +/−, „Fit“ = ganzer Baum, „Heart“ = zurück zu Heir's Heart.
- Hover zeigt Name, Stufe und Beschreibung (Pfad-Vorschau: später).
- Klick = auswählen, Doppelklick = Rang vormerken (Pending), Confirm/Undo wie heute.
- Level of Detail: rausgezoomt nur Formen und Farben, ab ca. 1× Node-Namen.

**Node-Farben (Timo 2026-10-05):**

| Zustand | Look |
| --- | --- |
| Unavailable | Dunkelgrau, kein Leuchten |
| Available | Normal-Weiß, pulsierend |
| Gelernt, Stufe I | Magic-Blau |
| Stufe II | Rare-Gelb |
| Stufe III | Epic-Lila |
| Keystone | Legendary-Orange auf jeder Stufe; Stufe über 1–3 Rahmenringe (III mit Krone), 1–3 Glut-Punkte, stärkeres Leuchten, auf III aufsteigende Funken |

Basis-Baum-Nodes zählen als Stufe I (Blau). Formen: Minor rund, Notable größer mit Doppelrand, Skill-Node als Raute mit Skill-Icon, Keystone groß und achteckig.
Light/Dark Mode nutzen die dunkleren Raritäts-Textfarben aus `ui-look-v1.md`, Rahmen/Glow die hellen.

**Verbindungen:** dunkle Linie wenn nicht gelernt, glühende Linie (Ember-Farbe, Additive Blend) wenn beide Enden gelernt.

**Effekte (PixiJS-Regel):** Lernen = kurzer Funkenstoß + Linie „brennt“ zur Node; neuer Abschnitt nach Vertiefen wächst animiert aus dem Ast; Keystone Supreme mit Partikeln. Alles respektiert `prefers-reduced-motion`.

**Bloodline-Schritt:** zeigt den Baum gezoomt; „Neuer Ast“ und „Vertiefen“ blenden die Vorschau als Geister-Nodes am Ziel-Anker ein, Kamera fährt hin.

**Kaelen:** Tab „Skill Tree“ wird die neue Ansicht; die eigene Ansicht „Prestige Branches“ entfällt. Battle-Plan-Tab bleibt.

## 4. Daten und Save

- `SkillNode` bekommt `tier`, `replaces` und `rules`; Prestige-Äste definieren Stufe II/III im selben `BranchSpec` (`t2`, `t3`) und einen Winkel, unter dem sie aus dem Baum wachsen.
- `legacy.branches` bleibt die Liste der Prestige-Wahlen; ein vertiefter Ast steht einmal pro Stufe drin (`branchTier`). Keine Save-Migration nötig.
- Keystone-Stufen sind eigene Nodes (`pb-<id>-keystone-2/3`), die den vorherigen Keystone ersetzen (nur die höchste gilt).
- Resonanz wird aus `branchTiers` berechnet und als Combat Rules / Stat-Bonus gemerged.
- Layout: Prestige-Äste starten auf einem Ring außerhalb des Basis-Baums (Radius 8,2), Stufe II/III weiter außen.
- Die Baum-Fläche bleibt in beiden Modi dunkel, weil die hellen Raritätsfarben nur auf dunklem Grund funktionieren.

## 5. Offene Punkte

- Balance der Greater/Supreme-Keystones und Resonanz-Werte (Balance-CLI `--act 7 --generations 7`).
- Ob Respec beim Trainer auch Vertiefungen umverteilen darf (Vorschlag: nein, Stufen sind permanent; Punkte darin ja).
