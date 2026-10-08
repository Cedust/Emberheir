import { GAME_DATA } from "@emberheir/content";
import {
  type GameState,
  WEAPON_GRADES,
  heroWeaponName,
  heroWeaponRank,
  weaponGrade,
} from "@emberheir/sim";
import { ItemArt } from "../ui/ItemArt";
import { WEAPON_BOX } from "../ui/Paperdoll";

/** Grade colours, Crude to Exalted (the weapon's temperature). */
export const GRADE_COLOR = ["#9a8c78", "#d0803a", "#ff7a2a", "#ffc04a", "#fff0c8"];

export function gradeIndex(rank: number): number {
  return Math.max(
    0,
    WEAPON_GRADES.findIndex((g) => g.name === weaponGrade(rank)),
  );
}

/**
 * The hero's own weapon on the paperdoll (Weapon Mastery): not an item, so it cannot be moved.
 * Its frame glows in the grade's colour, the badge shows the Weapon Rank.
 */
export function WeaponSlot(props: { state: GameState; scale?: number }) {
  const scale = props.scale ?? 1;
  const rank = heroWeaponRank(props.state);
  const color = GRADE_COLOR[gradeIndex(rank)] ?? GRADE_COLOR[0];
  const name = heroWeaponName(props.state, GAME_DATA);
  return (
    <div
      className="doll-slot weapon-slot"
      style={{ left: WEAPON_BOX.x * scale, top: WEAPON_BOX.y * scale }}
    >
      <div
        className="item-tile weapon-tile"
        role="img"
        aria-label={`${name}, Weapon Rank ${rank}`}
        title={`${name} · Rank ${rank}`}
        data-testid="weapon-slot"
        style={{
          width: WEAPON_BOX.w * scale,
          height: WEAPON_BOX.h * scale,
          borderColor: color,
          boxShadow: `inset 0 0 ${18 * scale}px ${color}55, 0 0 ${10 * scale}px ${color}44`,
        }}
      >
        <ItemArt baseId={props.state.hero.weaponId} slot="mainHand" />
        <span className="weapon-rank mono" style={{ color }}>
          {rank}
        </span>
      </div>
    </div>
  );
}
