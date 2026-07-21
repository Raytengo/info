# Info — AI Research News Tracker

追蹤 OpenAI、Anthropic、DeepMind、NVIDIA 的最新研究動態。每週自動更新，透過 iOS Widget 與網頁版瀏覽，左滑右滑回饋偏好。

## 運作流程

```
每週觸發（Cowork scheduled task）
    ↓
爬取本週四家 lab 新文章（listing page only）
    ↓
Agent 依據偏好歷史篩選 + 排序 → 選出 top N 篇
    ↓
Agent 生成繁中 summary / detail
    ↓
寫入 queue.json → git push → GitHub Pages 自動更新
    ↓
Widget / 網頁顯示本週內容
    ↓
使用者左滑（不喜歡）/ 右滑（喜歡）
    ↓
feedback.json 更新 → 下週 agent 參考
```

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `queue.json` | 本週展示文章，由 agent 每週生成並推送 |
| `feedback.json` | 使用者 like/dislike 記錄，供 agent 學習偏好 |
| `articles_raw.json` | 歷史文章 metadata 庫（2026 年起，僅 title + url，備用） |
| `AI Research Widget.js` | iOS Scriptable 桌面小工具 |
| `index.html` | GitHub Pages 網頁版 → [raytengo.github.io/info](https://raytengo.github.io/info/) |

## Widget 使用方式

1. 在 iOS 安裝 [Scriptable](https://scriptable.app/)
2. 將 `AI Research Widget.js` 複製到 Scriptable
3. 新增 Widget，長按 → 編輯 Widget，可選填參數：
   - `openai` / `anthropic` / `deepmind` / `nvidia` — 只顯示該 lab
   - 留空 — 四家輪播

支援 Small / Medium / Large 三種尺寸，點擊 Widget 開啟網頁版。

## 資料格式

### queue.json

```json
{
  "meta": { "updated_at": "", "count": 0 },
  "digest": { "all": "", "openai": "", "anthropic": "", "deepmind": "", "nvidia": "" },
  "articles": [
    {
      "id": "openai-2026-05-22-...",
      "lab": "openai",
      "title": "...",
      "summary": "一句話摘要",
      "detail": "2–3 句延伸說明",
      "url": "https://...",
      "image_url": "",
      "published_at": "2026-05-22",
      "crawled_at": "2026-05-27T00:00:00Z"
    }
  ]
}
```

### feedback.json

```json
{
  "updated_at": "2026-05-27T00:00:00Z",
  "ratings": {
    "openai-2026-05-22-...": "like",
    "anthropic-2026-05-20-...": "dislike"
  }
}
```

### articles_raw.json

2026 年起各 lab 所有文章的輕量 metadata（title + url + category，無全文）。
爬取時間：2026-05-27，共 200 篇（OpenAI 117 / Anthropic 58 / DeepMind 25）。

## 資料來源

- OpenAI：https://openai.com/news/
- Anthropic：https://www.anthropic.com/news
- DeepMind：https://deepmind.google/discover/blog/
- NVIDIA：https://developer.nvidia.com/blog/（僅研究分類）＋ https://huggingface.co/blog?author=nvidia（新模型發布）
