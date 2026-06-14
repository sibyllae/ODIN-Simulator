# ODIN-Simulator (奧丁：神叛 模擬器)

一個娛樂用的《奧丁：神叛》裝備強化與抽卡模擬器。
本專案於 2026 年進行了全面現代化重構，採用了極具科技感的暗黑模式、毛玻璃特效 (Glassmorphism) 以及流暢的微動畫，為玩家提供最佳的視覺與互動體驗。

## 🌟 核心特色 (Features)

*   **雙重模擬功能**：
    *   **🗡️ 裝備強化 (Enhancement)**：模擬武器、防具、披風與飾品的強化成功率，並統計累積消耗與強化次數。
    *   **🃏 抽卡模擬 (Card Drawing)**：還原遊戲內抽卡機率（白、綠、藍、紫、金），支援批量抽卡並自動計算等值台幣花費。
*   **頂級美學設計**：全面採用 2026 現代化 UI 設計，包含半透明毛玻璃面板、霓虹點綴與流暢的懸浮回饋。
*   **極致效能 (Vanilla Stack)**：零前端框架依賴 (Zero Dependencies)！專案完全以純 HTML5、CSS3 與 ES6+ JavaScript (ES Modules) 打造，展現輕量且紮實的底層架構。

## 🚀 如何運行 (How to Run)

由於本專案採用了現代的 ES Modules 架構 (`<script type="module">`)，直接在瀏覽器雙擊打開 HTML 檔案（使用 `file:///` 協議）將會遇到 CORS 安全限制。

為了確保所有功能正常運作，**請務必透過 Local Web Server 啟動本專案**。您可以使用以下任何一種方式：

### 1. 使用 VSCode (推薦)
1. 在 VSCode 中安裝 **Live Server** 擴充功能。
2. 開啟 `index.html`，點擊右下角的 `Go Live` 按鈕。

### 2. 使用 Node.js
如果您有安裝 Node.js，可以在終端機執行：
```bash
npx serve
# 或
npx http-server
```

### 3. 使用 Python
如果您有安裝 Python，可以在終端機執行：
```bash
python -m http.server 8000
```
啟動後，開啟瀏覽器前往 `http://localhost:8000` 即可體驗！

## 🛠️ 技術棧 (Tech Stack)

*   **HTML5** (語意化結構)
*   **CSS3** (CSS Variables, Flexbox/Grid, Animations, Backdrop-filter)
*   **JavaScript (ES6+)** (Vanilla JS, ES Modules, 原生 DOM 操作)

---
*聲明：本專案僅供娛樂與機率測試用途，內部機率資料為模擬數值，實際機率請以遊戲官方公佈為準。*
