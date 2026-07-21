const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");

loadEnv(path.join(ROOT, ".env"));

const PORT = Number(process.env.PORT || 4177);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_ADMINS = new Set(
  String(process.env.TELEGRAM_ADMIN_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
);
const ENABLE_TELEGRAM_BOT = process.env.ENABLE_TELEGRAM_BOT !== "false";
const TELEGRAM_BOT_MODE = process.env.TELEGRAM_BOT_MODE || (PUBLIC_BASE_URL.startsWith("https://") ? "webhook" : "polling");
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || "";
const COMPANY_WHATSAPP = process.env.COMPANY_WHATSAPP || "996990883883";

const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
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
      notifyAdmins(formatOrder(order), orderKeyboard(order)).catch((error) => {
        console.error("Telegram notification failed:", error.message);
      });
      return json(res, 201, { order });
    }

    if (req.method === "POST" && url.pathname.startsWith("/api/telegram/webhook/")) {
      if (!TELEGRAM_WEBHOOK_SECRET || url.pathname !== telegramWebhookPath()) {
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
        telegram: Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_ADMINS.size),
        telegramMode: TELEGRAM_BOT_MODE
      });
    }

    return serveStatic(req, res, url.pathname);
  } catch (error) {
    console.error(error);
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

function ensureStorage() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(PRODUCTS_FILE)) fs.writeFileSync(PRODUCTS_FILE, "[]\n");
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]\n");
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
  const safePath = pathname === "/" ? "/index.html" : decodeURIComponent(pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));
  if (!filePath.startsWith(PUBLIC_DIR)) return text(res, 403, "Forbidden");

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      const indexPath = path.join(PUBLIC_DIR, "index.html");
      return streamFile(res, indexPath);
    }
    return streamFile(res, filePath);
  });
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
  if (TELEGRAM_BOT_MODE === "webhook") {
    await setupTelegramWebhook();
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
    allowed_updates: ["message", "callback_query"]
  });
  console.log(`Telegram webhook connected: ${webhookUrl.replace(TELEGRAM_WEBHOOK_SECRET, "***")}`);
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

  if (!TELEGRAM_ADMINS.has(fromId)) {
    await sendMessage(chatId, "Доступ только для администраторов Линии Роста.");
    return;
  }

  const textValue = (message.text || message.caption || "").trim();
  const state = botState.get(fromId);

  if (textValue === "❌ Отмена" || textValue === "/cancel") {
    botState.delete(fromId);
    await sendMenu(chatId, "Действие отменено.");
    return;
  }

  if (state) return continueProductFlow(chatId, fromId, message, textValue, state);

  if (textValue === "/start" || textValue === "Меню") return sendMenu(chatId);
  if (textValue === "➕ Добавить товар" || textValue === "/addproduct") {
    botState.set(fromId, { flow: "product", step: "category", product: {} });
    return sendMessage(chatId, "Категория товара? Например: SPC ламинат, Профиля, Пленка.", cancelKeyboard());
  }
  if (textValue === "📦 Товары" || textValue === "/products") return sendProducts(chatId);
  if (textValue === "🧾 Заказы" || textValue === "/orders") return sendOrders(chatId);
  if (textValue === "📊 Сводка" || textValue === "/summary") return sendSummary(chatId);

  if (textValue.startsWith("/price ")) return updateProductPrice(chatId, textValue);
  if (textValue.startsWith("/stock ")) return updateProductStock(chatId, textValue);
  if (textValue.startsWith("/hide ")) return hideProduct(chatId, textValue);

  return sendMenu(chatId, "Выберите действие.");
}

