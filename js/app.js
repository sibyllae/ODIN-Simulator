import { CARD_TIERS, EQUIP_META } from './data.js';
import {
  calculateExpectedEquipRate,
  simulateCardDraws,
  simulateEnhancement,
  validateCardInput,
  validateEquipmentInput,
} from './simulator.js';

const STORAGE_KEY = 'odin-simulator:v2';
const MAX_HISTORY_ROWS = 100;
const MAX_TOASTS = 3;

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
  maximumFractionDigits: 0,
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
      totalDraws: 0,
      totalDiamonds: 0,
      totalCostTwd: 0,
      totals: { white: 0, green: 0, blue: 0, purple: 0, gold: 0 },
      history: [],
      batchCounter: 0,
    },
  };

  #els = {};

  constructor() {
    this.#cacheDOM();
    this.#restoreMode();
    this.#bindEvents();
    this.#syncTargetLevelOptions();
    this.#renderAll();
  }

  #cacheDOM() {
    const $ = (id) => document.getElementById(id);

    this.#els = {
      tabs: Array.from(document.querySelectorAll('[role="tab"]')),
      panels: {
        equipment: $('panel-equipment'),
        card: $('panel-card'),
      },
      toastRegion: $('toast-region'),

      // Equipment
      equipTotalConsumed: $('equip-total-consumed'),
      equipTotalReached: $('equip-total-reached'),
      equipLastOutcome: $('equip-last-outcome'),
      resetEquipBtn: $('reset-equip-btn'),
      equipForm: $('equip-form'),
      equipSelect: $('equip-select'),
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
      resetCardBtn: $('reset-card-btn'),
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
    };
  }

  #restoreMode() {
    const hashMode = window.location.hash.replace('#', '');
    if (hashMode === 'equipment' || hashMode === 'card') {
      this.#state.mode = hashMode;
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'equipment' || saved === 'card') {
        this.#state.mode = saved;
      }
    } catch {
      // Ignore storage access errors in restricted environments
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
      tab.addEventListener('click', () => {
        this.#switchMode(tab.dataset.mode);
      });

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

    // Equipment events
    this.#els.equipSelect.addEventListener('change', () => this.#updateEquipPreview());
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
      const count = parseStrictNumber(this.#els.cardCountInput.value);
      this.#runCardDraw(count);
    });

    window.addEventListener('hashchange', () => {
      const hashMode = window.location.hash.replace('#', '');
      if ((hashMode === 'equipment' || hashMode === 'card') && hashMode !== this.#state.mode) {
        this.#state.mode = hashMode;
        this.#renderModeTabs();
      }
    });

    this.#els.resetCardBtn.addEventListener('click', () => {
      this.#state.cardStats = {
        totalDraws: 0,
        totalDiamonds: 0,
        totalCostTwd: 0,
        totals: { white: 0, green: 0, blue: 0, purple: 0, gold: 0 },
        history: [],
        batchCounter: 0,
      };
      this.#clearError(this.#els.cardError, this.#els.cardCountInput);
      this.#renderCard();
      this.#showToast('已重置抽卡統計紀錄');
    });
  }

  #switchMode(mode) {
    if (mode !== 'equipment' && mode !== 'card') return;
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

  #syncActivePresetChips() {
    const currentPair = `${this.#els.nowLvSelect.value}-${this.#els.targetLvSelect.value}`;
    const currentQty = this.#els.equipCountInput.value.trim();

    this.#els.lvPresetBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.lvPreset === currentPair);
    });

    this.#els.qtyPresetBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.equipQty === currentQty);
    });
  }

  #updateEquipPreview() {
    const equipType = this.#els.equipSelect.value;
    const nowLv = Number.parseInt(this.#els.nowLvSelect.value, 10);
    const targetLv = Number.parseInt(this.#els.targetLvSelect.value, 10);
    const count = parseStrictNumber(this.#els.equipCountInput.value);

    const rate = calculateExpectedEquipRate(equipType, nowLv, targetLv);
    const equipLabel = EQUIP_META[equipType]?.label ?? equipType;

    if (!Number.isInteger(count) || count < 1) {
      this.#els.equipPreviewText.textContent =
        `${equipLabel} +${nowLv} → +${targetLv} 理論累積成功率：${formatProbability(rate)}`;
      return;
    }

    const expectedSurvivors = count * rate;
    this.#els.equipPreviewText.textContent =
      `${equipLabel} +${nowLv} → +${targetLv} 理論成功率 ${formatProbability(rate)}，` +
      `投入 ${numberFmt.format(count)} 件預期約剩 ${expectedSurvivors.toFixed(1)} 件`;
  }

  #handleEquipSubmit() {
    const equipType = this.#els.equipSelect.value;
    const nowLv = Number.parseInt(this.#els.nowLvSelect.value, 10);
    const targetLv = Number.parseInt(this.#els.targetLvSelect.value, 10);
    const count = parseStrictNumber(this.#els.equipCountInput.value);

    const error = validateEquipmentInput({ equipType, nowLv, targetLv, count });
    if (error) {
      this.#showError(this.#els.equipError, error, this.#els.equipCountInput);
      return;
    }

    this.#clearError(this.#els.equipError, this.#els.equipCountInput);
    const result = simulateEnhancement({ equipType, nowLv, targetLv, count });

    this.#state.equipStats.totalConsumed += result.initialCount;
    this.#state.equipStats.totalReached += result.finalSuccess;
    this.#state.equipStats.lastResult = result;

    this.#renderEquipment();

    if (result.finalSuccess > 0) {
      this.#showToast(
        `強化完成！成功產出 ${numberFmt.format(result.finalSuccess)} 件 +${result.targetLv} 裝備`,
        'gold'
      );
    }
  }

  #runCardDraw(count) {
    const error = validateCardInput(count);
    if (error) {
      this.#showError(this.#els.cardError, error, this.#els.cardCountInput);
      return;
    }

    this.#clearError(this.#els.cardError, this.#els.cardCountInput);
    const res = simulateCardDraws({ count });

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

    if (res.counts.gold > 0) {
      this.#showToast(`神運降臨！本次抽中 ${res.counts.gold} 張金卡！`, 'gold');
    } else if (res.counts.purple > 0) {
      this.#showToast(`歐氣爆發！本次抽中 ${res.counts.purple} 張紫卡！`, 'purple');
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
    this.#renderEquipment();
    this.#renderCard();
  }

  #renderModeTabs() {
    const activeMode = this.#state.mode;

    this.#els.tabs.forEach((tab) => {
      const isSelected = tab.dataset.mode === activeMode;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
    });

    this.#els.panels.equipment.hidden = activeMode !== 'equipment';
    this.#els.panels.card.hidden = activeMode !== 'card';
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

    // Outcome Banner
    const banner = this.#els.equipOutcomeBanner;
    banner.classList.remove('is-success', 'is-fail');
    if (lastResult.finalSuccess > 0) {
      const actualRate = lastResult.finalSuccess / lastResult.initialCount;
      banner.classList.add('is-success');
      banner.textContent =
        `${equipLabel} 投入 ${numberFmt.format(lastResult.initialCount)} 件（+${lastResult.startLv} → +${lastResult.targetLv}）：` +
        `最終成功 ${numberFmt.format(lastResult.finalSuccess)} 件（實際達成率 ${formatProbability(actualRate)}）`;
    } else {
      const stoppedAt = lastResult.steps.at(-1)?.level ?? lastResult.startLv + 1;
      banner.classList.add('is-fail');
      banner.textContent =
        `${equipLabel} 投入 ${numberFmt.format(lastResult.initialCount)} 件（+${lastResult.startLv} → +${lastResult.targetLv}）：` +
        `於衝刺 +${stoppedAt} 時全數爆裝歸零。`;
    }

    // Build table rows safely with DocumentFragment
    const fragment = document.createDocumentFragment();
    for (const step of lastResult.steps) {
      const tr = document.createElement('tr');
      const survivalRatio = step.success / lastResult.initialCount;

      tr.appendChild(createEl('td', 'font-bold', `+${step.fromLevel} → +${step.level}`));
      tr.appendChild(createEl('td', '', rateFmt.format(step.rate)));
      tr.appendChild(createEl('td', 'text-success font-bold', numberFmt.format(step.success)));
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
}

document.addEventListener('DOMContentLoaded', () => {
  new OdinSimulatorApp();
});
