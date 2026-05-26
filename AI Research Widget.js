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
   (empty)   → all labs, time-rotated
*/

/* ============ CONFIG ============ */

const QUEUE_URL = "https://raw.githubusercontent.com/Raytengo/info/master/queue.json";

// Minutes each article stays on screen before rotating to the next
const ROTATION_MINUTES = 5;

const LAB_COLORS  = { openai: "#10A37F", anthropic: "#CC785C", deepmind: "#4285F4" };
const LAB_LABELS  = { openai: "OpenAI",  anthropic: "Anthropic", deepmind: "DeepMind" };

var LAB_FILTER = "";   // set via widget parameter

/* ================================ */

const ONLINE = await isOnline();

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
if (!config.runsInWidget) { await widget.presentMedium(); }
Script.setWidget(widget);
Script.complete();

/* ============ BUILD WIDGET ============ */

async function buildWidget() {
  const articles = await fetchArticles();

  // Pick article by time slot
  const article = pickArticle(articles);

  const w = new ListWidget();
  w.setPadding(16, 18, 16, 18);

  if (!article) {
    return renderError(w);
  }

  const labColor = new Color(LAB_COLORS[article.lab] || "#8a8a8d");
  const labLabel = LAB_LABELS[article.lab] || article.lab.toUpperCase();

  // --- Background: dark with subtle lab-color tint at bottom ---
  const grad = new LinearGradient();
  grad.locations = [0, 1];
  grad.colors = [
    Color.dynamic(new Color("#f2f2f7"), new Color("#111111")),
    Color.dynamic(
      new Color(LAB_COLORS[article.lab] || "#333333", 0.08),
      new Color(LAB_COLORS[article.lab] || "#333333", 0.18)
    ),
  ];
  w.backgroundGradient = grad;

  // --- Row 1: header (lab badge + article counter) ---
  const headerStack = w.addStack();
  headerStack.layoutHorizontally();
  headerStack.centerAlignContent();

  // Lab badge: colored pill
  const badge = headerStack.addStack();
  badge.layoutHorizontally();
  badge.centerAlignContent();
  badge.backgroundColor = new Color(LAB_COLORS[article.lab] || "#8a8a8d", 0.15);
  badge.cornerRadius = 5;
  badge.setPadding(3, 7, 3, 7);

  const dotCtx = new DrawContext();
  dotCtx.size = new Size(7, 7);
  dotCtx.opaque = false;
  dotCtx.setFillColor(labColor);
  dotCtx.fillEllipse(new Rect(0, 0, 7, 7));
  const dotImg = badge.addImage(dotCtx.getImage());
  dotImg.imageSize = new Size(7, 7);
  badge.addSpacer(5);

  const badgeText = badge.addText(labLabel);
  badgeText.font = Font.semiboldSystemFont(11);
  badgeText.textColor = labColor;

  headerStack.addSpacer();

  // Article counter (e.g. "3 / 9")
  if (articles && articles.length > 1) {
    const idx = currentIndex(articles.length);
    const counter = headerStack.addText(`${idx + 1} / ${articles.length}`);
    counter.font = Font.mediumSystemFont(11);
    counter.textColor = Color.dynamic(new Color("#8a8a8d"), new Color("#636366"));
  }

  // Offline indicator
  if (!ONLINE) {
    headerStack.addSpacer(6);
    const sym = SFSymbol.named("icloud.slash");
    sym.applyFont(Font.systemFont(11));
    const offlineIcon = headerStack.addImage(sym.image);
    offlineIcon.imageSize = new Size(13, 13);
    offlineIcon.tintColor = Color.dynamic(new Color("#8a8a8d"), new Color("#636366"));
  }

  w.addSpacer();

  // --- Row 2: Article title ---
  const titleText = w.addText(article.title);
  titleText.font = Font.boldSystemFont(16);
  titleText.textColor = Color.dynamic(new Color("#000000"), new Color("#f2f2f7"));
  titleText.minimumScaleFactor = 0.8;
  titleText.lineLimit = 3;

  // --- Row 3: Summary (if available) ---
  if (article.summary && article.summary.length > 0) {
    w.addSpacer(6);
    const summaryText = w.addText(article.summary);
    summaryText.font = Font.systemFont(12);
    summaryText.textColor = Color.dynamic(new Color("#3c3c43", 0.6), new Color("#ebebf5", 0.6));
    summaryText.lineLimit = 3;
    summaryText.minimumScaleFactor = 0.85;
  }

  w.addSpacer();

  // --- Row 4: Date ---
  const dateStr = formatDate(article.published_at);
  const footerText = w.addText(dateStr);
  footerText.font = Font.mediumSystemFont(11);
  footerText.textColor = Color.dynamic(new Color("#8a8a8d"), new Color("#636366"));

  // Tap → open Scriptable app to show full news list
  const scriptName = encodeURIComponent(Script.name());
  w.url = `scriptable:///run?scriptName=${scriptName}`;

  return w;
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

  // Header row
  const header = new UITableRow();
  header.isHeader = true;
  header.height = 44;
  const headerCell = header.addText("AI Research News");
  headerCell.titleFont = Font.boldSystemFont(17);
  table.addRow(header);

  if (!articles || articles.length === 0) {
    const emptyRow = new UITableRow();
    emptyRow.addText("資料載入失敗，請確認網路連線");
    table.addRow(emptyRow);
    await table.present(false);
    return;
  }

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const row = new UITableRow();
    row.height = 72;
    row.dismissOnSelect = false;
    row.onSelect = () => { Safari.open(a.url); };

    // Lab color bar (narrow left cell)
    const labCell = row.addText(LAB_LABELS[a.lab] || a.lab.toUpperCase());
    labCell.titleColor = new Color(LAB_COLORS[a.lab] || "#8a8a8d");
    labCell.titleFont = Font.semiboldSystemFont(11);
    labCell.widthWeight = 20;

    // Title + summary (wide right cell)
    const date = formatDate(a.published_at);
    const titleCell = row.addText(a.title, (a.summary || "") + `\n${date}`);
    titleCell.titleFont = Font.semiboldSystemFont(14);
    titleCell.subtitleFont = Font.systemFont(12);
    titleCell.subtitleColor = new Color("#8a8a8d");
    titleCell.widthWeight = 80;

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
