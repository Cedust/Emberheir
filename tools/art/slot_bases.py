# Four bases use the painted empty-slot art (Timo 2026-10-16): Leather Cuirass (Body, mirrored),
# Gold Medallion (Amulet), Gold Ring (Ring) and Leaf Charm (Charm). Re-cuts the slot sheet at
# item size with cut_slots.py and writes assets/items/<base id>.webp in their own proportions.
# Run from the repo root: python3 tools/art/slot_bases.py  (needs Pillow)
import os
import tempfile
from PIL import Image

tmp = tempfile.mkdtemp()
src = open('tools/art/cut_slots.py').read()
src = src.replace("'apps/web/src/assets/slots/'", repr(tmp + '/')).replace('SIZE = 128', 'SIZE = 512')
exec(compile(src, 'cut_slots.py', 'exec'), {'__name__': '__main__'})

for slot, base, mirror in [
  ('body', 'leather-cuirass', True),
  ('amulet', 'gold-medallion', False),
  ('ring', 'gold-ring', False),
  ('charm', 'leaf-charm', False),
]:
  im = Image.open(os.path.join(tmp, slot + '.webp')).convert('RGBA')
  if mirror:
    im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
  pad = round(max(im.size) * 0.02)
  out = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0))
  out.paste(im, (pad, pad))
  scale = 288 / max(out.size)
  out = out.resize((round(out.width * scale), round(out.height * scale)), Image.Resampling.LANCZOS)
  out.save(f'apps/web/src/assets/items/{base}.webp', quality=90, method=6)
  print(base, out.size)
