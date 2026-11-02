# Story Intro: Old Nan findet den Heir (v1, 2026-11-02)

## Ablauf

Spielt bei **jedem New Game** vor der Class Select. Klick, Leertaste oder Enter zeigt erst die ganze
Zeile, dann die nächste. **Skip (Esc)** springt jederzeit zur Class Select. Die Texte erscheinen
Buchstabe für Buchstabe mit einem leisen Feder-Tick (Sound-Gruppe Click). Reduced Motion: Zeilen
sofort ganz, keine Partikel.

1. **Die Welt** (Ashen Fields in der Dämmerung, Asche fällt, Glut steigt, das Bild zoomt langsam):
   große Zeilen in der Mitte, ohne Sprecher.
   - Every world has seasons. This one has harvests.
   - Long ago, the Ashen Harvester fell from the sky and liked what it saw: rich soil, busy folk, and
     plenty to burn. *(ein brennender Stern fällt hinter die Hügel)*
   - So it lets the land grow. And when the land is ripe, it burns it all and feasts on the flames.
     *(der Horizont glüht rot)*
   - The ash settles. The world grows back, a little stronger every time. The Harvester has never
     once skipped a harvest.
   - But the fire always leaves something behind… *(das Bild wird dunkel)*
2. **Gefunden** (Schwarzblende, dann dieselben Felder nah am Boden, Old Nans Dialog-Box):
   - Oh! This one's still breathing. Good. The last one I poked just crumbled.
   - Easy, dear. You were lying in the ash like a burnt sausage. You can call me Old Nan. Nobody remembers my
     real name anyway. Not even me.
   - My caravan carries the Hearthfire, the last true flame. And after every harvest, the fire
     leaves an Heir in the ash. Too stubborn to stay dead.
   - That's you, dear. So tell me: do you remember who you were?
3. **Die Frage** (Antworten mit Zifferntasten 1-4):
   - „I held the line. Steel in hand.“ → *A Cinderguard! I knew it. Nobody else falls over that loudly.*
   - „I never missed. Not once.“ → *An Ashstrider. Sharp eyes, quick feet. You'll need both out there.*
   - „The fire spoke to me.“ → *An Emberseer. Well, don't let it talk you into anything silly.*
   - „I… don't remember.“ → *Nobody does, the first morning. It'll come back to you by the fire.*
   - danach immer: *Come on, then. The Harvester is waiting, and the soup won't cook itself.*
4. Schwarzblende ins nächtliche Camp: die **Class Select** öffnet auf der erinnerten Klasse
   (bei „don't remember“ oder Skip auf der ersten). Man kann dort frei wechseln.

Keine Spoiler: nur Ashen Fields und der Harvester (steht schon im Titel und Compendium) kommen vor.

## Bild: „Found in the Ash“

Geliefert 2026-11-02 (`art/intro/found-in-the-ash-v1.png`), im Spiel `assets/intro/found-in-the-ash.webp` als Szene 2.


Heute zeigt Szene 2 die Ashen Fields näher am Boden, ohne den Heir. Ein eigenes Bild würde den
Moment zeigen, in dem Nan uns findet. Wenn du es malst, tauscht der Code nur das Bild der Szene 2.

Ablage: `art/intro/found-in-the-ash-v1.png`, **Querformat 21:9** (wie die Arena-Bilder, z. B. 2560×1097
oder so groß wie das Tool kann). Als Referenzen anhängen: `art/arena/ashen-fields-v1.png`
(Landschaft und Stil), `art/heir/heir-master-v1.png` (der Otter).

```
A wide 21:9 landscape painting for a 2D fantasy video game intro, in the exact hand-painted storybook game art style of the first attached image: clean dark ink outlines, soft cel shading, warm colors, same level of detail.
Scene: the same burnt grey fields at dusk as in the first image, seen from low, close to the ground. Grey ash covers the ground like soft snow, a few small embers still glow in it.
In the middle of the picture, slightly above the center line, a young otter (the character from the second attached image, same face, fur colors and simple linen tunic and belt) lies curled on its side in the ash, half buried, eyes just opening, ash on its fur. It looks tired but unhurt, a little funny, not tragic.
Next to him on the ground stands a small old brass lantern with a warm golden light; the light falls on the otter and makes a soft warm circle in the grey ash. The lantern's owner is not in the picture.
Far in the background on a hill: the tiny silhouette of a covered caravan wagon with a warm campfire glow next to it. Dark orange dusk sky with smoke and a dim sun behind clouds, like the first image.
Keep the lower third of the picture calm and dark (only ash ground, no important details), because a dialogue box covers it. Keep the left and right edges simple, they get cut on narrow screens.
No text, no letters, no UI, no frame, no other characters, no weapons.
```
