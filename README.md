# ODIN-Simulator (奧丁：神叛 模擬器)

一個娛樂用的《奧丁：神叛》裝備強化與抽卡模擬器。
採用 **Zero Dependencies** 純原生前端技術棧（HTML5、Modern CSS、ES Modules）打造，並遵循現代網頁無障礙（WAI-ARIA）、響應式設計與效能規範。

## 🌟 核心功能 (Features)

* **🗡️ 裝備強化模擬 (Enhancement)**
  * 支援武器、防具、披風、一般飾品與商城飾品強化機率模擬（+0 ~ +20）。
  * **即時理論期望值預覽**：調整道具與目標等級時即時計算理論累積成功率與預期存活件數。
  * **常用快捷設定**：提供常見等級區間（`+0→+5`、`+0→+7`、`+5→+10`、`+7→+12`）與數量快捷按鈕。
  * **強化存活漏斗表**：視覺化呈現每階段成功/失敗數與累積存活進度條。
* **🃏 抽卡模擬 (Card Drawing)**
  * 還原五階級抽卡機率（白 `72.44%`、綠 `26.24%`、藍 `1.17%`、紫 `0.14%`、金 `0.01%`）。
  * 提供單抽、11 連抽、十組 11 抽、千抽測試與自訂抽數，自動統計累積鑽石與等值台幣花費，並對比實際與理論出率。
* **♿ 現代前端標準與無障礙體驗**
  * WAI-ARIA `tablist` / `tabpanel` 完整鍵盤導覽（支援 `ArrowLeft` / `ArrowRight` / `Home` / `End`）。
  * XSS 安全的純 DOM 建構（無 `innerHTML` 字串拼接）、表格數值 `tabular-nums` 等寬對齊、`:focus-visible` 鍵盤焦點指示與 `prefers-reduced-motion` 支援。
  * `@layer` CSS 架構與原生 CSS Nesting。

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
node --test tests/simulator.test.mjs
```

## 🛠️ 技術棧 (Tech Stack)

* **HTML5**：單一 `<main>` 語意地標、WAI-ARIA Tabs、原生表單與 `aria-live` 提示
* **CSS3 (Modern Baseline)**：`@layer` 階層管理、CSS Nesting、CSS Variables、`dvh`、`tabular-nums`、`prefers-reduced-motion`
* **JavaScript (ES2024+)**：ES Modules、私有欄位 (`#state`)、`Intl.NumberFormat`、職責分離純函式模擬引擎

---
*聲明：本專案僅供娛樂與機率測試用途，內部機率資料為模擬數值，實際機率請以遊戲官方公佈為準。*
