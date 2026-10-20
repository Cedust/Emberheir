import { GAME_DATA } from "@emberheir/content";
import { type GameState, heroWeaponName, heroWeaponRank, weaponGradeIndex } from "@emberheir/sim";
import { ItemArt } from "../ui/ItemArt";
import { useWeaponHover } from "../ui/ItemTooltip";
import { type DollBox, WEAPON_BOX } from "../ui/Paperdoll";
import { GRADE_COLOR, heroWeaponTip } from "../ui/weaponTip";

export { GRADE_COLOR };

export const gradeIndex = weaponGradeIndex;

/**
 * The hero's own weapon on the paperdoll (Weapon Mastery): not an item, so it cannot be moved.
 * Its frame glows in the grade's colour, the badge shows the Weapon Rank; hovering it shows the
 * weapon's tooltip.
 */
export function WeaponSlot(props: { state: GameState; scale?: number; box?: DollBox }) {
  const scale = props.scale ?? 1;
  const box = props.box ?? WEAPON_BOX;
  const rank = heroWeaponRank(props.state);
  const color = GRADE_COLOR[gradeIndex(rank)] ?? GRADE_COLOR[0];
  const name = heroWeaponName(props.state, GAME_DATA);
  const state = props.state;
  const hover = useWeaponHover(() => heroWeaponTip(state));
  return (
    <div className="doll-slot weapon-slot" style={{ left: box.x * scale, top: box.y * scale }}>
      <div
        className="item-tile weapon-tile"
        role="img"
        aria-label={`${name}, Weapon Rank ${rank}`}
        tabIndex={0}
        data-testid="weapon-slot"
        style={{
          width: box.w * scale,
          height: box.h * scale,
          borderColor: color,
          boxShadow: `inset 0 0 ${18 * scale}px ${color}55, 0 0 ${10 * scale}px ${color}44`,
        }}
        {...hover}
      >
        <ItemArt baseId={props.state.hero.weaponId} slot="mainHand" />
        <span className="weapon-rank mono" style={{ color }}>
          {rank}
        </span>
      </div>
    </div>
  );
}
