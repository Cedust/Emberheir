# Camp-Personas nach und nach – Vorschlag v1 (2026-10-27)

## Stand heute (Code, main f903424)

| Persona | Kann | Im Camp ab |
| --- | --- | --- |
| Eldrin (Scout) | Aufbruch, Road, Bounties, Draughts (ab Prestige 1) | Start (Pflicht) |
| Supply Wagon / Heir | Stash, Charakter | Start (Pflicht) |
| Hearthfire | Legacy (Worn Gear, Collections, Lineage) | Start |
| Old Nan | Reset Attributes / Ashborn (Acorns) | Start |
| Thoric | Schmiede (Crafting) | Start |
| Marisha | Black Market (Base Items, Gamble) | Start; zusätzlich 60 % pro Map als Knoten "marisha" auf dem mittleren Abschnitt |
| Kaelen + Training Dummy | Ash Tree, Battle Plan, Mastery / Build testen | Start |
| Liora (Mystic) | Crucible | nach dem ersten Act-Boss (`trainerUnlocked`) |
| Nyssa (Runesmith) | Runen | nach dem ersten Ausflug nach Rotwood (`runesmithUnlocked`) |

Beim allerersten Camp stehen also schon 7 Figuren + 2 Objekte da. Skill Points gibt es erst ab Waymark 5,
Marishas Gamble braucht Ember Coal, Nans Resets brauchen ausgegebene Punkte: vieles ist am Anfang leer.

## Vorschlag

**Ab Start nur:** Heir, Wagon, Hearthfire, Old Nan, Thoric, Eldrin.
Nan ist die Hüterin des Feuers (Anker der Karawane), Thoric gehört zur Item-Schleife (Kern des Spiels), Eldrin bringt dich los.

| Wer | Treffen | Story Blip (Idee, Ton: leichter Humor) | Danach |
| --- | --- | --- | --- |
| Kaelen + Dummy | Run 1, Waymark 5 (nach dem Gatekeeper), fest | Der Wolf kommt keuchend angerannt, als der Gatekeeper schon liegt. *"I was on my way. The battle was faster."* | im Camp: Ash Tree, Battle Plan, Mastery, Dummy. Passt zu seinem Spruch "Late to one battle." Erste Skill Points kommen genau hier. |
| Marisha | Ihr Map-Knoten, der ohnehin existiert. Bis sie dabei ist: Knoten auf jeder Map garantiert | 1. *"A customer! A living one!"* – sie verkauft, misstrauisch. 2. Sie sitzt auf der überquellenden Truhe, Deckel klemmt. 3. *"Your fire. Room for one more? And my chest?"* | im Camp: Black Market |
| Liora | erster Act-Boss (wie heute) | Aus der Asche des Bosses hoppelt ein Mondhase: *"I foresaw this. I also foresaw you needing me."* | Crucible |
| Nyssa | erster gewonnener Kampf in Rotwood (umgesetzt so statt eigenem Event-Knoten) | Eichhörnchen auf runengeritztem Stumpf: *"These runes are older than the Harvester. Want to know more? No? I'm coming anyway."* | Runen |

**Entschieden (Timo 2026-10-27):** Marisha zieht nach dem 3. Treffen ins Camp (drei Szenen).

## Story Blip (Backlog-Idee) als Baustein

- Kleine Szene auf der Map oder nach einem Kampf: gemaltes Portrait, 1–2 Zeilen, ein Button ("Welcome aboard"). Keine Wahl, kein Lesezwang.
- Läuft pro Save einmal (Flag `met`), Personas bleiben über jedes Prestige.
- Gleiche Optik wie Events/Nan-Dialog (kit Dialog), damit kein neues UI nötig ist.
- Später erweiterbar für andere Story Blips (erster Tod, erstes Prestige, Harvester), wenn Timo will.

## Technik (später, nach OK)

- `progress.met: PersonaId[]` statt `trainerUnlocked`/`runesmithUnlocked` (Achtung: `trainerUnlocked` schaltet heute Liora, nicht Kaelen frei). Save-Bump + Migration: alte Saves bekommen alle bisher freigeschalteten Personas, Kaelen/Marisha/Thoric immer (niemand verliert etwas).
- Map-Generator: Marisha-Knoten garantiert solange nicht `met`, Nyssa-Event fest auf der ersten Rotwood-Map.
- Camp: nicht getroffene Personas bleiben versteckt (wie heute).
- Autopilot/Balance: Kaelen fehlt nur Stage 1–4, da gibt es noch keine Skill Points; Marisha-Gamble erst später spart sogar etwas Economy-Flut (Economy-Audit).
- Jeder Blip bekommt einen kleinen Pixi-Effekt (Ankunft, Staubwolke, Mondlicht).
