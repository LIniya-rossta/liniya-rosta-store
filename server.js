const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
loadEnv(path.join(ROOT, ".env"));

const KYRGYZ_TIME_ZONE = "Asia/Bishkek";
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(PUBLIC_DIR, "uploads");
const SEEDED_PRODUCTS_FILE = path.join(ROOT, "data", "products.json");

const PORT = Number(process.env.PORT || 4177);
const RENDER_BASE_URL =
  process.env.RENDER_EXTERNAL_URL || (process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : "");
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || RENDER_BASE_URL || `http://localhost:${PORT}`;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_ADMINS = new Set(
  String(process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
const ENABLE_TELEGRAM_BOT = process.env.ENABLE_TELEGRAM_BOT !== "false";
const TELEGRAM_BOT_MODE = process.env.TELEGRAM_BOT_MODE || (PUBLIC_BASE_URL.startsWith("https://") ? "webhook" : "polling");
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || deriveTelegramSecret(TELEGRAM_BOT_TOKEN);
const TELEGRAM_DELETE_WEBHOOK_ON_POLLING = process.env.TELEGRAM_DELETE_WEBHOOK_ON_POLLING === "true";
const TELEGRAM_ADMIN_LOGIN = process.env.TELEGRAM_ADMIN_LOGIN || "LiniyaRosta";
const TELEGRAM_ADMIN_PASSWORD = process.env.TELEGRAM_ADMIN_PASSWORD || "";
const TELEGRAM_OBSERVERS = new Set(
  String(process.env.TELEGRAM_OBSERVER_IDS || process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
const ADMIN_SESSION_MS = Math.max(1, Number(process.env.TELEGRAM_ADMIN_SESSION_HOURS || 12)) * 60 * 60 * 1000;
const COMPANY_WHATSAPP = process.env.COMPANY_WHATSAPP || "996990883883";

const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const WATCHERS_FILE = path.join(DATA_DIR, "telegram-watchers.json");
const DEMO_PRODUCTS = [
  {
    id: "preview-laminate",
    title: "SPC ламинат «Дуб Медио»",
    category: "SPC ламинат",
    price: 1800,
    unit: "м²",
    stock: "хит showroom",
    description: "Влагостойкое покрытие с чистой древесной фактурой для квартир, студий и коммерции.",
    image: "/assets/product-laminate-1.jpg",
    imageFit: "cover",
    active: true
  },
  {
    id: "preview-profile",
    title: "Профиль парящий Air X",
    category: "Профиля",
    price: 650,
    unit: "пог. м",
    stock: "подбор",
    description: "Легкий акцент для потолков, подсветки и аккуратной геометрии интерьера.",
    image: "/assets/product-profile-1.png",
    imageFit: "contain",
    active: true
  },
  {
    id: "preview-film",
    title: "ПВХ пленка для потолков",
    category: "Пленка",
    price: 160,
    unit: "м²",
    stock: "матовая",
    description: "Матовые, сатиновые и фактурные варианты для ровного потолочного полотна.",
    image: "/assets/product-film-1.png",
    imageFit: "contain",
    active: true
  },
  {
    id: "preview-tool",
    title: "Лопатка монтажная",
    category: "Инструмент",
    price: 0,
    unit: "шт",
    stock: "наличие",
    description: "Монтажные мелочи, которые помогают собрать чистый и точный результат.",
    image: "/assets/product-tool-1.png",
    imageFit: "contain",
    active: true
  }
];
const STATUSES = ["new", "accepted", "in_work", "delivered", "canceled"];
const STATUS_LABELS = {
  new: "Новый",
  accepted: "Принят",
  in_work: "В работе",
  delivered: "Доставлен",
  canceled: "Отменен"
};

const botState = new Map();
const adminSessions = new Map();
let botOffset = 0;

ensureStorage();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/products") {
      const products = getCatalogProducts(await readJson(PRODUCTS_FILE, []));
      return json(res, 200, {
        products: products.filter((product) => product.active !== false)
      });
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      const payload = await readBody(req);
      const order = await createOrder(payload);
      notifyOrderWatchers(order).catch((error) => {
        console.error("Telegram notification failed:", error.message);
      });
      return json(res, 201, { order });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/telegram/webhook/")) {
      if (!TELEGRAM_WEBHOOK_SECRET || url.pathname !== telegramWebhookPath()) {
        return text(res, 403, "Forbidden");
      }
      if (req.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_WEBHOOK_SECRET) {
        return text(res, 403, "Forbidden");
      }
      if (!ENABLE_TELEGRAM_BOT || !TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMINS.size) {
        return json(res, 200, { ok: true, skipped: true });
      }
      const update = await readBody(req);
      await handleTelegramUpdate(update);
      return json(res, 200, { ok: true });
    }

    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, {
        ok: true,
        telegramPanel: "admin-v2",
        telegram: Boolean(ENABLE_TELEGRAM_BOT && TELEGRAM_BOT_TOKEN && TELEGRAM_ADMINS.size),
        telegramEnabled: ENABLE_TELEGRAM_BOT,
        telegramMode: TELEGRAM_BOT_MODE,
        telegramWebhookSecret: Boolean(TELEGRAM_WEBHOOK_SECRET),
        telegramAdminPassword: Boolean(TELEGRAM_ADMIN_PASSWORD)
      });
    }

    return serveStatic(req, res, url.pathname);
  } catch (error) {
    if (!error.statusCode || error.statusCode >= 500) console.error(error);
    return json(res, error.statusCode || 500, {
      error: error.publicMessage || "Что-то пошло не так"
    });
  }
});