async function continueProductFlow(chatId, adminId, message, textValue, state) {
  const product = state.product;

  if (state.step === "category") {
    product.category = trimText(textValue, 80);
    if (!product.category) return sendMessage(chatId, "Напишите категорию.");
    state.step = "title";
    return sendMessage(chatId, "Название товара?");
  }

  if (state.step === "title") {
    product.title = trimText(textValue, 160);
    if (!product.title) return sendMessage(chatId, "Напишите название.");
    state.step = "price";
    return sendMessage(chatId, "Цена в сомах? Только число. Если цена договорная, напишите 0.");
  }

  if (state.step === "price") {
    const price = Number(textValue.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) return sendMessage(chatId, "Нужна цена числом.");
    product.price = Math.round(price);
    state.step = "unit";
    return sendMessage(chatId, "Единица измерения? Например: шт, м², пог. м, рулон.");
  }

  if (state.step === "unit") {
    product.unit = trimText(textValue, 30) || "шт";
    state.step = "stock";
    return sendMessage(chatId, "Остаток/наличие? Например: 12 или 'в наличии'.");
  }

  if (state.step === "stock") {
    product.stock = trimText(textValue, 80) || "в наличии";
    state.step = "description";
    return sendMessage(chatId, "Описание товара. Можно коротко. Чтобы пропустить, напишите 'Пропустить'.");
  }

  if (state.step === "description") {
    product.description = /^пропустить$/i.test(textValue) ? "" : trimText(textValue, 800);
    state.step = "photo";
    return sendMessage(chatId, "Отправьте фото товара или напишите 'Пропустить'.");
  }

  if (state.step === "photo") {
    const id = `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    let image = "";
    if (message.photo && message.photo.length) {
      image = await saveTelegramPhoto(message.photo, id);
    } else if (!/^пропустить$/i.test(textValue)) {
      return sendMessage(chatId, "Отправьте фото или напишите 'Пропустить'.");
    }

    const savedProduct = {
      id,
      ...product,
      image,
      active: true,
      featured: false,
      createdAt: new Date().toISOString()
    };
    const products = await readJson(PRODUCTS_FILE, []);
    products.unshift(savedProduct);
    await writeJson(PRODUCTS_FILE, products);
    botState.delete(adminId);
    return sendMenu(chatId, `Товар добавлен: ${savedProduct.title}\nID: ${savedProduct.id}`);
  }
}

async function sendProducts(chatId) {
  const products = await readJson(PRODUCTS_FILE, []);
  const visible = products.filter((product) => product.active !== false).slice(0, 20);
  if (!visible.length) {
    return sendMessage(chatId, "Каталог пуст. Нажмите '➕ Добавить товар', чтобы загрузить первый товар.", mainKeyboard());
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
  return sendMessage(chatId, lines.join("\n\n"), mainKeyboard());
}

async function sendOrders(chatId) {
  const orders = await readJson(ORDERS_FILE, []);
  if (!orders.length) return sendMessage(chatId, "Заказов пока нет.", mainKeyboard());

  for (const order of orders.slice(0, 5)) {
    await sendMessage(chatId, formatOrder(order), orderKeyboard(order));
  }
}

async function sendSummary(chatId) {
  const products = await readJson(PRODUCTS_FILE, []);
  const orders = await readJson(ORDERS_FILE, []);
  const activeProducts = products.filter((product) => product.active !== false).length;
  const byStatus = STATUSES.map((status) => `${STATUS_LABELS[status]}: ${orders.filter((order) => order.status === status).length}`);
  const total = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  return sendMessage(
    chatId,
    [`Товаров на сайте: ${activeProducts}`, `Заказов всего: ${orders.length}`, `Сумма корзин: ${formatMoney(total)}`, ...byStatus].join("\n"),
    mainKeyboard()
  );
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
  await writeJson(PRODUCTS_FILE, products);
  return sendMessage(chatId, message, mainKeyboard());
}

async function handleCallback(query) {
  const fromId = String(query.from?.id || "");
  if (!TELEGRAM_ADMINS.has(fromId)) return;
  const [type, orderId, status] = String(query.data || "").split(":");
  if (type !== "order" || !STATUSES.includes(status)) return;

  const orders = await readJson(ORDERS_FILE, []);
  const order = orders.find((item) => item.id === orderId);
  if (!order) return tgApi("answerCallbackQuery", { callback_query_id: query.id, text: "Заказ не найден" });

  order.status = status;
  order.timeline = order.timeline || [];
  order.timeline.unshift({ status, at: new Date().toISOString() });
  await writeJson(ORDERS_FILE, orders);

  await tgApi("answerCallbackQuery", {
    callback_query_id: query.id,
    text: `Статус: ${STATUS_LABELS[status]}`
  });

  await sendMessage(String(query.message.chat.id), formatOrder(order), orderKeyboard(order));
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
  const lines = [
    `Заказ ${order.id}`,
    `Статус: ${STATUS_LABELS[order.status] || order.status}`,
    `Тип: ${order.type === "measurement" ? "Онлайн-замер" : "Корзина"}`,
    `Клиент: ${order.customer.name}`,
    `Телефон: ${order.customer.phone}`,
    order.customer.address ? `Адрес: ${order.customer.address}` : "",
    order.area ? `Площадь: ${order.area} м²` : "",
    `Получение: ${method}`,
    `Оплата: ${payment}`,
    order.items.length ? `Товары:\n${order.items.map((item) => `- ${item.title} x ${formatQty(item.qty)} ${item.unit} = ${formatMoney(item.price * item.qty)}`).join("\n")}` : "",
    order.total ? `Итого: ${formatMoney(order.total)}` : "",
    order.comment ? `Комментарий: ${order.comment}` : "",
    `Создан: ${new Date(order.createdAt).toLocaleString("ru-RU")}`
  ];
  return lines.filter(Boolean).join("\n");
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

async function sendMenu(chatId, prefix = "Админ-панель Линии Роста") {
  return sendMessage(chatId, `${prefix}\n\nКоманды: /products, /orders, /summary, /addproduct`, mainKeyboard());
}

function mainKeyboard() {
  return {
    keyboard: [
      [{ text: "➕ Добавить товар" }, { text: "📦 Товары" }],
      [{ text: "🧾 Заказы" }, { text: "📊 Сводка" }]
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

async function notifyAdmins(textValue, replyMarkup) {
  if (!ENABLE_TELEGRAM_BOT || !TELEGRAM_BOT_TOKEN || !TELEGRAM_ADMINS.size) return;
  for (const adminId of TELEGRAM_ADMINS) {
    await sendMessage(adminId, textValue, replyMarkup);
  }
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
