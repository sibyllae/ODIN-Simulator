/**
 * Enhancement success probabilities per equipment category and target level (+1 to +20).
 * Keys represent the target enhancement level being attempted (e.g., 1 = +0 -> +1).
 */
export const probability = Object.freeze({
  arms: Object.freeze({
    1: 0.95, 2: 0.90, 3: 0.85, 4: 0.80, 5: 0.75, 6: 0.60, 7: 0.45, 8: 0.30, 9: 0.20, 10: 0.10,
    11: 0.08, 12: 0.05, 13: 0.03, 14: 0.02, 15: 0.01, 16: 0.01, 17: 0.01, 18: 0.01, 19: 0.01, 20: 0.01,
  }),
  equip: Object.freeze({
    1: 0.95, 2: 0.90, 3: 0.85, 4: 0.80, 5: 0.75, 6: 0.55, 7: 0.40, 8: 0.25, 9: 0.15, 10: 0.08,
    11: 0.06, 12: 0.04, 13: 0.02, 14: 0.01, 15: 0.01, 16: 0.01, 17: 0.01, 18: 0.01, 19: 0.01, 20: 0.01,
  }),
  cloak: Object.freeze({
    1: 0.90, 2: 0.80, 3: 0.70, 4: 0.60, 5: 0.50, 6: 0.40, 7: 0.30, 8: 0.20, 9: 0.10, 10: 0.05,
    11: 0.03, 12: 0.02, 13: 0.01, 14: 0.01, 15: 0.01, 16: 0.01, 17: 0.01, 18: 0.01, 19: 0.01, 20: 0.01,
  }),
  accessory: Object.freeze({
    1: 0.85, 2: 0.75, 3: 0.65, 4: 0.50, 5: 0.40, 6: 0.30, 7: 0.20, 8: 0.10, 9: 0.05, 10: 0.03,
    11: 0.02, 12: 0.01, 13: 0.01, 14: 0.01, 15: 0.01, 16: 0.01, 17: 0.01, 18: 0.01, 19: 0.01, 20: 0.01,
  }),
  blackAccessory: Object.freeze({
    1: 0.75, 2: 0.65, 3: 0.50, 4: 0.40, 5: 0.30, 6: 0.20, 7: 0.10, 8: 0.05, 9: 0.03, 10: 0.01,
    11: 0.01, 12: 0.01, 13: 0.01, 14: 0.01, 15: 0.01, 16: 0.01, 17: 0.01, 18: 0.01, 19: 0.01, 20: 0.01,
  }),
});

export const EQUIP_META = Object.freeze({
  arms: Object.freeze({ label: '武器', maxLevel: 20 }),
  equip: Object.freeze({ label: '防具 / 裝備', maxLevel: 20 }),
  cloak: Object.freeze({ label: '披風', maxLevel: 20 }),
  accessory: Object.freeze({ label: '一般飾品（含紋章等制霸飾品）', maxLevel: 20 }),
  blackAccessory: Object.freeze({ label: '商城飾品', maxLevel: 20 }),
});

/**
 * Blessed / Ivaldi enhancement stone bonus: 20% chance to jump +2 on successful enhancement.
 */
export const BLESSED_JUMP_RATE = 0.20;

/**
 * Standard diamond summon rate distribution (Avatar, Mount, Weapon Appearance, Rune/Warding Stone).
 */
export const CARD_TIERS = Object.freeze([
  Object.freeze({ key: 'gold', label: '金（傳說）', shortLabel: '金', rate: 0.0001, cumulativeThreshold: 0.0001 }),
  Object.freeze({ key: 'purple', label: '紫（英雄）', shortLabel: '紫', rate: 0.0016, cumulativeThreshold: 0.0017 }),
  Object.freeze({ key: 'blue', label: '藍（稀有）', shortLabel: '藍', rate: 0.0132, cumulativeThreshold: 0.0149 }),
  Object.freeze({ key: 'green', label: '綠（高級）', shortLabel: '綠', rate: 0.2756, cumulativeThreshold: 0.2905 }),
  Object.freeze({ key: 'white', label: '白（一般）', shortLabel: '白', rate: 0.7095, cumulativeThreshold: 1.0 }),
]);

