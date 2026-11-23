import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCardCost,
  calculateExpectedEquipRate,
  simulateArtifactDraws,
  simulateCardDraws,
  simulateCascadeSynthesis,
  simulateCrafting,
  simulateEngraving,
  simulateEnhancement,
  simulateSynthesis,
  validateArtifactInput,
  validateCardInput,
  validateCraftingInput,
  validateEngravingInput,
  validateEquipmentInput,
  validateSynthesisInput,
} from '../js/simulator.js';
import {
  ARTIFACT_SLOTS,
  CARD_POOLS,
  MAX_BATCH_SIZE,
  SYNTHESIS_PITY_THRESHOLD,
  probability,
} from '../js/data.js';

test('calculateExpectedEquipRate computes exact cumulative probability from +0 to +2', () => {
  const expected = probability.arms[1] * probability.arms[2];
  const actual = calculateExpectedEquipRate('arms', 0, 2);
  assert.ok(Math.abs(actual - expected) < 1e-12);
});

test('calculateExpectedEquipRate with blessed stone exceeds normal stone rate via +2 jump', () => {
  const normal = calculateExpectedEquipRate('arms', 0, 5, 'normal');
  const blessed = calculateExpectedEquipRate('arms', 0, 5, 'blessed');
  assert.ok(blessed > normal);
});

test('simulateEnhancement uses target step probability (fixes off-by-one +0 -> +1 bug)', () => {
  const result = simulateEnhancement({
    equipType: 'arms',
    nowLv: 0,
    targetLv: 2,
    count: 10,
    rng: () => 0.5,
  });

  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[0].fromLevel, 0);
  assert.equal(result.steps[0].level, 1);
  assert.equal(result.steps[0].rate, 0.95);
  assert.equal(result.steps[0].success, 10);
  assert.equal(result.steps[1].level, 2);
  assert.equal(result.steps[1].rate, 0.9);
  assert.equal(result.finalSuccess, 10);
});

test('simulateEnhancement with blessed stone triggers +2 jump when jump rng < 0.20', () => {
  const result = simulateEnhancement({
    equipType: 'arms',
    nowLv: 0,
    targetLv: 2,
    count: 5,
    stoneType: 'blessed',
    rng: () => 0.1, // succeeds 0.95 AND triggers 0.20 jump
  });

  assert.equal(result.steps.length, 1);
  assert.equal(result.totalJumps, 5);
  assert.equal(result.finalSuccess, 5);
});

test('simulateEnhancement stops early when all items fail', () => {
  const result = simulateEnhancement({
    equipType: 'blackAccessory',
    nowLv: 0,
    targetLv: 5,
    count: 10,
    rng: () => 0.99,
  });

  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].success, 0);
  assert.equal(result.steps[0].fail, 10);
  assert.equal(result.finalSuccess, 0);
});

