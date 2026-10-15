# Cuts the painted Heir (an otter) into the parts of its arena rig: body and weapon forearm.
# Run from the repo root: python3 tools/art/cut_heir.py [painting.png]  (needs Pillow)
# The points (elbow, grip, feet) match SRC in apps/web/src/game/battle/heirRig.ts.
from PIL import Image, ImageDraw, ImageChops
import json
import sys
SRC=sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/heir/heir-master-v2.png'
OUT='apps/web/src/game/battle/heir/'
im=Image.open(SRC).convert('RGBA')
# Opaque where the painting is (the generator left alpha at 254).
im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 250 else (0 if a < 12 else a)))
def sc(pts): return [(620+x/2,560+y/2) for x,y in pts]
poly=sc([(224,430),(250,404),(300,380),(340,360),(366,348),(420,380),(640,520),(640,800),(330,800),(300,560),(226,486),(224,466)])
m=Image.new('L',im.size,0); ImageDraw.Draw(m).polygon(poly,fill=255)
# Shirt pixels (light, unsaturated) stay with the body.
px=im.load(); mp=m.load()
for y in range(int(min(p[1] for p in poly)),int(max(p[1] for p in poly))+1):
  for x in range(int(min(p[0] for p in poly)),int(max(p[0] for p in poly))+1):
    if mp[x,y]:
      r,g,b,a=px[x,y]
      if (r+g+b)/3>150 and max(r,g,b)-min(r,g,b)<70: mp[x,y]=0
arm=Image.new('RGBA',im.size,(0,0,0,0)); arm.paste(im,(0,0),m)
body=im.copy(); body.putalpha(ImageChops.subtract(im.getchannel('A'),m))
# The thumb alone: drawn over the weapon, the rest of the fist behind it, so the grip passes
# under the thumb.
fm=Image.new('L',im.size,0); ImageDraw.Draw(fm).polygon([(861,858),(880,849),(904,855),(908,880),(902,901),(870,901),(860,886)],fill=255)
fist=Image.new('RGBA',im.size,(0,0,0,0)); fist.paste(arm,(0,0),fm)
# A stump under the sleeve: a clean band of the forearm repeated up into it, so a turned
# arm shows no gap.
import math
A,B=(728,775),(804,734)
nx,ny=0.47,0.885
def band(o0,o1): return [(A[0]+nx*o0,A[1]+ny*o0),(B[0]+nx*o0,B[1]+ny*o0),(B[0]+nx*o1,B[1]+ny*o1),(A[0]+nx*o1,A[1]+ny*o1)]
bm=Image.new('L',im.size,0); ImageDraw.Draw(bm).polygon(band(14,44),fill=255)
src=Image.new('RGBA',im.size,(0,0,0,0)); src.paste(arm,(0,0),bm)
for k in range(1,3):
  sh=Image.new('RGBA',im.size,(0,0,0,0)); sh.paste(src,(round(-nx*28*k),round(-ny*28*k)))
  arm=Image.alpha_composite(sh,arm)
elbow=(762,750); grip=(882,880)
# Crop to bounding boxes and halve the resolution.
S=0.5
def save(img,name):
  bb=img.getchannel('A').getbbox()
  c=img.crop(bb); c=c.resize((round(c.width*S),round(c.height*S)),Image.LANCZOS)
  c.save(OUT+name,'WEBP',quality=90,method=6)
  return bb
bb_body=save(body,'heir-body.webp'); bb_arm=save(arm,'heir-arm.webp'); bb_fist=save(fist,'heir-thumb.webp')
feet=(600,1445)
print(json.dumps({'body':bb_body,'arm':bb_arm,'thumb':bb_fist,'elbow':elbow,'grip':grip,'feet':feet}))
