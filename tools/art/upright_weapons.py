# Turns the painted weapons (tools/art/cut_weapons.py, lying diagonally for the Damage plaque)
# upright for the inventory and the weapon slot: one webp per weapon base id in assets/items/.
# Run from the repo root: python3 tools/art/upright_weapons.py  (needs Pillow)
from PIL import Image

WEAPONS = {
  'sword': 'sword', 'mace': 'mace', 'axe': 'axe', 'dagger': 'dagger',
  'bow': 'bow', 'crossbow': 'crossbow', 'wand': 'fire-wand', 'staff': 'staff',
}
HEIGHT = 288  # a 1x3 weapon is about 120 stage px tall, up to 2.4x on 4K

for icon, base in WEAPONS.items():
  im = Image.open(f'apps/web/src/assets/weapons/{icon}.webp').convert('RGBA')
  # Grip lower left, tip upper right: a 45 degree turn to the left stands the weapon up.
  im = im.rotate(45, expand=True, resample=Image.Resampling.BICUBIC)
  im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
  scale = HEIGHT / im.height
  im = im.resize((round(im.width * scale), HEIGHT), Image.Resampling.LANCZOS)
  im.save(f'apps/web/src/assets/items/{base}.webp', quality=90, method=6)
  print(base, im.size)
