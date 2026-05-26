# Info — AI Research News Tracker

追蹤 OpenAI、Anthropic、DeepMind 的最新研究動態。

## 組成

| 檔案 | 說明 |
|------|------|
| `queue.json` | 資料來源，由本機 AI pipeline 自動更新並推送 |
| `AI Research Widget.js` | iOS Scriptable 桌面小工具 |
| `index.html` | GitHub Pages 網頁版 → [raytengo.github.io/info](https://raytengo.github.io/info/) |

## Widget 使用方式

1. 在 iOS 安裝 [Scriptable](https://scriptable.app/)
2. 將 `AI Research Widget.js` 複製到 Scriptable
3. 新增 Widget，長按 → 編輯 Widget，可選填參數：
   - `openai` / `anthropic` / `deepmind` — 只顯示該 lab
   - 留空 — 三家輪播

支援 Small / Medium / Large 三種尺寸，點擊 Widget 開啟網頁版。

## 資料格式

`queue.json` 包含三個區塊：

```
meta      → 最後更新時間、文章總數
digest    → 各 lab 近期方向摘要（all / openai / anthropic / deepmind）
articles  → 文章列表（id, lab, title, summary, detail, url, published_at）
```
