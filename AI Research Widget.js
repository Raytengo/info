// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: brain;
/********************************************
 *                                          *
 *         AI RESEARCH NEWS WIDGET          *
 *                                          *
 *   Based on News Widget by @saudumm       *
 *   https://github.com/Saudumm/            *
 *          scriptable-News-Widget          *
 *                                          *
 *   Data source: Raytengo/info queue.json  *
 *   Curated by local AI pipeline           *
 *                                          *
 ********************************************

 Widget Parameter (long-press → Edit Widget):
   openai    → show only OpenAI news
   anthropic → show only Anthropic news
   deepmind  → show only DeepMind news
   (empty)   → show all labs, sorted by date
*/

/* ============ CONFIG  START ============ */

// URL to your curated queue.json on GitHub
const QUEUE_URL = "https://raw.githubusercontent.com/Raytengo/info/master/queue.json";

// Lab brand colors and display names
const LAB_COLORS = {
  openai:    "#10A37F",
  anthropic: "#D97757",
  deepmind:  "#4285F4",
};
const LAB_LABELS = {
  openai:    "OpenAI",
  anthropic: "Anthropic",
  deepmind:  "DeepMind",
};

// Widget title shown at the top
var PARAM_WIDGET_TITLE = "AI Research";

// Lab filter — set via Widget Parameter, or leave "" for all labs
var LAB_FILTER = "";

// Show article images (if image_url is provided in queue.json)
// "true" or "false"
var PARAM_SHOW_NEWS_IMAGES = "true";

// Custom background image name (place file in Scriptable iCloud folder)
// set to "none" for no custom image
var PARAM_BG_IMAGE_NAME = "none";

// Blur the background image: "true" or "false"
var PARAM_BG_IMAGE_BLUR = "true";

// Gradient overlay on background image: "true" or "false"
var PARAM_BG_IMAGE_GRADIENT = "true";

// Max articles in large widget (4 or 5)
var CONF_LARGE_WIDGET_MAX_NEWS = 4;

// Date/time locale: "default" uses system locale
// or use codes like "zh-TW", "en-US", "ja-JP"
var CONF_DATE_TIME_LOCALE = "zh-TW";

// Time format: true = 12h, false = 24h
var CONF_12_HOUR = false;

// Widget background color (light / dark)
var CONF_BG_COLOR =
    Color.dynamic(
      new Color("#fefefe"),
      new Color("#1c1c1e")
    );

// Use gradient background instead of single color
var CONF_BG_GRADIENT = false;

var CONF_BG_GRADIENT_COLOR_TOP =
    Color.dynamic(new Color("#fefefe"), new Color("#000000"));
var CONF_BG_GRADIENT_COLOR_BTM =
    Color.dynamic(new Color("#cccccc"), new Color("#1c1c1e"));

var CONF_BG_GRADIENT_OVERLAY_TOP =
    Color.dynamic(new Color("#fefefe", 0.3), new Color("#1c1c1e", 0.3));
var CONF_BG_GRADIENT_OVERLAY_BTM =
    Color.dynamic(new Color("#fefefe", 1.0), new Color("#1c1c1e", 1.0));

// Widget title font
var CONF_FONT_WIDGET_TITLE = "System";
var CONF_FONT_WEIGHT_WIDGET_TITLE = "heavy";
var CONF_FONT_SIZE_WIDGET_TITLE = 16;
var CONF_FONT_COLOR_WIDGET_TITLE =
    Color.dynamic(new Color("#000000"), new Color("#fefefe"));

// Date / lab label font
var CONF_FONT_DATE = "System";
var CONF_FONT_WEIGHT_DATE = "semibold";
var CONF_FONT_SIZE_DATE = 12;
var CONF_FONT_COLOR_DATE =
    Color.dynamic(new Color("#8a8a8d"), new Color("#9f9fa4"));

// Headline font
var CONF_FONT_HEADLINE = "System";
var CONF_FONT_WEIGHT_HEADLINE = "semibold";
var CONF_FONT_SIZE_HEADLINE = 13;
var CONF_FONT_COLOR_HEADLINE =
    Color.dynamic(new Color("#000000"), new Color("#fefefe"));

/* ============= CONFIG  END ============= */

const ONLINE = await isOnline();

var WIDGET_SIZE = (config.runsInWidget ? config.widgetFamily : "large");

checkWidgetParameter();

