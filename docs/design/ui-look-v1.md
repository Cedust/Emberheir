# UI-Look v1 (entschieden 30.09.2026)

Moodboard: https://claude.ai/artifact/R8rvHLdbWYReFXacnfD6iH

## Modi
Zwei Modi, wählbar in den Einstellungen. Standard folgt der System-Einstellung des PCs (prefers-color-scheme).

| Token | Light Mode · Aged Parchment | Dark Mode · Scorched Parchment |
|---|---|---|
| bg | #d9c6a0 | #1c1a18 |
| panel | #e6d6b4 | #2a2622 |
| edge | #a88d62 | #6a4a2c |
| text | #2a1f17 | #ecdfc4 |
| text-sub | #5e4a36 | #b3a288 |
| accent | #a8401a (Siegelrot) | #ff8a3a (Glut) |
| accent-2 | #7a5a24 | #e8c07a |

- Beide mit feiner Papierkörnung. Dark Mode: verkohlte Ränder (dunkle Inset-Schatten) und leichte Glutkante.
- Kein Braun, kein Lila, kein Petrol als Grundton (Void/Epic sind lila, Petrol ist zu nah an Rotwood).

## Schrift
- Titel: **Cinzel**
- Text: **Alegreya Sans**
- Zahlen/Daten: JetBrains Mono (Vorschlag)

## Rarities
| Rarity | Original (Dark Mode, Rahmen, Glow) | Schrift im Light Mode |
|---|---|---|
| Normal | #d8d4cc | #5a5550 |
| Magic | #5b8cff | #2d5bd0 |
| Rare | #ffd84a | #a86f00 (Amber, gegen Olivstich) |
| Epic | #b36bff | #7a3fcf |
| Legendary | #ff8a1f + Glow | #b84a00 |
| Runeword | #c9a063 | offen |

Im Light Mode wird nur die Schrift abgedunkelt. Rahmen, Kartenoberkante und Glow behalten überall die Original-Farbe.

## Damage Types & Ressourcen
Physical #c9c2b8 · Bleed #e0314b · Poison #b5d82c (Säuregrün) · Fire #ff6a2b · Cold #6fd3ff · Lightning #ffe14d · Void #a35cff · Life #e5484d · Heal #4fe08a (immer mit "+", steigt nach oben) · Heat #ff9a3c (Verlauf #ff5a1f → #ffb13b).
**Crits:** Die Farbe zeigt immer den Damage Type, ein Crit wird nur über die Form markiert: größere, fettere Zahl, "!", leicht schräg, heller Schein und kurzer Pop-Effekt. Ein Lightning-Crit ist also gelb und groß, ein Fire-Crit orange und groß.

Schadenszahlen in der Arena nutzen in beiden Modi die Original-Farben mit dunkler Kontur (die Arena ist ohnehin pro Act eingefärbt). Nur Text auf Pergament-Flächen (Tooltips, Item-Texte) wird im Light Mode abgedunkelt, analog zu den Rarities.

## Act-Farben (Arena-Hintergrund)
UI-Rahmen bleiben konstant, nur Hintergrund und Licht der Arena wechseln:
Ashen Fields #8a7552→#3b3024 · Rotwood #4f7a3a→#1f2e1a · Ember Wastes #d1552a→#4a1a10 · Frost Peaks #7fb8d8→#1f3647 · Storm Spires #8a6fd8→#2a2050 · Void Rift #5a2a7a→#120a1c · Emberfall #ffb13b→#6a1c0a

## Bildstil (entschieden 30.09.2026)
Referenzen: **Hearthstone** und **Rayman Legends**. Stylized hand-painted, comichaft und weich: kräftige, vereinfachte Formen, normale Proportionen (keine Überzeichnung), weiche gemalte Farbflächen, wenig Kleindetail, feine dunkle Kontur. Hell und farbenfroh, nicht düster.

Entwurf Stil-Prompt für KI-Bilder (beschreibt den Stil ohne Spielnamen, damit er konsistent und rechtlich unbedenklich bleibt):

> stylized hand-painted fantasy game art, soft painterly shading, natural proportions, bold simple shapes, clean dark ink outline, vibrant warm colors, cheerful and slightly humorous mood, minimal fine detail, readable silhouette, soft rim light from an ember glow, plain background

Varianten je nach Motiv: Figuren/Gegner mit „full body, side view, facing right/left, isolated on transparent background“; Arena-Hintergründe mit „wide landscape, soft depth, no characters“ plus Act-Farbstimmung.
