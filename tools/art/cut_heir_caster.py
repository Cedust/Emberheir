# Cuts the painted Heir in its caster poses for the arena: Wand (heir-wand-v1.png) and Staff
# (heir-staff-v1.png). Per pose the whole otter and the paw on the weapon once more (only fur and
# ink, never the shirt behind), drawn over the weapon: for the Wand the thumb, which lies over the
# upright Wand in front of the fist; for the Staff the fist, the Staff running through it. The
# forearm (with the fist) is cut as well and taken out of the otter, so it can lift the
# Staff on a cast: where it lay, the shirt right of it is drawn on, or nothing over the background.
# Run from the repo root: python3 tools/art/cut_heir_caster.py  (needs Pillow)
# The printed top lefts match CASTER_POSES in apps/web/src/game/battle/heirRig.ts.
from PIL import Image, ImageDraw, ImageFilter
import json
ART='/mnt/project-files/art/heir/'
OUT='apps/web/src/game/battle/heir/'
POSES={
  'wand':{
    'src':'heir-wand-v1.png',
    # The thumb along the fist's underside, its tip under the curled fingers: the Wand lies under it.
    'hand':[(897,500),(906,496),(920,495),(932,493),(942,497),(952,502),(961,507),(964,514),(952,516),(935,513),(918,511),(903,509),(895,505)],
    # The forearm from the sleeve's cuff out to the fist.
    'arm':[(788,452),(830,448),(880,432),(925,415),(960,412),(990,425),(1003,450),(1000,490),(985,515),(965,525),(940,522),(905,518),(870,532),(830,556),(788,572)],
    # Only right of here does the forearm leave the otter: left of it stays inside the cuff.
    'keep':800,
  },
  'staff':{
    'src':'heir-staff-v1.png',
    # The raised fist and its wrist: the Staff runs through it, upright.
    'hand':[(440,585),(470,556),(530,553),(552,575),(552,620),(535,650),(520,676),(490,700),(452,700),(436,660)],
    # The forearm from inside the sleeve's cuff up to the fist.
    'arm':[(300,647),(350,630),(400,620),(443,590),(463,567),(490,555),(523,558),(545,590),(532,620),(519,653),(505,672),(465,679),(432,708),(405,735),(350,756),(316,752),(298,720)],
  },
}
def save(img,name):
  bb=img.getchannel('A').getbbox()
  c=img.crop(bb)
  c=c.resize((round(c.width*0.5),round(c.height*0.5)),Image.LANCZOS)
  c.save(OUT+name,'WEBP',quality=90,method=6)
  return bb[:2]
def fur(im,poly):
  """The fur and ink pixels inside `poly` as a mask."""
  m=Image.new('L',im.size,0); ImageDraw.Draw(m).polygon(poly,fill=255)
  px=im.load(); mp=m.load()
  for y in range(min(p[1] for p in poly),max(p[1] for p in poly)+1):
    for x in range(min(p[0] for p in poly),max(p[0] for p in poly)+1):
      if not mp[x,y]: continue
      r,g,b,a=px[x,y]
      # Fur is a deep, reddish brown, ink near black; the shirt is pale and much less red.
      if not ((r+g+b)/3<70 or g<r*0.75): mp[x,y]=0
  return m
def part(im,m):
  out=Image.new('RGBA',im.size,(0,0,0,0)); out.paste(im,(0,0),m)
  return out
out={}
for pose,p in POSES.items():
  im=Image.open(ART+p['src']).convert('RGBA')
  # Opaque where the painting is (the generator left alpha at 252-254).
  im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 245 else (0 if a < 12 else a)))
  out[pose]={}
  body=im
  if 'arm' in p:
    m=fur(im,p['arm'])
    out[pose]['arm']=save(part(im,m),f'heir-{pose}-arm.webp')
    # Take the forearm out, a little wider so its soft edge goes too.
    gone=m.filter(ImageFilter.MaxFilter(5))
    body=im.copy(); bp=body.load(); gp=gone.load(); src=im.load()
    for y in range(body.height):
      for x in range(body.width):
        if not gp[x,y] or x<p.get('keep',0): continue
        k=x+1
        while k<body.width and gp[k,y]: k+=1
        bp[x,y]=src[k,y] if k<body.width else (0,0,0,0)
  out[pose]['body']=save(body,f'heir-{pose}.webp')
  out[pose]['hand']=save(part(im,fur(im,p['hand'])),f'heir-{pose}-hand.webp')
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
