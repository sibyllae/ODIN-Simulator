import {
  ARTIFACT_SLOTS,
  BLESSED_JUMP_RATE,
  CARD_COST_CONFIG,
  CARD_POOLS,
  CARD_TIERS,
  CRAFTING_GREAT_SUCCESS_RATE,
  CRAFTING_PRESETS,
  ENGRAVING_STAGES,
  MAX_BATCH_SIZE,
  SYNTHESIS_CATEGORIES,
  SYNTHESIS_PITY_THRESHOLD,
  SYNTHESIS_TIERS,
  probability,
} from './data.js';

/**
 * Computes theoretical cumulative probability of reaching targetLv from nowLv.
 * Uses exact dynamic programming when stoneType is 'blessed' (+2 jump on 20% of successes).
 * @param {string} equipType
 * @param {number} nowLv
 * @param {number} targetLv
 * @param {'normal' | 'blessed'} [stoneType='normal']
 * @returns {number}
 */
export function calculateExpectedEquipRate(equipType, nowLv, targetLv, stoneType = 'normal') {
  const table = probability[equipType];
  if (!table || !Number.isInteger(nowLv) || !Number.isInteger(targetLv) || nowLv >= targetLv) {
    return 0;
  }

  if (stoneType !== 'blessed') {
    let cumulative = 1;
    for (let lv = nowLv + 1; lv <= targetLv; lv += 1) {
      cumulative *= table[lv] ?? 0.01;
    }
    return cumulative;
  }

  const dp = new Array(targetLv + 2).fill(0);
  dp[targetLv] = 1;
  for (let lv = targetLv - 1; lv >= nowLv; lv -= 1) {
    const rate = table[lv + 1] ?? 0.01;
    if (lv + 2 <= targetLv) {
      dp[lv] = rate * ((1 - BLESSED_JUMP_RATE) * dp[lv + 1] + BLESSED_JUMP_RATE * dp[lv + 2]);
    } else {
      dp[lv] = rate * dp[lv + 1];
    }
  }
  return dp[nowLv];
}

/**
 * Validates equipment simulation form parameters.
 * @param {{ equipType: string, nowLv: number, targetLv: number, count: number, stoneType?: string }} params
 * @returns {string | null}
 */