server.listen(PORT, () => {
  console.log(`Линия Роста: http://localhost:${PORT}`);
  if (ENABLE_TELEGRAM_BOT && TELEGRAM_BOT_TOKEN && TELEGRAM_ADMINS.size) {
    startTelegramIntegration().catch((error) => {
      console.error("Telegram setup failed:", error.message);
    });
  } else {
    console.log("Telegram bot is off: set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_IDS in .env");
  }
});

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function deriveTelegramSecret(token) {
  if (!token) return "";
  return `lr_${crypto.createHash("sha256").update(token).digest("hex").slice(0, 32)}`;
}

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(PRODUCTS_FILE)) {
    if (PRODUCTS_FILE !== SEEDED_PRODUCTS_FILE && fs.existsSync(SEEDED_PRODUCTS_FILE)) {
      fs.copyFileSync(SEEDED_PRODUCTS_FILE, PRODUCTS_FILE);
    } else {
      fs.writeFileSync(PRODUCTS_FILE, "[]\n");
    }
  }
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]\n");
  if (!fs.existsSync(WATCHERS_FILE)) fs.writeFileSync(WATCHERS_FILE, "[]\n");
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.promises.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(file, data) {
  const temp = `${file}.tmp`;
  await fs.promises.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`);
  await fs.promises.rename(temp, file);
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      const error = new Error("Body is too large");
      error.statusCode = 413;
      error.publicMessage = "Слишком большой запрос";
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    const error = new Error("Invalid JSON");
    error.statusCode = 400;
    error.publicMessage = "Некорректные данные формы";
    throw error;
  }
}

async function createOrder(payload) {
  const type = payload.type === "measurement" ? "measurement" : "cart";
  const customer = cleanCustomer(payload.customer || {});
  const products = getCatalogProducts(await readJson(PRODUCTS_FILE, []));
  const activeProducts = new Map(
    products.filter((product) => product.active !== false).map((product) => [product.id, product])
  );

  let items = [];
  let total = 0;

  if (type === "cart") {
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw publicError(400, "Корзина пустая");
    }

    items = payload.items.map((item) => {
      const product = activeProducts.get(String(item.productId));
      if (!product) throw publicError(400, "Один из товаров уже недоступен");
      const qty = clampQuantity(item.qty, product.unit || "шт");
      const price = Number(product.price || 0);
      total += price * qty;
      return {
        productId: product.id,
        title: product.title,
        category: product.category,
        price,
        qty,
        unit: product.unit || "шт",
        image: product.image || ""
      };
    });
  }

  const area = type === "measurement" ? clampNumber(payload.area, 50, 100000) : null;
  if (type === "measurement" && area < 50) {
    throw publicError(400, "Онлайн-заявка на замер доступна от 50 м²");
  }

  const fulfillment = {
    method: ["delivery", "pickup"].includes(payload.fulfillment?.method)
      ? payload.fulfillment.method
      : "delivery",
    payment: ["after_call", "online"].includes(payload.fulfillment?.payment)
      ? payload.fulfillment.payment
      : "after_call"
  };

  if (type === "cart") {
    Object.assign(fulfillment, cleanReadyWindow(payload.fulfillment || {}));
  }

  if (type === "measurement" && !customer.address) {
    throw publicError(400, "Укажите адрес объекта");
  }

  if (type === "cart" && fulfillment.method === "delivery" && !customer.address) {
    throw publicError(400, "Укажите адрес доставки");
  }

  const orders = await readJson(ORDERS_FILE, []);
  const order = {
    id: makeOrderId(orders),
    type,
    status: "new",
    customer,
    items,
    total,
    area,
    fulfillment,
    comment: trimText(payload.comment, 1000),
    source: "site",
    createdAt: new Date().toISOString(),
    timeline: [{ status: "new", at: new Date().toISOString() }]
  };

  orders.unshift(order);
  await writeJson(ORDERS_FILE, orders);
  return order;
}

function cleanCustomer(customer) {
  const name = trimText(customer.name, 120);
  const phone = trimText(customer.phone, 40);
  const address = trimText(customer.address, 240);

  if (!name) throw publicError(400, "Укажите имя");
  if (!phone) throw publicError(400, "Укажите телефон");

  return {
    name,
    phone,
    address
  };
}

function cleanReadyWindow(fulfillment) {
  const readyDate = trimText(fulfillment.readyDate, 10);
  const readyTime = trimText(fulfillment.readyTime, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(readyDate) || !/^\d{2}:\d{2}$/.test(readyTime)) {
    throw publicError(400, "Выберите дату и время готовности заказа");
  }

  const readyAt = parseKyrgyzDateTime(readyDate, readyTime);
  if (!readyAt) throw publicError(400, "Некорректная дата или время готовности");
  if (readyAt.getTime() < Date.now() - 10 * 60 * 1000) {
    throw publicError(400, "Выберите будущее время готовности заказа");
  }

  return {
    readyDate,
    readyTime,
    readyAt: readyAt.toISOString(),
    timeZone: KYRGYZ_TIME_ZONE
  };
}

function parseKyrgyzDateTime(dateValue, timeValue) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const plainDate = new Date(Date.UTC(year, month - 1, day));
  if (plainDate.getUTCFullYear() !== year || plainDate.getUTCMonth() !== month - 1 || plainDate.getUTCDate() !== day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour - 6, minute));
}

function getCatalogProducts(products) {
  return products.length ? products : DEMO_PRODUCTS;
}

function publicError(statusCode, publicMessage) {
  const error = new Error(publicMessage);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  return error;
}

function trimText(value, max) {
  return String(value || "").trim().slice(0, max);
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function clampQuantity(value, unit) {
  const number = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return 1;
  const max = 99999;
  if (isMeasuredUnit(unit)) return Math.min(max, Math.max(0.1, Math.round(number * 10) / 10));
  return Math.min(max, Math.max(1, Math.round(number)));
}

function isMeasuredUnit(unit) {
  const normalized = String(unit || "").toLowerCase();
  return normalized.includes("м²") || normalized.includes("м2") || normalized.includes("кв") || normalized.includes("пог") || normalized === "м";
}

function formatQty(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10).replace(".", ",");
}

function makeOrderId(orders = []) {
  const maxNumber = orders.reduce((max, order) => {
    const match = /^LR-(\d+)$/.exec(String(order.id || ""));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);
  return `LR-${maxNumber + 1}`;
}

function serveStatic(req, res, pathname) {
  if (pathname.startsWith("/uploads/")) {
    const uploadPath = path.normalize(path.join(UPLOAD_DIR, decodeURIComponent(pathname.slice("/uploads/".length))));
    if (!isInsideDirectory(UPLOAD_DIR, uploadPath)) return text(res, 403, "Forbidden");
    if (fs.existsSync(uploadPath) && fs.statSync(uploadPath).isFile()) return streamFile(res, uploadPath);
  }

  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!isInsideDirectory(PUBLIC_DIR, filePath)) return text(res, 403, "Forbidden");

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      const indexPath = path.join(PUBLIC_DIR, "index.html");
      return streamFile(res, indexPath);
    }
    return streamFile(res, filePath);
  });
}

function isInsideDirectory(baseDir, targetPath) {
  const relative = path.relative(baseDir, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function streamFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".svg": "image/svg+xml"
  }[ext] || "application/octet-stream";

  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
}

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(body));
}

function text(res, statusCode, body) {
  res.writeHead(statusCode, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(body);
}

async function startTelegramIntegration() {
  await setTelegramCommands();
  if (TELEGRAM_BOT_MODE === "webhook") {
    await setupTelegramWebhook();
    return;
  }
  if (!TELEGRAM_DELETE_WEBHOOK_ON_POLLING) {
    console.log("Telegram polling is off to keep the production webhook untouched.");
    return;
  }
  await tgApi("deleteWebhook", { drop_pending_updates: false });
  startTelegramBot();
}

async function setupTelegramWebhook() {
  if (!PUBLIC_BASE_URL.startsWith("https://")) {
    throw new Error("PUBLIC_BASE_URL must be an https domain for Telegram webhook");
  }
  if (!TELEGRAM_WEBHOOK_SECRET) {
    throw new Error("Set TELEGRAM_WEBHOOK_SECRET in .env for Telegram webhook");
  }

  const webhookUrl = new URL(telegramWebhookPath(), PUBLIC_BASE_URL).toString();
  await tgApi("setWebhook", {
    url: webhookUrl,
    secret_token: TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"]
  });
  console.log(`Telegram webhook connected: ${webhookUrl.replace(TELEGRAM_WEBHOOK_SECRET, "***")}`);
}

async function setTelegramCommands() {
  await tgApi("setMyCommands", {
    commands: [
      { command: "start", description: "Запустить Telegram-панель" },
      { command: "admin", description: "Войти в админ-панель" },
      { command: "watch", description: "Наблюдать за новыми заказами" },
      { command: "orders", description: "Последние заказы" },
      { command: "week", description: "Сводка за неделю" },
      { command: "cancel", description: "Отменить текущее действие" }
    ]
  });
}

function telegramWebhookPath() {
  return `/api/telegram/webhook/${encodeURIComponent(TELEGRAM_WEBHOOK_SECRET)}`;
}

async function startTelegramBot() {
  console.log("Telegram admin bot polling started");
  while (true) {
    try {
      const result = await tgApi("getUpdates", {
        offset: botOffset,
        timeout: 25,
        allowed_updates: ["message", "callback_query"]
      });

      for (const update of result.result || []) {
        botOffset = update.update_id + 1;
        await handleTelegramUpdate(update);
      }
    } catch (error) {
      console.error("Telegram polling error:", error.message);
      await wait(4000);
    }
  }
}

async function handleTelegramUpdate(update) {
  if (update.callback_query) return handleCallback(update.callback_query);
  if (!update.message) return;

  const message = update.message;
  const chatId = String(message.chat.id);
  const fromId = String(message.from?.id || "");
  const textValue = (message.text || message.caption || "").trim();
  const key = stateKey(chatId, fromId);
  const state = botState.get(key);

  if (textValue === "❌ Отмена" || textValue === "/cancel") {
    botState.delete(key);
    return isAdminSession(fromId)
      ? sendAdminPanel(chatId, "Действие отменено.")
      : sendStartMenu(chatId, "Действие отменено.");
  }

  if (state?.flow === "login") return continueLoginFlow(chatId, fromId, textValue, state);
  if (state?.flow === "product") return continueProductFlow(chatId, fromId, message, textValue, state);
  if (state?.flow === "edit_product") return continueFindProductFlow(chatId, fromId, textValue, state);
  if (state?.flow === "edit_field") return continueEditFieldFlow(chatId, fromId, message, textValue, state);

  if (textValue === "/start" || textValue === "Старт") return sendStartMenu(chatId);
  if (textValue === "/admin" || textValue === "Войти в админ-панель") return startAdminLogin(chatId, fromId);
  if (textValue === "/watch" || textValue === "Наблюдать за заказами") return subscribeWatcher(chatId, fromId, message.chat);
  if (textValue === "/watch_off") return unsubscribeWatcher(chatId);

  if (!isAdminSession(fromId)) return sendStartMenu(chatId, "Выберите режим работы бота.");

  if (textValue === "➕ Добавить товар" || textValue === "/addproduct") return startProductFlow(chatId, fromId);
  if (textValue === "✏️ Изменить товар" || textValue === "/edit") return startEditProductFlow(chatId, fromId);
  if (textValue === "📦 Товары" || textValue === "/products") return sendProducts(chatId);
  if (textValue === "🧾 Последние заказы" || textValue === "/orders") return sendOrders(chatId, { withKeyboard: true });
  if (textValue === "📊 Сводка за неделю" || textValue === "/week" || textValue === "/summary") return sendWeeklySummary(chatId);
  if (textValue === "🚪 Выйти") return logoutAdmin(chatId, fromId);

  if (textValue.startsWith("/price ")) return updateProductPrice(chatId, textValue);
  if (textValue.startsWith("/stock ")) return updateProductStock(chatId, textValue);
  if (textValue.startsWith("/hide ")) return hideProduct(chatId, textValue);

  return sendAdminPanel(chatId, "Выберите действие.");
}

function stateKey(chatId, fromId) {
  return `${chatId}:${fromId}`;
}

function isAdminSession(fromId) {
  const session = adminSessions.get(fromId);
  if (!session) return false;
  if (session.expiresAt <= Date.now()) {
    adminSessions.delete(fromId);
    return false;
  }
  return true;
}

function markAdminSession(fromId, chatId) {
  adminSessions.set(fromId, {
    chatId,
    expiresAt: Date.now() + ADMIN_SESSION_MS
  });
}

function canRegisterWatcher(fromId) {
  return TELEGRAM_ADMINS.has(fromId) || TELEGRAM_OBSERVERS.has(fromId) || isAdminSession(fromId);
}

async function sendStartMenu(chatId, prefix = "Линия Роста") {
  return sendMessage(
    chatId,
    `${prefix}\n\nВыберите режим: войти в админ-панель или просто получать новые заказы с сайта.`,
    startKeyboard()
  );
}

function startKeyboard() {
  return {
    keyboard: [[{ text: "Войти в админ-панель" }, { text: "Наблюдать за заказами" }]],
    resize_keyboard: true
  };
}

async function startAdminLogin(chatId, fromId) {
  botState.set(stateKey(chatId, fromId), { flow: "login", step: "login" });
  const hint = TELEGRAM_ADMIN_PASSWORD
    ? "Введите логин."
    : "Пароль админ-панели не задан на сервере. Добавьте TELEGRAM_ADMIN_PASSWORD в Render Environment, затем повторите вход.";
  return sendMessage(chatId, hint, cancelKeyboard());
}

async function continueLoginFlow(chatId, fromId, textValue, state) {
  if (!TELEGRAM_ADMIN_PASSWORD) {
    botState.delete(stateKey(chatId, fromId));
    return sendStartMenu(chatId, "Админ-пароль не настроен на сервере.");
  }

  if (state.step === "login") {
    if (textValue !== TELEGRAM_ADMIN_LOGIN) {
      return sendMessage(chatId, "Логин неверный. Попробуйте еще раз или нажмите /cancel.", cancelKeyboard());
    }
    state.step = "password";
    return sendMessage(chatId, "Введите пароль.", cancelKeyboard());
  }

  if (state.step === "password") {
    if (textValue !== TELEGRAM_ADMIN_PASSWORD) {
      return sendMessage(chatId, "Пароль неверный. Попробуйте еще раз или нажмите /cancel.", cancelKeyboard());
    }
    botState.delete(stateKey(chatId, fromId));
    markAdminSession(fromId, chatId);
    return sendAdminPanel(chatId, "Вход выполнен.");
  }
}

async function logoutAdmin(chatId, fromId) {
  adminSessions.delete(fromId);
  botState.delete(stateKey(chatId, fromId));
  return sendStartMenu(chatId, "Вы вышли из админ-панели.");
}

async function startProductFlow(chatId, fromId) {
  botState.set(stateKey(chatId, fromId), {
    flow: "product",
    step: "category",
    product: {
      id: newProductId(),
      stock: "в наличии"
    }
  });
  return sendMessage(chatId, "Категория товара? Например: SPC ламинат, Профиля, Пленка.", cancelKeyboard());
}

async function continueProductFlow(chatId, adminId, message, textValue, state) {
  const product = state.product;

  if (state.step === "category") {
    product.category = trimText(textValue, 80);
    if (!product.category) return sendMessage(chatId, "Напишите категорию.");
    if (state.editing) return finishDraftEdit(chatId, state);
    state.step = "title";
    return sendMessage(chatId, "Название товара?");
  }

  if (state.step === "title") {
    product.title = trimText(textValue, 160);
    if (!product.title) return sendMessage(chatId, "Напишите название.");
    if (state.editing) return finishDraftEdit(chatId, state);
    state.step = "price";
    return sendMessage(chatId, "Цена в сомах? Только число. Если цена договорная, напишите 0.");
  }

  if (state.step === "price") {
    const price = Number(textValue.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) return sendMessage(chatId, "Нужна цена числом.");
    product.price = Math.round(price);
    if (state.editing) return finishDraftEdit(chatId, state);
    state.step = "unit";
    return sendMessage(chatId, "Единица измерения? Например: м², шт, пог. м, рулон.");
  }

  if (state.step === "unit") {
    product.unit = normalizeUnit(textValue);
    if (state.editing) return finishDraftEdit(chatId, state);
    state.step = "description";
    return sendMessage(chatId, "Описание товара. Можно коротко. Чтобы пропустить, напишите 'Пропустить'.");
  }

  if (state.step === "description") {
    product.description = /^пропустить$/i.test(textValue) ? "" : trimText(textValue, 800);
    if (state.editing) return finishDraftEdit(chatId, state);
    state.step = "photo";
    return sendMessage(chatId, "Отправьте фото товара или напишите 'Пропустить'.");
  }

  if (state.step === "photo") {
    if (message.photo && message.photo.length) {
      product.image = await saveTelegramPhoto(message.photo, product.id);
    } else if (!/^пропустить$/i.test(textValue)) {
      return sendMessage(chatId, "Отправьте фото или напишите 'Пропустить'.");
    }

    state.step = "confirm";
    state.editing = false;
    return sendProductDraft(chatId, product);
  }

  if (state.step === "confirm") {
    return sendProductDraft(chatId, product, "Проверьте карточку и нажмите кнопку.");
  }
}

async function finishDraftEdit(chatId, state) {
  state.step = "confirm";
  state.editing = false;
  return sendProductDraft(chatId, state.product, "Поле обновлено. Проверьте карточку.");
}

async function sendProductDraft(chatId, product, prefix = "Черновик товара") {
  const textValue = [
    prefix,
    "",
    formatProduct(product),
    "",
    "Опубликовать товар на сайте?"
  ].join("\n");
  return sendMessage(chatId, textValue, productConfirmKeyboard());
}

function productConfirmKeyboard() {
  return {
    inline_keyboard: [
      [{ text: "Опубликовать", callback_data: "product:publish" }],
      [{ text: "Изменить", callback_data: "product:edit" }, { text: "Отмена", callback_data: "product:cancel" }]
    ]
  };
}

function productDraftEditKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "Категория", callback_data: "product:field:category" },
        { text: "Название", callback_data: "product:field:title" }
      ],
      [
        { text: "Цена", callback_data: "product:field:price" },
        { text: "Ед. изм.", callback_data: "product:field:unit" }
      ],
      [
        { text: "Описание", callback_data: "product:field:description" },
        { text: "Фото", callback_data: "product:field:photo" }
      ],
      [{ text: "Назад к проверке", callback_data: "product:confirm" }]
    ]
  };
}

async function publishDraftProduct(chatId, fromId) {
  const key = stateKey(chatId, fromId);
  const state = botState.get(key);
  if (state?.flow !== "product" || state.step !== "confirm") {
    return sendMessage(chatId, "Черновик товара не найден. Нажмите 'Добавить товар' заново.", adminKeyboard());
  }

  const product = normalizeProductForSave(state.product);
  const products = await readJson(PRODUCTS_FILE, []);
  const index = products.findIndex((item) => item.id === product.id);
  if (index >= 0) products[index] = product;
  else products.unshift(product);
  await writeJson(PRODUCTS_FILE, products);

  const savedProducts = await readJson(PRODUCTS_FILE, []);
  const isVisible = savedProducts.some((item) => item.id === product.id && item.active !== false);
  botState.delete(key);

  return sendAdminPanel(
    chatId,
    isVisible
      ? `Товар опубликован на сайте.\nID: ${product.id}\n${PUBLIC_BASE_URL}/catalog`
      : "Товар сохранен, но не прошел проверку видимости."
  );
}

function normalizeProductForSave(product) {
  return {
    id: product.id || newProductId(),
    title: trimText(product.title, 160),
    category: trimText(product.category, 80),
    price: Math.max(0, Math.round(Number(product.price || 0))),
    unit: normalizeUnit(product.unit),
    stock: trimText(product.stock, 80) || "в наличии",
    description: trimText(product.description, 800),
    image: trimText(product.image, 240),
    imageFit: product.image ? "cover" : "contain",
    active: true,
    featured: false,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function newProductId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeUnit(value) {
  return trimText(value, 30) || "шт";
}

async function sendProducts(chatId) {
  const products = await readJson(PRODUCTS_FILE, []);
  const visible = products.filter((product) => product.active !== false).slice(0, 20);
  if (!visible.length) {
    return sendMessage(chatId, "Каталог пуст. Нажмите 'Добавить товар', чтобы загрузить первый товар.", adminKeyboard());
  }

  const lines = visible.map((product) => {
    return [
      product.title,
      `ID: ${product.id}`,
      `Категория: ${product.category || "без категории"}`,
      `Цена: ${formatMoney(product.price)} / ${product.unit || "шт"}`,
      `Наличие: ${product.stock || "не указано"}`
    ].join("\n");
  });
  return sendMessage(chatId, lines.join("\n\n"), adminKeyboard());
}

async function sendOrders(chatId, options = {}) {
  const orders = await readJson(ORDERS_FILE, []);
  if (!orders.length) return sendMessage(chatId, "Заказов пока нет.", options.withKeyboard ? adminKeyboard() : undefined);

  for (const order of orders.slice(0, 8)) {
    await sendMessage(chatId, formatOrder(order), options.withKeyboard ? orderKeyboard(order) : undefined);
  }
}

async function sendWeeklySummary(chatId) {
  const products = await readJson(PRODUCTS_FILE, []);
  const orders = await readJson(ORDERS_FILE, []);
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekOrders = orders.filter((order) => Date.parse(order.createdAt || "") >= weekAgo);
  const activeProducts = products.filter((product) => product.active !== false).length;
  const byStatus = STATUSES.map((status) => `${STATUS_LABELS[status]}: ${weekOrders.filter((order) => order.status === status).length}`);
  const total = weekOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const topItems = topProductsFromOrders(weekOrders);
  return sendMessage(
    chatId,
    [
      "Сводка за 7 дней",
      `Товаров на сайте: ${activeProducts}`,
      `Новых заказов: ${weekOrders.length}`,
      `Сумма корзин: ${formatMoney(total)}`,
      ...byStatus,
      topItems.length ? `Популярные позиции:\n${topItems.map((item) => `- ${item.title}: ${formatQty(item.qty)} ${item.unit}`).join("\n")}` : ""
    ].filter(Boolean).join("\n"),
    adminKeyboard()
  );
}

function topProductsFromOrders(orders) {
  const items = new Map();
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.productId || item.title;
      const current = items.get(key) || { title: item.title, qty: 0, unit: item.unit || "шт" };
      current.qty += Number(item.qty || 0);
      items.set(key, current);
    }
  }
  return [...items.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
}

async function updateProductPrice(chatId, command) {
  const [, id, priceValue] = command.split(/\s+/);
  const price = Number(priceValue);
  if (!id || !Number.isFinite(price) || price < 0) return sendMessage(chatId, "Формат: /price ID 1800");
  return mutateProduct(chatId, id, (product) => {
    product.price = Math.round(price);
    return `Цена обновлена: ${product.title} -> ${formatMoney(product.price)}`;
  });
}

async function updateProductStock(chatId, command) {
  const parts = command.split(/\s+/);
  const id = parts[1];
  const stock = parts.slice(2).join(" ");
  if (!id || !stock) return sendMessage(chatId, "Формат: /stock ID в наличии");
  return mutateProduct(chatId, id, (product) => {
    product.stock = trimText(stock, 80);
    return `Наличие обновлено: ${product.title} -> ${product.stock}`;
  });
}

async function hideProduct(chatId, command) {
  const id = command.split(/\s+/)[1];
  if (!id) return sendMessage(chatId, "Формат: /hide ID");
  return mutateProduct(chatId, id, (product) => {
    product.active = false;
    return `Товар скрыт с сайта: ${product.title}`;
  });
}

async function mutateProduct(chatId, id, updater) {
  const products = await readJson(PRODUCTS_FILE, []);
  const product = products.find((item) => item.id === id);
  if (!product) return sendMessage(chatId, "Товар с таким ID не найден.");
  const message = updater(product);
  product.updatedAt = new Date().toISOString();
  await writeJson(PRODUCTS_FILE, products);
  return sendMessage(chatId, message, adminKeyboard());
}

async function handleCallback(query) {
  const fromId = String(query.from?.id || "");
  const chatId = String(query.message?.chat?.id || query.from?.id || "");
  const data = String(query.data || "");
  await tgApi("answerCallbackQuery", { callback_query_id: query.id }).catch(() => {});

  if (data === "entry:admin") return startAdminLogin(chatId, fromId);
  if (data === "entry:watch") return subscribeWatcher(chatId, fromId, query.message?.chat || {});

  if (data.startsWith("product:")) return handleProductCallback(chatId, fromId, data);
  if (data.startsWith("editproduct:")) return handleEditProductCallback(chatId, fromId, data);

  const [type, orderId, status] = data.split(":");
  if (type !== "order" || !STATUSES.includes(status)) return;
  if (!isAdminSession(fromId)) {
    return sendMessage(chatId, "Сначала войдите в админ-панель через /admin.");
  }

  const orders = await readJson(ORDERS_FILE, []);
  const order = orders.find((item) => item.id === orderId);
  if (!order) return sendMessage(chatId, "Заказ не найден.");

  order.status = status;
  order.timeline = order.timeline || [];
  order.timeline.unshift({ status, at: new Date().toISOString() });
  await writeJson(ORDERS_FILE, orders);

  await sendMessage(String(query.message.chat.id), formatOrder(order), orderKeyboard(order));
}

async function handleProductCallback(chatId, fromId, data) {
  if (!isAdminSession(fromId)) return sendMessage(chatId, "Сначала войдите в админ-панель через /admin.");
  const key = stateKey(chatId, fromId);
  const state = botState.get(key);

  if (data === "product:publish") return publishDraftProduct(chatId, fromId);
  if (data === "product:cancel") {
    botState.delete(key);
    return sendAdminPanel(chatId, "Публикация товара отменена.");
  }
  if (data === "product:confirm") {
    if (state?.flow !== "product") return sendAdminPanel(chatId, "Черновик товара не найден.");
    state.step = "confirm";
    return sendProductDraft(chatId, state.product);
  }
  if (data === "product:edit") {
    if (state?.flow !== "product") return sendAdminPanel(chatId, "Черновик товара не найден.");
    return sendMessage(chatId, "Что изменить?", productDraftEditKeyboard());
  }
  if (data.startsWith("product:field:")) {
    if (state?.flow !== "product") return sendAdminPanel(chatId, "Черновик товара не найден.");
    const field = data.split(":")[2];
    state.step = field;
    state.editing = true;
    return askProductField(chatId, field);
  }
}

function askProductField(chatId, field) {
  const prompts = {
    category: "Новая категория?",
    title: "Новое название?",
    price: "Новая цена в сомах?",
    unit: "Новая единица измерения? Например: м², шт, пог. м.",
    description: "Новое описание или 'Пропустить'.",
    photo: "Отправьте новое фото или напишите 'Пропустить'."
  };
  return sendMessage(chatId, prompts[field] || "Введите новое значение.", cancelKeyboard());
}

async function startEditProductFlow(chatId, fromId) {
  botState.set(stateKey(chatId, fromId), { flow: "edit_product", step: "find" });
  const products = await readJson(PRODUCTS_FILE, []);
  const visible = products.filter((product) => product.active !== false).slice(0, 8);
  const keyboard = visible.length
    ? {
        inline_keyboard: visible.map((product) => [
          { text: `${product.title}`.slice(0, 50), callback_data: `editproduct:select:${product.id}` }
        ])
      }
    : cancelKeyboard();
  return sendMessage(chatId, "Выберите товар из списка или напишите его ID/часть названия.", keyboard);
}

async function continueFindProductFlow(chatId, fromId, textValue) {
  const products = await readJson(PRODUCTS_FILE, []);
  const query = textValue.toLowerCase();
  const matches = products
    .filter((product) => product.id === textValue || String(product.title || "").toLowerCase().includes(query))
    .slice(0, 8);

  if (!matches.length) return sendMessage(chatId, "Товар не найден. Напишите точный ID или часть названия.", cancelKeyboard());
  if (matches.length === 1) return openProductEditor(chatId, fromId, matches[0].id);

  return sendMessage(chatId, "Нашел несколько товаров. Выберите нужный:", {
    inline_keyboard: matches.map((product) => [
      { text: `${product.title}`.slice(0, 50), callback_data: `editproduct:select:${product.id}` }
    ])
  });
}

async function handleEditProductCallback(chatId, fromId, data) {
  if (!isAdminSession(fromId)) return sendMessage(chatId, "Сначала войдите в админ-панель через /admin.");
  const [, action, productId, field] = data.split(":");
  if (action === "select") return openProductEditor(chatId, fromId, productId);
  if (action === "field") return startProductFieldEdit(chatId, fromId, productId, field);
  if (action === "toggle") return toggleProductVisibility(chatId, fromId, productId);
  if (action === "done") {
    botState.delete(stateKey(chatId, fromId));
    return sendAdminPanel(chatId, "Редактирование завершено.");
  }
}

async function openProductEditor(chatId, fromId, productId) {
  botState.set(stateKey(chatId, fromId), { flow: "edit_product", step: "selected", productId });
  const products = await readJson(PRODUCTS_FILE, []);
  const product = products.find((item) => item.id === productId);
  if (!product) return sendMessage(chatId, "Товар не найден.", adminKeyboard());
  return sendMessage(chatId, formatProduct(product), productEditKeyboard(product));
}

function productEditKeyboard(product) {
  const visibleText = product.active === false ? "Показать" : "Скрыть";
  return {
    inline_keyboard: [
      [
        { text: "Название", callback_data: `editproduct:field:${product.id}:title` },
        { text: "Цена", callback_data: `editproduct:field:${product.id}:price` }
      ],
      [
        { text: "Категория", callback_data: `editproduct:field:${product.id}:category` },
        { text: "Ед. изм.", callback_data: `editproduct:field:${product.id}:unit` }
      ],
      [
        { text: "Описание", callback_data: `editproduct:field:${product.id}:description` },
        { text: "Фото", callback_data: `editproduct:field:${product.id}:photo` }
      ],
      [{ text: visibleText, callback_data: `editproduct:toggle:${product.id}` }],
      [{ text: "Готово", callback_data: `editproduct:done:${product.id}` }]
    ]
  };
}

async function startProductFieldEdit(chatId, fromId, productId, field) {
  botState.set(stateKey(chatId, fromId), { flow: "edit_field", productId, field });
  return askProductField(chatId, field);
}

async function continueEditFieldFlow(chatId, fromId, message, textValue, state) {
  const products = await readJson(PRODUCTS_FILE, []);
  const product = products.find((item) => item.id === state.productId);
  if (!product) {
    botState.delete(stateKey(chatId, fromId));
    return sendMessage(chatId, "Товар не найден.", adminKeyboard());
  }

  if (state.field === "photo") {
    if (message.photo && message.photo.length) {
      product.image = await saveTelegramPhoto(message.photo, product.id);
      product.imageFit = "cover";
    } else if (!/^пропустить$/i.test(textValue)) {
      return sendMessage(chatId, "Отправьте фото или напишите 'Пропустить'.", cancelKeyboard());
    }
  } else if (state.field === "price") {
    const price = Number(textValue.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) return sendMessage(chatId, "Нужна цена числом.", cancelKeyboard());
    product.price = Math.round(price);
  } else if (state.field === "unit") {
    product.unit = normalizeUnit(textValue);
  } else if (state.field === "description") {
    product.description = /^пропустить$/i.test(textValue) ? "" : trimText(textValue, 800);
  } else if (state.field === "category") {
    product.category = trimText(textValue, 80);
  } else if (state.field === "title") {
    product.title = trimText(textValue, 160);
  }

  product.updatedAt = new Date().toISOString();
  await writeJson(PRODUCTS_FILE, products);
  return openProductEditor(chatId, fromId, product.id);
}

async function toggleProductVisibility(chatId, fromId, productId) {
  const products = await readJson(PRODUCTS_FILE, []);
  const product = products.find((item) => item.id === productId);
  if (!product) return sendMessage(chatId, "Товар не найден.", adminKeyboard());
  product.active = product.active === false;
  product.updatedAt = new Date().toISOString();
  await writeJson(PRODUCTS_FILE, products);
  return openProductEditor(chatId, fromId, product.id);
}

function formatProduct(product) {
  return [
    `ID: ${product.id || "новый"}`,
    `Название: ${product.title || "не указано"}`,
    `Категория: ${product.category || "не указана"}`,
    `Цена: ${formatMoney(product.price)} / ${product.unit || "шт"}`,
    `Наличие: ${product.stock || "в наличии"}`,
    `Описание: ${product.description || "без описания"}`,
    `Фото: ${product.image ? "загружено" : "нет"}`,
    `На сайте: ${product.active === false ? "нет" : "да"}`
  ].join("\n");
}

async function saveTelegramPhoto(photos, id) {
  const photo = photos[photos.length - 1];
  const fileResult = await tgApi("getFile", { file_id: photo.file_id });
  const filePath = fileResult.result?.file_path;
  if (!filePath) return "";

  const ext = path.extname(filePath) || ".jpg";
  const response = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`);
  if (!response.ok) throw new Error("Cannot download Telegram photo");
  const buffer = Buffer.from(await response.arrayBuffer());
  const filename = `${id}${ext}`;
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

