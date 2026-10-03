# M10: Die Ernte (Umsetzung)

**Stand:** 03.10.2026 · PR #10 · Werte sind Startwerte für die Balance-CLI 💡

## Inhalt

- **Act 5 Storm Spires** (Lightning, Shock): Storm Sprite, Thunder Brute, Storm Caller, Static Golem (wirft jeden 5. Treffer zurück). Boss **Storm Herald**: Shock, Storm Mirror (jeder 5. Treffer kommt zurück, gedeckelt), Thunderclap alle 11 s.
- **Act 6 Void Rift** (Void, Corruption): Rift Stalker, Hollow Brute, Void Seer (Hex), Gloom Weaver. Boss **Voidborn Maw**: Corruption, die immer weiter wächst, Rift Snap alle 12 s, Hunger unter 30 % Life.
- **Act 7 Emberfall** (alle Elemente, 10 Stages, damit es 100 Stages sind): Ash Revenant, Ember Wraith, Harrow Hound, Cinder Knight. Final Boss **The Ashen Harvester** mit drei Phasen: Harvest Swing; ab 66 % Ash Aura, Rime Shell und Ashfall; ab 33 % Storm Mirror, Endless Hunger, Reaping Frenzy und Last Harvest. Jeder Act-Boss steckt in ihm.
- **Mace** (Melee, Physical, Stagger: jeder 4. Angriff betäubt 0,5 s) und **Staff** (Ranged, Void, Warming, Start Skill Void Bolt) als Loot-Waffen.
- Neue Bausteine im Sim: **Stun** (Tenacity verkürzt ihn), **Reflect** (gedeckelt über die Life des Angreifers), Trigger "Every Nth Hit Taken", Boss-Phasen (`belowLife` an Triggern und Telegraphs), Skill-Effekte **Barrier** und **Stun**, Trigger an Skill-Tree-Nodes.

## Battle Plan (skills-v1.md Abschnitt 6)

Ein Upgrade pro Prestige. Die Reihenfolge steht in einer Tabelle (`BATTLE_PLAN_START` und `BATTLE_PLAN_LADDER` in `packages/sim/src/progression/battle-plan.ts`). Unlocks, Kaelen-Ansicht und Inheritance lesen alles daraus, ein Upgrade lässt sich also mit einer Zeile verschieben (z. B. wenn der Vorschlag "Battle Plan früher freischalten" kommt).

| Prestige | Upgrade |
| --- | --- |
| 1 | Rotation Slot 2 |
| 2 | Trigger Threshold (pro Slot "Fires at Heat") |
| 3 | Rotation Slot 3 |
| 4 | Reaction Slot 1 |
| 5 | Slot Modifiers (Thrifty, Empowered, Reverb, Overcharge) |
| 6 | Rotation Slot 4 |
| 7 | Reaction Slot 2 |
| 8 | Rotation Conditions ("Only if") |
| 9 | 2. Slot Modifier |
| 10 | Capstone (1 von 6, Wechsel kostet 200 Gold) |

- Reaction Slots: Fight Start, Life unter 50/30 %, Enemy winds up, Enemy unter 30 %, eigenes Ailment. 10 s Cooldown, zahlen aus derselben Heat-Leiste und gehen vor dem nächsten Rotation Skill.
- Im Kampf stehen die Reactions rechts neben der Rotation (gestrichelt, mit Cooldown).
- Speicherstand v6: alte Spielstände bekommen einen leeren Battle Plan.

## Prestige-Äste (skill-tree-v1.md Abschnitt 3)

Zehn Äste, einer pro Prestige, gewählt im neuen Schritt **Bloodline** zwischen Victory und Seal. Jeder Ast hängt an einem Node seines Grundasts, hat 10 Nodes (16 Skill Points + 1 Keystone), einen eigenen Skill und einen eigenen Keystone.

| Ast | hängt an | Skill | Keystone |
| --- | --- | --- | --- |
| Duelist | Brutal Force | Feint | Blade Dancer (Crit Chance ×1,5, +15 % Damage Taken) |
| Marksman | Killer Instinct | Piercing Shot | Patient Hunter (Default Attack +40 %, Skills +30 % Heat) |
| Butcher | Butcher | Cleave | Exsanguinate (+40 % unter 35 % Life, +10 % Damage Taken) |
| Venomancer | Venomancer | Plague Cloud | Plaguebearer (DoT +30 %, 5 % DoT-Lifesteal, Default Attack −30 %) |
| Stormcaller | Storm Weaver | Thunderstrike | Eye of the Storm (Burn und Chill schocken auch) |
| Frostbinder | Frost | Frost Nova | Winter's Grasp (Burn und Shock chillen auch) |
| Pyromancer | Pyromancer | Inferno | Pyre (DoT +25 %, +10 % Damage Taken) |
| Void Lord | Void Lord | Void Rift | Event Horizon (DoT +20 %, 8 % DoT-Lifesteal, Default Attack −30 %) |
| Warden | Iron Will | Iron Bastion | Juggernaut (−15 % Damage Taken, Default Attack −20 %) |
| Tactician | First Spark | Rally | Grand Strategy (Skills −20 % Heat, +10 % Damage Taken) |

Bei Kaelen hat der Skill Tree zwei Ansichten: **Base Tree** und **Prestige Branches** (alle zehn als kleine Ketten, gesperrte gedimmt).

## Boss-Fähigkeiten pro Prestige

Ein Act-Boss bekommt pro Prestige nach dem Run, in dem sein Act dazukam, eine Fähigkeit aus einer Liste von zehn (Hardened, Frenzied, Ashen Shell, Leeching, Ember Brand, Unstoppable, Second Wind, Retribution, Cruel, Kindled). Jeder Act fängt an einer anderen Stelle der Liste an. Sie stehen wie Elite-Modifier auf der Boss-Plakette. In den Ascension-Runs (8–10) bekommt so auch der Harvester neue Fähigkeiten.

## Balance

Der Autopilot nutzt jetzt den Battle Plan (Rotation, Modifier, eine Reaction, Capstone) und wählt Prestige-Äste passend zur Waffe. Level Band: Start = alter Cap − 15 − 5 pro weiterem Prestige.

`npm run balance -- --act 7 --generations 7 --runs 12` (alle Acts in allen Runs 100 % geschafft):

| Run | neuester Act | Tode Sword | Tode Wand | Boss-Kampf |
| --- | --- | --- | --- | --- |
| 1 | Ashen Fields | 0,6 | 2,8 | 34–39 s |
| 2 | Rotwood | 0,3 | 0,0 | 18–19 s |
| 3 | Ember Wastes | 0,0 | 0,0 | 26–35 s |
| 4 | Frost Peaks | 0,0 | 0,2 | 28–31 s |
| 5 | Storm Spires | 0,0 | 0,1 | 18–26 s |
| 6 | Void Rift | 0,0 | 0,1 | 18–23 s |
| 7 | Emberfall (Harvester) | 1,0 | 5,9 | 24–31 s |

Offen: Der Harvester ist für die Wand die größte Hürde (rund 80 % ihrer Tode in Run 7). Das ist als Finale gewollt, kann nach dem Playtest aber weicher werden.
