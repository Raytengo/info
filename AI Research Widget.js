// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: brain;
/********************************************
 *         AI RESEARCH NEWS WIDGET          *
 *   Data: Raytengo/info queue.json         *
 *   Based on News Widget by @saudumm       *
 ********************************************

 Widget Parameter (long-press → Edit Widget):
   openai    → only OpenAI
   anthropic → only Anthropic
   deepmind  → only DeepMind
   nvidia    → only NVIDIA
   (empty)   → all labs, time-rotated
*/

/* ============ CONFIG ============ */

const QUEUE_URL = "https://raw.githubusercontent.com/Raytengo/info/master/queue.json";
const PAGE_URL  = "https://raytengo.github.io/info/";  // 點擊跳轉的網頁；帶 ?a=<id> 直接開該篇

// Minutes each article stays on screen before rotating to the next.
// Note: iOS decides how often a home-screen widget actually refreshes (often
// not every minute, whatever this is). We hint iOS via refreshAfterDate below,
// but a true 1-minute cadence is best-effort, not guaranteed by the OS.
const ROTATION_MINUTES = 1;

// Widget only shows articles from the last N days (rolling window).
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;  // 兩週

const LAB_COLORS  = { openai: "#10A37F", anthropic: "#CC785C", deepmind: "#4285F4", nvidia: "#76B900" };
const LAB_LABELS  = { openai: "OpenAI",  anthropic: "Anthropic", deepmind: "DeepMind", nvidia: "NVIDIA" };

var LAB_FILTER = "";   // set via widget parameter

/* ================================ */

const ONLINE = await isOnline();
var WIDGET_SIZE = config.runsInWidget ? config.widgetFamily : "medium";

if (args.widgetParameter) {
  const p = args.widgetParameter.trim().toLowerCase();
  if (LAB_COLORS[p]) { LAB_FILTER = p; }
}

await checkCacheDir();
await cleanUpCache();

if (config.runsInApp) {
  await showNewsList();
  return;
}

const widget = await buildWidget();
if (!config.runsInWidget) {
  if (WIDGET_SIZE === "small")       { await widget.presentSmall(); }
  else if (WIDGET_SIZE === "large")  { await widget.presentLarge(); }
  else                               { await widget.presentMedium(); }
}
Script.setWidget(widget);
Script.complete();

/* ============ BUILD WIDGET ============ */

async function buildWidget() {
  const articles = await fetchArticles();
  const article  = pickArticle(articles);

  const w = new ListWidget();
  w.setPadding(16, 18, 16, 18);
  w.refreshAfterDate = new Date(Date.now() + ROTATION_MINUTES * 60 * 1000);  // 請 iOS 盡快再刷新（盡力，非保證）
  w.url = article ? PAGE_URL + "?a=" + encodeURIComponent(article.id) : PAGE_URL;

  if (!article) { return renderError(w); }

  setBackground(w, article.lab);

  const size = WIDGET_SIZE;

  if (size === "small") {
    buildSmall(w, article, articles.length);
  } else if (size === "large") {
    buildLarge(w, article, articles.length);
  } else {
    buildMedium(w, article, articles.length);
  }

  return w;
}

// ── Small: lab badge + title only (no summary) ──
function buildSmall(w, article, total) {
  addHeader(w, article, total, 11);
  w.addSpacer();

  const title = w.addText(article.title);
  title.font = Font.boldSystemFont(14);
  title.textColor = Color.dynamic(new Color("#000000"), new Color("#f2f2f7"));
  title.lineLimit = 4;
  title.minimumScaleFactor = 0.8;

  w.addSpacer();
  addDate(w, article.published_at, 11);
}

// ── Medium: lab badge + title + summary ──
function buildMedium(w, article, total) {
  addHeader(w, article, total, 11);
  w.addSpacer();

  const title = w.addText(article.title);
  title.font = Font.boldSystemFont(15);
  title.textColor = Color.dynamic(new Color("#000000"), new Color("#f2f2f7"));
  title.lineLimit = 3;
  title.minimumScaleFactor = 0.85;

  if (article.summary) {
    w.addSpacer(5);
    const summary = w.addText(article.summary);
    summary.font = Font.systemFont(12);
    summary.textColor = Color.dynamic(new Color("#3c3c43", 0.6), new Color("#ebebf5", 0.6));
    summary.lineLimit = 2;
  }

  w.addSpacer();
  addDate(w, article.published_at, 11);
}