function formatOrder(order) {
  const method = order.fulfillment?.method === "pickup" ? "Самовывоз" : "Доставка";
  const payment = order.fulfillment?.payment === "online" ? "Онлайн-оплата" : "После связи менеджера";
  const readyText = formatReadyWindow(order.fulfillment);
  const lines = [
    `Заказ ${order.id}`,
    `Статус: ${STATUS_LABELS[order.status] || order.status}`,
    `Тип: ${order.type === "measurement" ? "Онлайн-замер" : "Корзина"}`,
    `Клиент: ${order.customer.name}`,
    `Телефон: ${order.customer.phone}`,
    order.customer.address ? `Адрес: ${order.customer.address}` : "",
    order.area ? `Площадь: ${order.area} м²` : "",
    `Получение: ${method}`,
    readyText ? `Готовность: ${readyText}` : "",
    `Оплата: ${payment}`,
    order.items.length ? `Товары:\n${order.items.map((item) => `- ${item.title} x ${formatQty(item.qty)} ${item.unit} = ${formatMoney(item.price * item.qty)}`).join("\n")}` : "",
    order.total ? `Итого: ${formatMoney(order.total)}` : "",
    order.comment ? `Комментарий: ${order.comment}` : "",
    `Создан: ${formatKyrgyzDateTime(order.createdAt)} Кыргызстан`
  ];
  return lines.filter(Boolean).join("\n");
}

