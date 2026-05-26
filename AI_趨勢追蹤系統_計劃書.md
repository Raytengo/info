# AI 趨勢追蹤系統 - 詳細計劃書

## 1. 系統概述

**目標**：自動爬取 OpenAI、Anthropic、DeepMind 三家頭部 AI 實驗室的最新動態（博客、論文、公告），通過 GitHub 中轉，在手機上以卡片式小組件展示，支持用戶反饋（感興趣/不感興趣）。

**核心優勢**：
- 集中追蹤三大頭部實驗室
- 電腦端強力爬蟲 + AI 智能去重
- 手機端輕量級展示 + 人工反饋
- 七天雙向同步，保持數據新鮮度

---

## 2. 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│  (中央數據倉庫：存放爬蟲結果 + 用戶反饋)                      │
│                                                               │
│  ├─ data/                                                    │
│  │  ├─ queue.json          (待看文章隊列)                   │
│  │  └─ feedback.json       (用戶反饋記錄)                   │
│  └─ logs/                  (爬蟲執行日誌)                    │
└────────────┬──────────────────────────────┬─────────────────┘
             │                              │
             │ 推送更新                      │ 拉取反饋
             │ (7 天一次)                    │ (7 天一次)
             │                              │
      ┌──────▼──────┐                ┌─────▼────────┐
      │ 電腦端        │                │  手機端        │
      │ Scheduled    │                │  Scriptable  │
      │ Task         │                │  小組件       │
      │              │                │              │
      │ - 爬蟲引擎    │                │ - 卡片展示    │
      │ - 去重邏輯    │                │ - 輪流播放    │
      │ - AI 判決    │                │ - 用戶交互    │
      │ - Git Push   │                │ - Git Pull   │
      └──────────────┘                └──────────────┘
```

---

## 3. 數據結構設計

### 3.1 主隊列文件：`queue.json`

```json
{
  "meta": {
    "last_crawled": "2026-05-26T08:30:00Z",
    "last_synced_to_phone": "2026-05-20T10:15:00Z",
    "total_unseen": 12,
    "total_all_time": 127
  },
  
  "queue": [
    {
      "id": "openai_20260526_001",
      "title": "GPT-5 發佈公告",
      "summary": "首次介紹 GPT-5 的推理能力和多模態特性...",
      "url": "https://openai.com/blog/gpt-5/",
      "source": "openai_blog",
      "type": "blog",  // 或 "paper"、"announcement"
      "date": "2026-05-26",
      "crawled_at": "2026-05-26T08:30:00Z",
      "image_url": "https://...",  // 用於小組件展示（可選）
      "tags": ["reasoning", "multimodal"]  // 便於分類（可選）
    },
    {
      "id": "anthropic_20260525_arxiv_001",
      "title": "Constitutional AI at Scale: 200B Parameters",
      "summary": "探討如何在超大規模模型上實施憲法 AI 方法...",
      "url": "https://arxiv.org/abs/2605.xxxx",
      "source": "anthropic_research",
      "type": "paper",
      "date": "2026-05-25",
      "crawled_at": "2026-05-25T14:20:00Z",
      "tags": ["constitutional-ai", "training"]
    },
    {
      "id": "deepmind_20260524_blog_001",
      "title": "Gato 架構的新進展",
      "summary": "統一模型框架在多任務學習中的最新突破...",
      "url": "https://deepmind.google/blog/...",
      "source": "deepmind_blog",
      "type": "blog",
      "date": "2026-05-24",
      "crawled_at": "2026-05-24T09:45:00Z"
    }
  ],
  
  "history": [
    {
      "id": "openai_20260520_001",
      "title": "DALL-E 4 多語言支持",
      "status": "liked",  // "liked" | "disliked" | "seen"
      "user_action_at": "2026-05-21T11:30:00Z"
    },
    {
      "id": "anthropic_20260519_001",
      "title": "Claude 安全研究更新",
      "status": "disliked",
      "user_action_at": "2026-05-19T15:00:00Z"
    }
  ]
}
```

### 3.2 用戶反饋同步文件：`feedback.json`

```json
{
  "last_synced_from_phone": "2026-05-20T10:15:00Z",
  
  "actions": [
    {
      "article_id": "openai_20260526_001",
      "action": "liked",
      "timestamp": "2026-05-26T14:22:00Z"
    },
    {
      "article_id": "anthropic_20260525_arxiv_001",
      "action": "disliked",
      "timestamp": "2026-05-26T12:15:00Z"
    }
  ],
  
  "statistics": {
    "total_liked": 23,
    "total_disliked": 8,
    "total_seen": 45,
    "preference": {
      "openai": { "liked": 10, "disliked": 2 },
      "anthropic": { "liked": 8, "disliked": 4 },
      "deepmind": { "liked": 5, "disliked": 2 }
    }
  }
}
```

---

## 4. 爬蟲模塊設計

### 4.1 爬蟲源定義

#### **OpenAI**
- **博客**：https://openai.com/blog/ 
  - 視覺化提取：標題、發佈日期、摘要、封面圖、文章鏈接
- **更新頻率**：每週 1-3 篇平均

#### **Anthropic**
- **博客**：https://www.anthropic.com/blog
  - 視覺化提取：標題、發佈日期、摘要、文章鏈接
- **更新頻率**：每週 1-2 篇平均

#### **DeepMind**
- **博客**：https://www.deepmind.google/blog/
  - 視覺化提取：標題、發佈日期、摘要、文章鏈接
- **更新頻率**：每週 1-2 篇平均

### 4.2 爬蟲邏輯流程（Claude Code 視覺化方式）

```
Scheduled Task 啟動爬蟲
  ↓
