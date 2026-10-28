# Heat Form im Heirloom: gemalte Esse (Sheet 13, v1, 2026-10-27)

## Heute

Unter der Waffe steht ein **code-gezeichneter Eisentrog** mit Kohlen. Die vier Heat Forms sind darin nur
kleine Ringe mit einem Bogen; die gewählte Form brennt als Code-Flamme. Probleme:

- klein und flach, wirkt neben der gemalten Waffe wie ein Platzhalter;
- die vier Formen sehen gleich aus, nur der Name darunter unterscheidet sie;
- die schon gemalten Heat-Form-Icons (Holzscheite, Hufeisen, Laterne, glimmendes Holz aus
  `art/icons/heat-sheet-v1.png`) tauchen hier gar nicht auf;
- die Messinglinie des Trogs läuft quer durch die Ringe, die Namen stehen auf dem Trog.

## Vorschlag

Eine **gemalte Schmiede-Esse** aus Stein und Eisen ersetzt den Trog, etwa 1,5× so breit wie heute.

- Oben in der Esse **vier runde Glutschalen** nebeneinander. In jeder liegt das gemalte Icon ihrer
  Heat Form (gibt es schon).
- **Gewählte Form:** ihre Schale brennt. Pixi-Feuer in der Farbe der Form (Steady gold, Cooling
  eisblau, Warming hellrot, Smoldering dunkelrot) mit Partikeln und Glühen, das Icon leuchtet, die
  Kohlerisse der ganzen Esse glühen in derselben Farbe. Das Licht hinter der Waffe färbt sich wie heute.
- **Andere Formen:** Icon abgedunkelt, nur ein schwaches Glimmen. Beim Hover wird es etwas heller.
- **Vor Weapon Rank 3:** die drei anderen Schalen tragen einen **Eisendeckel** (gemalt), Steady brennt allein.
  Ab Rank 3 klappen die Deckel weg.
- **Wechsel der Form:** ein Funkenbogen springt von der alten in die neue Schale, dann zündet sie (nur
  Effekt, kein Spieltext).
- Namen kommen **unter** die Esse auf kleine gemalte Namensschildchen (Stück aus dem UI-Rahmen),
  der Titel HEAT FORM auf das große Namensschild. Die Beschreibung bleibt im Tooltip.

Nur **ein neues Sheet** nötig (Esse + Deckel). Feuer, Glühen und Funken macht der Code.

## Prompt (Sheet 13)

Ablage: `art/icons/heat-forge-sheet-v1.png`, transparentes PNG, so groß wie das Tool kann.
Als Stil-Referenz `art/ui/benches/anvil-v1.png` anhängen (gleiche Werkbank-Optik wie Thorics Amboss).

```
Two separate game assets for a 2D fantasy video game on a transparent background, with lots of empty space between them: the big forge on the left, the small lid on the right.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, same warm colors, same level of detail. Do not copy the object in it.
Light from the top left. Seen from the front and slightly from above, so the tops of the bowls are visible as flat ovals.

1. A wide, low blacksmith's forge hearth, about four times as wide as it is tall. Rough grey fieldstone base with dark mortar, a heavy black iron rim with brass rivets running along the top. Set into the top in one straight row are four identical round shallow iron fire bowls with brass rims, evenly spaced, each filled with dark, cold, unlit charcoal. Small iron bellows lean against the left end. The forge is cold: no fire, no glow, no smoke, no sparks.
2. One round iron lid that fits exactly on top of one of the fire bowls: dark hammered iron, a simple cross-shaped brass handle, four rivets around the edge, seen from the same angle as the bowls.

Do NOT include: any fire, flame, glow, embers, smoke or sparks; any text, letters, numbers or runes; any character, animal, hand or tool other than the bellows; any background, floor, scenery or cast shadow; photorealism; plastic or modern look.
```

## Wenn das Sheet da ist

`tools/art/cut_heat_forge.py` schneidet Esse und Deckel nach `apps/web/src/assets/mastery/`, ich messe die
Mitte der vier Schalen aus, setze die Heat-Form-Icons hinein und baue Feuer/Glühen/Funken in
`MasteryScene.ts` (statt `drawForge` und dem Code-Trog). Screenshot hell und dunkel im PR.
