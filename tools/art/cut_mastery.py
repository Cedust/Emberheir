# Cuts Timo's painted Weapon Mastery sheets: one weapon in five rows (the plain form and its four
# Keystone forms), lying horizontal with the pommel on the left. Writes one webp per form to
# apps/web/src/assets/mastery/<weapon>-<form>.webp and the sizes the scene needs to
# apps/web/src/game/camp/masteryArtData.ts.
# Run from the repo root: python3 tools/art/cut_mastery.py [weapon ...]  (needs Pillow, numpy, scipy)
#
# The generator never gives a clean transparent background, so the script removes it itself:
# - a grey checkerboard (the "transparent" preview baked into the image): everything grey that
#   touches the border, up to the ink outline;
# - a smooth dark gradient with a glow around the weapons: a fitted background model plus the
#   bright glow, both stopped by the black ink outline.
import json
import subprocess
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SHEETS = '/mnt/project-files/art/mastery/'
OUT = 'apps/web/src/assets/mastery/'
DATA = 'apps/web/src/game/camp/masteryArtData.ts'
# Row order on each sheet: the plain weapon first, then the Keystones in the prompt's order.
FORMS = {
  'sword': ['plain', 'perfect-parry', 'deep-cuts', 'flowing-blade', 'final-verdict'],
  'mace': ['plain', 'earthshaker', 'anvil', 'siege', 'bastion'],
  'axe': ['plain', 'bloodbath', 'rampage', 'executioner', 'gore'],
  'dagger': ['plain', 'thousand-cuts', 'assassinate', 'toxic-bloom', 'shadowstep'],
  # The bow sheet has a sixth row: one loose arrow, which the scene lays on the string.
  'bow': ['plain', 'rain-of-arrows', 'patient-draw', 'hunters-mark', 'wild-shot', 'arrow'],
  'crossbow': ['plain', 'deadeye', 'siege-engine', 'repeater', 'harpoon'],
  'wand': ['plain', 'prism', 'glass-cannon', 'focused-will', 'wild-magic'],
  'staff': ['plain', 'endless-night', 'pyre', 'siphon', 'eclipse'],
}
SHEET = {}
# Attunement weapons: the crystal (Wand) and the orb (Staff) are painted pale icy blue. Those
# pixels also go to <weapon>-<form>-gem.webp as grey light, which the scene tints in the
# element's colour.
GEMS = {'wand', 'staff'}
# Rows that touch (crossguards) are split on a mask eroded by this many pixels; a bow's thin
# string would vanish, and its rows never touch.
ERODE = {'bow': 0, 'crossbow': 0}
# Share of the width, from the left, where the rows' handles (or the bow tips) are read.
BAND = {'bow': 0.3}
# Width of the longest form in the game, in pixels (the scene draws it at most ~800 px on 4K).
LENGTH = 900
# Brightest channel of the ink outline: the glow stops there. Bows need a higher one, their
# thin antialiased outlines leak; heavy dark metal (a mace head) needs the low one.
INK = {'bow': 45, 'crossbow': 45}
# Weapons that enclose background (a bow and its string): big smooth areas that look like the
# background inside them are cut out too. Off for the rest, it would eat a smooth haft.
GAPS = {'bow', 'crossbow'}


def grow(seed, allowed):
  """Every allowed pixel 4-connected to the seed."""
  labels, _ = ndimage.label(allowed)
  hit = np.unique(labels[seed & allowed])
  return np.isin(labels, hit[hit > 0])


def border(shape):
  b = np.zeros(shape, bool)
  b[0] = b[-1] = True
  b[:, 0] = b[:, -1] = True
  return b


