# Cuts the painted Heir in its caster poses for the arena: Wand (heir-wand-v1.png) and Staff
# (heir-staff-v1.png). Per pose the whole otter; the Staff pose also its front fist once more
# (only fur and ink, never the shirt behind), drawn over the Staff that stands in front of it.
# The Wand lies behind the stretched fist, so that pose needs no second part.
# Run from the repo root: python3 tools/art/cut_heir_caster.py  (needs Pillow)
# The printed top lefts match CASTER_POSES in apps/web/src/game/battle/heirRig.ts.
from PIL import Image, ImageDraw
import json
ART='/mnt/project-files/art/heir/'
OUT='apps/web/src/game/battle/heir/'
POSES={
  'wand':{'src':'heir-wand-v1.png'},
  'staff':{
    'src':'heir-staff-v1.png',
    # The raised fist and its wrist: the Staff runs through it, upright.
    'hand':[(440,585),(470,556),(530,553),(552,575),(552,620),(535,650),(520,676),(490,700),(452,700),(436,660)],
  },
}
def save(img,name):
  bb=img.getchannel('A').getbbox()
  c=img.crop(bb)
  c=c.resize((round(c.width*0.5),round(c.height*0.5)),Image.LANCZOS)
  c.save(OUT+name,'WEBP',quality=90,method=6)
  return bb[:2]
out={}
for pose,p in POSES.items():
  im=Image.open(ART+p['src']).convert('RGBA')
  # Opaque where the painting is (the generator left alpha at 252-254).
  im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 245 else (0 if a < 12 else a)))
  out[pose]={'body':save(im,f'heir-{pose}.webp')}
  if 'hand' in p:
    m=Image.new('L',im.size,0); ImageDraw.Draw(m).polygon(p['hand'],fill=255)
    px=im.load(); mp=m.load()
    x0=min(x for x,_ in p['hand']); x1=max(x for x,_ in p['hand'])
    y0=min(y for _,y in p['hand']); y1=max(y for _,y in p['hand'])
    for y in range(y0,y1+1):
      for x in range(x0,x1+1):
        if not mp[x,y]: continue
        r,g,b,a=px[x,y]
        # Fur is a deep, reddish brown, ink near black; the shirt is pale and much less red.
        if not ((r+g+b)/3<70 or g<r*0.75): mp[x,y]=0
    part=Image.new('RGBA',im.size,(0,0,0,0)); part.paste(im,(0,0),m)
    out[pose]['hand']=save(part,f'heir-{pose}-hand.webp')
print(json.dumps(out))

# The open Grimoire, painted over the Staff pose's open paw (heir-staff-book-v1.png): its pages
# towards the otter, the cover and spine towards the player. The painting has no alpha (a grey
# checkerboard is baked in), so the background is everything neutral grey reachable from the
# box's edge; the book's ink outline closes it off.
from collections import deque
book = Image.open(ART + 'heir-staff-book-v1.png').convert('RGB').crop((715, 215, 1024, 560))
W, H = book.size
px = book.load()
bg = Image.new('L', book.size, 0)
bp = bg.load()
q = deque([(x, y) for x in range(W) for y in (0, H - 1)] + [(x, y) for y in range(H) for x in (0, W - 1)])
while q:
  x, y = q.popleft()
  if not (0 <= x < W and 0 <= y < H) or bp[x, y]:
    continue
  r, g, b = px[x, y]
  if min(r, g, b) <= 95 or max(r, g, b) - min(r, g, b) >= 22:
    continue
  bp[x, y] = 255
  q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
cut = book.convert('RGBA')
cut.putalpha(Image.eval(bg, lambda v: 255 - v))
cut = cut.crop(cut.getchannel('A').getbbox())
cut.save(OUT + 'offhand-grimoire-open.webp', 'WEBP', quality=90, method=6)
print(json.dumps({'grimoireOpen': cut.size}))