export const CARD_POOLS = Object.freeze({
  avatar: Object.freeze({
    id: 'avatar',
    label: '造型召喚',
    description: '決定角色職業與攻速・施速基礎素質',
    diamondsPer11Draws: 2100,
    tiers: CARD_TIERS,
  }),
  mount: Object.freeze({
    id: 'mount',
    label: '坐騎召喚',
    description: '提供跑速、採集速度與減傷／防禦屬性',
    diamondsPer11Draws: 2100,
    tiers: CARD_TIERS,
  }),
  weaponSkin: Object.freeze({
    id: 'weaponSkin',
    label: '武器形象召喚',
    description: '獨立武器外觀並與造型・坐騎連動加成',
    diamondsPer11Draws: 2100,
    tiers: CARD_TIERS,
  }),
  rune: Object.freeze({
    id: 'rune',
    label: '符石 / 庇佑石召喚',
    description: '鑲嵌盤面套裝效果，強化命中、爆擊與減傷',
    diamondsPer11Draws: 2100,
    tiers: CARD_TIERS,
  }),
});

export const CARD_COST_CONFIG = Object.freeze({
  diamondsPer11Draws: 2100,
  diamondsPer10kTwd: 30580,
  twdBundlePrice: 10000,
});

/**
 * 4-to-1 card synthesis tiers (Avatar, Mount, Weapon Skin, Warding Stone).
 */
export const SYNTHESIS_TIERS = Object.freeze([
  Object.freeze({ id: 'white-green', fromKey: 'white', toKey: 'green', fromLabel: '白（一般）', toLabel: '綠（高級）', rate: 0.30, cardsRequired: 4 }),
  Object.freeze({ id: 'green-blue', fromKey: 'green', toKey: 'blue', fromLabel: '綠（高級）', toLabel: '藍（稀有）', rate: 0.21, cardsRequired: 4 }),
  Object.freeze({ id: 'blue-purple', fromKey: 'blue', toKey: 'purple', fromLabel: '藍（稀有）', toLabel: '紫（英雄）', rate: 0.18, cardsRequired: 4 }),
  Object.freeze({ id: 'purple-gold', fromKey: 'purple', toKey: 'gold', fromLabel: '紫（英雄）', toLabel: '金（傳說）', rate: 0.16, cardsRequired: 4 }),
  Object.freeze({ id: 'gold-red', fromKey: 'gold', toKey: 'red', fromLabel: '金（傳說）', toLabel: '紅（神話）', rate: 0.14, cardsRequired: 4 }),
]);

/**
 * Rune built-in panel upgrade rates (different from 4-to-1 card synthesis).
 */
export const RUNE_UPGRADE_TIERS = Object.freeze([
  Object.freeze({ id: 'white-green', fromKey: 'white', toKey: 'green', fromLabel: '白符石', toLabel: '綠符石', rate: 0.30, cardsRequired: 1 }),
  Object.freeze({ id: 'green-blue', fromKey: 'green', toKey: 'blue', fromLabel: '綠符石', toLabel: '藍符石', rate: 0.16, cardsRequired: 1 }),
  Object.freeze({ id: 'blue-purple', fromKey: 'blue', toKey: 'purple', fromLabel: '藍符石', toLabel: '紫符石', rate: 0.13, cardsRequired: 1 }),
  Object.freeze({ id: 'purple-gold', fromKey: 'purple', toKey: 'gold', fromLabel: '紫符石', toLabel: '金符石', rate: 0.11, cardsRequired: 1 }),
  Object.freeze({ id: 'gold-red', fromKey: 'gold', toKey: 'red', fromLabel: '金符石', toLabel: '紅符石', rate: 0.10, cardsRequired: 1 }),
]);

export const SYNTHESIS_CATEGORIES = Object.freeze({
  avatar: Object.freeze({ id: 'avatar', label: '造型 4 合 1 合成', tiers: SYNTHESIS_TIERS, supportsPity: true }),
  mount: Object.freeze({ id: 'mount', label: '坐騎 4 合 1 合成', tiers: SYNTHESIS_TIERS, supportsPity: true }),
  weaponSkin: Object.freeze({ id: 'weaponSkin', label: '武器形象 4 合 1 合成', tiers: SYNTHESIS_TIERS, supportsPity: true }),
  warding: Object.freeze({ id: 'warding', label: '庇佑石 4 合 1 合成', tiers: SYNTHESIS_TIERS, supportsPity: true }),
  runeUpgrade: Object.freeze({ id: 'runeUpgrade', label: '符石內建升階（單顆）', tiers: RUNE_UPGRADE_TIERS, supportsPity: false }),
});