def background(im, weapon):
  H, W, _ = im.shape
  sat = im.max(-1) - im.min(-1)
  mean = im.mean(-1)
  edge = border((H, W))
  grey = (sat < 20) & (mean > 135) & (mean < 232)
  if grey[edge].mean() > 0.9:
    return grow(edge, grey)
  # Smooth background: grow over small steps, fit a low-order model to it, ...
  dv = np.abs(im[1:] - im[:-1]).max(-1) < 10
  dh = np.abs(im[:, 1:] - im[:, :-1]).max(-1) < 10
  smooth = edge.copy()
  while True:
    g = smooth.copy()
    g[1:] |= smooth[:-1] & dv
    g[:-1] |= smooth[1:] & dv
    g[:, 1:] |= smooth[:, :-1] & dh
    g[:, :-1] |= smooth[:, 1:] & dh
    if (g == smooth).all():
      break
    smooth = g
  ys, xs = np.nonzero(smooth)
  pick = np.random.default_rng(1).choice(len(ys), min(40000, len(ys)), replace=False)
  ys, xs = ys[pick], xs[pick]

  def basis(y, x, deg=5):
    y = y / H * 2 - 1
    x = x / W * 2 - 1
    return np.stack([x**i * y**j for i in range(deg + 1) for j in range(deg + 1 - i)], -1)

  A = basis(ys, xs)
  keep = np.ones(len(ys), bool)
  for it in range(5):
    coef, *_ = np.linalg.lstsq(A[keep], im[ys[keep], xs[keep]], rcond=None)
    keep = np.abs(A @ coef - im[ys, xs]).max(-1) < (25 if it < 2 else 12)
  yy, xx = np.mgrid[0:H, 0:W]
  model = (basis(yy.ravel(), xx.ravel()) @ coef).reshape(H, W, 3)
  # ... take what matches the model, then the glow and cast shadows up to the ink outline.
  match = np.abs(im - model).max(-1) < 18
  # The ink outline stops the glow; thickened by a pixel so its antialiased seams hold.
  ink = np.asarray(
    Image.fromarray(np.where(im.max(-1) <= INK.get(weapon, 22), 255, 0).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
  ) > 0
  glow = ~ink
  # Wide near-black corners of the backdrop count as background too (not the thin ink lines);
  # the ink line they swallow comes back below.
  black = Image.fromarray(np.where(im.max(-1) < 14, 255, 0).astype(np.uint8))
  black = np.asarray(black.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))) > 0
  bg = grow(edge, match | black)
  bg |= grow(bg & glow, glow)
  # Gaps a weapon encloses (between a bow and its string): big, smooth areas that look like the
  # background, then their glow.
  if weapon not in GAPS:
    return outline(im, bg)
  step = np.zeros((H, W))
  step[:-1] = np.maximum(step[:-1], np.abs(im[1:] - im[:-1]).max(-1))
  step[:, :-1] = np.maximum(step[:, :-1], np.abs(im[:, 1:] - im[:, :-1]).max(-1))
  gap = (np.abs(im - model).max(-1) < 24) & (step < 8) & ~bg
  labels, count = ndimage.label(gap)
  sizes = ndimage.sum(gap, labels, range(1, count + 1))
  bg |= np.isin(labels, np.nonzero(sizes >= 1500)[0] + 1)
  bg |= grow(bg & glow, glow)
  return outline(im, bg)


def outline(im, bg):
  """Gives the weapons back the dark ink line right around them."""
  fg = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8))
  rim = np.asarray(fg.filter(ImageFilter.MaxFilter(5))) > 0
  return bg & ~(rim & (im.max(-1) < 40))