// ── Large: lab badge + title + full detail ──
function buildLarge(w, article, total) {
  addHeader(w, article, total, 12);
  w.addSpacer(6);

  const title = w.addText(article.title);
  title.font = Font.boldSystemFont(20);
  title.textColor = Color.dynamic(new Color("#000000"), new Color("#f2f2f7"));
  title.lineLimit = 3;
  title.minimumScaleFactor = 0.85;

  const content = article.detail || article.summary || "";
  if (content) {
    w.addSpacer(8);
    const detail = w.addText(content);
    detail.font = Font.systemFont(15);
    detail.textColor = Color.dynamic(new Color("#3c3c43", 0.75), new Color("#ebebf5", 0.75));
    detail.lineLimit = 15;
    detail.minimumScaleFactor = 0.75;
  }

  w.addSpacer(4);
  addDate(w, article.published_at, 11);
}

// ── Shared helpers ──

function addHeader(w, article, total, fontSize) {
  const labColor = new Color(LAB_COLORS[article.lab] || "#8a8a8d");
  const labLabel = LAB_LABELS[article.lab] || article.lab.toUpperCase();

  const row = w.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();

  // Lab badge pill
  const badge = row.addStack();
  badge.layoutHorizontally();
  badge.centerAlignContent();
  badge.backgroundColor = new Color(LAB_COLORS[article.lab] || "#8a8a8d", 0.15);
  badge.cornerRadius = 5;
  badge.setPadding(3, 7, 3, 7);

  const dotCtx = new DrawContext();
  dotCtx.size = new Size(6, 6);
  dotCtx.opaque = false;
  dotCtx.setFillColor(labColor);
  dotCtx.fillEllipse(new Rect(0, 0, 6, 6));
  const dot = badge.addImage(dotCtx.getImage());
  dot.imageSize = new Size(6, 6);
  badge.addSpacer(5);

  const label = badge.addText(labLabel);
  label.font = Font.semiboldSystemFont(fontSize);
  label.textColor = labColor;

  row.addSpacer();

  // Counter + offline icon
  if (total > 1) {
    const idx = currentIndex(total);
    const counter = row.addText(`${idx + 1} / ${total}`);
    counter.font = Font.mediumSystemFont(fontSize);
    counter.textColor = Color.dynamic(new Color("#8a8a8d"), new Color("#636366"));
  }

  if (!ONLINE) {
    row.addSpacer(5);
    const sym = SFSymbol.named("icloud.slash");
    sym.applyFont(Font.systemFont(fontSize));
    const icon = row.addImage(sym.image);
    icon.imageSize = new Size(fontSize, fontSize);
    icon.tintColor = Color.dynamic(new Color("#8a8a8d"), new Color("#636366"));
  }
}

function addDate(w, dateStr, fontSize) {
  const t = w.addText(formatDate(dateStr));
  t.font = Font.mediumSystemFont(fontSize);
  t.textColor = Color.dynamic(new Color("#8a8a8d"), new Color("#636366"));
}

function setBackground(w, lab) {
  const grad = new LinearGradient();
  grad.locations = [0, 1];
  grad.colors = [
    Color.dynamic(new Color("#f2f2f7"), new Color("#111111")),
    Color.dynamic(
      new Color(LAB_COLORS[lab] || "#333333", 0.08),
      new Color(LAB_COLORS[lab] || "#333333", 0.20)
    ),
  ];
  w.backgroundGradient = grad;
}

function renderError(w) {
  w.backgroundColor = new Color("#1c1c1e");
  w.addSpacer();
  const t = w.addText("資料載入失敗");
  t.font = Font.mediumSystemFont(14);
  t.textColor = new Color("#636366");
  t.centerAlignText();
  w.addSpacer();
  return w;
}

