# AI 趨勢追蹤系統 — v2 計劃書

> v1 在 `AI_趨勢追蹤系統_計劃書.md`，本版根據檢討把過度設計的部分砍掉。

---

## 0. v2 相對 v1 的決策變更

| 項目 | v1 | v2 |
|------|----|----|
| feedback (like/dislike) | 有 | **砍掉** |
| history / seen 狀態 | 有 | **砍掉** |
| 提取方式 | 截圖 + vision | **WebFetch + HTML 解析** |
| GitHub 認證 | PAT + write | **repo 改 public，無認證** |
| 資料流向 | 雙向同步 | **單向（電腦 → repo → 手機）** |
| 抓取範圍 | blog + paper | **只有 blog** |
| 去重邏輯 | 自相矛盾 | **由 Claude Code agent 自然語言判斷** |
| 舊 Chrome extension | 並行 | **淘汰** |

---

## 1. 系統目標

每 7 天自動抓取 OpenAI、Anthropic、DeepMind 三家官方 **blog** 的新文章，存到一個 public GitHub repo，iPhone 用 Scriptable widget 被動展示。零手動操作。

**非目標**（明確劃線，避免 scope creep）：

- 不抓 research papers / publications page
- 不做用戶反饋（like/dislike/seen）
- 不做個人化排序或過濾
- 不做即時推播

7 天週期是起點，之後可在 scheduled task 設定裡動態調整。

---

## 2. 整體架構

```
┌──────────────────────────────────────────┐
│   GitHub repo (PUBLIC)                   │
│   Raytengo/ai-research-data              │
│   └─ data/queue.json                     │
└────────┬─────────────────────┬───────────┘
         │ push                │ fetch
         │ (7 天一次)           │ (每次開 widget)
         │                     │
   ┌─────▼──────────┐    ┌─────▼─────────┐
   │ Scheduled Task │    │ iPhone        │
   │ → Claude Code  │    │ Scriptable    │
   │   agent run    │    │ widget        │
   │ (爬蟲+去重+commit)│  │ (純展示)      │
   └────────────────┘    └───────────────┘
```

- 單一資料檔：`data/queue.json`
- 單向資料流，無回寫
- Widget 不需要任何認證（public repo + raw URL）

---

## 3. 資料結構

只有一個檔案：`data/queue.json`

```json
{
  "meta": {
    "last_crawled": "2026-05-26T08:00:00Z",
    "total": 47
  },
  "articles": [
    {
      "id": "openai-20260526-gpt5-reasoning",
      "lab": "openai",
      "title": "GPT-5: Next Generation Reasoning",
      "summary": "OpenAI 推出 GPT-5,推理能力與多模態大幅提升...",
      "url": "https://openai.com/news/gpt-5",
      "image_url": "https://...",
      "published_at": "2026-05-26",
      "crawled_at": "2026-05-26T08:00:00Z"
    }
  ]
}
```

欄位約定：

| 欄位 | 說明 |
|------|------|
| `id` | `{lab}-{YYYYMMDD}-{url-slug}`,dedup 主鍵 |
| `lab` | `openai` / `anthropic` / `deepmind` |
| `title` | 原文標題（原文語言,通常英文） |
| `summary` | 1–2 句繁體中文摘要,由 agent 從內文生成 |
| `url` | canonical URL,移除 utm/ref/source 等 query string |
| `image_url` | 封面圖,抓不到就 `null` |
| `published_at` | `YYYY-MM-DD` |
| `crawled_at` | 本次 agent run 的時間,ISO8601 UTC |

排序：`articles` 永遠按 `published_at` 倒序,**最多保留 100 篇**,超過砍最舊的。

---

## 4. Scheduled Task = Claude Code agent

### 4.1 觸發

Cowork scheduled task,每 7 天一次,週一 08:00。

### 4.2 為什麼用 agent,不寫 Python 腳本

- 三家 blog HTML 結構各異且常改版,自然語言判斷比 CSS selector 穩
- Summary 生成需要 reasoning,agent 直接做掉,不用再外掛 LLM
- 去重不用算字串相似度,agent 看標題語意判斷
- 代價:每次 run 較貴較慢,但 7 天一次完全可接受

### 4.3 Agent prompt(直接拿去掛在 scheduled task)

