# Punkte als Icons (Icon Sheet 14, v1, 2026-10-27)

Timo: Punkte (Skill, Heirloom, Attribute) wie Währungen zeigen, Icon + Zahl, Name beim Hover.
Attribute Points haben schon ihr Icon (die zwei Glutsteine aus dem Harvest-Sheet). Skill Points nutzen bis
dahin einen Zweig aus dem Ash Tree, Heirloom Points das Waffen-Medaillon des Heirs. Beide sollen ein eigenes,
kleines Münz-Icon bekommen.

Ablage: `art/icons/points-sheet-v1.png`, transparentes PNG, so groß wie das Tool kann. Als Stil-Referenz
`art/currency/currency-sheet-v1.png` anhängen (die Icons stehen direkt neben Acorns und Ash).

| # | Icon | Motiv |
|---|---|---|
| 1 | Skill Point | ein Eschen-Samen (geflügelte "Ash Key"), Flügel mit Glut-Adern, der Samen glüht |
| 2 | Heirloom Point | ein kleiner Wetzstein aus grauem Stein, eine Kante glüht wie frisch geschliffene Glut |

## Prompt

```
A sprite sheet of 2 small game currency icons for a 2D fantasy video game, seen perfectly straight from the front, side by side with lots of empty space between them, transparent background. Each icon is one single free-standing object, no medallion or frame around it. They must stay readable at 20 pixels: simple strong silhouettes, high contrast, few details.
Use the attached image ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, warm earthy colors and ember glow, same size and line weight as those currency icons. Do not copy the objects in it.
Light from the top left.

1. A single winged ash tree seed (an "ash key"): one long thin papery wing in warm brown-orange with fine glowing ember veins, the small seed at its base glowing bright orange.
2. A small flat sharpening whetstone, slightly rounded grey stone bar lying diagonally, its upper edge glowing bright orange like fresh hot embers, two tiny sparks above it.

Do NOT include: any text, letters, numbers or runes; any character, animal or face; any background, scenery or cast shadow; perspective or tilt; photorealism; plastic or modern look.
```

Nach dem Upload schneide ich das Sheet nach `apps/web/src/assets/points/` und tausche die Platzhalter in
`apps/web/src/ui/kit/Points.tsx` aus (Kaelen, Ash Tree, Heirloom, Character Sheet, Charakter-Erstellung).
