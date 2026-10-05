# M9: Act 3 + 4, Affliction, Bow/Crossbow (Umsetzung)

**Stand:** 02.10.2026 · PR #10 · Werte sind Startwerte für die Balance-CLI 💡

## Inhalt

- **Act 3 Ember Wastes** (Fire, Burn): Cinder Imp, Magma Brute, Flame Caller, Obsidian Guard (Barrier unter 50 % Life). Boss **Cinder Tyrant**: Fire Aura alle 2 s, Eruption alle 12 s, Enrage unter 30 % Life. Loot bevorzugt Fire Resistance.
- **Act 4 Frost Peaks** (Cold, Chill): Frost Wolf, Ice Golem (Thorns), Rime Witch, Frost Warden (Ice Wall alle 10 s). Boss **Rime Warden**: Chill, Ice Barrier bei 75/50/25 % Life, Avalanche alle 12 s. Loot bevorzugt Cold Resistance.
- Acts öffnen nach dem Prestige-Modell: Run 3 = Acts 1–3, Run 4 = Acts 1–4.
- **Affliction-Branch** (Skill Tree, 12 Nodes): Immolate, Corrupt, Wither (Curse: mehr DoT-Schaden), Soul Harvest; neues Ailment **Corruption** (Void, steigt mit der Zeit), Affix "Blighted" (Corruption Chance).
- **Bow, Crossbow** als Loot-Waffen, **Quiver** als ihr Off Hand (Focus nur noch für Wands).

## Balance: Run Pressure

Ohne Anpassung war der neueste Act jedes Runs der leichteste: Nach dem Prestige startet der Held ohne Gear, ist im ersten Act knapp dran und am Run-Ende mit vollem Gear und Level Cap weit überlegen.

- **Run Pressure** (`PROGRESSION.runPressure`): Entlang des Runs bekommen Monster bis zu +25 % Life und +15 % Damage pro Act nach dem ersten. Run 1 bleibt unverändert, in Run 4 hat der Final Boss +75 % Life und +45 % Damage.
- **Level Band** startet jetzt 15 statt 10 Level unter dem alten Cap, damit das Neu-Ausrüsten am Run-Anfang keine Wand ist.
- Act-3- und Act-4-Gegner haben etwas mehr Life und Damage als Act 2.

`npm run balance -- --act 4 --runs 40` (alle Acts 100 % geschafft):

| Run | neuester Act | Tode Sword | Tode Wand | Boss-Kampf |
| --- | --- | --- | --- | --- |
| 1 | Ashen Fields | 0,5 | 2,0 | 33 s |
| 2 | Rotwood | 0,4 | 0,8 | 21–24 s |
| 3 | Ember Wastes | 0,1 | 0,2 | 28–32 s |
| 4 | Frost Peaks | 0,1 | 1,2 | 40–44 s |

Offen: Der erste Act in Run 4 hat lange Kämpfe (ca. 50 s), weil der Held ohne Gear startet. Das ist das gewollte "Neu-Anfangen"-Gefühl, kann aber mit mehr Playtest-Daten weicher werden.