```
你是 AI 趨勢追蹤系統的爬蟲 agent,每 7 天運行一次。

## 任務
從三家 blog 抓「上次爬蟲之後」新發佈的文章,合併進 GitHub 上的 queue.json。

來源:
- OpenAI:    https://openai.com/news/
- Anthropic: https://www.anthropic.com/news
- DeepMind:  https://deepmind.google/blog/

## 步驟

1. clone (或 pull) Raytengo/ai-research-data
2. 讀 data/queue.json,記下 meta.last_crawled
3. 對每個來源:
   a. WebFetch 該 blog 列表頁
   b. 解析所有文章卡片,取出 title / url / published_at / image_url
   c. 篩出 published_at > last_crawled 的
   d. 對每篇新文章再 WebFetch 它的 url,從內文生成 1–2 句繁體中文 summary
4. 去重:
   - 用 id 比對 queue.articles 是否已存在 → 已存在則略過
   - id 不同但標題明顯講同一件事 → 自行判斷,寧可保留也不要誤刪
5. 把通過的新文章 prepend 進 articles 陣列頭
6. 更新 meta.last_crawled 與 meta.total
7. 若 articles.length > 100,砍掉尾部最舊的
8. 寫回 data/queue.json,git add → commit → push
   - commit message 格式:`crawl: +N (openai:x, anthropic:y, deepmind:z)`

## 異常處理
- 某來源 fetch 失敗:log 後跳過,不影響其他兩家
- 全部 0 篇新文章:仍更新 last_crawled,但不要 commit 空 diff
- queue.json parse 失敗:停止,不要 push 壞掉的檔案
- git push 失敗:報錯後結束,下個週期會自動補上

## 成功標準
- 三個來源都被嘗試
- queue.json 仍是合法 JSON
- 新增文章欄位齊全
- git push 成功(或明確報告為何沒 push)
```

---

## 5. Widget(iPhone Scriptable)

### 5.1 行為

每次 widget 刷新時:

1. fetch `https://raw.githubusercontent.com/Raytengo/ai-research-data/main/data/queue.json`
2. 解析 articles 陣列
3. 顯示第一篇(最新):lab badge + title + summary + published_at + 可選 image
4. 點 widget → Safari 開原文 url
5. 不存任何狀態到雲端

### 5.2 「新文章」紅點(optional,純本地)

Scriptable 在 Keychain 存 `last_opened_at`。比這個時間更新的 `crawled_at` 在卡片右上角畫一個小紅點。本地行為,完全不寫回 GitHub。

### 5.3 多 lab 切換

iOS widget 不能放真按鈕。如果想看不同 lab 的最新,用 widget stack 上下滑(每個 widget 一家 lab,fetch 時 filter `lab` 欄位)。

---

## 6. Repo 結構

```
Raytengo/ai-research-data/    (public)
├── README.md                 # 一句話說明 + queue.json schema
└── data/
    └── queue.json
```

不放 scripts,不放 logs,不放 workflows。所有邏輯在 scheduled task 的 agent prompt 裡。

---

## 7. 實作優先級

### Phase 1(MVP,~1 週)

- [ ] `Raytengo/ai-research-data` repo 改成 public
- [ ] 把 §4.3 的 prompt 掛上 Cowork scheduled task,週期設 7 天
- [ ] 手動觸發一次,驗證 queue.json 產出正確、git push 成功
- [ ] 寫 Scriptable widget script(純展示版,fetch + 渲染)
- [ ] 砍掉舊的 `ai-research-newtab/` Chrome extension 與相關檔案

### Phase 2(之後再說,先別開工)

- like/dislike feedback 機制
- Agent + RL 偏好的個人化過濾
- Research papers / arXiv 來源
- 推播通知
- 動態調整爬蟲頻率

---

## 8. 已知未決問題

1. **電腦關機時 scheduled task 不會跑**。7–8 月 KKday 實習在台北 onsite,期間若電腦沒開,週期會跳過。可能解法:agent 啟動時檢查 `last_crawled` 距今 > 7 天就立刻補跑一次;或把 scheduled task 改成跑在常駐 server 上。
2. **OpenAI blog URL path**。早期是 `/blog/`,現在似乎遷到 `/news/`。第一次跑要確認 canonical path,寫進 prompt。
3. **Anthropic 沒官方 RSS、HTML 改版頻繁**。第一次 agent 跑完要人工檢查,確認解析沒漏。
4. **DeepMind blog 與 Google AI blog 的界線**。目前只抓 `deepmind.google/blog/`,如果 Gemini 相關公告會貼在 `blog.google` 則會漏。

---

## 附錄:對 v1 砍掉內容的存檔說明

以下 v1 章節在 v2 不再保留,理由如下:

- §3.2 `feedback.json` schema:沒 feedback 機制就不需要
- §6 手機小組件交互邏輯(按鈕、reactions):iOS widget 無真按鈕,且 MVP 不做反饋
- §7 雙向同步機制:單向流就沒衝突可言
- §8.2 Claude API 調用模式:整個工作改由 Claude Code agent run 完成,不另呼叫 API
- §9.3 GitHub PAT:public repo 不需要
- §10.2 監控指標:MVP 不做
- §11 未來擴展方向:全部進 v2 §7 Phase 2 列表

若日後需要把 feedback / personalization 加回來,從 v2 起重新討論架構,不要照 v1 直接拼回去。