def rows(fg, n, band_share):
  """Centre line (y) of each row, read from the handles at the left."""
  H, W = fg.shape
  inner = fg.copy()
  inner[:, :8] = inner[:, -8:] = False
  cols = np.nonzero(inner.any(0))[0]
  x0 = cols[0]
  band = fg[:, x0 + 10 : x0 + 10 + int((cols[-1] - x0) * band_share)].any(1)
  runs, start = [], None
  for y in range(H):
    if band[y] and start is None:
      start = y
    if not band[y] and start is not None:
      runs.append((start, y))
      start = None
  if start is not None:
    runs.append((start, H))
  runs = sorted(runs, key=lambda r: r[0] - r[1])[:n]
  if len(runs) != n:
    sys.exit(f'found {len(runs)} handles, expected {n}')
  return sorted((a + b) // 2 for a, b in runs)


def cut(weapon):
  src = Image.open(f'{SHEETS}{SHEET.get(weapon, weapon)}-sheet-v1.png').convert('RGB')
  im = np.asarray(src).astype(float)
  fg = ~background(im, weapon)
  forms = FORMS[weapon]
  centres = rows(fg, len(forms), BAND.get(weapon, 1 / 6))
  # Rows can touch (crossguards): split them on a slightly eroded mask, then give the edge
  # pixels back to the row next to them.
  mask = Image.fromarray(np.where(fg, 255, 0).astype(np.uint8))
  erode = ERODE.get(weapon, 5)
  core = np.asarray(mask.filter(ImageFilter.MinFilter(erode)) if erode > 1 else mask) > 0
  comps, count = ndimage.label(core)
  owner = np.zeros(count + 1, np.uint8)
  cols = np.nonzero(fg.any(0))[0]
  for i, y in enumerate(centres):
    hits = comps[y, cols[0] :]
    first = hits[hits > 0]
    if not len(first):
      sys.exit(f'{weapon}: row {i + 1} not found')
    if owner[first[0]]:
      sys.exit(f'{weapon}: row {i + 1} runs into row {owner[first[0]]}')
    owner[first[0]] = i + 1
  # Loose bits (a crystal shard, a bow tip) join the row nearest to them.
  sizes = ndimage.sum(core, comps, range(1, count + 1))
  ys = ndimage.center_of_mass(core, comps, range(1, count + 1))
  edge = np.unique(np.concatenate([comps[0], comps[-1], comps[:, 0], comps[:, -1]]))
  light = ndimage.mean(im.max(-1), comps, range(1, count + 1))
  for c in range(1, count + 1):
    # Leftovers of the backdrop touch the sheet's border; weapons never do.
    # Cast shadows are dark smudges; painted bits are not.
    if not owner[c] and sizes[c - 1] >= 300 and c not in edge and light[c - 1] > 70:
      owner[c] = 1 + int(np.argmin([abs(ys[c - 1][0] - y) for y in centres]))
  lab = owner[comps]
  for _ in range(4):
    grown = np.asarray(Image.fromarray(lab).filter(ImageFilter.MaxFilter(3)))
    lab = np.where((lab == 0) & fg, grown, lab)
  lab[~fg] = 0
  rgba = np.dstack([np.asarray(src), np.zeros(fg.shape, np.uint8)])
  parts = []
  for i, form in enumerate(forms):
    alpha = np.where(lab == i + 1, 255, 0).astype(np.uint8)
    img = rgba.copy()
    img[..., 3] = alpha
    part = Image.fromarray(img, 'RGBA')
    # Soften the cut edge by one pixel.
    a = part.getchannel('A').filter(ImageFilter.GaussianBlur(0.6))
    part.putalpha(Image.fromarray(np.minimum(np.asarray(a), alpha)))
    box = part.getbbox()
    gem = None
    if weapon in GEMS:
      rgb = im.astype(float)
      # Glass is at least as blue as it is red (wood, gold and leather are far redder); close
      # the white facets and cracks, drop specks.
      icy = (rgb[..., 2] - rgb[..., 0] > 2) & (rgb.max(-1) > 100) & (alpha > 0)
      icy = Image.fromarray(np.where(icy, 255, 0).astype(np.uint8))
      icy = icy.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
      icy = np.asarray(icy) > 0
      bits, count = ndimage.label(icy)
      big = np.nonzero(ndimage.sum(icy, bits, range(1, count + 1)) >= 150)[0] + 1
      icy = ndimage.binary_fill_holes(np.isin(bits, big)) & (alpha > 0)
      grey = rgb.mean(-1).clip(0, 255).astype(np.uint8)
      g = np.dstack([grey, grey, grey, np.where(icy, np.asarray(part.getchannel('A')), 0).astype(np.uint8)])
      gem = Image.fromarray(g, 'RGBA').crop(box)
    parts.append((form, part.crop(box), centres[i] - box[1], gem))
  scale = LENGTH / max(p.width for f, p, _, _ in parts if f != 'arrow')
  out = {}
  for form, part, axis, gem in parts:
    w, h = round(part.width * scale), round(part.height * scale)
    part.resize((w, h), Image.Resampling.LANCZOS).save(f'{OUT}{weapon}-{form}.webp', quality=90, method=6)
    out[form] = {'w': w, 'h': h, 'axis': round(axis * scale)}
    if gem is not None:
      gem.resize((w, h), Image.Resampling.LANCZOS).save(f'{OUT}{weapon}-{form}-gem.webp', quality=90, method=6)
    print(weapon, form, out[form])
  return out


def main():
  weapons = sys.argv[1:] or list(FORMS)
  try:
    with open(DATA) as f:
      data = json.loads(f.read().split('= ', 1)[1].rsplit(';', 1)[0])
  except (OSError, IndexError, ValueError):
    data = {}
  for weapon in weapons:
    data[weapon] = cut(weapon)
  with open(DATA, 'w') as f:
    f.write('// Written by tools/art/cut_mastery.py: size of each painted Mastery weapon (pixels) and\n')
    f.write('// the height of its handle\'s centre line from the top of the image.\n')
    f.write('export const MASTERY_ART: Record<\n  string,\n  Record<string, { w: number; h: number; axis: number }>\n> = ')
    f.write(json.dumps(data, indent=2))
    f.write(';\n')
  subprocess.run(['npx', 'prettier', '--write', DATA], check=True)


main()
