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
  accessory: Object.freeze({ label: '一般飾品', maxLevel: 20 }),
  blackAccessory: Object.freeze({ label: '商城飾品', maxLevel: 20 }),
});

/**
 * Card draw tiers ordered from rarest to most common.
 * cumulativeThreshold is evaluated against a uniform [0, 1) random sample.
 */
export const CARD_TIERS = Object.freeze([
  Object.freeze({ key: 'gold', label: '金', rate: 0.0001, cumulativeThreshold: 0.0001 }),
  Object.freeze({ key: 'purple', label: '紫', rate: 0.0014, cumulativeThreshold: 0.0015 }),
  Object.freeze({ key: 'blue', label: '藍', rate: 0.0117, cumulativeThreshold: 0.0132 }),
  Object.freeze({ key: 'green', label: '綠', rate: 0.2624, cumulativeThreshold: 0.2756 }),
  Object.freeze({ key: 'white', label: '白', rate: 0.7244, cumulativeThreshold: 1.0 }),
]);

export const CARD_COST_CONFIG = Object.freeze({
  diamondsPer11Draws: 2100,
  diamondsPer10kTwd: 30580,
  twdBundlePrice: 10000,
});

export const MAX_BATCH_SIZE = 100_000;
