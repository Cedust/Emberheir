# Cuts Timo's painted Rune and skill sheets (design/notes/runen-skill-icons-art-v1.md) into
# apps/web/src/assets/runes/<runeId>.webp and apps/web/src/assets/skills/<skillId>.webp.
# Run from the repo root: python3 tools/art/cut_skills.py  (needs Pillow, numpy and scipy)
#   art/icons/rune-sheet-v1.png     2 x 4 Runes, lowest rank first
#   art/icons/skill-sheet-a-v1.png  2 x 4 Steel, Blood, Iron Bastion, Rally
#   art/icons/skill-sheet-b-v1.png  3 + 4 Venom, Flame
#   art/icons/skill-sheet-c-v1.png  3 x 3 Storm, Frost, Void
#   art/icons/skill-sheet-d-v1.png  3 x 3 Mastery skills
#   art/icons/skill-sheet-e-v1.png  2 x 4 Weapon Innates (Frostbolt = the Wand's after Cold Attunement)
#   art/icons/attack-sheet-v1.png   2 x 4 Default Attacks -> apps/web/src/assets/attacks/<weaponId>.webp
# Sheets B, D and E came with a baked checkerboard: tools/art/unmix_checker.py made them from the
# matching *-raw.png first.
# The glows of the painted effects touch, so every sheet is cut on its grid, not by pieces; the
# alpha fades out at the cell edge so a neighbour's glow never ends in a hard line. Every icon is
# centred on a square canvas: skill slots draw 18 to 32 stage pixels, up to 2.4x on 4K.
import numpy as np
from scipy import ndimage
from PIL import Image

ART = '/mnt/project-files/art/icons/'
SIZE = 128
FADE = 0.06

SHEETS = [
  ('attack-sheet-v1.png', 'attacks', [
    ['sword', 'axe', 'mace', 'dagger'],
    ['bow', 'crossbow', 'wand', 'staff'],
  ]),
  ('rune-sheet-v1.png', 'runes', [
    ['ash', 'moss', 'thorn', 'venom'],
    ['ember', 'rime', 'volt', 'dusk'],
  ]),
  ('skill-sheet-a-v1.png', 'skills', [
    ['flurry', 'execute', 'crushing-blow', 'rend'],
    ['serrated-edge', 'cleave', 'iron-bastion', 'rally'],
  ]),
  ('skill-sheet-b-v1.png', 'skills', [
    ['envenom', 'wither', 'toxic-burst'],
    ['immolate', 'meteor', 'inferno', 'searing-blow'],
  ]),
  ('skill-sheet-c-v1.png', 'skills', [
    ['storm-strike', 'chain-lightning', 'thunderstrike'],
    ['ice-lance', 'frost-strike', 'frost-nova'],
    ['corrupt', 'soul-harvest', 'void-rift'],
  ]),
  ('skill-sheet-d-v1.png', 'skills', [
    ['earthsplitter', 'rampage', 'rupture'],
    ['deadly-aim', 'hit-and-run', 'dirty-trick'],
    ['arcane-blast', 'spell-volley', 'malediction'],
  ]),
  ('skill-sheet-e-v1.png', 'skills', [
    ['power-strike', 'lacerate', 'skull-crack', 'barbed-arrow'],
    ['heavy-bolt', 'shockbolt', 'frostbolt', 'void-bolt'],
  ]),
]


def edge_fade(w, h):
  ramp = lambda n: np.minimum(np.arange(n), np.arange(n)[::-1]) / (FADE * n)
  return np.minimum.outer(ramp(h), ramp(w)).clip(0, 1)


for sheet, folder, rows in SHEETS:
  im = Image.open(ART + sheet).convert('RGBA')
  W, H = im.size
  for r, names in enumerate(rows):
    y0, y1 = H * r // len(rows), H * (r + 1) // len(rows)
    for c, name in enumerate(names):
      x0, x1 = W * c // len(names), W * (c + 1) // len(names)
      cell = np.asarray(im.crop((x0, y0, x1, y1))).astype(float)
      cell[..., 3] *= edge_fade(x1 - x0, y1 - y0)
      # A neighbour's spill reaches in from the cell edge: keep the icon (the biggest piece) and the
      # sparks around it, drop the other pieces that touch the edge.
      pieces, n = ndimage.label(ndimage.binary_dilation(cell[..., 3] > 30, iterations=4))
      sizes = np.bincount(pieces.ravel())
      sizes[0] = 0
      edge = set(np.unique(np.concatenate([pieces[0], pieces[-1], pieces[:, 0], pieces[:, -1]])))
      keep = [i for i in range(1, n + 1) if i == sizes.argmax() or i not in edge]
      cell[..., 3] *= np.isin(pieces, keep)
      icon = Image.fromarray(cell.astype(np.uint8), 'RGBA')
      # Framed by everything that clearly shows (glow included, the neighbour's spill is gone), so
      # the icon sits in the middle of its slot and fills it (Timo).
      icon = icon.crop(icon.getchannel('A').point(lambda v: 255 if v > 60 else 0).getbbox())
      side = max(icon.size)
      square = Image.new('RGBA', (side, side))
      square.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
      square.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(
        f'apps/web/src/assets/{folder}/{name}.webp', quality=90, method=6)
      print(folder, name, icon.size)