export function validateEquipmentInput({ equipType, nowLv, targetLv, count, stoneType = 'normal' }) {
  if (!equipType || !probability[equipType]) {
    return '請選擇要強化的道具類型。';
  }
  if (stoneType !== 'normal' && stoneType !== 'blessed') {
    return '請選擇有效的強化石類型。';
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
 * Supports normal stones and blessed (Ivaldi) stones with 20% +2 jump chance.
 * @param {{ equipType: string, nowLv: number, targetLv: number, count: number, stoneType?: 'normal' | 'blessed', rng?: () => number }} params
 */
export function simulateEnhancement({
  equipType,
  nowLv,
  targetLv,
  count,
  stoneType = 'normal',
  rng = Math.random,
}) {
  const validationError = validateEquipmentInput({ equipType, nowLv, targetLv, count, stoneType });
  if (validationError) {
    throw new Error(validationError);
  }

  const table = probability[equipType];
  const atLevel = new Array(targetLv + 1).fill(0);
  atLevel[nowLv] = count;

  const steps = [];
  let totalJumps = 0;

  for (let lv = nowLv; lv < targetLv; lv += 1) {
    const attempting = atLevel[lv];
    if (attempting <= 0) continue;

    const rate = table[lv + 1] ?? 0.01;
    let plus1 = 0;
    let jump2 = 0;

    for (let i = 0; i < attempting; i += 1) {
      if (rng() < rate) {
        if (stoneType === 'blessed' && lv + 2 <= targetLv && rng() < BLESSED_JUMP_RATE) {
          jump2 += 1;
          atLevel[lv + 2] += 1;
        } else {
          plus1 += 1;
          atLevel[lv + 1] += 1;
        }
      }
    }

    const success = plus1 + jump2;
    const fail = attempting - success;
    totalJumps += jump2;

    steps.push({
      fromLevel: lv,
      level: lv + 1,
      attempted: attempting,
      success,
      plus1,
      jump2,
      fail,
      rate,
      survivorsAtEndOfStep: atLevel[lv + 1] + (lv + 2 <= targetLv ? atLevel[lv + 2] : 0),
    });
  }

  return {
    equipType,
    stoneType,
    initialCount: count,
    startLv: nowLv,
    targetLv,
    finalSuccess: atLevel[targetLv],
    totalJumps,
    expectedRate: calculateExpectedEquipRate(equipType, nowLv, targetLv, stoneType),
    steps,
  };
}

/**
 * Validates card draw quantity and pool ID.
 * @param {number} count
 * @param {string} [poolId='avatar']
 * @returns {string | null}
 */
export function validateCardInput(count, poolId = 'avatar') {
  if (!CARD_POOLS[poolId]) {
    return '請選擇有效的召喚卡池。';
  }
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
 * @param {string} [poolId='avatar']
 * @returns {{ diamonds: number, costTwd: number }}
 */
export function calculateCardCost(count, poolId = 'avatar') {
  const pool = CARD_POOLS[poolId] ?? CARD_POOLS.avatar;
  const diamondsPer11 = pool.diamondsPer11Draws ?? CARD_COST_CONFIG.diamondsPer11Draws;
  const { diamondsPer10kTwd, twdBundlePrice } = CARD_COST_CONFIG;

  const diamonds = Math.ceil((count / 11) * diamondsPer11);
  const costTwd = Math.ceil((diamonds / diamondsPer10kTwd) * twdBundlePrice);
  return { diamonds, costTwd };
}

/**
 * Runs a batch gacha card draw simulation for the specified summon pool.
 * @param {{ count: number, poolId?: string, rng?: () => number }} params
 */
export function simulateCardDraws({ count, poolId = 'avatar', rng = Math.random }) {
  const validationError = validateCardInput(count, poolId);
  if (validationError) {
    throw new Error(validationError);
  }

  const pool = CARD_POOLS[poolId];
  const tiers = pool.tiers ?? CARD_TIERS;
  const counts = { white: 0, green: 0, blue: 0, purple: 0, gold: 0 };

  for (let i = 0; i < count; i += 1) {
    const r = rng();
    let matched = false;
    for (const tier of tiers) {
      if (r < tier.cumulativeThreshold) {
        counts[tier.key] += 1;
        matched = true;
        break;
      }
    }
    if (!matched) {
      counts.white += 1;
    }
  }

  const { diamonds, costTwd } = calculateCardCost(count, poolId);

  return {
    poolId: pool.id,
    poolLabel: pool.label,
    count,
    counts,
    diamonds,
    costTwd,
  };
}

/**
 * Validates single-tier synthesis simulation input.
 * @param {{ category: string, tierId: string, attempts: number }} params
 * @returns {string | null}
 */
export function validateSynthesisInput({ category, tierId, attempts }) {
  const cat = SYNTHESIS_CATEGORIES[category];
  if (!cat) {
    return '請選擇有效的合成類別。';
  }
  if (!cat.tiers.some((t) => t.id === tierId)) {
    return '請選擇有效的合成階級。';
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    return '請輸入至少 1 次的合成次數。';
  }
  if (attempts > MAX_BATCH_SIZE) {
    return `單次模擬上限為 ${MAX_BATCH_SIZE.toLocaleString('zh-TW')} 次，避免瀏覽器卡頓。`;
  }
  return null;
}

/**
 * Simulates N independent synthesis attempts (4-to-1 card synthesis or 1-to-1 rune upgrade).
 * @param {{ category?: string, tierId: string, attempts: number, enablePity?: boolean, initialPityCount?: number, rng?: () => number }} params
 */
export function simulateSynthesis({
  category = 'avatar',
  tierId,
  attempts,
  enablePity = true,
  initialPityCount = 0,
  rng = Math.random,
}) {
  const error = validateSynthesisInput({ category, tierId, attempts });
  if (error) {
    throw new Error(error);
  }

  const cat = SYNTHESIS_CATEGORIES[category];
  const tier = cat.tiers.find((t) => t.id === tierId);
  const usePity = Boolean(enablePity && cat.supportsPity);

  let directSuccess = 0;
  let failCount = 0;
  let pityTriggered = 0;
  let pityProgress = initialPityCount;

  for (let i = 0; i < attempts; i += 1) {
    if (rng() < tier.rate) {
      directSuccess += 1;
    } else {
      failCount += 1;
      if (usePity) {
        pityProgress += 1;
        if (pityProgress >= SYNTHESIS_PITY_THRESHOLD) {
          pityTriggered += 1;
          pityProgress = 0;
        }
      }
    }
  }

  return {
    category,
    tierId: tier.id,
    fromLabel: tier.fromLabel,
    toLabel: tier.toLabel,
    rate: tier.rate,
    attempts,
    materialsUsed: attempts * tier.cardsRequired,
    directSuccess,
    failCount,
    pityTriggered,
    totalGained: directSuccess + pityTriggered,
    remainingPity: pityProgress,
  };
}

/**
 * Simulates cascading 4-to-1 synthesis from White all the way up to Red (Mythic).
 * @param {{ inventory: Record<string, number>, category?: string, enablePity?: boolean, rng?: () => number }} params
 */
export function simulateCascadeSynthesis({
  inventory,
  category = 'avatar',
  enablePity = true,
  rng = Math.random,
}) {
  const cat = SYNTHESIS_CATEGORIES[category] ?? SYNTHESIS_CATEGORIES.avatar;
  const tiers = cat.tiers ?? SYNTHESIS_TIERS;

  const pool = {
    white: Math.max(0, Math.floor(inventory?.white ?? 0)),
    green: Math.max(0, Math.floor(inventory?.green ?? 0)),
    blue: Math.max(0, Math.floor(inventory?.blue ?? 0)),
    purple: Math.max(0, Math.floor(inventory?.purple ?? 0)),
    gold: Math.max(0, Math.floor(inventory?.gold ?? 0)),
    red: 0,
  };

  const steps = [];
  let totalAttempts = 0;
  let totalPity = 0;

  for (const tier of tiers) {
    const inputCards = pool[tier.fromKey];
    const attempts = Math.floor(inputCards / tier.cardsRequired);
    const leftoverCards = inputCards % tier.cardsRequired;

    if (attempts === 0) {
      steps.push({
        category: cat.id,
        tierId: tier.id,
        fromLabel: tier.fromLabel,
        toLabel: tier.toLabel,
        rate: tier.rate,
        inputCards,
        attempts: 0,
        materialsUsed: 0,
        directSuccess: 0,
        failCount: 0,
        pityTriggered: 0,
        totalGained: 0,
        remainingPity: 0,
        leftoverCards,
      });
      continue;
    }

    const res = simulateSynthesis({
      category: cat.id,
      tierId: tier.id,
      attempts,
      enablePity,
      rng,
    });

    pool[tier.fromKey] = leftoverCards;
    pool[tier.toKey] += res.totalGained;
    totalAttempts += res.attempts;
    totalPity += res.pityTriggered;

    steps.push({
      ...res,
      inputCards,
      leftoverCards,
    });
  }

  return {
    category: cat.id,
    steps,
    finalInventory: pool,
    totalAttempts,
    totalPity,
  };
}

/**
 * Validates 10-slot Artifact Roulette input.
 * @param {{ draws: number, selectedSlots: number[] }} params
 * @returns {string | null}
 */
export function validateArtifactInput({ draws, selectedSlots }) {
  if (!Array.isArray(selectedSlots) || selectedSlots.length === 0) {
    return '請至少在盤面上勾選 1 個目標欄位。';
  }
  if (selectedSlots.some((idx) => !Number.isInteger(idx) || idx < 0 || idx >= ARTIFACT_SLOTS.length)) {
    return '盤面欄位索引無效。';
  }
  if (!Number.isInteger(draws) || draws < 1) {
    return '請輸入至少 1 次的抽獎次數。';
  }
  if (draws > MAX_BATCH_SIZE) {
    return `單次古物模擬上限為 ${MAX_BATCH_SIZE.toLocaleString('zh-TW')} 次。`;
  }
  return null;
}

/**
 * Simulates draws on the 10-slot Artifact Roulette Board.
 * @param {{ draws: number, selectedSlots: number[], rng?: () => number }} params
 */
export function simulateArtifactDraws({ draws, selectedSlots, rng = Math.random }) {
  const err = validateArtifactInput({ draws, selectedSlots });
  if (err) throw new Error(err);

  const selectedSet = new Set(selectedSlots);
  const slotHits = new Array(ARTIFACT_SLOTS.length).fill(0);
  let targetHits = 0;

  for (let i = 0; i < draws; i += 1) {
    const r = rng();
    let acc = 0;
    let landed = ARTIFACT_SLOTS.length - 1;
    for (let s = 0; s < ARTIFACT_SLOTS.length; s += 1) {
      acc += ARTIFACT_SLOTS[s].weight;
      if (r < acc) {
        landed = s;
        break;
      }
    }
    slotHits[landed] += 1;
    if (selectedSet.has(landed)) {
      targetHits += 1;
    }
  }

  const expectedHitRate = [...selectedSet].reduce((sum, idx) => sum + ARTIFACT_SLOTS[idx].weight, 0);

  return {
    draws,
    selectedSlots: [...selectedSet].sort((a, b) => a - b),
    expectedHitRate,
    targetHits,
    slotHits,
  };
}

/**
 * Validates Engraving simulation input.
 * @param {{ stage: number, attempts: number }} params
 * @returns {string | null}
 */
export function validateEngravingInput({ stage, attempts }) {
  if (!ENGRAVING_STAGES[stage]) {
    return '請選擇有效的刻印階段 (1 ~ 5)。';
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    return '請輸入至少 1 顆黃金印章的數量。';
  }
  if (attempts > MAX_BATCH_SIZE) {
    return `單次刻印模擬上限為 ${MAX_BATCH_SIZE.toLocaleString('zh-TW')} 顆黃金印章。`;
  }
  return null;
}

function rollEngravingSlotTier(tierWeights, r) {
  if (r < tierWeights.gold) return 'gold';
  if (r < tierWeights.gold + tierWeights.purple) return 'purple';
  return 'white';
}

/**
 * Simulates Golden Seal engraving rolls at a given stage (1..5).
 * Each attempt rolls 3 slot tiers and checks if all 3 share the same stat (matchRate).
 * @param {{ stage: number, attempts: number, rng?: () => number }} params
 */
export function simulateEngraving({ stage, attempts, rng = Math.random }) {
  const err = validateEngravingInput({ stage, attempts });
  if (err) throw new Error(err);

  const cfg = ENGRAVING_STAGES[stage];
  let matchedAny = 0;
  let matchedPurplePlus = 0;
  let matchedAllGold = 0;
  let lastRoll = null;

  for (let i = 0; i < attempts; i += 1) {
    const s1 = rollEngravingSlotTier(cfg.tierWeights, rng());
    const s2 = rollEngravingSlotTier(cfg.tierWeights, rng());
    const s3 = rollEngravingSlotTier(cfg.tierWeights, rng());
    const sameStat = rng() < cfg.matchRate;

    if (sameStat) {
      matchedAny += 1;
      if (s1 !== 'white' && s2 !== 'white' && s3 !== 'white') {
        matchedPurplePlus += 1;
      }
      if (s1 === 'gold' && s2 === 'gold' && s3 === 'gold') {
        matchedAllGold += 1;
      }
    }

    if (i === attempts - 1) {
      lastRoll = { slots: [s1, s2, s3], sameStat };
    }
  }

  const pPurplePlus = (cfg.tierWeights.purple + cfg.tierWeights.gold) ** 3;
  const pAllGold = cfg.tierWeights.gold ** 3;

  return {
    stage,
    label: cfg.label,
    matchRate: cfg.matchRate,
    attempts,
    matchedAny,
    matchedPurplePlus,
    matchedAllGold,
    expectedMatchRate: cfg.matchRate,
    expectedPurpleMatchRate: cfg.matchRate * pPurplePlus,
    expectedGoldMatchRate: cfg.matchRate * pAllGold,
    lastRoll,
  };
}

/**
 * Validates Crafting & Critical Success simulation input.
 * @param {{ presetId: string, attempts: number }} params
 * @returns {string | null}
 */
export function validateCraftingInput({ presetId, attempts }) {
  if (!CRAFTING_PRESETS[presetId]) {
    return '請選擇有效的製作項目。';
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    return '請輸入至少 1 次的製作次數。';
  }
  if (attempts > MAX_BATCH_SIZE) {
    return `單次製作模擬上限為 ${MAX_BATCH_SIZE.toLocaleString('zh-TW')} 次。`;
  }
  return null;
}

/**
 * Simulates crafting attempts with base success rate and 15% critical (great) success rate.
 * @param {{ presetId: string, attempts: number, rng?: () => number }} params
 */
export function simulateCrafting({ presetId, attempts, rng = Math.random }) {
  const err = validateCraftingInput({ presetId, attempts });
  if (err) throw new Error(err);

  const preset = CRAFTING_PRESETS[presetId];
  let normalSuccess = 0;
  let greatSuccess = 0;
  let failCount = 0;

  for (let i = 0; i < attempts; i += 1) {
    if (rng() < preset.baseRate) {
      if (rng() < CRAFTING_GREAT_SUCCESS_RATE) {
        greatSuccess += 1;
      } else {
        normalSuccess += 1;
      }
    } else {
      failCount += 1;
    }
  }

  return {
    presetId,
    label: preset.label,
    baseRate: preset.baseRate,
    greatSuccessRate: CRAFTING_GREAT_SUCCESS_RATE,
    attempts,
    normalSuccess,
    greatSuccess,
    totalSuccess: normalSuccess + greatSuccess,
    failCount,
  };
}
