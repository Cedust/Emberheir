// Written by tools/art/cut_mastery.py: size of each painted Mastery weapon (pixels) and
// the height of its handle's centre line from the top of the image.
export const MASTERY_ART: Record<string, Record<string, { w: number; h: number; axis: number }>> = {
  sword: {
    plain: {
      w: 895,
      h: 118,
      axis: 64,
    },
    "perfect-parry": {
      w: 892,
      h: 139,
      axis: 74,
    },
    "deep-cuts": {
      w: 898,
      h: 106,
      axis: 58,
    },
    "flowing-blade": {
      w: 900,
      h: 93,
      axis: 49,
    },
    "final-verdict": {
      w: 865,
      h: 114,
      axis: 61,
    },
  },
  mace: {
    plain: {
      w: 712,
      h: 147,
      axis: 78,
    },
    earthshaker: {
      w: 793,
      h: 150,
      axis: 78,
    },
    anvil: {
      w: 707,
      h: 129,
      axis: 65,
    },
    siege: {
      w: 900,
      h: 155,
      axis: 75,
    },
    bastion: {
      w: 766,
      h: 164,
      axis: 84,
    },
  },
  axe: {
    plain: {
      w: 882,
      h: 265,
      axis: 125,
    },
    bloodbath: {
      w: 878,
      h: 274,
      axis: 123,
    },
    rampage: {
      w: 871,
      h: 252,
      axis: 136,
    },
    executioner: {
      w: 900,
      h: 333,
      axis: 156,
    },
    gore: {
      w: 893,
      h: 283,
      axis: 129,
    },
  },
  dagger: {
    plain: {
      w: 842,
      h: 134,
      axis: 74,
    },
    "thousand-cuts": {
      w: 898,
      h: 134,
      axis: 73,
    },
    assassinate: {
      w: 900,
      h: 133,
      axis: 72,
    },
    "toxic-bloom": {
      w: 847,
      h: 133,
      axis: 72,
    },
    shadowstep: {
      w: 899,
      h: 132,
      axis: 71,
    },
  },
  bow: {
    plain: {
      w: 848,
      h: 89,
      axis: 44,
    },
    "rain-of-arrows": {
      w: 851,
      h: 85,
      axis: 42,
    },
    "patient-draw": {
      w: 900,
      h: 51,
      axis: 23,
    },
    "hunters-mark": {
      w: 847,
      h: 97,
      axis: 55,
    },
    "wild-shot": {
      w: 888,
      h: 94,
      axis: 47,
    },
    arrow: {
      w: 604,
      h: 79,
      axis: 58,
    },
  },
  crossbow: {
    plain: {
      w: 860,
      h: 260,
      axis: 163,
    },
    deadeye: {
      w: 862,
      h: 260,
      axis: 161,
    },
    "siege-engine": {
      w: 863,
      h: 297,
      axis: 169,
    },
    repeater: {
      w: 859,
      h: 263,
      axis: 163,
    },
    harpoon: {
      w: 900,
      h: 282,
      axis: 172,
    },
  },
  wand: {
    plain: {
      w: 900,
      h: 89,
      axis: 51,
    },
    prism: {
      w: 889,
      h: 131,
      axis: 78,
    },
    "glass-cannon": {
      w: 895,
      h: 132,
      axis: 79,
    },
    "focused-will": {
      w: 891,
      h: 121,
      axis: 68,
    },
    "wild-magic": {
      w: 896,
      h: 131,
      axis: 68,
    },
  },
  staff: {
    plain: {
      w: 892,
      h: 122,
      axis: 77,
    },
    "endless-night": {
      w: 892,
      h: 132,
      axis: 74,
    },
    pyre: {
      w: 894,
      h: 117,
      axis: 64,
    },
    siphon: {
      w: 887,
      h: 111,
      axis: 61,
    },
    eclipse: {
      w: 900,
      h: 118,
      axis: 62,
    },
  },
};
