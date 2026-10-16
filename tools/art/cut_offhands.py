# Cuts what the painted Heir needs to really hold its off hand in the arena:
#  - the raised off-hand fist out of the painting, drawn over the held item so it grips it;
#  - the left half of the Ember Focus' root ring, drawn over the fist: the hand goes through the
#    ring, its right side disappears in the fist, its left side runs over the arm;
#  - the Quiver without its shoulder strap (it rides on the back).
# Run from the repo root: python3 tools/art/cut_offhands.py [painting.png]  (needs Pillow)
# The fist's box matches SRC.offFist in apps/web/src/game/battle/heirRig.ts.
from PIL import Image, ImageChops, ImageDraw, ImageFilter
import json
import sys
SRC = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/heir/heir-master-v2.png'
ITEMS = 'apps/web/src/assets/items/'
OUT = 'apps/web/src/game/battle/heir/'

im = Image.open(SRC).convert('RGBA')
im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 250 else (0 if a < 12 else a)))
# Around the fist and wrist; inside it only fur and ink, never the shirt behind.
area = [(427, 657), (470, 627), (497, 608), (543, 607), (570, 637), (570, 673), (537, 720), (477, 722), (427, 727)]
m = Image.new('L', im.size, 0)
ImageDraw.Draw(m).polygon(area, fill=255)
px = im.load()
mp = m.load()
for y in range(600, 730):
    for x in range(420, 575):
        if not mp[x, y]:
            continue
        r, g, b, a = px[x, y]
        # Fur is a deep, reddish brown (green well below red), ink is near black; the shirt
        # and its shadows are pale and much less red.
        lum = (r + g + b) / 3
        if not (lum < 70 or g < r * 0.75):
            mp[x, y] = 0
# The curled fingers start right of this painting column; the wrist is left of it.
FINGERS_FROM = 488
fist = Image.new('RGBA', im.size, (0, 0, 0, 0))
fist.paste(im, (0, 0), m)
bb = fist.getchannel('A').getbbox()
c = fist.crop(bb)
c = c.resize((round(c.width / 2), round(c.height / 2)), Image.LANCZOS)
c.save(OUT + 'heir-off-fist.webp', 'WEBP', quality=90, method=6)


def cut(name, keep, out, crop=True):
    """Keeps the item's pixels inside the polygon `keep` (icon pixels, 192 wide)."""
    item = Image.open(ITEMS + name + '.webp').convert('RGBA')
    k = Image.new('L', item.size, 0)
    ImageDraw.Draw(k).polygon(keep, fill=255)
    a = Image.new('L', item.size, 0)
    a.paste(item.getchannel('A'), (0, 0), k)
    item.putalpha(a)
    box = a.getbbox() if crop else (0, 0, item.width, item.height)
    item.crop(box).save(OUT + out, 'WEBP', quality=92, method=6)
    return box


# Same canvas as the icon, so it lies exactly on the whole Focus drawn under the fist. Where the
# ring would cover the curled fingers it stays behind them. The Focus' hold in heroArt.ts
# (size 84, anchor 0.44/0.7, offset -4/2, no tilt) maps icon pixels onto the painting.
focus = cut('ember-focus', [(0, 96), (85, 96), (85, 192), (0, 192)], 'offhand-focus-front.webp', crop=False)
front = Image.open(OUT + 'offhand-focus-front.webp').convert('RGBA')
behind = Image.new('L', front.size, 0)
bp = behind.load()
S = 84 / 192 / 0.3
for y in range(front.height):
    for x in range(front.width):
        px_, py_ = 520 + (-4 / 0.3) + (x - 0.44 * 192) * S, 645 + (2 / 0.3) + (y - 0.7 * 192) * S
        if px_ > FINGERS_FROM and mp[int(px_), int(py_)]:
            bp[x, y] = 255
# A soft edge where the ring slips behind the fingers.
behind = behind.filter(ImageFilter.GaussianBlur(0.8))
front.putalpha(ImageChops.multiply(front.getchannel('A'), ImageChops.invert(behind)))
front.save(OUT + 'offhand-focus-front.webp', 'WEBP', quality=92, method=6)
quiver = cut('quiver', [(0, 0), (188, 0), (188, 288), (44, 288), (44, 250), (66, 82), (60, 0)], 'offhand-quiver.webp')
print(json.dumps({'offFist': bb, 'focus': focus, 'quiver': quiver}))
