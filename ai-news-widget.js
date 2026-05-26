// ai-news-widget.js
// Scriptable widget for Ray's AI research news system (v2).
// Reads queue.json from public GitHub repo, renders one article card.
//
// Setup:
//   1. iPhone 上裝 Scriptable app
//   2. 在 Scriptable 裡 New Script,把整份貼進去,命名 "AI News"
//   3. 長按桌面 → 加 Scriptable widget(建議 medium 尺寸)
//   4. 編輯 widget → 選 "AI News" script
//   5. (選擇性) Widget Parameter 填 "openai" / "anthropic" / "deepmind"
//      不填 = 永遠顯示最新一篇

const RAW_URL = "https://raw.githubusercontent.com/Raytengo/ai-research-data/main/data/queue.json";

const LAB_COLORS = {
  openai: "#10A37F",
  anthropic: "#D97757",
  deepmind: "#4285F4",
};
const LAB_LABELS = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepmind: "DeepMind",
};

async function fetchQueue() {
  const req = new Request(RAW_URL);
  req.timeoutInterval = 10;
  return await req.loadJSON();
}

function pickArticle(articles, labFilter) {
  if (!articles || articles.length === 0) return null;
  if (labFilter) {
    return articles.find((a) => a.lab === labFilter.toLowerCase()) || null;
  }
  return articles[0];
}

function relativeDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const days = Math.floor((now - d) / 86400000);
  if (days <= 0) return "今天";
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  if (days < 30) return `${Math.floor(days / 7)} 週前`;
  return dateStr;
}

function buildErrorWidget(err) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0F0F10");
  w.setPadding(14, 14, 14, 14);
  const t = w.addText("讀取失敗");
  t.font = Font.boldSystemFont(14);
  t.textColor = new Color("#FF3B30");
  w.addSpacer(4);
  const e = w.addText(String(err).slice(0, 100));
  e.font = Font.systemFont(10);
  e.textColor = Color.gray();
  e.lineLimit = 3;
  return w;
}

function buildEmptyWidget(labFilter) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0F0F10");
  w.setPadding(14, 14, 14, 14);
  const t = w.addText(labFilter ? `${LAB_LABELS[labFilter] || labFilter} 暫無資料` : "暫無資料");
  t.font = Font.systemFont(13);
  t.textColor = Color.gray();
  return w;
}

function buildArticleWidget(article) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0F0F10");
  w.setPadding(14, 14, 14, 14);

  // Header: lab badge + date (right-aligned)
  const header = w.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const labBadge = header.addText(LAB_LABELS[article.lab] || article.lab.toUpperCase());
  labBadge.font = Font.boldSystemFont(11);
  labBadge.textColor = new Color(LAB_COLORS[article.lab] || "#999999");

  header.addSpacer();

  const date = header.addText(relativeDate(article.published_at));
  date.font = Font.systemFont(10);
  date.textColor = new Color("#888888");

  w.addSpacer(8);

  // Title
  const title = w.addText(article.title);
  title.font = Font.boldSystemFont(15);
  title.textColor = Color.white();
  title.lineLimit = 2;

  w.addSpacer(5);

  // Summary
  const summary = w.addText(article.summary || "");
  summary.font = Font.systemFont(12);
  summary.textColor = new Color("#C8C8C8");
  summary.lineLimit = 4;

  w.addSpacer();

  // Tap to open article
  w.url = article.url;

  return w;
}

async function run() {
  const labParam = (args.widgetParameter || "").trim() || null;

  let widget;
  try {
    const data = await fetchQueue();
    const article = pickArticle(data.articles || [], labParam);
    widget = article ? buildArticleWidget(article) : buildEmptyWidget(labParam);
  } catch (err) {
    widget = buildErrorWidget(err);
  }

  if (config.runsInWidget) {
    Script.setWidget(widget);
  } else {
    // Preview when running inside Scriptable app
    await widget.presentMedium();
  }
  Script.complete();
}

await run();