Claude Code 啟動瀏覽器
  ↓
[OpenAI 博客頁面]
  ├─ 打開 https://openai.com/blog/
  ├─ 截圖 + 視覺化 Claude 讀取頁面
  ├─ 識別所有博客文章卡片
  ├─ 提取：
  │  ├─ title（文章標題）
  │  ├─ date（發佈日期）
  │  ├─ summary（摘要文本）
  │  ├─ url（文章鏈接）
  │  └─ image_url（封面圖）
  └─ 只提取本週新文章（與上次爬蟲日期對比）
  ↓
[Anthropic 博客頁面]
  ├─ 打開 https://www.anthropic.com/blog
  ├─ 截圖 + 視覺化 Claude 讀取頁面
  ├─ 識別所有博客文章卡片
  ├─ 提取：title、date、summary、url
  └─ 只提取本週新文章
  ↓
[DeepMind 博客頁面]
  ├─ 打開 https://www.deepmind.google/blog/
  ├─ 截圖 + 視覺化 Claude 讀取頁面
  ├─ 識別所有博客文章卡片
  ├─ 提取：title、date、summary、url
  └─ 只提取本週新文章
  ↓
合併去重（交給 Claude 本地判決）
  ├─ 將三個來源的新文章合併
  ├─ Claude 讀取現有 queue.json，逐一比對
  │  - 檢查 URL 是否完全相同
  │  - 檢查標題 / 摘要是否語義相同
  │  - 去除重複項
  └─ 生成去重後的新增文章列表
  ↓
更新 queue.json
  ├─ 新增文章 (prepend 到 queue 陣列頭部)
  ├─ 保留舊文章 (已看過但未刪除的保留在 history)
  └─ 更新 meta.last_crawled
  ↓
提交到 GitHub
  ├─ git add queue.json
  ├─ git commit -m "周期爬蟲: 新增 X 篇 (OpenAI: x, Anthropic: y, DeepMind: z)"
  └─ git push
  ↓
