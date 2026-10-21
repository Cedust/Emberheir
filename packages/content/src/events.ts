import type { EventDefinition } from "@emberheir/sim";

/**
 * Events of the act map (act-karte-entwurf-v1.md, Timo 2026-10-21). Every Event can be left for
 * free; no price takes more than half of a layer. Acorns, Ash and XP count in normal fights of
 * the stage, so the prices grow with the world. Starting values.
 */
export const EVENTS: readonly EventDefinition[] = [
  {
    id: "smoldering-altar",
    name: "Smoldering Altar",
    text: "An old altar glows under the ash. It wants a little of your life.",
    options: [
      {
        id: "sacrifice",
        label: "Sacrifice",
        text: "Lose 20 % Life. Gain a Rune one rank above this act's.",
        cost: { life: 0.2 },
        gain: { rune: 1 },
      },
    ],
  },
  {
    id: "ember-spring",
    name: "Ember Spring",
    text: "Warm water bubbles out of the cinders.",
    options: [
      { id: "drink", label: "Drink", text: "Heal 30 % Life.", gain: { life: 0.3 } },
      {
        id: "bottle",
        label: "Bottle It",
        text: "Gain 1 Ember Flask charge.",
        gain: { flask: 1 },
      },
    ],
  },
  {
    id: "trapped-chest",
    name: "Trapped Chest",
    text: "A chest with a suspicious wire. Something clicks inside.",
    options: [
      {
        id: "open",
        label: "Break It Open",
        text: "An item pick. Half the time the trap costs 25 % Life.",
        gain: { items: true },
        risk: { chance: 0.5, life: 0.25 },
      },
    ],
  },
  {
    id: "ashen-challenger",
    name: "Ashen Challenger",
    text: "A scarred fighter blocks the road and grins. It wants a real fight.",
    options: [
      {
        id: "accept",
        label: "Accept",
        text: "Your next fight is an Elite. Take 2 of its items.",
        gain: { challenge: true },
      },
    ],
  },
  {
    id: "hedgehog-peddler",
    name: "Hedgehog Peddler",
    text: "A hedgehog with a heavy pack. Everything is for sale, even the pack.",
    options: [
      {
        id: "flask",
        label: "Buy a Charge",
        text: "Pay Acorns for 1 Ember Flask charge.",
        cost: { acornFights: 4 },
        gain: { flask: 1 },
      },
      {
        id: "coal",
        label: "Trade Ash",
        text: "Pay Ash for 2 Ember Coal.",
        cost: { ashFights: 3 },
        gain: { emberCoal: 2 },
      },
    ],
  },
  {
    id: "hunters-camp",
    name: "Hunters' Camp",
    text: "A circle of tired hunters around a small fire. They wave you over.",
    options: [
      { id: "rest", label: "Rest", text: "Heal 20 % Life.", gain: { life: 0.2 } },
      {
        id: "train",
        label: "Train",
        text: "Gain the XP of 2 fights.",
        gain: { xpFights: 2 },
      },
    ],
  },
  {
    id: "cursed-spark",
    name: "Cursed Spark",
    text: "A spark of stolen fire hovers over the road. It burns the wrong way.",
    shrine: true,
    options: [
      {
        id: "take",
        label: "Take It",
        text: "1 of 3 Boons. Enemies deal 15 % more damage until the next Waymark.",
        gain: { boons: true },
        curse: { damage: 0.15 },
      },
    ],
  },
  {
    id: "lost-cub",
    name: "Lost Cub",
    text: "A shivering fox cub, far from its den. It is very hungry.",
    options: [
      {
        id: "home",
        label: "Bring It Home",
        text: "Lose 1 Ember Flask charge. Your next item pick holds a Rare or better.",
        cost: { flask: 1 },
        gain: { lucky: true },
      },
    ],
  },
];
