/**
 * Hunts (docs/design hunts-entwurf-v1.md): two Signature Affixes per enemy, existing stat affixes
 * that fit its look. Once its hunt reaches tier II, one card of every item pick after a win over
 * it carries one of them. Wardens have none: their hunt raises the trophy chance instead.
 */
export const HUNT_SIGNATURES: Readonly<Record<string, readonly string[]>> = {
  // Act 1: Ashen Fields
  "ashen-brute": ["armor", "life"],
  "ashen-skirmisher": ["attack-speed", "crit-chance"],
  "cinder-caster": ["elemental-damage", "burn-chance"],
  // Act 2: Rotwood
  "rotwood-stalker": ["bleed-chance", "evasion"],
  "blight-spitter": ["poison-chance", "ailment-effect"],
  barkhide: ["thorns", "tenacity"],
  "mossbound-warden": ["life", "block-chance"],
  // Act 3: Ember Wastes
  "cinder-imp": ["attack-speed", "starting-heat"],
  "magma-brute": ["physical-damage", "physical-penetration"],
  "flame-caller": ["elemental-damage", "heat-gain"],
  "obsidian-guard": ["armor", "fire-resistance"],
  // Act 4: Frost Peaks
  "frost-wolf": ["evasion", "crit-chance"],
  "ice-golem": ["armor", "cold-resistance"],
  "rime-witch": ["chill-chance", "barrier"],
  "frost-warden": ["block-chance", "tenacity"],
  // Act 5: Storm Spires
  "storm-sprite": ["attack-speed", "shock-chance"],
  "thunder-brute": ["physical-damage", "vitality"],
  "storm-caller": ["elemental-penetration", "intelligence"],
  "static-golem": ["thorns", "lightning-resistance"],
  // Act 6: Void Rift
  "rift-stalker": ["crit-chance", "dexterity"],
  "hollow-brute": ["life", "void-resistance"],
  "void-seer": ["elemental-penetration", "wisdom"],
  "gloom-weaver": ["corruption-chance", "ailment-effect"],
  // Act 7: Emberfall
  "ash-revenant": ["lifesteal", "strength"],
  "ember-wraith": ["barrier", "elemental-damage"],
  "harrow-hound": ["bleed-chance", "agility"],
  "cinder-knight": ["all-resistance", "armor"],
  // Everywhere from Act 2
  "ember-thief": ["agility", "flask-charges"],
};
