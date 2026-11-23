import {
  ARTIFACT_SLOTS,
  CARD_POOLS,
  CARD_TIERS,
  CRAFTING_PRESETS,
  ENGRAVING_STAGES,
  EQUIP_META,
  SYNTHESIS_CATEGORIES,
  SYNTHESIS_PITY_THRESHOLD,
} from './data.js';
import {
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
} from './simulator.js';

const STORAGE_KEY = 'odin-simulator:v3';
const MAX_HISTORY_ROWS = 100;
const MAX_TOASTS = 3;
const VALID_MODES = new Set(['equipment', 'card', 'synthesis', 'artifact', 'engraving']);
const MODE_TITLES = Object.freeze({
  equipment: '裝備強化模擬｜奧丁：神叛 模擬器',
  card: '卡片召喚模擬｜奧丁：神叛 模擬器',
  synthesis: '4 合 1 卡片合成模擬｜奧丁：神叛 模擬器',
  artifact: '古物 10 格轉盤模擬｜奧丁：神叛 模擬器',
  engraving: '刻印與製作大成功模擬｜奧丁：神叛 模擬器',
});

const numberFmt = new Intl.NumberFormat('zh-TW');
const percentFmt = new Intl.NumberFormat('zh-TW', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const finePercentFmt = new Intl.NumberFormat('zh-TW', {
  style: 'percent',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});
const rateFmt = new Intl.NumberFormat('zh-TW', {
  style: 'percent',
  maximumFractionDigits: 1,
});

/**
 * Formats a ratio in [0, 1] without collapsing very small non-zero values to 0.00%.
 * @param {number} ratio
 * @returns {string}
 */
function formatProbability(ratio) {
  if (ratio <= 0) return percentFmt.format(0);
  if (ratio < 0.000001) return '< 0.0001%';
  if (ratio < 0.0001) return finePercentFmt.format(ratio);
  return percentFmt.format(ratio);
}

/**
 * Parses a numeric input string without silently truncating decimals (unlike parseInt).
 * @param {string} raw
 * @returns {number}
 */
function parseStrictNumber(raw) {
  const trimmed = String(raw).trim();
  if (!trimmed) return Number.NaN;
  return Number(trimmed);
}

/**
 * Safely creates an element with optional className and textContent (XSS-safe).
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function createEl(tag, className = '', text = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== '') el.textContent = text;
  return el;
}

class OdinSimulatorApp {
  #state = {
    mode: 'equipment',
    equipStats: {
      totalConsumed: 0,
      totalReached: 0,
      lastResult: null,
    },
    cardStats: {
      selectedPool: 'avatar',
      totalDraws: 0,
      totalDiamonds: 0,
      totalCostTwd: 0,
      totals: { white: 0, green: 0, blue: 0, purple: 0, gold: 0 },
      history: [],
      batchCounter: 0,
    },
    synthStats: {
      totalAttempts: 0,
      totalSuccess: 0,
      totalPity: 0,
      lastView: null,
    },
    artifactStats: {
      selectedSlots: [1], // default Slot #2 (35%)
      totalDraws: 0,
      totalHits: 0,
      slotHits: new Array(ARTIFACT_SLOTS.length).fill(0),
      lastResult: null,
    },
    engraveStats: {
      totalSeals: 0,
      totalMatches: 0,
      totalPurplePlus: 0,
      totalAllGold: 0,
      lastResult: null,
      lastCraft: null,
    },
  };

  #els = {};

  constructor() {
    this.#cacheDOM();
    this.#restoreMode();
    this.#bindEvents();
    this.#syncTargetLevelOptions();
    this.#syncSynthesisOptions();
    this.#renderAll();
  }

  #cacheDOM() {
    const $ = (id) => document.getElementById(id);

    this.#els = {
      tabs: Array.from(document.querySelectorAll('[role="tab"]')),
      panels: {
        equipment: $('panel-equipment'),
        card: $('panel-card'),
        synthesis: $('panel-synthesis'),
        artifact: $('panel-artifact'),
        engraving: $('panel-engraving'),
      },
      toastRegion: $('toast-region'),

      // Equipment
      equipTotalConsumed: $('equip-total-consumed'),
      equipTotalReached: $('equip-total-reached'),
      equipLastOutcome: $('equip-last-outcome'),
      resetEquipBtn: $('reset-equip-btn'),
      equipForm: $('equip-form'),
      equipSelect: $('equip-select'),
      equipStoneSelect: $('equip-stone-select'),
      nowLvSelect: $('now-lv-select'),
      targetLvSelect: $('target-lv-select'),
      equipCountInput: $('equip-count-input'),
      equipPreviewText: $('equip-preview-text'),
      equipError: $('equip-error'),
      equipEmptyState: $('equip-empty-state'),
      equipResultsWrap: $('equip-results-wrap'),
      equipOutcomeBanner: $('equip-outcome-banner'),
      equipResultTbody: $('equip-result-tbody'),
      lvPresetBtns: Array.from(document.querySelectorAll('[data-lv-preset]')),
      qtyPresetBtns: Array.from(document.querySelectorAll('[data-equip-qty]')),

      // Card
      cardTotalDraws: $('card-total-draws'),
      cardTotalDiamonds: $('card-total-diamonds'),
      cardTotalTwd: $('card-total-twd'),
      sendToSynthBtn: $('send-to-synth-btn'),
      resetCardBtn: $('reset-card-btn'),
      cardPoolSelect: $('card-pool-select'),
      cardPoolDesc: $('card-pool-desc'),
      cardForm: $('card-form'),
      cardCountInput: $('card-count-input'),
      cardError: $('card-error'),
      cardEmptyState: $('card-empty-state'),
      cardResultsWrap: $('card-results-wrap'),
      cardResultTbody: $('card-result-tbody'),
      quickDrawBtns: Array.from(document.querySelectorAll('[data-quick-draw]')),
      raritySummary: {
        white: { count: $('summary-white'), actual: $('actual-white') },
        green: { count: $('summary-green'), actual: $('actual-green') },
        blue: { count: $('summary-blue'), actual: $('actual-blue') },
        purple: { count: $('summary-purple'), actual: $('actual-purple') },
        gold: { count: $('summary-gold'), actual: $('actual-gold') },
      },

      // Synthesis
      synthTotalAttempts: $('synth-total-attempts'),
      synthTotalSuccess: $('synth-total-success'),
      synthTotalPity: $('synth-total-pity'),
      resetSynthBtn: $('reset-synth-btn'),
      synthForm: $('synth-form'),
      synthCategorySelect: $('synth-category-select'),
      synthTierSelect: $('synth-tier-select'),
      synthAttemptsInput: $('synth-attempts-input'),
      synthPityCheckbox: $('synth-pity-checkbox'),
      synthPityLabel: $('synth-pity-label'),
      synthPreviewText: $('synth-preview-text'),
      synthError: $('synth-error'),
      cascadeFromCardBtn: $('cascade-from-card-btn'),
      synthEmptyState: $('synth-empty-state'),
      synthResultsWrap: $('synth-results-wrap'),
      synthOutcomeBanner: $('synth-outcome-banner'),
      synthResultTbody: $('synth-result-tbody'),
      synthQtyBtns: Array.from(document.querySelectorAll('[data-synth-qty]')),

      // Artifact
      artifactTotalDraws: $('artifact-total-draws'),
      artifactTotalHits: $('artifact-total-hits'),
      artifactActualRate: $('artifact-actual-rate'),
      resetArtifactBtn: $('reset-artifact-btn'),
      artifactBoard: $('artifact-board'),
      artifactForm: $('artifact-form'),
      artifactCountInput: $('artifact-count-input'),
      artifactPreviewText: $('artifact-preview-text'),
      artifactError: $('artifact-error'),
      artifactOutcomeBanner: $('artifact-outcome-banner'),
      artifactPickBtns: Array.from(document.querySelectorAll('[data-artifact-pick]')),
      artifactQuickBtns: Array.from(document.querySelectorAll('[data-artifact-draw]')),

      // Engraving & Crafting
      engraveTotalSeals: $('engrave-total-seals'),
      engraveTotalMatches: $('engrave-total-matches'),
      engraveTotalHigh: $('engrave-total-high'),
      resetEngraveBtn: $('reset-engrave-btn'),
      engraveForm: $('engrave-form'),
      engraveStageSelect: $('engrave-stage-select'),
      engraveCountInput: $('engrave-count-input'),
      engravePreviewText: $('engrave-preview-text'),
      engraveError: $('engrave-error'),
      engraveResultBox: $('engrave-result-box'),
      engraveOutcomeBanner: $('engrave-outcome-banner'),
      engraveSlotsRow: $('engrave-slots-row'),
      engraveQtyBtns: Array.from(document.querySelectorAll('[data-engrave-qty]')),

      craftForm: $('craft-form'),
      craftPresetSelect: $('craft-preset-select'),
      craftCountInput: $('craft-count-input'),
      craftError: $('craft-error'),
      craftOutcomeBanner: $('craft-outcome-banner'),
    };
  }

  #restoreMode() {
    const hashMode = window.location.hash.replace('#', '');
    if (VALID_MODES.has(hashMode)) {
      this.#state.mode = hashMode;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (VALID_MODES.has(saved)) {
        this.#state.mode = saved;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  #persistMode(mode) {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore storage errors
    }
    if (window.location.hash !== `#${mode}`) {
      history.replaceState(null, '', `#${mode}`);
    }
  }

  #bindEvents() {
    // Tab switching & WAI-ARIA keyboard navigation
    this.#els.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => this.#switchMode(tab.dataset.mode));
      tab.addEventListener('keydown', (e) => {
        const total = this.#els.tabs.length;
        let nextIndex = null;
        if (e.key === 'ArrowRight') nextIndex = (index + 1) % total;
        else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + total) % total;
        else if (e.key === 'Home') nextIndex = 0;
        else if (e.key === 'End') nextIndex = total - 1;

        if (nextIndex !== null) {
          e.preventDefault();
          const nextTab = this.#els.tabs[nextIndex];
          nextTab.focus();
          this.#switchMode(nextTab.dataset.mode);
        }
      });
    });

    window.addEventListener('hashchange', () => {
      const hashMode = window.location.hash.replace('#', '');
      if (VALID_MODES.has(hashMode) && hashMode !== this.#state.mode) {
        this.#state.mode = hashMode;
        this.#renderModeTabs();
      }
    });

    // Equipment events
    this.#els.equipSelect.addEventListener('change', () => this.#updateEquipPreview());
    this.#els.equipStoneSelect.addEventListener('change', () => this.#updateEquipPreview());
    this.#els.nowLvSelect.addEventListener('change', () => {
      this.#syncTargetLevelOptions();
      this.#updateEquipPreview();
    });
    this.#els.targetLvSelect.addEventListener('change', () => this.#updateEquipPreview());
    this.#els.equipCountInput.addEventListener('input', () => {
      this.#clearError(this.#els.equipError, this.#els.equipCountInput);
      this.#updateEquipPreview();
      this.#syncActivePresetChips();
    });

    this.#els.lvPresetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const [start, target] = btn.dataset.lvPreset.split('-');
        this.#els.nowLvSelect.value = start;
        this.#syncTargetLevelOptions();
        this.#els.targetLvSelect.value = target;
        this.#updateEquipPreview();
        this.#syncActivePresetChips();
      });
    });

    this.#els.qtyPresetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.#els.equipCountInput.value = btn.dataset.equipQty;
        this.#clearError(this.#els.equipError, this.#els.equipCountInput);
        this.#updateEquipPreview();
        this.#syncActivePresetChips();
      });
    });

    this.#els.equipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#handleEquipSubmit();
    });

    this.#els.resetEquipBtn.addEventListener('click', () => {
      this.#state.equipStats = { totalConsumed: 0, totalReached: 0, lastResult: null };
      this.#clearError(this.#els.equipError, this.#els.equipCountInput);
      this.#renderEquipment();
      this.#showToast('已重置裝備強化統計紀錄');
    });

    // Card events
    this.#els.cardPoolSelect.addEventListener('change', () => {
      this.#state.cardStats.selectedPool = this.#els.cardPoolSelect.value;
      this.#renderCardPoolMeta();
    });

    this.#els.cardCountInput.addEventListener('input', () => {
      this.#clearError(this.#els.cardError, this.#els.cardCountInput);
    });

    this.#els.quickDrawBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const qty = parseStrictNumber(btn.dataset.quickDraw);
        this.#els.cardCountInput.value = String(qty);
        this.#runCardDraw(qty);
      });
    });

    this.#els.cardForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#runCardDraw(parseStrictNumber(this.#els.cardCountInput.value));
    });

    this.#els.sendToSynthBtn.addEventListener('click', () => {
      this.#runCascadeFromCardInventory(true);
    });

    this.#els.resetCardBtn.addEventListener('click', () => {
      this.#state.cardStats = {
        selectedPool: this.#els.cardPoolSelect.value,
        totalDraws: 0,
        totalDiamonds: 0,
        totalCostTwd: 0,
        totals: { white: 0, green: 0, blue: 0, purple: 0, gold: 0 },
        history: [],
        batchCounter: 0,
      };
      this.#clearError(this.#els.cardError, this.#els.cardCountInput);
      this.#renderCard();
      this.#renderSynthesisCascadeButton();
      this.#showToast('已重置抽卡統計紀錄');
    });

    // Synthesis events
    this.#els.synthCategorySelect.addEventListener('change', () => {
      this.#syncSynthesisOptions();
      this.#updateSynthPreview();
    });
    this.#els.synthTierSelect.addEventListener('change', () => this.#updateSynthPreview());
    this.#els.synthPityCheckbox.addEventListener('change', () => this.#updateSynthPreview());
    this.#els.synthAttemptsInput.addEventListener('input', () => {
      this.#clearError(this.#els.synthError, this.#els.synthAttemptsInput);
      this.#updateSynthPreview();
      this.#syncActivePresetChips();
    });

    this.#els.synthQtyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.#els.synthAttemptsInput.value = btn.dataset.synthQty;
        this.#clearError(this.#els.synthError, this.#els.synthAttemptsInput);
        this.#updateSynthPreview();
        this.#syncActivePresetChips();
      });
    });

    this.#els.synthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#handleSynthSubmit();
    });

    this.#els.cascadeFromCardBtn.addEventListener('click', () => {
      this.#runCascadeFromCardInventory(false);
    });

    this.#els.resetSynthBtn.addEventListener('click', () => {
      this.#state.synthStats = { totalAttempts: 0, totalSuccess: 0, totalPity: 0, lastView: null };
      this.#clearError(this.#els.synthError, this.#els.synthAttemptsInput);
      this.#renderSynthesis();
      this.#showToast('已重置卡片合成統計紀錄');
    });

    // Artifact events
    this.#els.artifactPickBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.#state.artifactStats.selectedSlots = btn.dataset.artifactPick
          .split(',')
          .map((v) => Number.parseInt(v, 10));
        this.#clearError(this.#els.artifactError, this.#els.artifactCountInput);
        this.#renderArtifact();
      });
    });

    this.#els.artifactQuickBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const qty = parseStrictNumber(btn.dataset.artifactDraw);
        this.#els.artifactCountInput.value = String(qty);
        this.#runArtifactDraw(qty);
      });
    });

    this.#els.artifactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#runArtifactDraw(parseStrictNumber(this.#els.artifactCountInput.value));
    });

    this.#els.artifactCountInput.addEventListener('input', () => {
      this.#clearError(this.#els.artifactError, this.#els.artifactCountInput);
    });

    this.#els.resetArtifactBtn.addEventListener('click', () => {
      this.#state.artifactStats = {
        selectedSlots: this.#state.artifactStats.selectedSlots,
        totalDraws: 0,
        totalHits: 0,
        slotHits: new Array(ARTIFACT_SLOTS.length).fill(0),
        lastResult: null,
      };
      this.#clearError(this.#els.artifactError, this.#els.artifactCountInput);
      this.#renderArtifact();
      this.#showToast('已重置古物轉盤紀錄');
    });

    // Engraving & Crafting events
    this.#els.engraveStageSelect.addEventListener('change', () => this.#updateEngravePreview());
    this.#els.engraveCountInput.addEventListener('input', () => {
      this.#clearError(this.#els.engraveError, this.#els.engraveCountInput);
      this.#updateEngravePreview();
      this.#syncActivePresetChips();
    });

    this.#els.engraveQtyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.#els.engraveCountInput.value = btn.dataset.engraveQty;
        this.#clearError(this.#els.engraveError, this.#els.engraveCountInput);
        this.#updateEngravePreview();
        this.#syncActivePresetChips();
      });
    });

    this.#els.engraveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#handleEngraveSubmit();
    });

    this.#els.resetEngraveBtn.addEventListener('click', () => {
      this.#state.engraveStats = {
        totalSeals: 0,
        totalMatches: 0,
        totalPurplePlus: 0,
        totalAllGold: 0,
        lastResult: null,
        lastCraft: this.#state.engraveStats.lastCraft,
      };
      this.#clearError(this.#els.engraveError, this.#els.engraveCountInput);
      this.#renderEngraving();
      this.#showToast('已重置刻印統計紀錄');
    });

    this.#els.craftCountInput.addEventListener('input', () => {
      this.#clearError(this.#els.craftError, this.#els.craftCountInput);
    });

    this.#els.craftForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.#handleCraftSubmit();
    });
  }

  #switchMode(mode) {
    if (!VALID_MODES.has(mode)) return;
    this.#state.mode = mode;
    this.#persistMode(mode);
    this.#renderModeTabs();
  }

  #syncTargetLevelOptions() {
    const nowLv = Number.parseInt(this.#els.nowLvSelect.value, 10);
    const currentTarget = Number.parseInt(this.#els.targetLvSelect.value, 10);

    for (const option of this.#els.targetLvSelect.options) {
      const optLv = Number.parseInt(option.value, 10);
      option.disabled = optLv <= nowLv;
    }

    if (currentTarget <= nowLv) {
      this.#els.targetLvSelect.value = String(Math.min(nowLv + 1, 20));
    }
  }

  #syncSynthesisOptions() {
    const categoryId = this.#els.synthCategorySelect.value;
    const cat = SYNTHESIS_CATEGORIES[categoryId] ?? SYNTHESIS_CATEGORIES.avatar;
    const prevTierId = this.#els.synthTierSelect.value;

    const fragment = document.createDocumentFragment();
    for (const tier of cat.tiers) {
      const opt = document.createElement('option');
      opt.value = tier.id;
      opt.textContent = `${tier.fromLabel} → ${tier.toLabel} (${rateFmt.format(tier.rate)})`;
      fragment.appendChild(opt);
    }
    this.#els.synthTierSelect.replaceChildren(fragment);

    if (cat.tiers.some((t) => t.id === prevTierId)) {
      this.#els.synthTierSelect.value = prevTierId;
    } else if (cat.tiers.some((t) => t.id === 'blue-purple')) {
      this.#els.synthTierSelect.value = 'blue-purple';
    }

    this.#els.synthPityCheckbox.disabled = !cat.supportsPity;
    this.#els.synthPityCheckbox.parentElement?.classList.toggle('is-disabled', !cat.supportsPity);
    this.#els.synthPityLabel.textContent = cat.supportsPity
      ? `啟用 ${SYNTHESIS_PITY_THRESHOLD} 次失敗保底（每失敗 ${SYNTHESIS_PITY_THRESHOLD} 次必送 1 張目標卡）`
      : '符石內建單顆升階不適用 4 合 1 失敗保底';
  }

  #syncActivePresetChips() {
    const currentPair = `${this.#els.nowLvSelect.value}-${this.#els.targetLvSelect.value}`;
    const currentQty = this.#els.equipCountInput.value.trim();
    const currentSynthQty = this.#els.synthAttemptsInput.value.trim();
    const currentEngraveQty = this.#els.engraveCountInput.value.trim();

    this.#els.lvPresetBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lvPreset === currentPair);
    });
    this.#els.qtyPresetBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.equipQty === currentQty);
    });
    this.#els.synthQtyBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.synthQty === currentSynthQty);
    });
    this.#els.engraveQtyBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.engraveQty === currentEngraveQty);
    });
  }

  #updateEquipPreview() {
    const equipType = this.#els.equipSelect.value;
    const stoneType = this.#els.equipStoneSelect.value;
    const nowLv = Number.parseInt(this.#els.nowLvSelect.value, 10);
    const targetLv = Number.parseInt(this.#els.targetLvSelect.value, 10);
    const count = parseStrictNumber(this.#els.equipCountInput.value);

    const rate = calculateExpectedEquipRate(equipType, nowLv, targetLv, stoneType);
    const equipLabel = EQUIP_META[equipType]?.label ?? equipType;
    const stoneTag = stoneType === 'blessed' ? '【伊瓦爾第跳階石】' : '';

    if (!Number.isInteger(count) || count < 1) {
      this.#els.equipPreviewText.textContent =
        `${stoneTag}${equipLabel} +${nowLv} → +${targetLv} 理論累積成功率：${formatProbability(rate)}`;
      return;
    }

    const expectedSurvivors = count * rate;
    this.#els.equipPreviewText.textContent =
      `${stoneTag}${equipLabel} +${nowLv} → +${targetLv} 理論成功率 ${formatProbability(rate)}，` +
      `投入 ${numberFmt.format(count)} 件預期約剩 ${expectedSurvivors.toFixed(1)} 件`;
  }

  #updateSynthPreview() {
    const categoryId = this.#els.synthCategorySelect.value;
    const cat = SYNTHESIS_CATEGORIES[categoryId] ?? SYNTHESIS_CATEGORIES.avatar;
    const tierId = this.#els.synthTierSelect.value;
    const tier = cat.tiers.find((t) => t.id === tierId);
    const attempts = parseStrictNumber(this.#els.synthAttemptsInput.value);
    const pityEnabled = cat.supportsPity && this.#els.synthPityCheckbox.checked;

    if (!tier) return;

    if (!Number.isInteger(attempts) || attempts < 1) {
      this.#els.synthPreviewText.textContent =
        `${tier.fromLabel} → ${tier.toLabel} 單次成功率 ${rateFmt.format(tier.rate)}（每次消耗 ${tier.cardsRequired} 張/顆）`;
      return;
    }

    const totalMaterials = attempts * tier.cardsRequired;
    const expectedDirect = attempts * tier.rate;
    const pityNote = cat.supportsPity
      ? (pityEnabled ? `・每失敗 ${SYNTHESIS_PITY_THRESHOLD} 次觸發保底` : '・未啟用保底')
      : '・符石單顆升階';

    this.#els.synthPreviewText.textContent =
      `${tier.fromLabel} → ${tier.toLabel}（${rateFmt.format(tier.rate)}）：嘗試 ${numberFmt.format(attempts)} 次` +
      `需消耗 ${numberFmt.format(totalMaterials)} 個素材，預期直接成功約 ${expectedDirect.toFixed(1)} 次${pityNote}`;
  }

  #updateEngravePreview() {
    const stage = Number.parseInt(this.#els.engraveStageSelect.value, 10);
    const cfg = ENGRAVING_STAGES[stage] ?? ENGRAVING_STAGES[1];
    const attempts = parseStrictNumber(this.#els.engraveCountInput.value);

    const pPurplePlus = ((cfg.tierWeights.purple + cfg.tierWeights.gold) ** 3) * cfg.matchRate;
    const pAllGold = (cfg.tierWeights.gold ** 3) * cfg.matchRate;
    const qtyNote = Number.isInteger(attempts) && attempts >= 1
      ? `｜投入 ${numberFmt.format(attempts)} 顆預期同詞條約 ${(attempts * cfg.matchRate).toFixed(1)} 次`
      : '';

    this.#els.engravePreviewText.textContent =
      `${cfg.label}：3 格同詞條 ${rateFmt.format(cfg.matchRate)}｜全紫以上同詞條 ${formatProbability(pPurplePlus)}｜全金同詞條 ${formatProbability(pAllGold)}${qtyNote}`;
  }

  #handleEquipSubmit() {
    const equipType = this.#els.equipSelect.value;
    const stoneType = this.#els.equipStoneSelect.value;
    const nowLv = Number.parseInt(this.#els.nowLvSelect.value, 10);
    const targetLv = Number.parseInt(this.#els.targetLvSelect.value, 10);
    const count = parseStrictNumber(this.#els.equipCountInput.value);

    const error = validateEquipmentInput({ equipType, nowLv, targetLv, count, stoneType });
    if (error) {
      this.#showError(this.#els.equipError, error, this.#els.equipCountInput);
      return;
    }

    this.#clearError(this.#els.equipError, this.#els.equipCountInput);
    const result = simulateEnhancement({ equipType, nowLv, targetLv, count, stoneType });

    this.#state.equipStats.totalConsumed += result.initialCount;
    this.#state.equipStats.totalReached += result.finalSuccess;
    this.#state.equipStats.lastResult = result;

    this.#renderEquipment();

    if (result.finalSuccess > 0) {
      const jumpNote = result.totalJumps > 0 ? `（含跳階 +2 共 ${result.totalJumps} 次）` : '';
      this.#showToast(
        `強化完成！成功產出 ${numberFmt.format(result.finalSuccess)} 件 +${result.targetLv} 裝備${jumpNote}`,
        'gold'
      );
    }
  }

  #runCardDraw(count) {
    const poolId = this.#els.cardPoolSelect.value;
    const error = validateCardInput(count, poolId);
    if (error) {
      this.#showError(this.#els.cardError, error, this.#els.cardCountInput);
      return;
    }

    this.#clearError(this.#els.cardError, this.#els.cardCountInput);
    const res = simulateCardDraws({ count, poolId });

    this.#state.cardStats.batchCounter += 1;
    this.#state.cardStats.totalDraws += res.count;
    this.#state.cardStats.totalDiamonds += res.diamonds;
    this.#state.cardStats.totalCostTwd += res.costTwd;

    for (const tier of CARD_TIERS) {
      this.#state.cardStats.totals[tier.key] += res.counts[tier.key];
    }

    this.#state.cardStats.history.unshift({
      batchId: this.#state.cardStats.batchCounter,
      ...res,
    });

    if (this.#state.cardStats.history.length > MAX_HISTORY_ROWS) {
      this.#state.cardStats.history.length = MAX_HISTORY_ROWS;
    }

    this.#renderCard();
    this.#renderSynthesisCascadeButton();

    if (res.counts.gold > 0) {
      this.#showToast(`神運降臨！[${res.poolLabel}] 抽中 ${res.counts.gold} 張金卡！`, 'gold');
    } else if (res.counts.purple > 0) {
      this.#showToast(`歐氣爆發！[${res.poolLabel}] 抽中 ${res.counts.purple} 張紫卡！`, 'purple');
    }
  }

  #handleSynthSubmit() {
    const category = this.#els.synthCategorySelect.value;
    const tierId = this.#els.synthTierSelect.value;
    const attempts = parseStrictNumber(this.#els.synthAttemptsInput.value);
    const enablePity = this.#els.synthPityCheckbox.checked;

    const error = validateSynthesisInput({ category, tierId, attempts });
    if (error) {
      this.#showError(this.#els.synthError, error, this.#els.synthAttemptsInput);
      return;
    }

    this.#clearError(this.#els.synthError, this.#els.synthAttemptsInput);
    const result = simulateSynthesis({ category, tierId, attempts, enablePity });

    this.#state.synthStats.totalAttempts += result.attempts;
    this.#state.synthStats.totalSuccess += result.totalGained;
    this.#state.synthStats.totalPity += result.pityTriggered;
    this.#state.synthStats.lastView = { type: 'single', data: result };

    this.#renderSynthesis();

    if (result.totalGained > 0) {
      this.#showToast(
        `升階完成！獲得 ${numberFmt.format(result.totalGained)} 個 ${result.toLabel}`,
        result.tierId === 'purple-gold' || result.tierId === 'gold-red' ? 'gold' : 'purple'
      );
    }
  }

  #runCascadeFromCardInventory(switchTab) {
    const { totals, totalDraws, selectedPool } = this.#state.cardStats;
    if (totalDraws === 0) {
      this.#showToast('目前尚無抽卡庫存，請先在「卡片召喚」抽卡！');
      return;
    }

    const category = selectedPool === 'rune' ? 'warding' : selectedPool;
    this.#els.synthCategorySelect.value = category in SYNTHESIS_CATEGORIES ? category : 'avatar';
    this.#syncSynthesisOptions();
    const enablePity = this.#els.synthPityCheckbox.checked;

    const cascadeResult = simulateCascadeSynthesis({
      inventory: totals,
      category: this.#els.synthCategorySelect.value,
      enablePity,
    });

    const totalGained = cascadeResult.steps.reduce((acc, s) => acc + s.totalGained, 0);
    this.#state.synthStats.totalAttempts += cascadeResult.totalAttempts;
    this.#state.synthStats.totalSuccess += totalGained;
    this.#state.synthStats.totalPity += cascadeResult.totalPity;
    this.#state.synthStats.lastView = { type: 'cascade', data: cascadeResult };

    if (switchTab) {
      this.#switchMode('synthesis');
    }

    this.#clearError(this.#els.synthError, this.#els.synthAttemptsInput);
    this.#renderSynthesis();

    const { red, gold, purple } = cascadeResult.finalInventory;
    if (red > 0) {
      this.#showToast(`神話降臨！連鎖合成產出 ${red} 張紅卡！`, 'gold');
    } else if (gold > 0) {
      this.#showToast(`傳說降臨！連鎖合成最終保有 ${gold} 張金卡！`, 'gold');
    } else if (purple > 0) {
      this.#showToast(`連鎖合成完成！最終保有 ${purple} 張紫卡！`, 'purple');
    } else {
      this.#showToast('連鎖合成完成，可查看各階消耗與剩餘結果');
    }
  }

  #runArtifactDraw(draws) {
    const selectedSlots = this.#state.artifactStats.selectedSlots;
    const err = validateArtifactInput({ draws, selectedSlots });
    if (err) {
      this.#showError(this.#els.artifactError, err, this.#els.artifactCountInput);
      return;
    }

    this.#clearError(this.#els.artifactError, this.#els.artifactCountInput);
    const res = simulateArtifactDraws({ draws, selectedSlots });

    this.#state.artifactStats.totalDraws += res.draws;
    this.#state.artifactStats.totalHits += res.targetHits;
    for (let i = 0; i < ARTIFACT_SLOTS.length; i += 1) {
      this.#state.artifactStats.slotHits[i] += res.slotHits[i];
    }
    this.#state.artifactStats.lastResult = res;

    this.#renderArtifact();

    if (res.targetHits > 0) {
      this.#showToast(`古物轉盤命中目標 ${numberFmt.format(res.targetHits)} 次！`, 'gold');
    }
  }

  #handleEngraveSubmit() {
    const stage = Number.parseInt(this.#els.engraveStageSelect.value, 10);
    const attempts = parseStrictNumber(this.#els.engraveCountInput.value);

    const err = validateEngravingInput({ stage, attempts });
    if (err) {
      this.#showError(this.#els.engraveError, err, this.#els.engraveCountInput);
      return;
    }

    this.#clearError(this.#els.engraveError, this.#els.engraveCountInput);
    const res = simulateEngraving({ stage, attempts });

    this.#state.engraveStats.totalSeals += res.attempts;
    this.#state.engraveStats.totalMatches += res.matchedAny;
    this.#state.engraveStats.totalPurplePlus += res.matchedPurplePlus;
    this.#state.engraveStats.totalAllGold += res.matchedAllGold;
    this.#state.engraveStats.lastResult = res;

    this.#renderEngraving();

    if (res.matchedAllGold > 0) {
      this.#showToast(`神級刻印！洗出 ${res.matchedAllGold} 次「全金 3 同詞條」！`, 'gold');
    } else if (res.matchedPurplePlus > 0) {
      this.#showToast(`刻印達成！洗出 ${res.matchedPurplePlus} 次「全紫以上同詞條」！`, 'purple');
    }
  }

  #handleCraftSubmit() {
    const presetId = this.#els.craftPresetSelect.value;
    const attempts = parseStrictNumber(this.#els.craftCountInput.value);

    const err = validateCraftingInput({ presetId, attempts });
    if (err) {
      this.#showError(this.#els.craftError, err, this.#els.craftCountInput);
      return;
    }

    this.#clearError(this.#els.craftError, this.#els.craftCountInput);
    const res = simulateCrafting({ presetId, attempts });
    this.#state.engraveStats.lastCraft = res;

    this.#renderCrafting();

    if (res.greatSuccess > 0) {
      this.#showToast(`製作大成功！產出 ${numberFmt.format(res.greatSuccess)} 件可交易成品！`, 'gold');
    }
  }

  #showError(alertEl, message, inputEl) {
    alertEl.textContent = message;
    alertEl.hidden = false;
    inputEl?.setAttribute('aria-invalid', 'true');
    if (alertEl.id) inputEl?.setAttribute('aria-describedby', alertEl.id);
    inputEl?.focus();
  }

  #clearError(alertEl, inputEl) {
    alertEl.hidden = true;
    alertEl.textContent = '';
    inputEl?.removeAttribute('aria-invalid');
    inputEl?.removeAttribute('aria-describedby');
  }

  #showToast(message, variant = 'default') {
    while (this.#els.toastRegion.children.length >= MAX_TOASTS) {
      this.#els.toastRegion.firstElementChild?.remove();
    }

    const toast = createEl('div', 'toast', message);
    if (variant === 'gold') toast.classList.add('toast-gold');
    if (variant === 'purple') toast.classList.add('toast-purple');

    this.#els.toastRegion.appendChild(toast);
    window.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  #renderAll() {
    this.#renderModeTabs();
    this.#syncActivePresetChips();
    this.#updateEquipPreview();
    this.#updateSynthPreview();
    this.#updateEngravePreview();
    this.#renderEquipment();
    this.#renderCardPoolMeta();
    this.#renderCard();
    this.#renderSynthesisCascadeButton();
    this.#renderSynthesis();
    this.#renderArtifact();
    this.#renderEngraving();
    this.#renderCrafting();
  }

  #renderModeTabs() {
    const activeMode = this.#state.mode;

    this.#els.tabs.forEach((tab) => {
      const isSelected = tab.dataset.mode === activeMode;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });

    for (const [mode, panel] of Object.entries(this.#els.panels)) {
      panel.hidden = mode !== activeMode;
    }

    if (MODE_TITLES[activeMode]) {
      document.title = MODE_TITLES[activeMode];
    }
  }

  #renderCardPoolMeta() {
    const pool = CARD_POOLS[this.#els.cardPoolSelect.value] ?? CARD_POOLS.avatar;
    this.#els.cardPoolDesc.textContent =
      `${pool.description}（11 抽 = ${numberFmt.format(pool.diamondsPer11Draws)} 鑽石）`;
  }

  #renderSynthesisCascadeButton() {
    const totalDraws = this.#state.cardStats.totalDraws;
    this.#els.sendToSynthBtn.disabled = totalDraws === 0;
    this.#els.cascadeFromCardBtn.disabled = totalDraws === 0;
    this.#els.cascadeFromCardBtn.textContent = totalDraws > 0
      ? `用抽卡庫存連鎖合成 (${numberFmt.format(totalDraws)} 張)`
      : '用抽卡庫存連鎖合成 (白→紅神話)';
  }

  #renderEquipment() {
    const { totalConsumed, totalReached, lastResult } = this.#state.equipStats;

    this.#els.equipTotalConsumed.textContent = numberFmt.format(totalConsumed);
    this.#els.equipTotalReached.textContent = numberFmt.format(totalReached);

    if (!lastResult) {
      this.#els.equipLastOutcome.textContent = '尚未模擬';
      this.#els.equipEmptyState.hidden = false;
      this.#els.equipResultsWrap.hidden = true;
      this.#els.equipResultTbody.replaceChildren();
      return;
    }

    const equipLabel = EQUIP_META[lastResult.equipType]?.label ?? lastResult.equipType;
    this.#els.equipLastOutcome.textContent =
      `+${lastResult.targetLv} 達成 ${numberFmt.format(lastResult.finalSuccess)} 件`;

    this.#els.equipEmptyState.hidden = true;
    this.#els.equipResultsWrap.hidden = false;

    const banner = this.#els.equipOutcomeBanner;
    banner.classList.remove('is-success', 'is-fail');
    const stoneTag = lastResult.stoneType === 'blessed' ? '【伊瓦爾第石】' : '';
    const jumpText = lastResult.totalJumps > 0 ? `（含跳 +2 共 ${numberFmt.format(lastResult.totalJumps)} 次）` : '';

    if (lastResult.finalSuccess > 0) {
      const actualRate = lastResult.finalSuccess / lastResult.initialCount;
      banner.classList.add('is-success');
      banner.textContent =
        `${stoneTag}${equipLabel} 投入 ${numberFmt.format(lastResult.initialCount)} 件（+${lastResult.startLv} → +${lastResult.targetLv}）：` +
        `最終成功 ${numberFmt.format(lastResult.finalSuccess)} 件${jumpText}（實際達成率 ${formatProbability(actualRate)}）`;
    } else {
      const stoppedAt = lastResult.steps.at(-1)?.level ?? lastResult.startLv + 1;
      banner.classList.add('is-fail');
      banner.textContent =
        `${stoneTag}${equipLabel} 投入 ${numberFmt.format(lastResult.initialCount)} 件（+${lastResult.startLv} → +${lastResult.targetLv}）：` +
        `於衝刺 +${stoppedAt} 時全數爆裝歸零。`;
    }

    const fragment = document.createDocumentFragment();
    for (const step of lastResult.steps) {
      const tr = document.createElement('tr');
      const survivalRatio = step.success / lastResult.initialCount;

      tr.appendChild(createEl('td', 'font-bold', `+${step.fromLevel} → +${step.level}`));
      tr.appendChild(createEl('td', '', rateFmt.format(step.rate)));
      const successLabel = step.jump2 > 0
        ? `${numberFmt.format(step.success)} (+1:${step.plus1} / 跳+2:${step.jump2})`
        : numberFmt.format(step.success);
      tr.appendChild(createEl('td', 'text-success font-bold', successLabel));
      tr.appendChild(createEl('td', 'text-danger', numberFmt.format(step.fail)));

      const progressTd = document.createElement('td');
      const cellWrap = createEl('div', 'survival-cell');
      const track = createEl('div', 'survival-track');
      const fill = createEl('div', 'survival-fill');
      fill.style.width = `${Math.max(0, Math.min(100, survivalRatio * 100))}%`;
      track.appendChild(fill);
      cellWrap.appendChild(track);
      cellWrap.appendChild(createEl('span', 'survival-pct', formatProbability(survivalRatio)));
      progressTd.appendChild(cellWrap);
      tr.appendChild(progressTd);

      fragment.appendChild(tr);
    }

    this.#els.equipResultTbody.replaceChildren(fragment);
  }

  #renderCard() {
    const { totalDraws, totalDiamonds, totalCostTwd, totals, history } = this.#state.cardStats;

    this.#els.cardTotalDraws.textContent = numberFmt.format(totalDraws);
    this.#els.cardTotalDiamonds.textContent = numberFmt.format(totalDiamonds);
    this.#els.cardTotalTwd.textContent = `NT$ ${numberFmt.format(totalCostTwd)}`;

    for (const tier of CARD_TIERS) {
      const slot = this.#els.raritySummary[tier.key];
      const count = totals[tier.key];
      slot.count.textContent = numberFmt.format(count);
      const observed = totalDraws > 0 ? count / totalDraws : 0;
      slot.actual.textContent = `實際 ${formatProbability(observed)}`;
    }

    if (history.length === 0) {
      this.#els.cardEmptyState.hidden = false;
      this.#els.cardResultsWrap.hidden = true;
      this.#els.cardResultTbody.replaceChildren();
      return;
    }

    this.#els.cardEmptyState.hidden = true;
    this.#els.cardResultsWrap.hidden = false;

    const fragment = document.createDocumentFragment();
    for (const row of history) {
      const tr = document.createElement('tr');
      if (row.counts.gold > 0) tr.classList.add('row-jackpot-gold');
      else if (row.counts.purple > 0) tr.classList.add('row-jackpot-purple');

      tr.appendChild(createEl('td', '', `#${row.batchId}`));

      const poolTd = document.createElement('td');
      poolTd.appendChild(createEl('span', 'pool-pill', row.poolLabel));
      tr.appendChild(poolTd);

      tr.appendChild(createEl('td', 'font-bold', numberFmt.format(row.count)));
      tr.appendChild(createEl('td', 'text-white', numberFmt.format(row.counts.white)));
      tr.appendChild(createEl('td', 'text-green', numberFmt.format(row.counts.green)));
      tr.appendChild(createEl('td', 'text-blue', numberFmt.format(row.counts.blue)));
      tr.appendChild(createEl('td', 'text-purple font-bold', numberFmt.format(row.counts.purple)));
      tr.appendChild(createEl('td', 'text-gold font-bold', numberFmt.format(row.counts.gold)));
      tr.appendChild(createEl('td', '', numberFmt.format(row.costTwd)));

      fragment.appendChild(tr);
    }

    this.#els.cardResultTbody.replaceChildren(fragment);
  }

  #renderSynthesis() {
    const { totalAttempts, totalSuccess, totalPity, lastView } = this.#state.synthStats;

    this.#els.synthTotalAttempts.textContent = numberFmt.format(totalAttempts);
    this.#els.synthTotalSuccess.textContent = numberFmt.format(totalSuccess);
    this.#els.synthTotalPity.textContent = numberFmt.format(totalPity);

    if (!lastView) {
      this.#els.synthEmptyState.hidden = false;
      this.#els.synthResultsWrap.hidden = true;
      this.#els.synthResultTbody.replaceChildren();
      return;
    }

    this.#els.synthEmptyState.hidden = true;
    this.#els.synthResultsWrap.hidden = false;

    const banner = this.#els.synthOutcomeBanner;
    banner.classList.remove('is-success', 'is-fail');

    const fragment = document.createDocumentFragment();

    if (lastView.type === 'single') {
      const res = lastView.data;
      const catLabel = SYNTHESIS_CATEGORIES[res.category]?.label ?? res.category;

      if (res.totalGained > 0) {
        banner.classList.add('is-success');
        banner.textContent =
          `${catLabel}（${res.fromLabel} → ${res.toLabel}）：嘗試 ${numberFmt.format(res.attempts)} 次` +
          `（消耗 ${numberFmt.format(res.materialsUsed)} 個素材），共獲得 ${numberFmt.format(res.totalGained)} 個` +
          `（含保底 ${numberFmt.format(res.pityTriggered)} 個）。`;
      } else {
        banner.classList.add('is-fail');
        banner.textContent =
          `${catLabel}（${res.fromLabel} → ${res.toLabel}）：嘗試 ${numberFmt.format(res.attempts)} 次全數失敗，` +
          `累積保底進度 ${res.remainingPity}/${SYNTHESIS_PITY_THRESHOLD}。`;
      }

      const tr = document.createElement('tr');
      tr.appendChild(createEl('td', 'font-bold', `${res.fromLabel} → ${res.toLabel}`));
      tr.appendChild(createEl('td', '', rateFmt.format(res.rate)));
      tr.appendChild(createEl('td', '', numberFmt.format(res.attempts)));
      tr.appendChild(createEl('td', '', `${numberFmt.format(res.materialsUsed)} 個`));
      tr.appendChild(createEl('td', 'text-success font-bold', numberFmt.format(res.directSuccess)));
      tr.appendChild(createEl('td', 'text-gold font-bold', numberFmt.format(res.pityTriggered)));
      tr.appendChild(createEl('td', 'text-accent font-bold', `共 ${numberFmt.format(res.totalGained)} 個`));
      fragment.appendChild(tr);
    } else {
      const cascade = lastView.data;
      const catLabel = SYNTHESIS_CATEGORIES[cascade.category]?.label ?? cascade.category;
      const inv = cascade.finalInventory;

      const hasHighTier = inv.red > 0 || inv.gold > 0 || inv.purple > 0;
      banner.classList.add(hasHighTier ? 'is-success' : 'is-fail');
      banner.textContent =
        `${catLabel} 連鎖結果（總合成 ${numberFmt.format(cascade.totalAttempts)} 次・保底 ${numberFmt.format(cascade.totalPity)} 次）→ ` +
        `最終庫存：紅 ${inv.red} / 金 ${inv.gold} / 紫 ${inv.purple} / 藍 ${inv.blue} / 綠 ${inv.green} / 白 ${inv.white}`;

      for (const step of cascade.steps) {
        const tr = document.createElement('tr');
        if (step.tierId === 'gold-red' && step.totalGained > 0) tr.classList.add('row-jackpot-gold');
        else if (step.tierId === 'purple-gold' && step.totalGained > 0) tr.classList.add('row-jackpot-gold');
        else if (step.tierId === 'blue-purple' && step.totalGained > 0) tr.classList.add('row-jackpot-purple');

        tr.appendChild(createEl('td', 'font-bold', `${step.fromLabel} → ${step.toLabel}`));
        tr.appendChild(createEl('td', '', rateFmt.format(step.rate)));
        tr.appendChild(createEl('td', '', numberFmt.format(step.attempts)));
        tr.appendChild(createEl('td', '', `${numberFmt.format(step.materialsUsed)} / ${numberFmt.format(step.inputCards)} 張`));
        tr.appendChild(createEl('td', 'text-success font-bold', numberFmt.format(step.directSuccess)));
        tr.appendChild(createEl('td', 'text-gold font-bold', numberFmt.format(step.pityTriggered)));
        tr.appendChild(
          createEl(
            'td',
            step.totalGained > 0 ? 'text-accent font-bold' : '',
            `+${numberFmt.format(step.totalGained)}（餘 ${step.leftoverCards} 張）`
          )
        );
        fragment.appendChild(tr);
      }
    }

    this.#els.synthResultTbody.replaceChildren(fragment);
  }

  #renderArtifact() {
    const { selectedSlots, totalDraws, totalHits, slotHits, lastResult } = this.#state.artifactStats;
    const selectedSet = new Set(selectedSlots);

    this.#els.artifactTotalDraws.textContent = numberFmt.format(totalDraws);
    this.#els.artifactTotalHits.textContent = numberFmt.format(totalHits);
    const actualRate = totalDraws > 0 ? totalHits / totalDraws : 0;
    this.#els.artifactActualRate.textContent = formatProbability(actualRate);

    // Build 10-slot interactive board
    const fragment = document.createDocumentFragment();
    for (const slot of ARTIFACT_SLOTS) {
      const btn = createEl('button', 'artifact-slot');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(selectedSet.has(slot.index)));

      const head = createEl('div', 'artifact-slot-head');
      head.appendChild(createEl('span', 'artifact-slot-num', `第 ${slot.slotNumber} 格`));
      head.appendChild(createEl('span', 'artifact-slot-rate', rateFmt.format(slot.weight)));

      btn.appendChild(head);
      btn.appendChild(createEl('span', 'artifact-slot-name', slot.label));
      btn.appendChild(createEl('span', 'artifact-slot-hits', `累計命中 ${numberFmt.format(slotHits[slot.index])} 次`));

      btn.addEventListener('click', () => {
        const next = new Set(this.#state.artifactStats.selectedSlots);
        if (next.has(slot.index)) {
          if (next.size === 1) {
            this.#showToast('盤面至少須保留 1 個目標欄位');
            return;
          }
          next.delete(slot.index);
        } else {
          next.add(slot.index);
        }
        this.#state.artifactStats.selectedSlots = [...next].sort((a, b) => a - b);
        this.#renderArtifact();
      });

      fragment.appendChild(btn);
    }
    this.#els.artifactBoard.replaceChildren(fragment);

    const expectedRate = selectedSlots.reduce((sum, idx) => sum + ARTIFACT_SLOTS[idx].weight, 0);
    const slotNums = selectedSlots.map((idx) => `#${idx + 1}`).join('、');
    this.#els.artifactPreviewText.textContent =
      `已選取 ${selectedSlots.length} 格（${slotNums}）｜理論組合命中率：${formatProbability(expectedRate)}`;

    const pickKey = selectedSlots.join(',');
    this.#els.artifactPickBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.artifactPick === pickKey);
    });

    const banner = this.#els.artifactOutcomeBanner;
    if (!lastResult) {
      banner.hidden = true;
      return;
    }

    banner.hidden = false;
    banner.classList.remove('is-success', 'is-fail');
    banner.classList.add(lastResult.targetHits > 0 ? 'is-success' : 'is-fail');
    const batchRate = lastResult.targetHits / lastResult.draws;
    banner.textContent =
      `本次抽取 ${numberFmt.format(lastResult.draws)} 次：目標命中 ${numberFmt.format(lastResult.targetHits)} 次` +
      `（實際命中率 ${formatProbability(batchRate)}，理論 ${formatProbability(lastResult.expectedHitRate)}）`;
  }

  #renderEngraving() {
    const { totalSeals, totalMatches, totalPurplePlus, totalAllGold, lastResult } = this.#state.engraveStats;

    this.#els.engraveTotalSeals.textContent = numberFmt.format(totalSeals);
    this.#els.engraveTotalMatches.textContent = numberFmt.format(totalMatches);
    this.#els.engraveTotalHigh.textContent = `${numberFmt.format(totalPurplePlus)} / ${numberFmt.format(totalAllGold)}`;

    if (!lastResult) {
      this.#els.engraveResultBox.hidden = true;
      return;
    }

    this.#els.engraveResultBox.hidden = false;
    const banner = this.#els.engraveOutcomeBanner;
    banner.classList.remove('is-success', 'is-fail');
    banner.classList.add(lastResult.matchedAny > 0 ? 'is-success' : 'is-fail');
    banner.textContent =
      `${lastResult.label} 投入 ${numberFmt.format(lastResult.attempts)} 顆黃金印章：` +
      `3 格同詞條 ${numberFmt.format(lastResult.matchedAny)} 次｜全紫+同詞條 ${numberFmt.format(lastResult.matchedPurplePlus)} 次｜全金同詞條 ${numberFmt.format(lastResult.matchedAllGold)} 次`;

    const tierLabelMap = { white: '一般（白）', purple: '英雄（紫）', gold: '傳說（金）' };
    const fragment = document.createDocumentFragment();
    lastResult.lastRoll.slots.forEach((tier, idx) => {
      const card = createEl('div', `engrave-slot-card tier-${tier}`);
      card.appendChild(createEl('span', 'kpi-label', `末次槽位 ${idx + 1}`));
      card.appendChild(createEl('strong', '', tierLabelMap[tier]));
      card.appendChild(
        createEl('span', 'kpi-label', lastResult.lastRoll.sameStat ? '詞條一致 ✓' : '詞條不同')
      );
      fragment.appendChild(card);
    });
    this.#els.engraveSlotsRow.replaceChildren(fragment);
  }

  #renderCrafting() {
    const res = this.#state.engraveStats.lastCraft;
    const banner = this.#els.craftOutcomeBanner;
    if (!res) {
      banner.hidden = true;
      return;
    }

    banner.hidden = false;
    banner.classList.remove('is-success', 'is-fail');
    banner.classList.add(res.greatSuccess > 0 || res.totalSuccess > 0 ? 'is-success' : 'is-fail');
    banner.textContent =
      `${res.label}（${numberFmt.format(res.attempts)} 次）：` +
      `成功 ${numberFmt.format(res.totalSuccess)} 件（一般 ${numberFmt.format(res.normalSuccess)} 件・15% 大成功可交易 ${numberFmt.format(res.greatSuccess)} 件），` +
      `失敗 ${numberFmt.format(res.failCount)} 次。`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OdinSimulatorApp();
});