test('validateEquipmentInput rejects invalid ranges and oversized batches', () => {
  assert.ok(validateEquipmentInput({ equipType: 'unknown', nowLv: 0, targetLv: 5, count: 10 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', stoneType: 'invalid', nowLv: 0, targetLv: 5, count: 10 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 5, targetLv: 5, count: 10 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 5, targetLv: 3, count: 10 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 0, targetLv: 5, count: 0 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 0, targetLv: 5, count: MAX_BATCH_SIZE + 1 }));
  assert.equal(validateEquipmentInput({ equipType: 'arms', nowLv: 0, targetLv: 5, count: 100 }), null);
});

test('simulateCardDraws maps official boundary RNG values across all summon pools', () => {
  const samples = [0.00005, 0.0005, 0.005, 0.1, 0.8];
  for (const poolId of Object.keys(CARD_POOLS)) {
    let idx = 0;
    const result = simulateCardDraws({
      count: samples.length,
      poolId,
      rng: () => samples[idx++],
    });

    assert.equal(result.poolId, poolId);
    assert.deepEqual(result.counts, {
      gold: 1,
      purple: 1,
      blue: 1,
      green: 1,
      white: 1,
    });
  }
});

test('calculateCardCost computes expected diamonds and TWD', () => {
  const { diamonds, costTwd } = calculateCardCost(11, 'weaponSkin');
  assert.equal(diamonds, 2100);
  assert.equal(costTwd, Math.ceil((2100 / 30580) * 10000));
});

test('validateCardInput enforces valid poolId and positive integers within limit', () => {
  assert.ok(validateCardInput(11, 'invalidPool'));
  assert.ok(validateCardInput(0, 'avatar'));
  assert.ok(validateCardInput(-5, 'mount'));
  assert.ok(validateCardInput(1.5, 'weaponSkin'));
  assert.ok(validateCardInput(MAX_BATCH_SIZE + 1, 'rune'));
  assert.equal(validateCardInput(110, 'rune'), null);
});

test('simulateSynthesis triggers 15-failure pity when enabled and consumes 4 cards per attempt', () => {
  const resWithPity = simulateSynthesis({
    category: 'avatar',
    tierId: 'purple-gold',
    attempts: SYNTHESIS_PITY_THRESHOLD,
    enablePity: true,
    rng: () => 0.99,
  });

  assert.equal(resWithPity.materialsUsed, SYNTHESIS_PITY_THRESHOLD * 4);
  assert.equal(resWithPity.pityTriggered, 1);
  assert.equal(resWithPity.totalGained, 1);

  const runeUpgrade = simulateSynthesis({
    category: 'runeUpgrade',
    tierId: 'green-blue',
    attempts: 20,
    enablePity: true,
    rng: () => 0.99,
  });
  assert.equal(runeUpgrade.materialsUsed, 20);
  assert.equal(runeUpgrade.pityTriggered, 0);
});

test('simulateCascadeSynthesis cascades 4-to-1 upgrades from White up to Red (Mythic)', () => {
  const cascade = simulateCascadeSynthesis({
    inventory: { white: 1025, green: 0, blue: 0, purple: 0, gold: 0 },
    category: 'mount',
    enablePity: true,
    rng: () => 0.01,
  });

  assert.equal(cascade.steps.length, 5);
  assert.deepEqual(cascade.finalInventory, {
    white: 1,
    green: 0,
    blue: 0,
    purple: 0,
    gold: 0,
    red: 1,
  });
});

test('validateSynthesisInput rejects invalid categories, tiers, and counts', () => {
  assert.ok(validateSynthesisInput({ category: 'bad', tierId: 'blue-purple', attempts: 5 }));
  assert.ok(validateSynthesisInput({ category: 'avatar', tierId: 'bad-tier', attempts: 5 }));
  assert.ok(validateSynthesisInput({ category: 'avatar', tierId: 'blue-purple', attempts: 0 }));
  assert.ok(validateSynthesisInput({ category: 'avatar', tierId: 'blue-purple', attempts: MAX_BATCH_SIZE + 1 }));
  assert.equal(validateSynthesisInput({ category: 'runeUpgrade', tierId: 'gold-red', attempts: 15 }), null);
});

test('simulateArtifactDraws hits slot 2 (35%) and computes exact combined pick probability', () => {
  const totalWeight = ARTIFACT_SLOTS.reduce((acc, s) => acc + s.weight, 0);
  assert.ok(Math.abs(totalWeight - 1.0) < 1e-12);

  const res = simulateArtifactDraws({
    draws: 10,
    selectedSlots: [1, 2], // Slot 2 (35%) + Slot 3 (17.5%) = 52.5%
    rng: () => 0.25, // falls in Slot 2 [0.12, 0.47)
  });

  assert.equal(res.targetHits, 10);
  assert.equal(res.slotHits[1], 10);
  assert.ok(Math.abs(res.expectedHitRate - 0.525) < 1e-12);
  assert.ok(validateArtifactInput({ draws: 10, selectedSlots: [] }));
});

test('simulateEngraving evaluates 3-slot tiers and matching stats', () => {
  const res = simulateEngraving({
    stage: 1,
    attempts: 5,
    rng: () => 0.01, // gold (<0.15) on all 3 slots AND match (<0.08)
  });

  assert.equal(res.matchedAny, 5);
  assert.equal(res.matchedPurplePlus, 5);
  assert.equal(res.matchedAllGold, 5);
  assert.deepEqual(res.lastRoll, { slots: ['gold', 'gold', 'gold'], sameStat: true });
  assert.ok(validateEngravingInput({ stage: 99, attempts: 5 }));
});

test('simulateCrafting evaluates base success and 15% great success', () => {
  const res = simulateCrafting({
    presetId: 'gearPattern', // 20% base, 15% great success
    attempts: 10,
    rng: () => 0.05, // succeeds 20% AND triggers 15% great success
  });

  assert.equal(res.totalSuccess, 10);
  assert.equal(res.greatSuccess, 10);
  assert.equal(res.normalSuccess, 0);
  assert.equal(res.failCount, 0);
  assert.ok(validateCraftingInput({ presetId: 'unknown', attempts: 10 }));
});