完成（Claude Code 進程結束）
```

---

## 5. Scheduled Task 工作流程

### 5.1 電腦端 Scheduled Task（七天週期）

**觸發時機**：每 7 天一次（比如每週一早上 8 點）

**工作流程**：

```
Scheduled Task 啟動
  ↓
[階段 1] 爬蟲並去重
  ├─ 執行上述爬蟲邏輯
  ├─ 調用 Claude API 進行智能去重
  └─ 生成新的 queue.json
  ↓
[階段 2] 拉取用戶反饋
  ├─ git pull (獲取手機最新反饋)
  ├─ 解析 feedback.json 中的新反饋
  └─ 將反饋記錄合併到 queue.json 的 history
  ↓
[階段 3] 數據持久化
  ├─ 更新 queue.json (新文章 + 反饋歷史)
  ├─ 清理 feedback.json (已同步的反饋標記為已處理)
  └─ 生成爬蟲日誌 (logs/crawl_YYYYMMDD.log)
  ↓
[階段 4] Git 提交
  ├─ git add queue.json feedback.json logs/
  ├─ git commit -m "周期同步: 爬蟲結果 + 反饋合併"
  └─ git push
  ↓
完成，等待 7 天後下一個週期
```

### 5.2 Claude Code Scheduled Task 的提示詞框架

```
提示詞結構：
1. 背景：AI 趨勢追蹤系統，需要定期爬取三家頭部實驗室新聞
2. 任務：
   - 打開瀏覽器，逐個訪問 OpenAI、Anthropic、DeepMind 官方博客
   - 視覺化截圖 + 讀取頁面，手動提取本週新文章
   - 提取字段：標題、摘要、URL、日期、來源
   - 讀取現有 queue.json，進行去重判決（比對 URL、標題、摘要）
   - 生成新 queue.json，推送到 GitHub
3. 工具：
   - 瀏覽器（Chrome 或 Safari）
   - Claude 視覺化內容理解（截圖 → 提取信息）
   - Git CLI（提交到 GitHub）
   - 文件系統（讀寫 JSON）
4. 成功標準：
   - 三個官網都被訪問並截圖
   - 新文章被正確視覺化提取（無遺漏）
   - 去重邏輯正確執行
   - 用戶反饋被正確合併
   - Git 提交成功
```

---

## 6. 手機小組件交互邏輯

### 6.1 小組件工作流程

```
Scriptable 小組件啟動
  ↓
[階段 1] 數據拉取
  ├─ 檢查網絡連接
  ├─ git pull (獲取最新 queue.json)
  ├─ 解析 JSON
  └─ 篩選未看過的文章
  ↓
[階段 2] 展示當前卡片
  ├─ 取 queue 的第一篇未看文章
  ├─ 展示：
  │  ├─ 標題（粗體，2 行）
  │  ├─ 摘要（1-2 行）
  │  ├─ 來源 + 日期（小字）
  │  └─ 縮略圖（如有）
  └─ 渲染小組件
  ↓
[階段 3] 用戶交互
  ├─ ◀ 上一篇
  ├─ ▶ 下一篇
  ├─ ❤️ 感興趣 (liked)
  ├─ 👎 不感興趣 (disliked)
  └─ 🔗 點擊標題跳轉到原文
  ↓
[階段 4] 反饋記錄
  ├─ 用戶動作被記錄到本地 JSON
  ├─ 記錄內容：
  │  {
  │    "article_id": "xxx",
  │    "action": "liked|disliked|seen",
  │    "timestamp": "ISO 8601"
  │  }
  └─ 待 7 天週期同步時提交到 GitHub
  ↓
