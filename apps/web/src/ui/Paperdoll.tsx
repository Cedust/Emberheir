import type { EquipmentSlot } from "@emberheir/sim";
import type { ReactNode } from "react";

/** Size of the paperdoll in stage pixels at scale 1. */
export const DOLL_W = 400;
export const DOLL_H = 360;

export interface DollBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Where every equipment slot sits, laid out like Diablo 2's character screen: Helm on top with
 * the Amulet beside it, weapon and off hand left and right of the Body Armor, and the bottom row
 * Gloves, Ring, Belt, Ring, Boots.
 */
export const DOLL: Readonly<Record<EquipmentSlot, DollBox>> = {
  helm: { x: 160, y: 4, w: 80, h: 80 },
  amulet: { x: 256, y: 28, w: 52, h: 52 },
  mainHand: { x: 14, y: 96, w: 92, h: 160 },
  body: { x: 142, y: 96, w: 116, h: 154 },
  offHand: { x: 294, y: 96, w: 92, h: 160 },
  gloves: { x: 14, y: 268, w: 84, h: 84 },
  ring1: { x: 106, y: 284, w: 52, h: 52 },
  belt: { x: 162, y: 264, w: 76, h: 48 },
  ring2: { x: 242, y: 284, w: 52, h: 52 },
  boots: { x: 302, y: 268, w: 84, h: 84 },
};

/** A slot's box at a scale. */
export function dollBox(slot: EquipmentSlot, scale = 1): DollBox {
  const b = DOLL[slot];
  return { x: b.x * scale, y: b.y * scale, w: b.w * scale, h: b.h * scale };
}

/** The paperdoll frame: the hero's silhouette behind the slots the caller places on it. */
export function Paperdoll(props: { scale?: number; className?: string; children: ReactNode }) {
  const scale = props.scale ?? 1;
  return (
    <div
      className={`paperdoll ${props.className ?? ""}`}
      style={{ width: DOLL_W * scale, height: DOLL_H * scale }}
    >
      <svg className="silhouette" viewBox={`0 0 ${DOLL_W} ${DOLL_H}`} aria-hidden="true">
        <circle cx="200" cy="44" r="34" />
        <path d="M128 352 C126 190 150 92 200 92 C250 92 274 190 272 352 Z" />
        <path d="M128 130 L86 250 L104 258 L140 170 Z M272 130 L314 250 L296 258 L260 170 Z" />
      </svg>
      {props.children}
    </div>
  );
}
