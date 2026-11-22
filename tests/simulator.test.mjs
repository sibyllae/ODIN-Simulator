import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCardCost,
  calculateExpectedEquipRate,
  simulateCardDraws,
  simulateEnhancement,
  validateCardInput,
  validateEquipmentInput,
} from '../js/simulator.js';
import { MAX_BATCH_SIZE, probability } from '../js/data.js';

test('calculateExpectedEquipRate computes exact cumulative probability from +0 to +2', () => {
  const expected = probability.arms[1] * probability.arms[2]; // 0.95 * 0.90 = 0.855
  const actual = calculateExpectedEquipRate('arms', 0, 2);
  assert.ok(Math.abs(actual - expected) < 1e-12);
});

test('simulateEnhancement uses target step probability (fixes off-by-one +0 -> +1 bug)', () => {
  // With rng returning 0.50: +0->+1 rate is 0.95 (succeeds), +1->+2 rate is 0.90 (succeeds)
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

test('simulateEnhancement stops early when all items fail', () => {
  const result = simulateEnhancement({
    equipType: 'blackAccessory',
    nowLv: 0,
    targetLv: 5,
    count: 10,
    rng: () => 0.99, // fails 75% step +0 -> +1
  });

  assert.equal(result.steps.length, 1);
  assert.equal(result.steps[0].success, 0);
  assert.equal(result.steps[0].fail, 10);
  assert.equal(result.finalSuccess, 0);
});

test('validateEquipmentInput rejects invalid ranges and oversized batches', () => {
  assert.ok(validateEquipmentInput({ equipType: 'unknown', nowLv: 0, targetLv: 5, count: 10 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 5, targetLv: 5, count: 10 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 5, targetLv: 3, count: 10 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 0, targetLv: 5, count: 0 }));
  assert.ok(validateEquipmentInput({ equipType: 'arms', nowLv: 0, targetLv: 5, count: MAX_BATCH_SIZE + 1 }));
  assert.equal(validateEquipmentInput({ equipType: 'arms', nowLv: 0, targetLv: 5, count: 100 }), null);
});

test('simulateCardDraws maps boundary RNG values to expected tiers', () => {
  const samples = [0.00005, 0.0005, 0.005, 0.1, 0.8];
  let idx = 0;
  const result = simulateCardDraws({
    count: samples.length,
    rng: () => samples[idx++],
  });

  assert.deepEqual(result.counts, {
    gold: 1,
    purple: 1,
    blue: 1,
    green: 1,
    white: 1,
  });
});

test('calculateCardCost computes expected diamonds and TWD', () => {
  const { diamonds, costTwd } = calculateCardCost(11);
  assert.equal(diamonds, 2100);
  assert.equal(costTwd, Math.ceil((2100 / 30580) * 10000));
});

test('validateCardInput enforces valid positive integers within limit', () => {
  assert.ok(validateCardInput(0));
  assert.ok(validateCardInput(-5));
  assert.ok(validateCardInput(1.5));
  assert.ok(validateCardInput(MAX_BATCH_SIZE + 1));
  assert.equal(validateCardInput(110), null);
});