完成，用戶可繼續滑動或關閉
```

### 6.2 小組件交互細節

| 操作 | 行為 | 數據記錄 |
|------|------|--------|
| **❤️ 感興趣** | 記錄喜歡，跳轉到下一篇 | `action: "liked"` |
| **👎 不感興趣** | 記錄不喜歡，跳轉到下一篇 | `action: "disliked"` |
| **▶ 下一篇** | 滑動到下一篇（不記錄） | 無記錄 |
| **◀ 上一篇** | 滑動到上一篇（不記錄） | 無記錄 |
| **點擊標題** | 用 Safari 打開原文 URL | 標記為 `"seen"` |
| **小組件刷新** | 重新拉取 GitHub 最新數據 | `last_synced_to_phone` 更新 |

---

## 7. 七天雙向同步機制

### 7.1 同步時間表

```
Day 1 (Monday 8:00 AM) ─────── Scheduled Task 執行
  ├─ 爬蟲三家官網
  ├─ 去重（Claude 判決）
  ├─ 拉取手機反饋（feedback.json）
  ├─ 合併反饋到 history
  └─ Git Push 新 queue.json

Day 2-6: 用戶在手機上瀏覽和反饋
  ├─ 每天早上手動刷新或自動刷新小組件
  ├─ 反饋記錄在手機本地

Day 7 (Sunday 23:59) ──────── 手動同步（或在下週一自動）
  ├─ 手機 Scriptable 執行 Git Push
  │  └─ 將 feedback.json 推送到 GitHub
  └─ 等待下週一的 Scheduled Task

Day 8 (Monday 8:00 AM) ─────── 下一個週期開始
```

### 7.2 衝突解決策略

| 場景 | 策略 |
|------|------|
| 同一篇文章在電腦和手機都有反饋 | 取最新的時間戳（timestamp 較晚的） |
| Scheduled Task 運行時用戶在手機反饋 | Scheduled Task 會拉取最新反饋，不會覆蓋 |
| 網絡中斷導致 git push 失敗 | 重試機制：等待下一週期再同步 |

---

## 8. 去重和智能決策流程

### 8.1 去重規則（交給 Claude）

Claude 將分析以下維度，判斷兩篇文章是否相同：

```
輸入：
- 新文章：{ title, summary, url, date, source }
- 現有隊列：[已有的所有文章]

分析維度：
1. URL 完全相同 → 必定重複
2. 標題語義相似（>80%） + 日期接近（<3 天）→ 可能重複
3. 摘要涵蓋相同核心概念 → 可能是同一事件的不同報導
4. 來源和日期 → 上下文判斷

輸出：
- 重複評分（0-100）
- 推薦判決（duplicate / unique）
- 原因說明（給人看）
```

### 8.2 Claude API 調用模式

```
系統提示：
"你是 AI 趨勢去重專家。分析新爬取的文章是否與現有隊列重複。"

用戶提示：
"新文章：
  Title: 'GPT-5: Enhanced Reasoning'
  Summary: '我們推出 GPT-5，具備更強的推理能力...'
  URL: openai.com/blog/gpt-5
  Date: 2026-05-26
  
現有隊列中的候選：
  1. Title: 'OpenAI 發佈新模型'
     Summary: 'OpenAI 今日宣佈推出最新的...'
     Date: 2026-05-26
  2. Title: 'GPT-5 技術突破'
     ...
     
判斷哪些是重複？"