/* ============ NEWS LIST (in-app) ============ */

async function showNewsList() {
  const articles = await fetchArticles();

  const table = new UITable();
  table.showSeparators = true;

  // Header
  const header = new UITableRow();
  header.isHeader = true;
  header.height = 50;
  const headerCell = header.addText("AI Research News");
  headerCell.titleFont = Font.boldSystemFont(18);
  table.addRow(header);

  if (!articles || articles.length === 0) {
    const r = new UITableRow();
    r.height = 60;
    const c = r.addText("資料載入失敗", "請確認網路連線後重試");
    c.titleColor = new Color("#8a8a8d");
    table.addRow(r);
    await table.present(false);
    return;
  }

  const LAB_EMOJI = { openai: "🟢", anthropic: "🟠", deepmind: "🔵", nvidia: "🟩" };

  for (const a of articles) {
    const row = new UITableRow();
    row.height = 80;
    row.dismissOnSelect = false;
    row.onSelect = () => { Safari.open(PAGE_URL + "?a=" + encodeURIComponent(a.id)); };

    const emoji = LAB_EMOJI[a.lab] || "⚪";
    const label = LAB_LABELS[a.lab] || a.lab;
    const date  = formatDate(a.published_at);

    const cell = row.addText(a.title, `${emoji} ${label}  ·  ${date}`);
    cell.titleFont    = Font.semiboldSystemFont(15);
    cell.subtitleFont = Font.systemFont(12);
    cell.subtitleColor = new Color("#8a8a8d");

    table.addRow(row);
  }

  await table.present(false);
}

/* ============ DATA ============ */

async function fetchArticles() {
  try {
    const fm        = FileManager.local();
    const cacheFile = fm.joinPath(fm.documentsDirectory()+"/ai-widget-cache", "queue.json");

    let data;
    if (ONLINE) {
      data = await new Request(QUEUE_URL).loadJSON();
      fm.writeString(cacheFile, JSON.stringify(data));
    } else if (fm.fileExists(cacheFile)) {
      data = JSON.parse(fm.readString(cacheFile));
    } else {
      return [];
    }

    let articles = data.articles || [];

    if (LAB_FILTER) {
      articles = articles.filter(a => a.lab === LAB_FILTER);
    }

    // Widget shows the last two weeks' news; the webpage shows the whole month
    // (queue.json holds the month, the widget filters it down).
    const now    = Date.now();
    const recent = articles.filter(a => (now - new Date(a.published_at).getTime()) <= WINDOW_MS);
    // Fallback: if a quiet fortnight has no articles, show everything rather than an empty widget.
    articles = recent.length ? recent : articles;

    articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    return articles;

  } catch(err) {
    logError("fetchArticles: " + err);
    return [];
  }
}

function pickArticle(articles) {
  if (!articles || articles.length === 0) { return null; }
  return articles[currentIndex(articles.length)];
}

// Deterministic index based on current time slot
function currentIndex(total) {
  const slot = Math.floor(Date.now() / (ROTATION_MINUTES * 60 * 1000));
  return slot % total;
}

/* ============ UTILS ============ */

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString(["zh-TW"], {
      year: "numeric", month: "2-digit", day: "2-digit"
    });
  } catch(e) {
    return dateStr;
  }
}

async function isOnline() {
  const view = new WebView();
  return await view.evaluateJavaScript("navigator.onLine");
}

function checkCacheDir() {
  const fm  = FileManager.local();
  const dir = fm.joinPath(fm.documentsDirectory(), "ai-widget-cache");
  if (!fm.fileExists(dir)) { fm.createDirectory(dir, true); }
}

function cleanUpCache() {
  const fm  = FileManager.local();
  const dir = fm.joinPath(fm.documentsDirectory(), "ai-widget-cache");
  if (!fm.fileExists(dir)) { return; }
  for (const name of fm.listContents(dir)) {
    const path  = fm.joinPath(dir, name);
    const hours = Math.round((Date.now() - fm.creationDate(path)) / 3600000);
    if (Math.abs(hours) > 2) { fm.remove(path); }
  }
}
