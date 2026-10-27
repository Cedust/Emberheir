# Eldrin's Cache: gemaltes Prop (v1, 2026-10-27)

Für Eldrin's Cache im Road-Fenster (Bounties v2, PR #115). Heute stehen dort nur die drei Item-Karten,
rechts daneben ist Platz frei. Das Prop füllt diesen Platz und gibt dem Moment "Bounty eingelöst"
ein eigenes Bild, wie Marishas Mystery Crate unter dem Gamble-Raster.

Idee: Eldrin ist ein Rabe. Raben horten Glänzendes. Sein Cache ist ein Versteck aus dem Rabennest:
eine kleine Truhe in einem Nest aus Zweigen, mit seinem grünen Umhang-Stoff und Rabenfedern.

Zwei Bilder vom selben Prop:

| # | Datei | Wo im Spiel |
|---|---|---|
| 1 | `art/ui/benches/eldrins-cache-closed-v1.png` | Bounty erfüllt, noch nicht eingelöst (Turn In) |
| 2 | `art/ui/benches/eldrins-cache-open-v1.png` | Eldrin's Cache offen, die Item-Karten liegen daneben |

Als Stil-Referenz `art/ui/benches/mystery-crate-v1.png` anhängen (gleiches Prop-Format) und
`art/personas/eldrin-v1.png` (Eldrins grüner Umhang und Federn). Bild 2 am besten als Bearbeitung
von Bild 1 erzeugen, damit es dieselbe Truhe bleibt.

## Prompt 1 (geschlossen)

```
A single prop for a 2D fantasy video game, square 1:1, front view seen slightly from above, centered with margin, transparent background.
Use the attached images ONLY as a style reference: same hand-painted storybook game art style, same clean dark ink outlines, soft cel shading, warm earthy colors, same level of detail and same line weight. Do not copy the objects in them.
Light from the top left.

Prop: a raven's hidden stash. A small, weathered wooden chest with aged brass corners and a simple brass latch, sitting in a messy round nest of dark twigs. A torn strip of moss-green hooded-cloak cloth is tied around the chest with twine, knotted on top, and two glossy black raven feathers are tucked under the knot. Around the chest in the nest lie a few shiny trinkets a raven would collect: a small brass button, a bit of a broken copper chain, a smooth glowing ember stone. The lid is closed.

Do NOT include: any text, letters, numbers or runes; any character, bird or animal; coins, cards, dice; any background, floor or cast shadow; perspective tilt; photorealism; plastic or modern look.
```

## Prompt 2 (offen)

Bild 1 anhängen und so bearbeiten:

```
Edit the attached image. Keep the same chest, nest, cloth, feathers and trinkets, same style, same angle, same size, transparent background.
Change only: the twine is untied and hangs loose, the lid is open and leaning back, and a warm golden-orange glow rises from inside the chest. The inside of the chest is empty except for the glow.

Do NOT include: any text, letters, numbers or runes; any character, bird or animal; any item inside the chest; coins, cards, dice; any background, floor or cast shadow.
```

Nach dem Upload schneide ich beide Bilder frei (`apps/web/src/assets/benches/eldrins-cache-*.webp`) und setze
sie ein: die geschlossene Truhe in den "Bounty done"-Hinweis, die offene rechts neben die Item-Karten.
Der Glow bekommt im Spiel noch ein leichtes Pulsieren per Code.