export const SYNTHESIS_PITY_THRESHOLD = 15;

/**
 * 10-slot Artifact Roulette Board (古物抽獎盤).
 * Slot 2 has 35% hit weight, Slots 3 & 4 have 17.5% each, and remaining slots share the tail.
 */
export const ARTIFACT_SLOTS = Object.freeze([
  Object.freeze({ index: 0, slotNumber: 1, label: '一般道具 / 素材', tier: 'common', weight: 0.12 }),
  Object.freeze({ index: 1, slotNumber: 2, label: '白古物（主力高機率格）', tier: 'target', weight: 0.35 }),
  Object.freeze({ index: 2, slotNumber: 3, label: '綠古物 / 強化石', tier: 'uncommon', weight: 0.175 }),
  Object.freeze({ index: 3, slotNumber: 4, label: '綠古物 / 收藏品', tier: 'uncommon', weight: 0.175 }),
  Object.freeze({ index: 4, slotNumber: 5, label: '精隨 / 消耗品', tier: 'common', weight: 0.06 }),
  Object.freeze({ index: 5, slotNumber: 6, label: '藍古物碎片', tier: 'rare', weight: 0.04 }),
  Object.freeze({ index: 6, slotNumber: 7, label: '稀有裝備圖樣', tier: 'rare', weight: 0.03 }),
  Object.freeze({ index: 7, slotNumber: 8, label: '稀有藍古物', tier: 'rare', weight: 0.025 }),
  Object.freeze({ index: 8, slotNumber: 9, label: '高階稀有製作書', tier: 'epic', weight: 0.015 }),
  Object.freeze({ index: 9, slotNumber: 10, label: '英雄紫布 / 頂級大獎', tier: 'epic', weight: 0.01 }),
]);

/**
 * Engraving stages (刻印系統第 1~5 階) with 3-slot matching stat & tier probabilities.
 */
export const ENGRAVING_STAGES = Object.freeze({
  1: Object.freeze({ stage: 1, label: '第 1 階段', matchRate: 0.08, tierWeights: Object.freeze({ white: 0.65, purple: 0.20, gold: 0.15 }) }),
  2: Object.freeze({ stage: 2, label: '第 2 階段', matchRate: 0.07, tierWeights: Object.freeze({ white: 0.65, purple: 0.20, gold: 0.15 }) }),
  3: Object.freeze({ stage: 3, label: '第 3 階段', matchRate: 0.05, tierWeights: Object.freeze({ white: 0.70, purple: 0.18, gold: 0.12 }) }),
  4: Object.freeze({ stage: 4, label: '第 4 階段', matchRate: 0.02, tierWeights: Object.freeze({ white: 0.77, purple: 0.16, gold: 0.07 }) }),
  5: Object.freeze({ stage: 5, label: '第 5 階段', matchRate: 0.02, tierWeights: Object.freeze({ white: 0.77, purple: 0.16, gold: 0.07 }) }),
});

/**
 * Crafting presets & fixed 15% critical success rate (製作大成功).
 */
export const CRAFTING_GREAT_SUCCESS_RATE = 0.15;
export const CRAFTING_PRESETS = Object.freeze({
  gearPattern: Object.freeze({ id: 'gearPattern', label: '一般裝備圖樣製作', baseRate: 0.20 }),
  essence: Object.freeze({ id: 'essence', label: '精隨 / 靈魂製作', baseRate: 0.12 }),
  skillMaterial: Object.freeze({ id: 'skillMaterial', label: '高階材料 / 技能書', baseRate: 0.30 }),
  guaranteed: Object.freeze({ id: 'guaranteed', label: '必成製作（僅拚 15% 大成功）', baseRate: 1.0 }),
});

export const MAX_BATCH_SIZE = 100_000;
