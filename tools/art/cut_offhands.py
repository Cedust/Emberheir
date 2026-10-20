# Cuts the Quiver for the arena without its shoulder strap (it rides on the Heir's back).
# Run from the repo root: python3 tools/art/cut_offhands.py  (needs Pillow)
from PIL import Image, ImageDraw
import json
ITEMS = 'apps/web/src/assets/items/'
OUT = 'apps/web/src/game/battle/heir/'


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


quiver = cut('quiver', [(0, 0), (188, 0), (188, 288), (44, 288), (44, 250), (66, 82), (60, 0)], 'offhand-quiver.webp')
print(json.dumps({'quiver': quiver}))