function formatReadyWindow(fulfillment = {}) {
  if (fulfillment.readyAt) return `${formatKyrgyzDateTime(fulfillment.readyAt)} Кыргызстан`;
  if (fulfillment.readyDate && fulfillment.readyTime) return `${fulfillment.readyDate} ${fulfillment.readyTime} Кыргызстан`;
  return "";
}

function formatKyrgyzDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: KYRGYZ_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function orderKeyboard(order) {
  return {
    inline_keyboard: [
      [
        { text: "Принят", callback_data: `order:${order.id}:accepted` },
        { text: "В работе", callback_data: `order:${order.id}:in_work` }
      ],
      [
        { text: "Доставлен", callback_data: `order:${order.id}:delivered` },
        { text: "Отменен", callback_data: `order:${order.id}:canceled` }
      ]
    ]
  };
}

async function subscribeWatcher(chatId, fromId, chat = {}) {
  if (!canRegisterWatcher(fromId)) {
    return sendMessage(chatId, "Наблюдение доступно только менеджерам Линии Роста. Для доступа войдите в админ-панель.");
  }

  const watchers = await readJson(WATCHERS_FILE, []);
  const existing = watchers.find((watcher) => watcher.chatId === chatId);
  const item = {
    chatId,
    title: chat.title || chat.username || `chat ${chatId}`,
    createdBy: fromId,
    updatedAt: new Date().toISOString()
  };

  if (existing) Object.assign(existing, item);
  else watchers.unshift({ ...item, createdAt: new Date().toISOString() });

  await writeJson(WATCHERS_FILE, watchers);
  return sendMessage(chatId, "Наблюдение включено. В этот чат будут приходить новые заказы с сайта.\n\nЧтобы отключить: /watch_off");
}

