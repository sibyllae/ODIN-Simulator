import { CARD_COST_CONFIG, CARD_TIERS, MAX_BATCH_SIZE, probability } from './data.js';

/**
 * @typedef {Object} EnhancementStep
 * @property {number} fromLevel
 * @property {number} level
 * @property {number} attempted
 * @property {number} success
 * @property {number} fail
 * @property {number} rate
 */

/**
 * @typedef {Object} EnhancementResult
 * @property {string} equipType
 * @property {number} initialCount
 * @property {number} startLv
 * @property {number} targetLv
 * @property {number} finalSuccess
 * @property {number} expectedRate
 * @property {EnhancementStep[]} steps
 */

/**
 * @typedef {Object} CardDrawCounts
 * @property {number} white
 * @property {number} green
 * @property {number} blue
 * @property {number} purple
 * @property {number} gold
 */

/**
 * @typedef {Object} CardDrawResult
 * @property {number} count
 * @property {CardDrawCounts} counts
 * @property {number} diamonds
 * @property {number} costTwd
 */

/**
 * Computes the theoretical cumulative probability of reaching targetLv from nowLv.
 * @param {string} equipType
 * @param {number} nowLv
 * @param {number} targetLv
 * @returns {number} Probability in [0, 1]
 */
export function calculateExpectedEquipRate(equipType, nowLv, targetLv) {
  const table = probability[equipType];
  if (!table || !Number.isInteger(nowLv) || !Number.isInteger(targetLv) || nowLv >= targetLv) {
    return 0;
  }

  let cumulative = 1;
  for (let lv = nowLv + 1; lv <= targetLv; lv += 1) {
    cumulative *= table[lv] ?? 0.01;
  }
  return cumulative;
}

/**
 * Validates equipment simulation form parameters.
 * @param {{ equipType: string, nowLv: number, targetLv: number, count: number }} params
 * @returns {string | null} Error message in Traditional Chinese or null when valid
 */
export function validateEquipmentInput({ equipType, nowLv, targetLv, count }) {
  if (!equipType || !probability[equipType]) {
    return '請選擇要強化的道具類型。';
  }
  if (!Number.isInteger(nowLv) || nowLv < 0 || nowLv > 19) {
    return '請選擇有效的目前等級 (+0 ~ +19)。';
  }
  if (!Number.isInteger(targetLv) || targetLv < 1 || targetLv > 20) {
    return '請選擇有效的目標等級 (+1 ~ +20)。';
  }
  if (nowLv >= targetLv) {
    return '目標等級必須高於目前等級。';
  }
  if (!Number.isInteger(count) || count < 1) {
    return '請輸入至少 1 件的投入數量。';
  }
  if (count > MAX_BATCH_SIZE) {
    return `單次強化數量上限為 ${MAX_BATCH_SIZE.toLocaleString('zh-TW')} 件，避免瀏覽器卡頓。`;
  }
  return null;
}

/**
 * Runs a batch enhancement simulation from nowLv to targetLv.
 * @param {{ equipType: string, nowLv: number, targetLv: number, count: number, rng?: () => number }} params
 * @returns {EnhancementResult}
 */
export function simulateEnhancement({ equipType, nowLv, targetLv, count, rng = Math.random }) {
  const validationError = validateEquipmentInput({ equipType, nowLv, targetLv, count });
  if (validationError) {
    throw new Error(validationError);
  }

  const table = probability[equipType];
  const steps = [];
  let remaining = count;
  let currentLv = nowLv;

  while (remaining > 0 && currentLv < targetLv) {
    const nextLv = currentLv + 1;
    const rate = table[nextLv] ?? 0.01;

    let success = 0;
    for (let i = 0; i < remaining; i += 1) {
      if (rng() < rate) {
        success += 1;
      }
    }

    const fail = remaining - success;
    steps.push({
      fromLevel: currentLv,
      level: nextLv,
      attempted: remaining,
      success,
      fail,
      rate,
    });

    remaining = success;
    currentLv = nextLv;
  }

  return {
    equipType,
    initialCount: count,
    startLv: nowLv,
    targetLv,
    finalSuccess: currentLv === targetLv ? remaining : 0,
    expectedRate: calculateExpectedEquipRate(equipType, nowLv, targetLv),
    steps,
  };
}

/**
 * Validates card draw quantity.
 * @param {number} count
 * @returns {string | null}
 */
export function validateCardInput(count) {
  if (!Number.isInteger(count) || count < 1) {
    return '請輸入至少 1 抽的數量。';
  }
  if (count > MAX_BATCH_SIZE) {
    return `單次抽卡數量上限為 ${MAX_BATCH_SIZE.toLocaleString('zh-TW')} 抽，避免瀏覽器卡頓。`;
  }
  return null;
}

/**
 * Estimates diamond and TWD cost for a given draw count.
 * @param {number} count
 * @returns {{ diamonds: number, costTwd: number }}
 */
export function calculateCardCost(count) {
  const { diamondsPer11Draws, diamondsPer10kTwd, twdBundlePrice } = CARD_COST_CONFIG;
  const diamonds = Math.ceil((count / 11) * diamondsPer11Draws);
  const costTwd = Math.ceil((((count / 11) * diamondsPer11Draws) / diamondsPer10kTwd) * twdBundlePrice);
  return { diamonds, costTwd };
}

/**
 * Runs a batch gacha card draw simulation.
 * @param {{ count: number, rng?: () => number }} params
 * @returns {CardDrawResult}
 */
export function simulateCardDraws({ count, rng = Math.random }) {
  const validationError = validateCardInput(count);
  if (validationError) {
    throw new Error(validationError);
  }

  const counts = { white: 0, green: 0, blue: 0, purple: 0, gold: 0 };

  for (let i = 0; i < count; i += 1) {
    const r = rng();
    for (const tier of CARD_TIERS) {
      if (r < tier.cumulativeThreshold) {
        counts[tier.key] += 1;
        break;
      }
    }
  }

  const { diamonds, costTwd } = calculateCardCost(count);

  return {
    count,
    counts,
    diamonds,
    costTwd,
  };
}
