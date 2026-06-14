import { probability } from './data.js';

class OdinSimulator {
  constructor() {
    this.mode = 'default';
    this.accumulation = 0;
    this.results = [];
    
    this.initDOM();
    this.bindEvents();
    this.render();
  }
  
  initDOM() {
    this.modeSelect = document.getElementById('mode-select');
    this.equipmentSection = document.getElementById('equipment-section');
    this.cardSection = document.getElementById('card-section');
    
    // Equipment DOM
    this.accumEquipmentLabel = document.getElementById('accum-equipment-label');
    this.resetEquipBtn = document.getElementById('reset-equip-btn');
    this.equipSelect = document.getElementById('equip-select');
    this.nowLvSelect = document.getElementById('now-lv-select');
    this.targetLvSelect = document.getElementById('target-lv-select');
    this.equipCountInput = document.getElementById('equip-count-input');
    this.startEquipBtn = document.getElementById('start-equip-btn');
    this.equipResultTableBody = document.getElementById('equip-result-tbody');
    
    // Card DOM
    this.accumCardLabel = document.getElementById('accum-card-label');
    this.resetCardBtn = document.getElementById('reset-card-btn');
    this.cardCountInput = document.getElementById('card-count-input');
    this.startCardBtn = document.getElementById('start-card-btn');
    this.cardResultTableBody = document.getElementById('card-result-tbody');
    
    this.summaryWhite = document.getElementById('summary-white');
    this.summaryGreen = document.getElementById('summary-green');
    this.summaryBlue = document.getElementById('summary-blue');
    this.summaryPurple = document.getElementById('summary-purple');
    this.summaryGold = document.getElementById('summary-gold');
  }
  
  bindEvents() {
    this.modeSelect.addEventListener('change', (e) => {
      this.mode = e.target.value;
      this.resetState();
    });

    this.resetEquipBtn?.addEventListener('click', () => this.resetState());
    this.resetCardBtn?.addEventListener('click', () => this.resetState());
    
    this.startEquipBtn?.addEventListener('click', () => this.startEquipment());
    this.startCardBtn?.addEventListener('click', () => this.startCard());
  }

  resetState() {
    this.accumulation = 0;
    this.results = [];
    if (this.equipCountInput) this.equipCountInput.value = '';
    if (this.cardCountInput) this.cardCountInput.value = '';
    this.render();
  }
  
  startEquipment() {
    const equip = this.equipSelect.value;
    const nowLv = parseInt(this.nowLvSelect.value);
    const targetLv = parseInt(this.targetLvSelect.value);
    let count = parseInt(this.equipCountInput.value);
    
    if (equip === 'default' || isNaN(nowLv) || isNaN(targetLv) || isNaN(count) || count <= 0) {
      alert('請填寫完整且正確的強化資訊！');
      return;
    }
    if (nowLv >= targetLv) {
      alert('目標等級必須大於目前等級！');
      return;
    }

    this.results = [];
    let currentNowLv = nowLv;
    const data = probability[equip];
    
    while (count > 0 && currentNowLv < targetLv) {
      let level = currentNowLv + 1;
      let prob = data[currentNowLv] || 0.01; // fallback
      let blackUp = `${Math.floor(prob * 100)} %`;
      
      let success = 0;
      for (let i = 0; i < count; i++) {
        if (prob >= Math.random()) success++;
      }
      
      let fail = count - success;
      this.results.push({ level, success, fail, blackUp });
      
      count = success;
      currentNowLv++;
    }
    
    this.accumulation += parseInt(this.equipCountInput.value);
    this.render();
  }

  startCard() {
    let count = parseInt(this.cardCountInput.value);
    if (isNaN(count) || count <= 0) {
      alert('請輸入正確的抽卡數量！');
      return;
    }

    let currentRes = { white: 0, green: 0, blue: 0, purple: 0, gold: 0 };

    for (let i = 0; i < count; i++) {
      let r = Math.random();
      if (r < 0.0001) currentRes.gold++;
      else if (r < 0.0015) currentRes.purple++;
      else if (r < 0.0132) currentRes.blue++;
      else if (r < 0.2756) currentRes.green++;
      else currentRes.white++;
    }

    this.results.unshift(currentRes);
    
    // Calculate cost: 11 draws = 2100 diamonds. 30580 diamonds = 10000 TWD
    let cost = Math.ceil(((count / 11) * 2100 / 30580) * 10000);
    this.accumulation += cost;
    
    this.render();
  }

  render() {
    // Mode visibility
    this.equipmentSection.style.display = this.mode === 'equipment' ? 'block' : 'none';
    this.cardSection.style.display = this.mode === 'card' ? 'block' : 'none';
    
    // Render Equipment
    if (this.mode === 'equipment') {
      this.accumEquipmentLabel.textContent = `目前累積強化 ${this.accumulation} 次`;
      this.equipResultTableBody.innerHTML = '';
      this.results.forEach(res => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${res.level}</td>
          <td class="text-success">${res.success}</td>
          <td class="text-danger">${res.fail}</td>
          <td>${res.blackUp}</td>
        `;
        // animate insertion
        tr.style.animation = "fadeIn 0.3s ease-out forwards";
        this.equipResultTableBody.appendChild(tr);
      });
    }

    // Render Card
    if (this.mode === 'card') {
      this.accumCardLabel.textContent = `目前累積花費 ${this.accumulation.toLocaleString()} 元台幣`;
      
      // Calculate totals
      let tWhite = 0, tGreen = 0, tBlue = 0, tPurple = 0, tGold = 0;
      this.results.forEach(res => {
        tWhite += res.white; tGreen += res.green; tBlue += res.blue;
        tPurple += res.purple; tGold += res.gold;
      });
      
      this.summaryWhite.textContent = tWhite;
      this.summaryGreen.textContent = tGreen;
      this.summaryBlue.textContent = tBlue;
      this.summaryPurple.textContent = tPurple;
      this.summaryGold.textContent = tGold;
      
      this.cardResultTableBody.innerHTML = '';
      this.results.forEach(res => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="text-white">${res.white}</td>
          <td class="text-green">${res.green}</td>
          <td class="text-blue">${res.blue}</td>
          <td class="text-purple">${res.purple}</td>
          <td class="text-gold font-bold">${res.gold}</td>
        `;
        tr.style.animation = "fadeIn 0.3s ease-out forwards";
        this.cardResultTableBody.appendChild(tr);
      });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new OdinSimulator();
});
