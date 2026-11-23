# ODIN-Simulator (奧丁：神叛 模擬器)

一個娛樂用的《奧丁：神叛》全系統機率模擬器。
採用 **Zero Dependencies** 純原生前端技術棧（HTML5、Modern CSS、ES Modules）打造，並遵循現代網頁無障礙（WAI-ARIA）、響應式設計與效能規範。

## 🌟 核心功能 (Features)

* **⚔️ 裝備強化模擬 (Enhancement)**
  * 支援武器、防具、披風、一般飾品（含紋章）與商城飾品強化機率模擬（+0 ~ +20）。
  * 支援切換 **一般強化石 (+1)** 與 **伊瓦爾第強化石（成功時 20% 機率跳 +2）**，並以動態規劃計算真實理論存活率。
  * 提供常用等級區間（`+0→+5`、`+0→+7`、`+5→+10`、`+7→+12`）與數量快捷按鈕，以存活率進度條呈現各階漏斗。
* **🃏 四大卡池召喚模擬 (Multi-Pool Card Summoning)**
  * 支援遊戲四大召喚項目切換：**造型召喚 (Avatar)**、**坐騎召喚 (Mount)**、**武器形象召喚 (Weapon Appearance)** 與 **符石 / 庇佑石召喚 (Rune & Warding Stone)**。
  * 採用官方公開鑽石召喚基準機率（白 `70.95%`、綠 `27.56%`、藍 `1.32%`、紫 `0.16%`、金 `0.01%`；11 抽 = `2,100` 鑽石），對比實際與理論出率並自動換算台幣花費。
* **🔮 4 合 1 卡片合成 & 符石升階 (Card Synthesis & Rune Upgrade)**
  * 還原 **4 合 1 合成**（白→綠 `30%`、綠→藍 `21%`、藍→紫 `18%`、紫→金 `16%`、金→紅神話 `14%`，失敗消耗全部 4 張素材）與 **每失敗 15 次必送 1 張目標卡** 的保底機制。
  * 支援 **符石內建升階** 獨立機率（`30% / 16% / 13% / 11% / 10%`），並可一鍵將「卡片召喚」累積的庫存帶入進行 **白→紅神話連鎖合成**。
* **🏺 古物 10 格轉盤模擬 (Artifact Roulette)**
  * 視覺化呈現 10 格古物盤面權重（第 2 格 `35%`、第 3/4 格 `17.5%` 等），支援多選目標欄位（1-Pick / 2-Pick / 3-Pick 策略實測）。
* **🔱 刻印 & 製作大成功模擬 (Engraving & Crafting)**
  * **刻印系統（黃金印章）**：模擬第 1~5 階段 3 格同詞條配對機率（`8% / 7% / 5% / 2% / 2%`）與白／紫／金槽位稀有度分佈。
  * **製作大成功**：模擬一般裝備圖樣（`20%`）、精隨／靈魂（`12%`）、高階材料（`30%`）搭配奧丁固定 `15%` 大成功可交易產出率。

## 🚀 如何運行 (How to Run)

由於本專案使用 ES Modules (`<script type="module">`)，請透過 Local Web Server 啟動（直接以 `file:///` 開啟會受瀏覽器 CORS 限制）：

### 1. 使用 VSCode Live Server
安裝 **Live Server** 擴充功能，開啟 `index.html` 後點擊右下角 `Go Live`。

### 2. 使用 Node.js
```bash
npx serve
# 或
npx http-server
```

## 🧪 執行單元測試 (Tests)

本專案內建 Node.js 原生測試（零外部套件依賴，需 Node.js 18+）：

```bash
npm test
# 或
node --test tests/simulator.test.mjs
```

## 🛠️ 技術棧 (Tech Stack)

* **HTML5**：單一 `<main>` 語意地標、WAI-ARIA Tabs、原生表單與 `aria-live` 提示
* **CSS3 (Modern Baseline)**：`@layer` 階層管理、CSS Nesting、CSS Variables、`dvh`、`tabular-nums`、`prefers-reduced-motion`
* **JavaScript (ES2024+)**：ES Modules、私有欄位 (`#state`)、`Intl.NumberFormat`、職責分離純函式模擬引擎

---
*聲明：本專案僅供娛樂與機率測試用途，內部機率資料為模擬參考數值，實際機率與活動規則請以遊戲官方公佈為準。*