async function unsubscribeWatcher(chatId) {
  const watchers = await readJson(WATCHERS_FILE, []);
  const nextWatchers = watchers.filter((watcher) => watcher.chatId !== chatId);
  await writeJson(WATCHERS_FILE, nextWatchers);
  return sendStartMenu(chatId, "Наблюдение отключено.");
}

async function notifyOrderWatchers(order) {
  if (!ENABLE_TELEGRAM_BOT || !TELEGRAM_BOT_TOKEN) return;
  const chatIds = await getNotificationChatIds();
  const message = `Новый заказ с сайта\n\n${formatOrder(order)}`;
  for (const chatId of chatIds) {
    await sendMessage(chatId, message);
  }
}

async function getNotificationChatIds() {
  const watchers = await readJson(WATCHERS_FILE, []);
  const chatIds = new Set([...TELEGRAM_ADMINS]);
  for (const watcher of watchers) {
    if (watcher.chatId) chatIds.add(String(watcher.chatId));
  }
  return [...chatIds];
}

async function sendAdminPanel(chatId, prefix = "Админ-панель Линии Роста") {
  return sendMessage(
    chatId,
    `${prefix}\n\nДоступно: добавить товар, изменить товар, последние заказы и сводка за неделю.`,
    adminKeyboard()
  );
}

function adminKeyboard() {
  return {
    keyboard: [
      [{ text: "➕ Добавить товар" }, { text: "✏️ Изменить товар" }],
      [{ text: "🧾 Последние заказы" }, { text: "📊 Сводка за неделю" }],
      [{ text: "📦 Товары" }, { text: "🚪 Выйти" }]
    ],
    resize_keyboard: true
  };
}

function cancelKeyboard() {
  return {
    keyboard: [[{ text: "❌ Отмена" }]],
    resize_keyboard: true
  };
}

async function sendMessage(chatId, textValue, replyMarkup) {
  return tgApi("sendMessage", {
    chat_id: chatId,
    text: textValue.slice(0, 4000),
    reply_markup: replyMarkup
  });
}

async function tgApi(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMoney(value) {
  return `${new Intl.NumberFormat("ru-RU").format(Number(value || 0))} сом`;
}