返回：JSON 格式的去重結果
```

---

## 9. 系統依賴和工具清單

### 9.1 電腦端
- **Claude Code**：本地 CLI 工具（打開瀏覽器、視覺化提取信息）
- **Git**：`git` CLI（GitHub 操作）
- **Scheduled Task**：Cowork 的 scheduled task（定時觸發 Claude Code）
- **依賴**：
  - 瀏覽器（Chrome / Safari）
  - Claude 本地推理能力（視覺化內容理解）

### 9.2 手機端
- **平台**：iOS（Scriptable 應用）
- **Scriptable 庫**：
  - `URLSession`（網絡請求）
  - `FileManager`（本地文件存儲）
  - `JSON`（JSON 解析）
  - `WidgetKit`（小組件 UI）

### 9.3 數據中轉
- **GitHub**：
  - 倉庫：`Raytengo/ai-research-data`（假設）
  - 文件：`data/queue.json`、`data/feedback.json`、`logs/`
  - 認證：GitHub Personal Access Token（PAT）

---

## 10. 邊界情況和異常處理

### 10.1 異常場景

| 場景 | 處理方式 |
|------|--------|
| 爬蟲失敗（網絡中斷） | 記錄日誌，跳過本週期，等待下週 |
| Claude API 調用失敗 | 所有新文章標記為 `unreviewed`，下次補去重 |
| GitHub 連接失敗 | 本地緩存結果，待網絡恢復後重試 |
| 手機本地存儲滿了 | 自動刪除最早的反饋記錄，保留最近 100 個 |
| 文章 URL 失效 | 保留文章記錄，點擊時提示「原文已刪除」 |
| 小組件超時（>30s） | 顯示緩存的上一次數據，後台重新拉取 |

### 10.2 監控指標

記錄以下指標到日誌，便於調試：

```
- 爬蟲成功率（每個來源）
- 去重決策耗時
- 新增文章數（來源分佈）
- 用戶反饋率（liked / disliked / seen）
- 小組件同步成功率
```

---

## 11. 未來擴展方向

1. **更多來源**：Google DeepMind 之外，加入 Meta AI、Microsoft Research、Tesla AI 等
2. **智能排序**：根據用戶的 liked/disliked 歷史，用推薦算法調整展示順序
3. **分類標籤**：自動給文章打標籤（「推理能力」「安全對齊」「多模態」），便於篩選
4. **摘要生成**：用 Claude 自動生成更精煉的摘要（如果爬到的摘要太長）
5. **通知推送**：重要文章發佈時主動推送給用戶
6. **數據可視化**：展示趨勢統計（哪個實驗室發佈最頻繁、用戶最感興趣的主題等）

---

## 12. 實現優先級

### Phase 1（核心系統，1-2 週）
- [ ] 定義 queue.json 和 feedback.json 結構
- [ ] 編寫爬蟲邏輯（三個官網）
- [ ] 集成 Claude API 去重
- [ ] 實現 Scheduled Task（七天一次）
- [ ] Scriptable 基礎小組件（展示 + 切換）

### Phase 2（完善反饋機制，1 週）
- [ ] 實現手機反饋記錄（liked / disliked）
- [ ] 七天同步機制（手機 ↔ GitHub）
- [ ] 衝突解決邏輯

### Phase 3（優化和擴展，持續）
- [ ] 性能優化（減少數據拉取量）
- [ ] UI 改進（美化卡片、字體大小等）
- [ ] 新增功能（分類、搜索、統計等）

---

## 附錄 A：GitHub 倉庫結構

```
ai-research-data/
├── README.md
├── data/
│  ├── queue.json          # 主隊列文件
│  ├── feedback.json       # 反饋文件
│  └── sources.json        # 爬蟲源配置（URLs 等）
├── logs/
│  ├── crawl_20260526.log
│  ├── crawl_20260519.log
│  └── ...
├── scripts/
│  ├── crawler.py          # 爬蟲主邏輯（可選，供參考）
│  └── deduplication.py    # 去重邏輯（可選，供參考）
└── .gitignore
```

---

## 附錄 B：Scheduled Task 提示詞模板

```
【系統背景】
你是 AI 趨勢追蹤系統的爬蟲管理員。每七天執行一次定期爬蟲任務，
目標是從 OpenAI、Anthropic、DeepMind 三家實驗室的官方博客爬取最新文章，
通過視覺化方式提取內容，存儲到 GitHub 倉庫供手機小組件展示。

【具體任務】

1. 打開瀏覽器並訪問 OpenAI 官方博客
   - URL: https://openai.com/blog/
   - 截圖整個頁面
   - 視覺化識別所有博客文章卡片
   - 從本週（相對於上次爬蟲時間）新發佈的文章中提取：
     * title: 文章標題
     * date: 發佈日期（格式：YYYY-MM-DD）
     * summary: 文章摘要（1-2 句）
     * url: 完整文章鏈接
     * image_url: 封面圖鏈接（如果有）
   - 按發佈時間排序（最新優先）