var WIDGET_NEWS_COUNT = (WIDGET_SIZE == "small") ? 1 : (WIDGET_SIZE == "medium") ? 2 : 5;
if (CONF_LARGE_WIDGET_MAX_NEWS < 4 || CONF_LARGE_WIDGET_MAX_NEWS > 5) {CONF_LARGE_WIDGET_MAX_NEWS = 4;}

await checkFileDirs();
await cleanUpCache();

if (config.runsInApp) {
  const al = new Alert();
  al.title = "AI Research Widget";
  al.message = "Add this widget to your homescreen via Scriptable.\n\nWidget Parameter options:\n• openai\n• anthropic\n• deepmind\n• (empty = all labs)";
  al.addAction("Preview Widget");
  al.addCancelAction("Cancel");
  if (await al.presentSheet() !== 0) { return; }
}

const widget = await createWidget();

if (!config.runsInWidget) {
  switch (WIDGET_SIZE) {
    case "small":  await widget.presentSmall();  break;
    case "medium": await widget.presentMedium(); break;
    case "large":  await widget.presentLarge();  break;
  }
}

Script.setWidget(widget);
Script.complete();


/* ============== FUNCTIONS ============== */

async function createWidget() {
  const fontWidgetTitle = loadFont(CONF_FONT_WIDGET_TITLE, CONF_FONT_WEIGHT_WIDGET_TITLE, CONF_FONT_SIZE_WIDGET_TITLE);
  const fontDate        = loadFont(CONF_FONT_DATE,         CONF_FONT_WEIGHT_DATE,         CONF_FONT_SIZE_DATE);
  const fontHeadline    = loadFont(CONF_FONT_HEADLINE,     CONF_FONT_WEIGHT_HEADLINE,     CONF_FONT_SIZE_HEADLINE);

  const list = new ListWidget();
  const widgetNewsData = await getData();

  // Title row
  const titleStack = list.addStack();
  titleStack.layoutHorizontally();

  const widgetTitle = titleStack.addText(PARAM_WIDGET_TITLE);
  widgetTitle.font = fontWidgetTitle;
  widgetTitle.textColor = CONF_FONT_COLOR_WIDGET_TITLE;
  widgetTitle.lineLimit = 1;
  widgetTitle.minimumScaleFactor = 0.5;

  // Offline indicator
  if (!ONLINE) {
    titleStack.addSpacer();
    const sym = SFSymbol.named("icloud.slash");
    sym.applyFont(fontWidgetTitle);
    const symbolOffline = titleStack.addImage(sym.image);
    symbolOffline.rightAlignImage();
    symbolOffline.tintColor = CONF_FONT_COLOR_WIDGET_TITLE;
    symbolOffline.imageSize = new Size(19, 19);
  }

  if (widgetNewsData) {
    if (WIDGET_SIZE == "large" && CONF_LARGE_WIDGET_MAX_NEWS == 4) {WIDGET_NEWS_COUNT = 4;}
    if (WIDGET_NEWS_COUNT >= widgetNewsData.aNewsHeadlines.length) {WIDGET_NEWS_COUNT = widgetNewsData.aNewsHeadlines.length;}
    if (WIDGET_SIZE == "medium" && WIDGET_NEWS_COUNT == 2) {list.addSpacer(3);}
    else if (WIDGET_SIZE == "large" && WIDGET_NEWS_COUNT == 5) {list.addSpacer(10);}
    else {list.addSpacer();}

    if (WIDGET_NEWS_COUNT == 1 || widgetNewsData.aNewsHeadlines.length == 1) {
      // Single article (small widget or only one result)
      list.useDefaultPadding();

      if (PARAM_SHOW_NEWS_IMAGES == "true" && PARAM_BG_IMAGE_NAME == "none") {
        if (widgetNewsData.aNewsIMGPaths[0] != "none") {
          list.backgroundImage = await loadLocalImage(widgetNewsData.aNewsIMGPaths[0]+(PARAM_BG_IMAGE_BLUR == "true" ? "-bg-blur" : "-bg"));
          CONF_BG_GRADIENT = true;
          CONF_BG_GRADIENT_COLOR_TOP = CONF_BG_GRADIENT_OVERLAY_TOP;
          CONF_BG_GRADIENT_COLOR_BTM = CONF_BG_GRADIENT_OVERLAY_BTM;
        }
      }

      const postStack = list.addStack();
      postStack.layoutVertically();

      if (config.widgetFamily === "medium" || config.widgetFamily === "large") {
        const labelDateTime = postStack.addText(widgetNewsData.aNewsSiteNames[0]+" · "+widgetNewsData.aNewsDateTimes[0]);
        labelDateTime.font = fontDate;
        labelDateTime.textColor = widgetNewsData.aNewsLabColors[0];
        labelDateTime.lineLimit = 1;
        labelDateTime.minimumScaleFactor = 0.5;
      } else {
        const labelSite = postStack.addText(widgetNewsData.aNewsSiteNames[0]);
        labelSite.font = fontDate;
        labelSite.textColor = widgetNewsData.aNewsLabColors[0];
        labelSite.lineLimit = 1;
        labelSite.minimumScaleFactor = 0.5;

        const labelDateTime = postStack.addText(widgetNewsData.aNewsDateTimes[0]);
        labelDateTime.font = fontDate;
        labelDateTime.textColor = CONF_FONT_COLOR_DATE;
        labelDateTime.lineLimit = 1;
        labelDateTime.minimumScaleFactor = 0.5;
      }

      const labelHeadline = postStack.addText(widgetNewsData.aNewsHeadlines[0]);
      labelHeadline.font = fontHeadline;
      labelHeadline.textColor = CONF_FONT_COLOR_HEADLINE;
      labelHeadline.lineLimit = 3;

      list.url = widgetNewsData.aNewsURLs[0];

    } else {
      // Multiple articles (medium / large widget)
      list.setPadding(16, 16, 16, 16);

      const aStackRow       = new Array(WIDGET_NEWS_COUNT);
      const aStackCol       = new Array(WIDGET_NEWS_COUNT);
      const aLblNewsDate    = new Array(WIDGET_NEWS_COUNT);
      const aLblNewsHeadline = new Array(WIDGET_NEWS_COUNT);
      const aLblNewsImage   = new Array(WIDGET_NEWS_COUNT);

      for (let i = 0; i < WIDGET_NEWS_COUNT; i++) {
        aStackRow[i] = list.addStack();
        aStackRow[i].layoutHorizontally();
        aStackRow[i].url = widgetNewsData.aNewsURLs[i];

        aStackCol[i] = aStackRow[i].addStack();
        aStackCol[i].layoutVertically();

        // Lab name + date line (lab name in brand color)
        aLblNewsDate[i] = aStackCol[i].addText(widgetNewsData.aNewsSiteNames[i]+" · "+widgetNewsData.aNewsDateTimes[i]);
        aLblNewsDate[i].font = fontDate;
        aLblNewsDate[i].textColor = widgetNewsData.aNewsLabColors[i];
        aLblNewsDate[i].lineLimit = 1;
        aLblNewsDate[i].minimumScaleFactor = 0.5;

        aLblNewsHeadline[i] = aStackCol[i].addText(widgetNewsData.aNewsHeadlines[i]);
        aLblNewsHeadline[i].font = fontHeadline;
        aLblNewsHeadline[i].textColor = CONF_FONT_COLOR_HEADLINE;
        aLblNewsHeadline[i].lineLimit = 2;

        if (PARAM_SHOW_NEWS_IMAGES == "true") {
          aStackRow[i].addSpacer();
          aLblNewsImage[i] = aStackRow[i].addImage(await loadLocalImage(widgetNewsData.aNewsIMGPaths[i]));
          if (WIDGET_SIZE == "large" && WIDGET_NEWS_COUNT == 4) {
            aLblNewsImage[i].imageSize = new Size(63, 63);
            aLblNewsHeadline[i].lineLimit = 3;
          } else {
            aLblNewsImage[i].imageSize = new Size(45.66, 45.66);
          }
          aLblNewsImage[i].cornerRadius = 8;
          if (widgetNewsData.aNewsIMGPaths[i] === "none") {
            aLblNewsImage[i].tintColor = widgetNewsData.aNewsLabColors[i];
            aLblNewsImage[i].imageOpacity = 0.6;
          }
          aLblNewsImage[i].rightAlignImage();
        }

        if (i < WIDGET_NEWS_COUNT - 1) {list.addSpacer();}
      }
    }

  } else {
    // Error state
    widgetTitle.textColor = Color.white();
    list.addSpacer();
    const sadFace = list.addText(":(");
    sadFace.font = Font.regularSystemFont((WIDGET_SIZE === "large") ? 190 : 60);
    sadFace.textColor = Color.white();
    sadFace.lineLimit = 1;
    sadFace.minimumScaleFactor = 0.1;
    list.addSpacer();
    const errMsg = list.addText("Couldn't load data");
    errMsg.font = Font.regularSystemFont(12);
    errMsg.textColor = Color.white();
    CONF_BG_COLOR = new Color("#1f67b1");
    CONF_BG_GRADIENT = false;
    PARAM_BG_IMAGE_NAME = "none";
  }

  // Background: custom image / gradient / solid color
  if (PARAM_BG_IMAGE_NAME != "none") {
    const customBGImage = await loadBGImage(PARAM_BG_IMAGE_NAME, PARAM_BG_IMAGE_BLUR);
    if (customBGImage != "not found") {
      list.backgroundImage = customBGImage;
      if (PARAM_BG_IMAGE_GRADIENT == "true") {
        const gradient = new LinearGradient();
        gradient.locations = [0, 1];
        gradient.colors = [CONF_BG_GRADIENT_OVERLAY_TOP, CONF_BG_GRADIENT_OVERLAY_BTM];
        list.backgroundGradient = gradient;
      }
    } else {
      list.backgroundColor = CONF_BG_COLOR;
    }
  } else if (CONF_BG_GRADIENT == true) {
    const gradient = new LinearGradient();
    gradient.locations = [0, 1];
    gradient.colors = [CONF_BG_GRADIENT_COLOR_TOP, CONF_BG_GRADIENT_COLOR_BTM];
    list.backgroundGradient = gradient;
  } else {
    list.backgroundColor = CONF_BG_COLOR;
  }

  return list;
}

