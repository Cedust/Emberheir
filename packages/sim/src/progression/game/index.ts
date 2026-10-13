/**
 * The game loop (docs/design/game-design-document-v1.md section 2), one module per part:
 * `state` (the types of a save game), `actions` (`applyAction`), `new-game`, `acts`,
 * `hero-build`, `encounters`, `run`, `resolve`, `loot`, `rewards`, `item-rules`,
 * `item-actions`, `trainer` and `prestige`. Save games are in `../../save`.
 *
 * This barrel is the public API; the modules import each other directly.
 */
export {
  SAVE_VERSION,
  GameActionError,
  fail,
  nextRng,
  type ActData,
  type GameData,
  type Wallet,
  type HeroState,
  type Encounter,
  type ItemPick,
  type BountyDone,
  type BountyReward,
  type Rewards,
  type RunPhase,
  type RunState,
  type Notice,
  type PrestigeRewards,
  type LevelBand,
  type ChronicleEntry,
  type LegacyState,
  type PendingPrestige,
  type GameStats,
  type GameState,
} from "./state";
export { newGame, type NewGameOptions } from "./new-game";
export {
  getAct,
  stagesInAct,
  isFinaleAct,
  finaleOpen,
  finaleEchoes,
  actsInOrder,
  actsInRun,
  harvestAct,
  actUnlocked,
  nextAct,
  isHarvestAct,
  levelBand,
  stageMonsterLevel,
  waymarkStages,
  waymarkKey,
  earnedSkillPoints,
  stagePressure,
  isWallAct,
  gateStages,
  stageWall,
  wildfireOpen,
  emberPenalty,
  wildfireTop,
  wildfireName,
  wildfireLevel,
  wildfirePressure,
  prestigeRewards,
} from "./acts";
export {
  weaponBase,
  masteryTree,
  heroWeaponRank,
  wornEcho,
  heroWeapon,
  heroWeaponName,
  masteryPointsLeft,
  knownSkills,
  heroRotation,
  heroReactions,
  heroBoons,
  openBoonFamilies,
  heroClassOf,
  heroTitle,
  heroSetup,
  type KnownSkill,
} from "./hero-build";
export {
  encounterEnemy,
  bossAbilities,
  wildfireBossAbilities,
  eliteModifiersOf,
  enemySetup,
  encounterName,
  encounterRank,
  currentFight,
  fightRecording,
  startFight,
  finalePressure,
} from "./encounters";
export {
  salvageValue,
  targetSlot,
  slotsFor,
  equipBlockReason,
  takeBlockReason,
  unequipBlockReason,
  moveBlockReason,
  type EquipBlockReason,
  type UnequipBlockReason,
  type MoveBlockReason,
} from "./item-rules";
export { applyAction, requireCamp, type GameAction } from "./actions";
export { draughtsOpen, getDraught, brewedDraught, activeDraught, flaskCapacity } from "./run";
export { getBounty, bountyReward } from "./resolve";
export { lootGate, itemPickWeights, addRunes, maxRuneRank, rollRuneDrops } from "./loot";
export { rewardsDone } from "./rewards";
export {
  requireTrainer,
  spentInTree,
  respecAcorns,
  forgetAcorns,
  attributeRespecAcorns,
} from "./trainer";
export { openBranches } from "./prestige";