2. 打開瀏覽器並訪問 Anthropic 官方博客
   - URL: https://www.anthropic.com/blog
   - 截圖整個頁面
   - 視覺化識別所有博客文章卡片
   - 提取本週新發佈的文章（字段同上，無 image_url）
   - 按發佈時間排序

3. 打開瀏覽器並訪問 DeepMind 官方博客
   - URL: https://www.deepmind.google/blog/
   - 截圖整個頁面
   - 視覺化識別所有博客文章卡片
   - 提取本週新發佈的文章（字段同上）
   - 按發佈時間排序

4. 去重判決（本地進行，不調用 API）
   - 讀取 GitHub 上現有的 data/queue.json
   - 逐一比對新提取的文章：
     * 檢查 URL：完全相同 → 必定重複，標記為去除
     * 檢查標題：完全相同或高度相似（>90%） → 很可能重複
     * 檢查摘要：涵蓋相同核心概念 + 日期接近（<2 天）→ 可能重複
     * 判決原則：寧可保留，不要誤刪（用戶可手動標記不感興趣）
   - 輸出：去重後的新增文章列表

5. 合併用戶反饋
   - 讀取 GitHub 上的 data/feedback.json
   - 識別過去 7 天內新增的反饋記錄（liked/disliked/seen）
   - 更新 queue.json 中對應文章的狀態

6. 更新並提交到 GitHub
   - 用新增文章 + 反饋更新 data/queue.json
   - 清空或備份 data/feedback.json（標記已同步）
   - 執行 Git 操作：
     * git pull origin main（確保最新）
     * git add data/queue.json data/feedback.json
     * git commit -m "周期爬蟲: 新增 X 篇文章 (OpenAI: x, Anthropic: y, DeepMind: z)"
     * git push origin main

【數據格式示例】
新提取的文章列表（JSON 格式）：
[
  {
    "source": "openai_blog",
    "title": "GPT-5: Next Generation Reasoning",
    "summary": "We introduce GPT-5 with enhanced reasoning...",
    "url": "https://openai.com/blog/gpt-5",
    "date": "2026-05-26",
    "image_url": "https://..."
  },
  {
    "source": "anthropic_blog",
    "title": "Constitutional AI at Scale",
    "summary": "Scaling constitutional AI methods...",
    "url": "https://www.anthropic.com/blog/...",
    "date": "2026-05-25"
  }
]

【成功標準】
✓ 三個官網都被成功訪問並截圖
✓ 新文章視覺化提取無遺漏（標題、摘要、URL、日期都正確）
✓ 去重邏輯正確執行（無誤刪、無漏刪）
✓ 用戶反饋被正確合併
✓ queue.json 結構正確，無 JSON 格式錯誤
✓ GitHub 提交成功（git log 能看到本次提交）

【失敗處理】
✗ 網頁加載失敗 → 重試一次，若仍失敗則記錄日誌，跳過該源
✗ 視覺化提取不完整 → 記錄未提取的文章列表，供人工檢查
✗ 去重判決不確定 → 傾向保留（寧可多一個重複，不要漏一篇新文章）
✗ Git 提交失敗 → 記錄詳細錯誤信息，等待人工排查
```

---

## 總結

這個系統的核心思路是：

1. **電腦端** 每週爬一次，用 Claude 智能去重，保證內容質量
2. **GitHub** 作為中轉站，同時存儲爬蟲結果和用戶反饋
3. **手機端** 輕量級展示，用戶反饋存本地，定期同步
4. **七天週期** 平衡新鮮度和系統負擔

實現後，你就能在手機上看到全球頭部 AI 實驗室的最新動態，並通過「感興趣」「不感興趣」的反饋，幫助系統越來越了解你的偏好。

