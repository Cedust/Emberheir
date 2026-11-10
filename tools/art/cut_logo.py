# Builds the game's logo assets from Timo's two painted images:
# - the emblem sheet (Hearthfire, Otter Heir, Ember Seed on a transparent background): the Hearthfire,
#   the left emblem, becomes the favicon (16/32/48 PNG + favicon.ico) and the app icons for tablets
#   (180 apple-touch, 192/512 manifest, 512 maskable) on a dark ember-lit square.
# - the title logo (Hearthfire over the painted word EMBERHEIR): trimmed to its painted pixels for the
#   title screen.
# Run from the repo root: python3 tools/art/cut_logo.py [emblem-sheet.png] [title-logo.png]  (needs Pillow)
import sys
from PIL import Image, ImageDraw, ImageFilter

SHEET = sys.argv[1] if len(sys.argv) > 1 else '/mnt/project-files/art/logo/emblem-sheet-v1.png'
TITLE = sys.argv[2] if len(sys.argv) > 2 else '/mnt/project-files/art/logo/title-logo-v1.png'
PUBLIC = 'apps/web/public/'
ASSETS = 'apps/web/src/assets/logo/'
BG = (14, 12, 10)  # the manifest's background_color #0e0c0a

sheet = Image.open(SHEET).convert('RGBA')
W, H = sheet.size
left = sheet.crop((0, 0, W // 3, H))
left = left.crop(left.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox())
w, h = left.size
s = max(w, h)
emblem = Image.new('RGBA', (s, s), (0, 0, 0, 0))
emblem.paste(left, ((s - w) // 2, (s - h) // 2))


def fit(size: int, scale: float) -> Image.Image:
  """The emblem centred on a transparent square, filling `scale` of it."""
  out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
  e = round(size * scale)
  out.alpha_composite(emblem.resize((e, e), Image.Resampling.LANCZOS), ((size - e) // 2, (size - e) // 2))
  return out


def app_icon(size: int, scale: float) -> Image.Image:
  """The emblem on the dark night ground with a warm glow behind the fire (opaque, for home screens)."""
  out = Image.new('RGBA', (size, size), BG + (255,))
  glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
  r = size * 0.36
  ImageDraw.Draw(glow).ellipse(
    (size / 2 - r, size * 0.46 - r, size / 2 + r, size * 0.46 + r), fill=(255, 110, 30, 110))
  out.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * 0.12)))
  out.alpha_composite(fit(size, scale))
  return out


# Favicons: the emblem fills the whole square so it stays readable in a 16 px tab.
for px in (16, 32, 48):
  fit(px, 1.0).save(f'{PUBLIC}favicon-{px}.png')
fit(256, 1.0).save(f'{PUBLIC}favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
# Home screen icons: some margin; the maskable one keeps the emblem inside the 80 % safe circle.
app_icon(180, 0.82).convert('RGB').save(f'{PUBLIC}icon-180.png')
app_icon(192, 0.82).convert('RGB').save(f'{PUBLIC}icon-192.png')
app_icon(512, 0.82).convert('RGB').save(f'{PUBLIC}icon-512.png')
app_icon(512, 0.62).convert('RGB').save(f'{PUBLIC}icon-maskable-512.png')

# Title logo: painted pixels only, 1200 px wide (shown at ~760 stage px, sharp up to 4K-ish).
title = Image.open(TITLE).convert('RGBA')
title = title.crop(title.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
tw = 1200
title = title.resize((tw, round(title.height * tw / title.width)), Image.Resampling.LANCZOS)
title.save(f'{ASSETS}title-logo.webp', quality=88, method=6)
print('emblem', emblem.size, 'title', title.size)

# Camp top bar logo: the Hearthfire beside the painted word, side by side (the bar is only 64 px
# tall). The word is cut from the title logo below the brazier; the brazier's feet that reach into
# the letters' row are cleared. Kept at 2.5x its ~44 stage px, so it stays sharp at 4K.
HEADER_H = 110
word = title.crop((0, 258, title.width, title.height))
feet = Image.new('L', word.size, 255)
ImageDraw.Draw(feet).rectangle((470, 0, 720, 24), fill=0)
word.putalpha(Image.composite(word.getchannel('A'), Image.new('L', word.size, 0), feet))
word = word.crop(word.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox())
word_h = round(HEADER_H * 0.62)
word = word.resize((round(word.width * word_h / word.height), word_h), Image.Resampling.LANCZOS)
fire = emblem.resize((HEADER_H, HEADER_H), Image.Resampling.LANCZOS)
gap = round(HEADER_H * 0.08)
header = Image.new('RGBA', (fire.width + gap + word.width, HEADER_H), (0, 0, 0, 0))
header.alpha_composite(fire, (0, 0))
header.alpha_composite(word, (fire.width + gap, (HEADER_H - word_h) // 2 + round(HEADER_H * 0.06)))
header.save(f'{ASSETS}header-logo.webp', quality=90, method=6)
print('header', header.size)