// Fetch queue.json from GitHub and return structured widget data
async function getData() {
  try {
    const localFM = FileManager.local();
    const docDir  = localFM.documentsDirectory();
    const cacheFile = localFM.joinPath(docDir+"/saudumm-news-widget-data", "ai-queue-cache.json");

    let queueData;
    if (ONLINE) {
      queueData = await new Request(QUEUE_URL).loadJSON();
      await localFM.writeString(cacheFile, JSON.stringify(queueData));
    } else {
      if (localFM.fileExists(cacheFile)) {
        queueData = JSON.parse(localFM.readString(cacheFile));
      } else {
        return null;
      }
    }

    let articles = queueData.articles || [];

    // Filter by lab if widget parameter was set
    if (LAB_FILTER && LAB_FILTER !== "") {
      articles = articles.filter(a => a.lab === LAB_FILTER);
    }

    if (articles.length === 0) { return null; }

    // Sort newest first
    articles.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

    const count = Math.min(articles.length, WIDGET_NEWS_COUNT);

    const aDateTimes  = new Array(count);
    const aHeadlines  = new Array(count);
    const aURLs       = new Array(count);
    const aIMGPaths   = new Array(count);
    const aSiteNames  = new Array(count);
    const aLabColors  = new Array(count);

    for (let i = 0; i < count; i++) {
      const a = articles[i];

      aDateTimes[i] = new Date(a.published_at).toLocaleString(
        (CONF_DATE_TIME_LOCALE == "default" ? [] : [CONF_DATE_TIME_LOCALE]),
        {year: "numeric", month: "2-digit", day: "2-digit", hour12: CONF_12_HOUR}
      );

      aHeadlines[i] = a.title;
      aURLs[i]      = a.url;
      aSiteNames[i] = LAB_LABELS[a.lab] || a.lab.toUpperCase();
      aLabColors[i] = new Color(LAB_COLORS[a.lab] || "#8a8a8d");

      if (PARAM_SHOW_NEWS_IMAGES == "true" && a.image_url) {
        const fileID   = _hashCode(a.image_url);
        const fileName = await getFileName(aSiteNames[i], fileID);
        aIMGPaths[i]   = await _downloadPostImage(fileName, encodeURI(a.image_url), i === 0);
      } else {
        aIMGPaths[i] = "none";
      }
    }

    return {
      aNewsDateTimes:  aDateTimes,
      aNewsHeadlines:  aHeadlines,
      aNewsURLs:       aURLs,
      aNewsIMGPaths:   aIMGPaths,
      aNewsSiteNames:  aSiteNames,
      aNewsLabColors:  aLabColors,
    };

  } catch(err) {
    logError("getData: "+err);
    return null;
  }

  function _hashCode(str) {
    let hash = 0;
    for (let c = 0; c < str.length; c++) {
      const ch = str.charCodeAt(c);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async function _downloadPostImage(strFileName, strURL, boolAddBGImage) {
    const localFM = FileManager.local();
    const imgPath = localFM.joinPath(localFM.documentsDirectory()+"/saudumm-news-widget-data/image-cache", strFileName);
    const tempPath = localFM.joinPath(localFM.temporaryDirectory(), strFileName);

    if (!boolAddBGImage && localFM.fileExists(imgPath)) { return imgPath; }
    if (!boolAddBGImage && !localFM.fileExists(imgPath)) {
      if (!ONLINE) { return "none"; }
      let img = await new Request(strURL).load();
      await localFM.write(tempPath, img);
      img = await localFM.readImage(tempPath);
      img = await resizeImage(img, 200);
      img = await cropImageToSquare(img);
      await localFM.writeImage(imgPath, img);
      await localFM.remove(tempPath);
      return imgPath;
    }

    if (boolAddBGImage) {
      const imgPathBG     = imgPath+"-bg";
      const imgPathBGBlur = imgPath+"-bg-blur";

      if (localFM.fileExists(imgPath) && localFM.fileExists(imgPathBG) && localFM.fileExists(imgPathBGBlur)) {
        return imgPath;
      }
      if (!ONLINE) { return "none"; }

      let img = await new Request(strURL).load();
      await localFM.write(tempPath, img);
      img = await localFM.readImage(tempPath);

      if (Math.min(img.size.height, img.size.width) > 500) { img = await resizeImage(img, 500); }

      if (!localFM.fileExists(imgPath)) {
        let small = await resizeImage(img, 200);
        small = await cropImageToSquare(small);
        await localFM.writeImage(imgPath, small);
      }
      if (!localFM.fileExists(imgPathBG)) { await localFM.writeImage(imgPathBG, img); }
      if (!localFM.fileExists(imgPathBGBlur)) {
        await localFM.writeImage(imgPathBGBlur, await blurImage(img));
      }

      await localFM.remove(tempPath);
      return imgPath;
    }
    return "none";
  }
}

// Process widget parameter: lab filter or widget size
function checkWidgetParameter() {
  if (!args.widgetParameter) { return; }
  const p = args.widgetParameter.trim().toLowerCase();
  if (LAB_COLORS[p] !== undefined) {
    LAB_FILTER = p;
    PARAM_WIDGET_TITLE = LAB_LABELS[p];
  } else if (p === "small" || p === "medium" || p === "large") {
    WIDGET_SIZE = p;
  }
}

// ---- Utility functions (kept from original by @saudumm) ----

async function loadLocalImage(imgPath) {
  const localFM = FileManager.local();
  if (localFM.fileExists(imgPath)) {
    return await localFM.readImage(imgPath);
  } else {
    const sym = SFSymbol.named("square.slash");
    sym.applyFont(loadFont(CONF_FONT_HEADLINE, "regular", 60));
    return sym.image;
  }
}

async function loadBGImage(imageName, optBlur) {
  const localFM = FileManager.local();
  let iCloudFM;
  try {iCloudFM = FileManager.iCloud();} catch(err) {return "not found";}

  const docDir       = localFM.documentsDirectory();
  const iCloudDocDir = iCloudFM.documentsDirectory();
  const bgIMGiCloudDocPath = iCloudFM.joinPath(iCloudDocDir, imageName);
  const bgIMGiCloudWPPath  = iCloudFM.joinPath(iCloudDocDir+"/wallpaper", imageName);
  const bgIMGWPCachePath   = localFM.joinPath(docDir+"/saudumm-news-widget-data/wallpaper-cache", imageName);

  if (optBlur == "true" && localFM.fileExists(bgIMGWPCachePath+"-blur")) {
    return await localFM.readImage(bgIMGWPCachePath+"-blur");
  }
  if (optBlur == "true") {
    const src = iCloudFM.fileExists(bgIMGiCloudDocPath) ? bgIMGiCloudDocPath
              : iCloudFM.fileExists(bgIMGiCloudWPPath)  ? bgIMGiCloudWPPath : null;
    if (!src) { return "not found"; }
    if (iCloudFM.isFileStoredIniCloud(src)) { await iCloudFM.downloadFileFromiCloud(src); }
    let img = await iCloudFM.readImage(src);
    img = await resizeImage(img, 300);
    img = await blurImage(img);
    await localFM.writeImage(bgIMGWPCachePath+"-blur", img);
    return img;
  }
  if (iCloudFM.fileExists(bgIMGiCloudDocPath)) { return await iCloudFM.readImage(bgIMGiCloudDocPath); }
  if (iCloudFM.fileExists(bgIMGiCloudWPPath))  { return await iCloudFM.readImage(bgIMGiCloudWPPath); }
  return "not found";
}

function checkFileDirs() {
  const localFM = FileManager.local();
  const docDir  = localFM.documentsDirectory();
  const imgCacheDir   = localFM.joinPath(docDir, "saudumm-news-widget-data/image-cache");
  const imgCacheDirWP = localFM.joinPath(docDir, "saudumm-news-widget-data/wallpaper-cache");
  if (!localFM.fileExists(imgCacheDir))   { localFM.createDirectory(imgCacheDir,   true); }
  if (!localFM.fileExists(imgCacheDirWP)) { localFM.createDirectory(imgCacheDirWP, true); }
}

function cleanUpCache() {
  const localFM  = FileManager.local();
  const widgetDir = localFM.joinPath(localFM.documentsDirectory(), "saudumm-news-widget-data");
  const content   = localFM.listContents(widgetDir);
  if (!content || content.length < 1) { return; }
  for (let i = 0; i < content.length; i++) {
    const fullPath = localFM.joinPath(widgetDir, content[i]);
    if (!localFM.isDirectory(fullPath)) {
      const hours = Math.round((Date.now() - localFM.creationDate(fullPath)) / 3600000);
      if (Math.abs(hours) > 24) { localFM.remove(fullPath); }
    } else {
      const sub = localFM.listContents(fullPath);
      for (let c = 0; c < sub.length; c++) {
        const subPath = localFM.joinPath(fullPath, sub[c]);
        const hours   = Math.round((Date.now() - localFM.creationDate(subPath)) / 3600000);
        const limit   = (content[i] == "wallpaper-cache") ? 48 : 24;
        if (Math.abs(hours) > limit) { localFM.remove(subPath); }
      }
    }
  }
}

async function getFileName(strSiteName, strID) {
  const title    = PARAM_WIDGET_TITLE.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  const sitePart = strSiteName.replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();
  return title+"-"+sitePart+"-"+strID;
}

function loadFont(fontName, fontThickness, fontSize) {
  if (fontName !== "System" && fontName !== "Rounded" && fontName !== "Monospaced") {
    return new Font(fontName, fontSize);
  }
  const R = fontName === "Rounded";
  const M = fontName === "Monospaced";
  switch (fontThickness) {
    case "ultralight": return R ? Font.ultraLightRoundedSystemFont(fontSize) : M ? Font.ultraLightMonospacedSystemFont(fontSize) : Font.ultraLightSystemFont(fontSize);
    case "thin":       return R ? Font.thinRoundedSystemFont(fontSize)       : M ? Font.thinMonospacedSystemFont(fontSize)       : Font.thinSystemFont(fontSize);
    case "light":      return R ? Font.lightRoundedSystemFont(fontSize)      : M ? Font.lightMonospacedSystemFont(fontSize)      : Font.lightSystemFont(fontSize);
    case "regular":    return R ? Font.regularRoundedSystemFont(fontSize)    : M ? Font.regularMonospacedSystemFont(fontSize)    : Font.regularSystemFont(fontSize);
    case "medium":     return R ? Font.mediumRoundedSystemFont(fontSize)     : M ? Font.mediumMonospacedSystemFont(fontSize)     : Font.mediumSystemFont(fontSize);
    case "semibold":   return R ? Font.semiboldRoundedSystemFont(fontSize)   : M ? Font.semiboldMonospacedSystemFont(fontSize)   : Font.semiboldSystemFont(fontSize);
    case "bold":       return R ? Font.boldRoundedSystemFont(fontSize)       : M ? Font.boldMonospacedSystemFont(fontSize)       : Font.boldSystemFont(fontSize);
    case "heavy":      return R ? Font.heavyRoundedSystemFont(fontSize)      : M ? Font.heavyMonospacedSystemFont(fontSize)      : Font.heavySystemFont(fontSize);
    case "black":      return R ? Font.blackRoundedSystemFont(fontSize)      : M ? Font.blackMonospacedSystemFont(fontSize)      : Font.blackSystemFont(fontSize);
    default:           return Font.boldSystemFont(fontSize);
  }
}

async function isOnline() {
  const view = new WebView();
  return await view.evaluateJavaScript("navigator.onLine");
}

// blurImage / resizeImage / cropImageToSquare kept verbatim from @saudumm's original

async function blurImage(img) {
  const blurStrength = Math.max(1, Math.floor((img.size.height * img.size.width) / 18000));
  const js = `
    var mul_table=[512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,289,287,285,282,280,278,275,273,271,269,267,265,263,261,259];
    var shg_table=[9,11,12,13,13,14,14,15,15,15,15,16,16,16,16,17,17,17,17,17,17,17,18,18,18,18,18,18,18,18,18,19,19,19,19,19,19,19,19,19,19,19,19,19,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24];
    function stackBlurCanvasRGB(id,top_x,top_y,width,height,radius){if(isNaN(radius)||radius<1){return;}radius|=0;var canvas=document.getElementById(id);var context=canvas.getContext("2d");var imageData;try{imageData=context.getImageData(top_x,top_y,width,height);}catch(e){throw new Error("unable to access image data: "+e);}var pixels=imageData.data;var x,y,i,p,yp,yi,yw,r_sum,g_sum,b_sum,r_out_sum,g_out_sum,b_out_sum,r_in_sum,g_in_sum,b_in_sum,pr,pg,pb,rbs;var div=radius+radius+1;var w4=width<<2;var widthMinus1=width-1;var heightMinus1=height-1;var radiusPlus1=radius+1;var sumFactor=radiusPlus1*(radiusPlus1+1)/2/1;var stackStart=new BlurStack();var stack=stackStart;for(i=1;i<div;i++){stack=stack.next=new BlurStack();if(i==radiusPlus1)var stackEnd=stack;}stack.next=stackStart;var stackIn=null;var stackOut=null;yw=yi=0;var mul_sum=mul_table[radius];var shg_sum=shg_table[radius];for(y=0;y<height;y++){r_in_sum=g_in_sum=b_in_sum=r_sum=g_sum=b_sum=0;r_out_sum=radiusPlus1*(pr=pixels[yi]);g_out_sum=radiusPlus1*(pg=pixels[yi+1]);b_out_sum=radiusPlus1*(pb=pixels[yi+2]);r_sum+=sumFactor*pr;g_sum+=sumFactor*pg;b_sum+=sumFactor*pb;stack=stackStart;for(i=0;i<radiusPlus1;i++){stack.r=pr;stack.g=pg;stack.b=pb;stack=stack.next;}for(i=1;i<radiusPlus1;i++){p=yi+((widthMinus1<i?widthMinus1:i)<<2);r_sum+=(stack.r=(pr=pixels[p]))*(rbs=radiusPlus1-i);g_sum+=(stack.g=(pg=pixels[p+1]))*rbs;b_sum+=(stack.b=(pb=pixels[p+2]))*rbs;r_in_sum+=pr;g_in_sum+=pg;b_in_sum+=pb;stack=stack.next;}stackIn=stackStart;stackOut=stackEnd;for(x=0;x<width;x++){pixels[yi]=(r_sum*mul_sum)>>shg_sum;pixels[yi+1]=(g_sum*mul_sum)>>shg_sum;pixels[yi+2]=(b_sum*mul_sum)>>shg_sum;r_sum-=r_out_sum;g_sum-=g_out_sum;b_sum-=b_out_sum;r_out_sum-=stackIn.r;g_out_sum-=stackIn.g;b_out_sum-=stackIn.b;p=(yw+((p=x+radius+1)<widthMinus1?p:widthMinus1))<<2;r_in_sum+=(stackIn.r=pixels[p]);g_in_sum+=(stackIn.g=pixels[p+1]);b_in_sum+=(stackIn.b=pixels[p+2]);r_sum+=r_in_sum;g_sum+=g_in_sum;b_sum+=b_in_sum;stackIn=stackIn.next;r_out_sum+=(pr=stackOut.r);g_out_sum+=(pg=stackOut.g);b_out_sum+=(pb=stackOut.b);r_in_sum-=pr;g_in_sum-=pg;b_in_sum-=pb;stackOut=stackOut.next;yi+=4;}yw+=width;}for(x=0;x<width;x++){g_in_sum=b_in_sum=r_in_sum=g_sum=b_sum=r_sum=0;yi=x<<2;r_out_sum=radiusPlus1*(pr=pixels[yi]);g_out_sum=radiusPlus1*(pg=pixels[yi+1]);b_out_sum=radiusPlus1*(pb=pixels[yi+2]);r_sum+=sumFactor*pr;g_sum+=sumFactor*pg;b_sum+=sumFactor*pb;stack=stackStart;for(i=0;i<radiusPlus1;i++){stack.r=pr;stack.g=pg;stack.b=pb;stack=stack.next;}yp=width;for(i=1;i<=radius;i++){yi=(yp+x)<<2;r_sum+=(stack.r=(pr=pixels[yi]))*(rbs=radiusPlus1-i);g_sum+=(stack.g=(pg=pixels[yi+1]))*rbs;b_sum+=(stack.b=(pb=pixels[yi+2]))*rbs;r_in_sum+=pr;g_in_sum+=pg;b_in_sum+=pb;stack=stack.next;if(i<heightMinus1){yp+=width;}}yi=x;stackIn=stackStart;stackOut=stackEnd;for(y=0;y<height;y++){p=yi<<2;pixels[p]=(r_sum*mul_sum)>>shg_sum;pixels[p+1]=(g_sum*mul_sum)>>shg_sum;pixels[p+2]=(b_sum*mul_sum)>>shg_sum;r_sum-=r_out_sum;g_sum-=g_out_sum;b_sum-=b_out_sum;r_out_sum-=stackIn.r;g_out_sum-=stackIn.g;b_out_sum-=stackIn.b;p=(x+(((p=y+radiusPlus1)<heightMinus1?p:heightMinus1)*width))<<2;r_sum+=(r_in_sum+=(stackIn.r=pixels[p]));g_sum+=(g_in_sum+=(stackIn.g=pixels[p+1]));b_sum+=(b_in_sum+=(stackIn.b=pixels[p+2]));stackIn=stackIn.next;r_out_sum+=(pr=stackOut.r);g_out_sum+=(pg=stackOut.g);b_out_sum+=(pb=stackOut.b);r_in_sum-=pr;g_in_sum-=pg;b_in_sum-=pb;stackOut=stackOut.next;yi+=width;}}context.putImageData(imageData,top_x,top_y);}
    function BlurStack(){this.r=0;this.g=0;this.b=0;this.a=0;this.next=null;}
    const img=document.getElementById("blurImg");const canvas=document.getElementById("mainCanvas");const w=img.width;const h=img.height;canvas.style.width=w+"px";canvas.style.height=h+"px";canvas.width=w;canvas.height=h;const context=canvas.getContext("2d");context.clearRect(0,0,w,h);context.drawImage(img,0,0,w,h);var imageData=context.getImageData(0,0,w,h);context.putImageData(imageData,0,0);stackBlurCanvasRGB("mainCanvas",0,0,w,h,${blurStrength});canvas.toDataURL();
  `;
  const blurImgData = await Data.fromPNG(img).toBase64String();
  const html = `<img id="blurImg" src="data:image/png;base64,${blurImgData}" /><canvas id="mainCanvas" />`;
  const view = new WebView();
  await view.loadHTML(html);
  const returnValue = await view.evaluateJavaScript(js);
  return Image.fromData(Data.fromBase64String(returnValue.slice(22)));
}

async function resizeImage(img, maxShortSide) {
  const resizeFactor = Math.max(1, Math.round(Math.min(img.size.height, img.size.width) / maxShortSide));
  const js = `
    const img=document.getElementById("resImg");const canvas=document.getElementById("mainCanvas");const w=img.width;const h=img.height;const maxW=Math.round(w/${resizeFactor});const maxH=Math.round(h/${resizeFactor});canvas.style.width=w+"px";canvas.style.height=h+"px";canvas.width=maxW;canvas.height=maxH;const context=canvas.getContext("2d");context.clearRect(0,0,w,h);context.drawImage(img,0,0,maxW,maxH);canvas.toDataURL();
  `;
  const resImgData = await Data.fromPNG(img).toBase64String();
  const html = `<img id="resImg" src="data:image/png;base64,${resImgData}" /><canvas id="mainCanvas" />`;
  const view = new WebView();
  await view.loadHTML(html);
  const returnValue = await view.evaluateJavaScript(js);
  return Image.fromData(Data.fromBase64String(returnValue.slice(22)));
}

async function cropImageToSquare(img) {
  const h = img.size.height;
  const w = img.size.width;
  if (h === w) { return img; }
  const short = Math.min(h, w);
  const crop  = Math.floor((Math.max(h, w) - short) / 2);
  const rect  = (h > w) ? new Rect(0, crop, short, short) : new Rect(crop, 0, short, short);
  const draw  = new DrawContext();
  draw.size   = new Size(rect.width, rect.height);
  draw.drawImageAtPoint(img, new Point(-rect.x, -rect.y));
  return draw.getImage();
}
