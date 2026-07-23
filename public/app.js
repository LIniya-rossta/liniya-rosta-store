const routes = new Set(["/", "/catalog", "/cart", "/checkout", "/success", "/measure", "/installer"]);
const money = new Intl.NumberFormat("ru-RU");
const KYRGYZ_TIME_ZONE = "Asia/Bishkek";
const previewProducts = [
  {
    id: "preview-laminate",
    title: "SPC ламинат «Дуб Медио»",
    category: "SPC ламинат",
    price: 1800,
    unit: "м²",
    stock: "1000 м²",
    description: "Влагостойкое покрытие с чистой древесной фактурой для квартир, студий и коммерции.",
    image: "/assets/product-laminate-1.jpg",
    imageFit: "cover",
    preview: true
  },
  {
    id: "preview-profile",
    title: "Профиль парящий Air X",
    category: "Профиля",
    price: 650,
    unit: "пог. м",
    stock: "100 пог. м",
    description: "Легкий акцент для потолков, подсветки и аккуратной геометрии интерьера.",
    image: "/assets/product-profile-1.png",
    imageFit: "contain",
    preview: true
  },
  {
    id: "preview-film",
    title: "ПВХ пленка для потолков",
    category: "Пленка",
    price: 160,
    unit: "м²",
    stock: "1000 м²",
    description: "Матовые, сатиновые и фактурные варианты для ровного потолочного полотна.",
    image: "/assets/product-film-1.png",
    imageFit: "contain",
    preview: true
  },
  {
    id: "preview-tool",
    title: "Лопатка монтажная",
    category: "Инструмент",
    price: 0,
    unit: "шт",
    stock: "100 шт",
    description: "Монтажные мелочи, которые помогают собрать чистый и точный результат.",
    image: "/assets/product-tool-1.png",
    imageFit: "contain",
    preview: true
  }
];

const reviews = [
  {
    name: "Maria Н",
    service: "Натяжной потолок",
    rating: 5,
    text: "Хорошие и грамотные мастера. Переделывали натяжной потолок после других специалистов. Все исправили быстро и аккуратно."
  },
  {
    name: "destino_",
    service: "SPC ламинат",
    rating: 5,
    text: "Купили SPC ламинат в Линии Роста. Прошло 9 месяцев, покрытие показало себя очень достойно."
  },
  {
    name: "Клиент 2ГИС",
    service: "Доставка",
    rating: 5,
    text: "Выручили вечером, быстро согласовали и предложили доставку. Привезли как надо, с накладной."
  }
];

const state = {
  products: [],
  category: "Все",
  search: "",
  cart: loadCart(),
  lastOrder: loadLastOrder(),
  theme: "dark",
  managerOptions: [],
  managersLoading: false,
  managersLoaded: false,
  installerSketch: createDefaultSketch(),
  installerPhoto: null
};

const elements = {
  app: document.getElementById("app"),
  header: document.getElementById("storeHeader"),
  progress: document.getElementById("progressLine"),
  cartCount: document.getElementById("cartCount"),
  toast: document.getElementById("toast"),
  whatsappHeader: document.getElementById("whatsappHeader")
};

init();

async function init() {
  elements.whatsappHeader.href = whatsAppLink("Здравствуйте! Пишу с сайта Линия Роста.");
  applyTheme(state.theme);
  bindGlobalEvents();
  await loadProducts();
  renderRoute();
}

function bindGlobalEvents() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-link]");
    if (!link) return;
    const url = new URL(link.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    navigate(url.pathname + url.search);
  });

  window.addEventListener("popstate", renderRoute);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    const data = await response.json();
    state.products = Array.isArray(data.products) ? data.products : [];
    pruneCart();
  } catch {
    toast("Каталог временно не загрузился. Проверьте сервер.");
  }
}

function renderRoute() {
  const pathname = normalizePath(window.location.pathname);
  const route = routes.has(pathname) ? pathname : "/";
  document.body.dataset.route = route.slice(1) || "home";
  updateCartCount();
  updateActiveNav(route);

  if (route === "/") renderHome();
  if (route === "/catalog") renderCatalog();
  if (route === "/cart") renderCartPage();
  if (route === "/checkout") renderCheckout();
  if (route === "/success") renderSuccess();
  if (route === "/measure") renderMeasure();
  if (route === "/installer") renderInstaller();

  requestAnimationFrame(() => {
    observeReveal();
    updateHeader();
    window.scrollTo(0, 0);
  });
}

function renderHome() {
  const homeProducts = getHomeProducts();
  elements.app.innerHTML = `
    <section class="hero page-section">
      <div class="hero-media">
        <video autoplay muted loop playsinline poster="/assets/product-laminate-1.jpg">
          <source src="/assets/showroom-video.mp4" type="video/mp4">
        </video>
      </div>
      <div class="architect-grid" aria-hidden="true"></div>
      <div class="halo-lines" aria-hidden="true"><span></span><span></span><span></span><span></span></div>

      <div class="hero-inner reveal">
        <p class="overline">Бишкек · Куренкеева 49</p>
        <h1>Интернет-магазин отделочных решений</h1>
        <p>
          Потолки, световые профили, SPC ламинат и комплектующие для аккуратного ремонта.
        </p>
        <div class="action-row">
          <a class="btn btn-primary" href="${whatsAppLink("Здравствуйте! Хочу связаться с Линией Роста.")}" target="_blank" rel="noreferrer">Связаться с нами</a>
          <a class="btn btn-primary" href="/catalog" data-link>Перейти в каталог</a>
          <a class="btn btn-soft" href="/measure" data-link>Заказать замер от 50 м²</a>
          <a class="btn btn-soft" href="/installer" data-link>Пространство для монтажников</a>
        </div>
      </div>

    </section>

    <section class="page-section home-catalog">
      <div class="section-title reveal">
        <span class="overline">Витрина</span>
        <h2>Популярные категории</h2>
        <p>Ламинат, профили, пленка и монтажные аксессуары.</p>
      </div>
      <div class="product-grid preview-grid reveal">
        ${homeProducts.map((product) => productCard(product)).join("")}
      </div>
      <div class="center-row reveal">
        <a class="btn btn-primary" href="/catalog" data-link>Открыть весь каталог</a>
      </div>
    </section>

    ${reviewsSection()}
    ${measurePromo()}
    ${contactsSection()}
  `;
  bindProductButtons();
}

function renderCatalog() {
  const visibleProducts = getStoreProducts();
  const filtered = filterProducts(visibleProducts);

  elements.app.innerHTML = `
    <section class="shop-page page-section">
      <div class="shop-title reveal">
        <div>
          <span class="overline">Каталог</span>
          <h1>Товары Линии Роста</h1>
          <p>Добавьте товары в корзину и оформите заказ.</p>
        </div>
        <a class="btn btn-soft" href="/cart" data-link>Корзина</a>
      </div>

      <div class="catalog-bar reveal">
        <label class="search-box">
          <span>Поиск</span>
          <input id="searchInput" type="search" value="${escapeHtml(state.search)}" placeholder="Ламинат, профиль, пленка">
        </label>
        <div class="category-row" id="categoryRow">
          ${catalogCategories(visibleProducts).map((category) => `
            <button class="${category === state.category ? "is-active" : ""}" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>
          `).join("")}
        </div>
      </div>

      <div class="product-grid" id="catalogGrid">
        ${filtered.map((product) => productCard(product)).join("") || emptySearch()}
      </div>
    </section>
  `;
  bindCatalogControls();
  bindProductButtons();
}

function renderCartPage() {
  const lines = getCartLines();
  elements.app.innerHTML = `
    <section class="cart-page page-section">
      <div class="shop-title reveal">
        <div>
          <span class="overline">Корзина</span>
          <h1>Ваш заказ</h1>
          <p>Проверьте позиции и количество, затем переходите к оформлению заказа.</p>
        </div>
        <a class="btn btn-soft" href="/catalog" data-link>Вернуться в каталог</a>
      </div>

      ${lines.length ? cartLayout(lines) : emptyCart()}
    </section>
  `;
  bindCartControls();
}

function renderCheckout() {
  const lines = getCartLines();
  const ready = kyrgyzInputDateTime();
  elements.app.innerHTML = `
    <section class="checkout-page page-section">
      <div class="shop-title reveal">
        <div>
          <span class="overline">Оформление</span>
          <h1>Данные заказа</h1>
          <p>Контакты, адрес и способ получения перед отправкой менеджеру.</p>
        </div>
        <a class="btn btn-soft" href="/cart" data-link>Назад в корзину</a>
      </div>

      <div class="checkout-grid reveal">
        <form class="checkout-card checkout-form" id="checkoutForm">
          <label><span>Имя</span><input name="name" required autocomplete="name" placeholder="Ваше имя"></label>
          <label><span>Телефон</span><input name="phone" required autocomplete="tel" inputmode="tel" value="+996 " placeholder="+996 ..." data-phone-autocode="+996 "></label>
          <label class="full" id="checkoutAddressField"><span>Адрес доставки</span><input name="address" required autocomplete="street-address" placeholder="Район, улица, дом"></label>

          <fieldset>
            <legend>Получение</legend>
            <label><input type="radio" name="method" value="delivery" checked> Доставка</label>
            <label><input type="radio" name="method" value="pickup"> Самовывоз</label>
          </fieldset>

          <div class="ready-field ready-date-field" data-ready-date-field>
            <span>Дата готовности</span>
            <button class="ready-trigger" type="button" id="readyDateButton" aria-expanded="false" aria-controls="readyCalendar" data-ready-date-button>
              <strong id="readyDateLabel" data-ready-date-label>${escapeHtml(formatReadyDateLabel(ready.date))}</strong>
              <i aria-hidden="true"></i>
            </button>
            <input name="readyDate" type="hidden" value="${ready.date}" data-ready-date>
            <div class="ready-calendar" id="readyCalendar" data-ready-calendar hidden>
              ${calendarTemplate(ready.date, ready.date)}
            </div>
          </div>
          <div class="ready-field ready-time-field">
            <span>Время, Кыргызстан</span>
            <div class="ready-time-control">
              <button type="button" data-time-step="-15" aria-label="Уменьшить время">−</button>
              <strong id="readyTimeLabel" data-ready-time-label>${escapeHtml(ready.time)}</strong>
              <button type="button" data-time-step="15" aria-label="Увеличить время">+</button>
            </div>
            <input name="readyTime" type="hidden" value="${ready.time}" data-ready-time>
          </div>

          <label class="full"><span>Комментарий</span><textarea name="comment" rows="4" placeholder="Этаж, подъезд, удобное время, вопросы"></textarea></label>
          <button class="btn btn-primary full" type="submit" ${lines.length ? "" : "disabled"}>Оформить заказ</button>
          <p class="form-note full" id="checkoutNote">${lines.length ? "" : "Корзина пустая. Добавьте товары в каталоге."}</p>
        </form>

        <aside class="checkout-card order-summary">
          <span class="overline">Итого</span>
          ${checkoutSummary(lines)}
        </aside>
      </div>
    </section>
  `;
  const form = document.getElementById("checkoutForm");
  bindPhoneInputs();
  bindFulfillmentControls();
  bindReadyControls();
  form?.addEventListener("submit", submitCheckout);
}

function renderMeasure() {
  elements.app.innerHTML = `
    <section class="measure-page page-section">
      <div class="measure-hero reveal">
        <span class="overline">Онлайн-заявка</span>
        <h1>Замер от 50 м²</h1>
        <p>Для больших объектов: потолки, тихие стены, ламинат, световые линии и комплексный расчет.</p>
      </div>

      <div class="checkout-grid reveal">
        <form class="checkout-card checkout-form" id="measureForm">
          <label><span>Имя</span><input name="name" required autocomplete="name" placeholder="Как к вам обращаться"></label>
          <label><span>Телефон</span><input name="phone" required autocomplete="tel" inputmode="tel" value="+996 " placeholder="+996 ..." data-phone-autocode="+996 "></label>
          <label><span>Адрес объекта</span><input name="address" required autocomplete="street-address" placeholder="Район, улица, дом"></label>
          <label><span>Площадь, м²</span><input name="area" required type="number" min="50" value="50"></label>
          <label class="full"><span>Комментарий</span><textarea name="comment" rows="4" placeholder="Что рассчитать: потолок, пол, свет, стены"></textarea></label>
          <button class="btn btn-primary full" type="submit">Отправить заявку</button>
          <p class="form-note full" id="measureNote"></p>
        </form>
        <aside class="measure-panel checkout-card">
          <strong>50 м²+</strong>
          <p>Минимальная площадь для онлайн-заявки. Для меньших заказов лучше написать в WhatsApp или собрать корзину.</p>
          <a class="btn btn-soft" href="${whatsAppLink("Здравствуйте! Хочу уточнить расчет по объекту.")}" target="_blank" rel="noreferrer">Написать в WhatsApp</a>
        </aside>
      </div>
    </section>
  `;
  bindPhoneInputs();
  document.getElementById("measureForm")?.addEventListener("submit", submitMeasure);
}

function renderInstaller() {
  const ready = kyrgyzInputDateTime();
  const materials = installerMaterials();

  elements.app.innerHTML = `
    <section class="installer-page page-section">
      <div class="shop-title reveal">
        <div>
          <span class="overline">Монтажникам</span>
          <h1>Чертеж и заявка на полотно</h1>
          <p>Выберите материал, менеджера и отправьте замер напрямую в Telegram.</p>
        </div>
        <a class="btn btn-soft" href="/catalog" data-link>Каталог</a>
      </div>

      <div class="installer-workspace reveal">
        <section class="checkout-card sketch-card">
          <div class="panel-head">
            <div>
              <span class="overline">Easy-замер</span>
              <h2>Контур полотна</h2>
            </div>
            <div class="sketch-actions">
              <button type="button" data-sketch-template="rectangle">Прямоугольник</button>
              <button type="button" data-sketch-autofit>Выровнять</button>
              <button type="button" data-sketch-reset>Сброс</button>
              <button type="button" data-sketch-undo>Назад</button>
            </div>
          </div>
          <div class="sketch-board" id="sketchBoard">
            ${sketchTemplate()}
          </div>
          <div class="sketch-meta" id="sketchMeta">
            ${sketchMetaTemplate()}
          </div>
          <div class="sketch-builder" id="sketchBuilder">
            ${sketchBuilderTemplate()}
          </div>
          <div class="sketch-dimensions" id="sketchDimensions">
            ${sketchDimensionsTemplate()}
          </div>
          <label class="sketch-upload">
            <span>Фото чертежа</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" id="installerPhoto">
            <strong id="installerPhotoLabel">Прикрепить фото</strong>
          </label>
          <div class="photo-preview" id="installerPhotoPreview"></div>
          <button class="btn btn-soft full" type="button" data-ai-draft>Распознать фото в чертеж</button>
        </section>

        <form class="checkout-card checkout-form installer-form" id="installerForm">
          <label><span>Имя монтажника</span><input name="name" required autocomplete="name" placeholder="Ваше имя"></label>
          <label><span>Телефон</span><input name="phone" required autocomplete="tel" inputmode="tel" value="+996 " placeholder="+996 ..." data-phone-autocode="+996 "></label>
          <label class="full"><span>Адрес объекта</span><input name="objectAddress" required autocomplete="street-address" placeholder="Район, улица, дом"></label>
          ${materialPickerTemplate(materials)}
          <label>
            <span>Менеджер</span>
            <select name="managerId" required>
              ${managerOptionsTemplate()}
            </select>
          </label>
          <label><span>Площадь, м²</span><input name="area" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Например 42.5"></label>
          <label><span>Периметр, м</span><input name="perimeter" type="number" min="0" step="0.1" inputmode="decimal" placeholder="Например 28.4"></label>

          <fieldset>
            <legend>Получение</legend>
            <label><input type="radio" name="method" value="delivery" checked> Доставка</label>
            <label><input type="radio" name="method" value="pickup"> Самовывоз</label>
          </fieldset>

          <label class="full" id="installerDeliveryAddressField"><span>Адрес доставки</span><input name="deliveryAddress" required placeholder="Куда доставить готовое полотно"></label>

          <div class="ready-field ready-date-field" data-ready-date-field>
            <span>Дата готовности</span>
            <button class="ready-trigger" type="button" aria-expanded="false" data-ready-date-button>
              <strong data-ready-date-label>${escapeHtml(formatReadyDateLabel(ready.date))}</strong>
              <i aria-hidden="true"></i>
            </button>
            <input name="readyDate" type="hidden" value="${ready.date}" data-ready-date>
            <div class="ready-calendar" data-ready-calendar hidden>
              ${calendarTemplate(ready.date, ready.date)}
            </div>
          </div>
          <div class="ready-field ready-time-field">
            <span>Время, Кыргызстан</span>
            <div class="ready-time-control">
              <button type="button" data-time-step="-15" aria-label="Уменьшить время">−</button>
              <strong data-ready-time-label>${escapeHtml(ready.time)}</strong>
              <button type="button" data-time-step="15" aria-label="Увеличить время">+</button>
            </div>
            <input name="readyTime" type="hidden" value="${ready.time}" data-ready-time>
          </div>

          <label class="full"><span>Комментарий</span><textarea name="comment" rows="4" placeholder="Ниши, трубы, углы, пожелания по доставке"></textarea></label>
          <button class="btn btn-primary full" type="submit">Отправить менеджеру</button>
          <p class="form-note full" id="installerNote"></p>
        </form>
      </div>
    </section>
  `;

  if (!state.managersLoaded && !state.managersLoading) loadManagers().then(() => {
    if (normalizePath(window.location.pathname) === "/installer") renderInstaller();
  });
  bindPhoneInputs();
  bindReadyControls("installerForm");
  bindInstallerFulfillmentControls();
  bindInstallerSketch();
  bindInstallerPhoto();
  bindInstallerMaterialPicker();
  document.getElementById("installerForm")?.addEventListener("submit", submitInstallerRequest);
}

function renderSuccess() {
  const order = state.lastOrder;
  const orderId = new URLSearchParams(window.location.search).get("order");
  const visibleOrderId = order?.id || orderId;
  elements.app.innerHTML = `
    <section class="success-page page-section">
      <div class="success-card">
        <div class="success-mark" aria-hidden="true">
          <img src="/assets/logo.png" alt="">
          <span></span>
          <i></i><i></i><i></i><i></i><i></i><i></i>
        </div>
        <span class="overline">Благодарим</span>
        <h1>Заявка принята</h1>
        <p>${visibleOrderId ? `Номер заказа: ${escapeHtml(visibleOrderId)}.` : "Заявка отправлена."} Менеджер свяжется с вами для подтверждения.</p>
        <div class="action-row center-actions">
          <a class="btn btn-primary" href="/catalog" data-link>Вернуться в каталог</a>
          <a class="btn btn-soft" href="/" data-link>На главную</a>
        </div>
      </div>
    </section>
  `;
}

function productCard(product) {
  const productTitle = escapeHtml(product.title);
  const fit = productImageFit(product);
  const hasPrice = Number(product.price) > 0;
  const unit = product.unit || "шт";
  return `
    <article class="product-card" data-product-card>
      <a class="product-image is-${fit}" href="/catalog" data-link>
        ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${productTitle}" loading="lazy">` : `<span>${escapeHtml(initials(product.title))}</span>`}
      </a>
      <div class="product-info">
        <div class="product-tags">
          <span>${escapeHtml(product.category || "Каталог")}</span>
          <span>${escapeHtml(product.stock || "наличие уточняется")}</span>
        </div>
        <h3>${productTitle}</h3>
        <p>${escapeHtml(product.description || "Описание будет добавлено администратором.")}</p>
        <div class="product-bottom">
          <strong>${hasPrice ? formatMoney(product.price) : "Цена по запросу"}</strong>
          ${hasPrice ? `<small>/ ${escapeHtml(unit)}</small>` : ""}
        </div>
        <div class="product-cart-control" data-card-control="${escapeHtml(product.id)}">
          ${productCardCartControl(product)}
        </div>
      </div>
    </article>
  `;
}

function productCardCartControl(product) {
  const productId = product.id;
  const qty = state.cart[productId] || 0;
  const unit = product.unit || "шт";
  if (qty > 0) {
    const step = isMeasuredUnit(unit) ? "0.1" : "1";
    const min = isMeasuredUnit(unit) ? "0.1" : "1";
    return `
      <div class="card-qty-control">
        <button type="button" data-card-minus="${escapeHtml(productId)}" aria-label="Уменьшить количество">−</button>
        <label>
          <input type="number" min="${min}" step="${step}" inputmode="decimal" value="${escapeHtml(inputQtyValue(qty))}" data-card-qty-input="${escapeHtml(productId)}">
          <span>${escapeHtml(unit)}</span>
        </label>
        <button type="button" data-card-plus="${escapeHtml(productId)}" aria-label="Увеличить количество">+</button>
      </div>
    `;
  }

  return `<button class="add-to-cart" type="button" data-add="${escapeHtml(productId)}">Добавить в корзину</button>`;
}

function cartLayout(lines) {
  return `
    <div class="cart-grid reveal">
      <div class="cart-list">
        ${lines.map(({ product, qty }) => `
          <article class="cart-item">
            <div class="cart-item-media">
              ${product.image ? `<img src="${escapeHtml(product.image)}" alt="">` : `<span>${escapeHtml(initials(product.title))}</span>`}
            </div>
            <div>
              <span class="overline">${escapeHtml(product.category || "Каталог")}</span>
              <h3>${escapeHtml(product.title)}</h3>
              <p>${formatMoney(product.price)} / ${escapeHtml(product.unit || "шт")}</p>
            </div>
            ${cartQuantityControl(product, qty)}
            <strong class="line-total">${formatMoney(Number(product.price || 0) * qty)}</strong>
          </article>
        `).join("")}
      </div>
      <aside class="checkout-card order-summary sticky-summary">
        <span class="overline">Сумма заказа</span>
        ${checkoutSummary(lines)}
        <a class="btn btn-primary full" href="/checkout" data-link>Перейти к оформлению</a>
      </aside>
    </div>
  `;
}

function checkoutSummary(lines) {
  if (!lines.length) return `<p>Корзина пустая.</p>`;
  const total = cartTotal(lines);
  return `
    <div class="summary-lines">
      ${lines.map(({ product, qty }) => `
        <div>
          <span>${escapeHtml(product.title)} × ${formatQty(qty)} ${escapeHtml(product.unit || "шт")}</span>
          <strong>${formatMoney(Number(product.price || 0) * qty)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="summary-total">
      <span>Итого</span>
      <strong>${formatMoney(total)}</strong>
    </div>
  `;
}

function emptyCart() {
  return `
    <div class="empty-shop reveal">
      <div class="empty-animation" aria-hidden="true"><span></span><span></span><span></span></div>
      <h2>Корзина пока пустая</h2>
      <p>Добавьте товары из каталога, а затем оформите заказ с доставкой или самовывозом.</p>
      <a class="btn btn-primary" href="/catalog" data-link>Перейти в каталог</a>
    </div>
  `;
}

function emptySearch() {
  if (!state.products.length) {
    return `
      <div class="empty-shop">
        <h2>Каталог загружается</h2>
        <p>Обновите страницу через пару секунд. Если товары не появились, проверьте интернет или Render.</p>
      </div>
    `;
  }

  return `
    <div class="empty-shop">
      <h2>Ничего не найдено</h2>
      <p>Попробуйте другую категорию или поиск.</p>
    </div>
  `;
}

function reviewsSection() {
  return `
    <section class="page-section reviews-section">
      <div class="section-title reveal">
        <span class="overline">Отзывы</span>
        <h2>Что говорят клиенты</h2>
        <p>Клиенты отмечают аккуратную работу, быстрые ответы и помощь с материалами.</p>
      </div>
      <div class="review-grid reveal">
        ${reviews.map((review) => `
          <article class="review-card">
            <div class="stars">${"★".repeat(review.rating)}</div>
            <p>${escapeHtml(review.text)}</p>
            <footer>
              <strong>${escapeHtml(review.name)}</strong>
              <span>${escapeHtml(review.service)}</span>
            </footer>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function measurePromo() {
  return `
    <section class="page-section measure-promo">
      <div class="measure-promo-copy reveal">
        <span class="overline">Замер онлайн</span>
        <h2>Большой объект? Отправьте заявку отдельно от корзины</h2>
        <p>Для площадей от 50 м² заявка оформляется отдельно от корзины. Это удобно для квартир, домов и коммерческих объектов.</p>
        <a class="btn btn-primary" href="/measure" data-link>Заказать замер</a>
      </div>
      <div class="measure-promo-visual reveal" aria-hidden="true">
        <span>50 м²+</span>
      </div>
    </section>
  `;
}

function contactsSection() {
  return `
    <section class="page-section contacts-section">
      <div class="contacts-copy reveal">
        <span class="overline">Шоурум</span>
        <h2>Куренкеева 49, Бишкек</h2>
        <p>Пн-Сб 09:00-19:00. Можно приехать в шоурум, посмотреть материалы и обсудить расчет.</p>
        <div class="action-row">
          <a class="btn btn-primary" href="${whatsAppLink("Здравствуйте! Хочу приехать в шоурум Линия Роста.")}" target="_blank" rel="noreferrer">WhatsApp</a>
          <a class="btn btn-soft" href="https://2gis.kg/bishkek/firm/70000001094990183" target="_blank" rel="noreferrer">Открыть 2ГИС</a>
        </div>
      </div>
      <div class="map-shell reveal">
        <iframe title="Карта Линия Роста" src="https://www.openstreetmap.org/export/embed.html?bbox=74.618804%2C42.887143%2C74.628804%2C42.893143&layer=mapnik&marker=42.890143%2C74.623804" loading="lazy"></iframe>
      </div>
    </section>
  `;
}

function installerMaterials() {
  const products = getStoreProducts().filter((product) => product.active !== false);
  return products.sort((a, b) => installerMaterialScore(b) - installerMaterialScore(a));
}

function installerMaterialScore(product) {
  const text = `${product.title || ""} ${product.category || ""} ${product.unit || ""}`.toLowerCase();
  if (text.includes("плен") || text.includes("полотн")) return 3;
  if (text.includes("м²") || text.includes("м2") || text.includes("кв")) return 2;
  if (text.includes("проф") || text.includes("багет")) return 1;
  return 0;
}

function materialPickerTemplate(materials) {
  const selected = materials[0] || {};
  const categories = ["Все", ...new Set(materials.map((product) => product.category || "Без категории"))];
  return `
    <div class="material-picker full" id="installerMaterialPicker">
      <span class="field-title">Материал</span>
      <input type="hidden" name="materialId" value="${escapeHtml(selected.id || "")}">
      <button class="material-trigger" type="button" aria-expanded="false" data-material-trigger>
        ${materialTriggerContent(selected)}
      </button>
      <div class="material-panel" data-material-panel hidden>
        <div class="material-panel-head">
          <input type="search" inputmode="search" placeholder="Найти пленку, профиль, обои..." data-material-search>
        </div>
        <div class="material-tabs" aria-label="Категории материалов">
          ${categories.map((category, index) => `<button type="button" data-material-category="${escapeHtml(category)}" class="${index === 0 ? "is-active" : ""}">${escapeHtml(category)}</button>`).join("")}
        </div>
        <div class="material-options">
          ${materials.map((product, index) => materialOptionTemplate(product, index === 0)).join("")}
        </div>
      </div>
    </div>
  `;
}

function materialTriggerContent(product) {
  if (!product?.id) {
    return `
      <span class="material-thumb is-empty"></span>
      <span class="material-trigger-text">
        <strong>Материалы не загружены</strong>
        <small>Проверьте каталог</small>
      </span>
      <i aria-hidden="true"></i>
    `;
  }
  return `
    ${materialThumb(product)}
    <span class="material-trigger-text">
      <strong>${escapeHtml(product.title || "Материал")}</strong>
      <small>${escapeHtml(materialMeta(product))}</small>
    </span>
    <i aria-hidden="true"></i>
  `;
}

function materialOptionTemplate(product, selected = false) {
  const searchable = `${product.title || ""} ${product.category || ""} ${product.description || ""} ${product.stock || ""}`.toLowerCase();
  return `
    <button
      class="material-option ${selected ? "is-selected" : ""}"
      type="button"
      data-material-option="${escapeHtml(product.id)}"
      data-material-category-value="${escapeHtml(product.category || "Без категории")}"
      data-material-search-value="${escapeHtml(searchable)}"
    >
      ${materialThumb(product)}
      <span class="material-option-body">
        <span class="material-option-top">
          <strong>${escapeHtml(product.title || "Материал")}</strong>
          <em>${escapeHtml(product.price ? `${formatMoney(product.price)} / ${product.unit || "шт"}` : "Цена по запросу")}</em>
        </span>
        <small>${escapeHtml(materialMeta(product))}</small>
        ${product.description ? `<span class="material-description">${escapeHtml(product.description)}</span>` : ""}
      </span>
    </button>
  `;
}

function materialThumb(product) {
  if (product?.image) {
    return `<span class="material-thumb"><img src="${escapeHtml(product.image)}" alt=""></span>`;
  }
  const letter = String(product?.category || product?.title || "M").trim().charAt(0).toUpperCase();
  return `<span class="material-thumb is-empty">${escapeHtml(letter)}</span>`;
}

function materialMeta(product) {
  return [
    product.category || "Без категории",
    product.stock || "",
    product.unit ? `ед.: ${product.unit}` : ""
  ].filter(Boolean).join(" · ");
}

function managerOptionsTemplate() {
  if (state.managerOptions.length) {
    return state.managerOptions
      .map((manager) => `<option value="${escapeHtml(manager.id)}">${escapeHtml(manager.name)}</option>`)
      .join("");
  }
  if (state.managersLoaded) return `<option value="">Менеджеры не настроены</option>`;
  return `<option value="">Менеджеры загружаются</option>`;
}

async function loadManagers() {
  state.managersLoading = true;
  try {
    const response = await fetch("/api/managers/public");
    const data = await response.json();
    state.managerOptions = Array.isArray(data.managers) ? data.managers : [];
  } catch {
    toast("Менеджеры временно не загрузились.");
  } finally {
    state.managersLoading = false;
    state.managersLoaded = true;
  }
}

function createDefaultSketch() {
  return {
    points: [
      { label: "A", x: 120, y: 90 },
      { label: "B", x: 520, y: 90 },
      { label: "C", x: 520, y: 330 },
      { label: "D", x: 120, y: 330 }
    ],
    dimensions: {
      "A-B": 3.45,
      "B-C": 2.9,
      "C-D": 3.45,
      "D-A": 2.9
    },
    diagonals: {},
    holes: [],
    activeEdgeKey: "A-B",
    shapeType: "rectangle",
    aiDraft: false
  };
}

function createLShapeSketch() {
  return {
    points: [
      { label: "A", x: 70, y: 70 },
      { label: "B", x: 570, y: 70 },
      { label: "C", x: 570, y: 350 },
      { label: "D", x: 255, y: 350 },
      { label: "E", x: 255, y: 145 },
      { label: "F", x: 70, y: 145 }
    ],
    dimensions: {
      "A-B": 3.45,
      "B-C": 2.9,
      "C-D": 2.2,
      "D-E": 2.2,
      "E-F": 1.2,
      "F-A": 0.75
    },
    diagonals: {},
    holes: [],
    activeEdgeKey: "A-B",
    shapeType: "lshape",
    aiDraft: false
  };
}

function sketchTemplate() {
  const points = state.installerSketch.points;
  const holes = state.installerSketch.holes || [];
  const activeEdge = resolveSketchEdge();
  const pointString = points.map((point) => `${point.x},${point.y}`).join(" ");
  const edgeLabels = sketchEdges(points).map((edge) => sketchEdgeLabel(edge, state.installerSketch.dimensions[edge.key])).join("");
  const diagonals = sketchDiagonals(points);
  const diagonalLines = diagonals.map((diagonal) => {
    const value = state.installerSketch.diagonals[diagonal.key];
    if (!value) return "";
    return `
      <line class="sketch-diagonal" x1="${diagonal.from.x}" y1="${diagonal.from.y}" x2="${diagonal.to.x}" y2="${diagonal.to.y}"></line>
      ${sketchTextLabel(diagonal.midpoint, diagonal.key, value, "sketch-size-label is-diagonal")}
    `;
  }).join("");
  const circles = points.map((point, index) => `
    <g class="sketch-point" data-sketch-point="${index}">
      <circle cx="${point.x}" cy="${point.y}" r="13"></circle>
      <text x="${point.x}" y="${point.y + 5}">${escapeHtml(point.label)}</text>
    </g>
  `).join("");

  return `
    <svg class="sketch-svg" viewBox="0 0 640 420" role="img" aria-label="Чертеж потолка">
      <defs>
        <linearGradient id="sketchLine" x1="0" x2="1">
          <stop offset="0" stop-color="#63e6ff"></stop>
          <stop offset="1" stop-color="#f3dca8"></stop>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="638" height="418" rx="30"></rect>
      ${points.length >= 3 ? `<polygon points="${pointString}"></polygon>` : ""}
      ${points.length >= 2 ? `<polyline points="${pointString}${points.length >= 3 ? ` ${points[0].x},${points[0].y}` : ""}"></polyline>` : ""}
      ${activeEdge ? `<line class="sketch-active-edge" x1="${activeEdge.from.x}" y1="${activeEdge.from.y}" x2="${activeEdge.to.x}" y2="${activeEdge.to.y}"></line>` : ""}
      ${diagonalLines}
      ${edgeLabels}
      ${holes.map((hole) => sketchHoleTemplate(hole)).join("")}
      ${circles}
    </svg>
  `;
}

function sketchHoleTemplate(hole) {
  const radius = hole.type === "lamp" ? 19 : hole.type === "spot" ? 11 : 9;
  return `
    <g class="sketch-hole is-${escapeHtml(hole.type || "other")}">
      <circle cx="${escapeHtml(hole.x)}" cy="${escapeHtml(hole.y)}" r="${radius}"></circle>
      <text x="${escapeHtml(hole.x)}" y="${escapeHtml(Number(hole.y || 0) + radius + 17)}">${escapeHtml(hole.label || holeTypeLabel(hole.type))}</text>
    </g>
  `;
}

function holeTypeLabel(type) {
  return {
    pipe: "Труба",
    lamp: "Люстра",
    spot: "Точка",
    other: "Отверстие"
  }[type] || "Отверстие";
}

function normalizeAiShapeType(shapeType, pointsCount) {
  const value = String(shapeType || "").toLowerCase();
  if (value.includes("г") || value.includes("l") || value.includes("l-shape") || (pointsCount >= 6 && pointsCount <= 10)) return "lshape";
  if (value.includes("rect") || value.includes("прям") || pointsCount === 4) return "rectangle";
  return "custom";
}

function sketchTextLabel(point, key, value, className) {
  const label = value ? `${key}: ${formatQty(value)} м` : key;
  const width = Math.max(76, label.length * 8 + 20);
  return `
    <g class="${className}">
      <rect x="${point.x - width / 2}" y="${point.y - 15}" width="${width}" height="30" rx="12"></rect>
      <text x="${point.x}" y="${point.y + 5}">${escapeHtml(label)}</text>
    </g>
  `;
}

function sketchEdgeLabel(edge, value) {
  if (edge.length < 54 && !value) return "";
  const isActive = edge.key === state.installerSketch.activeEdgeKey;
  const center = sketchCentroid(state.installerSketch.points);
  const dx = edge.to.x - edge.from.x;
  const dy = edge.to.y - edge.from.y;
  const length = Math.hypot(dx, dy) || 1;
  let normal = { x: -dy / length, y: dx / length };
  const midpointToCenter = { x: center.x - edge.midpoint.x, y: center.y - edge.midpoint.y };
  if (normal.x * midpointToCenter.x + normal.y * midpointToCenter.y > 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  const offset = edge.length < 95 ? 48 : 26;
  const point = clampLabelPoint({
    x: edge.midpoint.x + normal.x * offset,
    y: edge.midpoint.y + normal.y * offset
  });
  const label = value ? `${edge.key}: ${formatQty(value)} м` : edge.key;
  const width = Math.max(76, label.length * 8 + 20);
  return `
    <g class="sketch-size-label${edge.length < 95 ? " is-compact" : ""}${isActive ? " is-active" : ""}" data-sketch-edge="${escapeHtml(edge.key)}">
      <rect x="${point.x - width / 2}" y="${point.y - 15}" width="${width}" height="30" rx="12"></rect>
      <text x="${point.x}" y="${point.y + 5}">${escapeHtml(label)}</text>
    </g>
  `;
}

function sketchMetaTemplate() {
  const stats = sketchMeasuredStats(state.installerSketch.points);
  const holesCount = (state.installerSketch.holes || []).length;
  return `
    <span>${state.installerSketch.points.length} точки</span>
    ${holesCount ? `<span>${holesCount} отверстий</span>` : ""}
    <span>Контур: ${formatQty(stats.perimeter)} м</span>
    <span>Площадь: ${formatQty(stats.area)} м²</span>
  `;
}

function sketchBuilderTemplate() {
  const edges = sketchEdges(state.installerSketch.points);
  const activeEdge = resolveSketchEdge(edges);
  return `
    <div class="builder-side-strip" role="list" aria-label="Стороны контура">
      ${edges.map((edge) => {
        const value = state.installerSketch.dimensions[edge.key];
        const active = activeEdge?.key === edge.key;
        return `
          <button class="builder-side${active ? " is-active" : ""}" type="button" data-select-edge="${escapeHtml(edge.key)}">
            <strong>${escapeHtml(edge.key)}</strong>
            <span>${value ? `${formatQty(value)} м` : "размер"}</span>
          </button>
        `;
      }).join("")}
    </div>
    <div class="builder-action-panel">
      <div>
        <span class="overline">Сторона</span>
        <strong>${escapeHtml(activeEdge?.key || "A-B")}</strong>
      </div>
      <div class="builder-action-row">
        <button type="button" data-add-notch="in">+ уступ внутрь</button>
        <button type="button" data-add-notch="out">+ выступ наружу</button>
        <button type="button" data-add-hole="pipe">+ труба</button>
        <button type="button" data-add-hole="lamp">+ люстра</button>
        <button type="button" data-add-hole="spot">+ точка</button>
      </div>
    </div>
  `;
}

function sketchDimensionsTemplate() {
  const points = state.installerSketch.points;
  const edges = sketchEdges(points);
  const diagonals = sketchDiagonals(points).slice(0, 8);
  return `
    <div class="dimension-group">
      <strong>Размеры по контуру</strong>
      <div class="dimension-grid">
        ${edges.map((edge) => dimensionInput(edge, "dimension")).join("")}
      </div>
    </div>
    <div class="dimension-group">
      <strong>Диагонали</strong>
      <div class="dimension-grid">
        ${diagonals.map((diagonal) => dimensionInput(diagonal, "diagonal")).join("")}
      </div>
    </div>
  `;
}

function dimensionInput(item, type) {
  const store = type === "diagonal" ? state.installerSketch.diagonals : state.installerSketch.dimensions;
  const value = store[item.key] || "";
  const isActive = type === "dimension" && item.key === state.installerSketch.activeEdgeKey;
  return `
    <div class="dimension-item${isActive ? " is-active" : ""}">
      <label>
        <span>${escapeHtml(item.key)}</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          inputmode="decimal"
          enterkeyhint="next"
          value="${escapeHtml(inputQtyValue(value))}"
          placeholder="${escapeHtml(dimensionPlaceholder(item.estimated))}"
          data-sketch-${type}="${escapeHtml(item.key)}"
        >
        <small>м</small>
      </label>
      ${type === "dimension" ? `<button type="button" data-select-edge="${escapeHtml(item.key)}">сторона</button>` : ""}
    </div>
  `;
}

function dimensionPlaceholder(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0.1) return "размер";
  return formatQty(number);
}

function bindCatalogControls() {
  const searchInput = document.getElementById("searchInput");
  searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderCatalogGrid();
  });

  document.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderCatalog();
    });
  });
}

function renderCatalogGrid() {
  const sourceProducts = getStoreProducts();
  const grid = document.getElementById("catalogGrid");
  if (!grid) return;
  const filtered = filterProducts(sourceProducts);
  grid.innerHTML = filtered.map((product) => productCard(product)).join("") || emptySearch();
  bindProductButtons();
  observeReveal();
}

function bindProductButtons() {
  document.querySelectorAll("[data-add]").forEach((button) => {
    button.onclick = () => {
      addToCart(button.dataset.add);
      refreshProductCardControls(button.dataset.add);
    };
  });
  document.querySelectorAll("[data-card-minus]").forEach((button) => {
    button.onclick = () => setCatalogQty(button.dataset.cardMinus, (state.cart[button.dataset.cardMinus] || 0) - qtyStep(button.dataset.cardMinus));
  });
  document.querySelectorAll("[data-card-plus]").forEach((button) => {
    button.onclick = () => setCatalogQty(button.dataset.cardPlus, (state.cart[button.dataset.cardPlus] || 0) + qtyStep(button.dataset.cardPlus));
  });
  document.querySelectorAll("[data-card-qty-input]").forEach((input) => {
    input.onchange = () => setCatalogQty(input.dataset.cardQtyInput, input.value);
    input.onblur = () => setCatalogQty(input.dataset.cardQtyInput, input.value);
  });
}

function bindCartControls() {
  document.querySelectorAll("[data-minus]").forEach((button) => {
    button.addEventListener("click", () => setQty(button.dataset.minus, (state.cart[button.dataset.minus] || 0) - 1));
  });
  document.querySelectorAll("[data-plus]").forEach((button) => {
    button.addEventListener("click", () => setQty(button.dataset.plus, (state.cart[button.dataset.plus] || 0) + 1));
  });
  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => setQty(button.dataset.remove, 0));
  });
  document.querySelectorAll("[data-qty-input]").forEach((input) => {
    input.addEventListener("change", () => setQty(input.dataset.qtyInput, input.value));
    input.addEventListener("blur", () => setQty(input.dataset.qtyInput, input.value));
  });
}

function bindPhoneInputs() {
  document.querySelectorAll("[data-phone-autocode]").forEach((input) => {
    input.addEventListener("focus", () => {
      if (!input.value.trim()) input.value = input.dataset.phoneAutocode || "+996 ";
    });
  });
}

function bindFulfillmentControls() {
  const form = document.getElementById("checkoutForm");
  const addressField = document.getElementById("checkoutAddressField");
  const addressInput = form?.elements.address;
  if (!form || !addressField || !addressInput) return;

  const updateAddressState = () => {
    const method = new FormData(form).get("method");
    const isPickup = method === "pickup";
    addressField.classList.toggle("is-hidden", isPickup);
    addressInput.required = !isPickup;
    addressInput.disabled = isPickup;
    if (isPickup) addressInput.value = "";
  };

  form.querySelectorAll('input[name="method"]').forEach((input) => {
    input.addEventListener("change", updateAddressState);
  });
  updateAddressState();
}

function bindReadyControls(formId = "checkoutForm") {
  const form = document.getElementById(formId);
  const dateInput = form?.querySelector("[data-ready-date]");
  const timeInput = form?.querySelector("[data-ready-time]");
  const dateButton = form?.querySelector("[data-ready-date-button]") || document.getElementById("readyDateButton");
  const dateLabel = form?.querySelector("[data-ready-date-label]") || document.getElementById("readyDateLabel");
  const calendar = form?.querySelector("[data-ready-calendar]") || document.getElementById("readyCalendar");
  const timeLabel = form?.querySelector("[data-ready-time-label]") || document.getElementById("readyTimeLabel");
  if (!form || !dateInput || !timeInput || !dateButton || !dateLabel || !calendar || !timeLabel) return;

  let displayDate = parseDateValue(dateInput.value);
  const closeCalendar = () => {
    calendar.hidden = true;
    dateButton.setAttribute("aria-expanded", "false");
  };
  const openCalendar = () => {
    calendar.hidden = false;
    dateButton.setAttribute("aria-expanded", "true");
  };
  const renderCalendar = () => {
    calendar.innerHTML = calendarTemplate(dateInput.value, dateValueFromParts(displayDate.year, displayDate.monthIndex, 1));
  };
  const setSelectedDate = (value) => {
    dateInput.value = value;
    dateLabel.textContent = formatReadyDateLabel(value);
    displayDate = parseDateValue(value);
    renderCalendar();
    closeCalendar();
  };
  const setSelectedTime = (value) => {
    timeInput.value = value;
    timeLabel.textContent = value;
  };

  dateButton.addEventListener("click", () => {
    if (calendar.hidden) openCalendar();
    else closeCalendar();
  });

  calendar.addEventListener("click", (event) => {
    const nav = event.target.closest("[data-calendar-nav]");
    const date = event.target.closest("[data-calendar-date]");
    if (nav) {
      displayDate = addCalendarMonths(displayDate, Number(nav.dataset.calendarNav));
      renderCalendar();
      return;
    }
    if (date && !date.disabled) setSelectedDate(date.dataset.calendarDate);
  });

  form.querySelectorAll("[data-time-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = minutesToTime(timeToMinutes(timeInput.value) + Number(button.dataset.timeStep));
      setSelectedTime(next);
    });
  });

  document.addEventListener("click", (event) => {
    if (calendar.hidden) return;
    if (!event.target.closest("[data-ready-date-field]")) closeCalendar();
  });

  renderCalendar();
  setSelectedTime(timeInput.value);
}

function bindInstallerFulfillmentControls() {
  const form = document.getElementById("installerForm");
  const addressField = document.getElementById("installerDeliveryAddressField");
  const addressInput = form?.elements.deliveryAddress;
  if (!form || !addressField || !addressInput) return;

  const updateAddressState = () => {
    const method = new FormData(form).get("method");
    const isPickup = method === "pickup";
    addressField.classList.toggle("is-hidden", isPickup);
    addressInput.required = !isPickup;
    addressInput.disabled = isPickup;
    if (isPickup) addressInput.value = "";
  };

  form.querySelectorAll('input[name="method"]').forEach((input) => {
    input.addEventListener("change", updateAddressState);
  });
  updateAddressState();
}

function bindInstallerMaterialPicker() {
  const root = document.getElementById("installerMaterialPicker");
  const trigger = root?.querySelector("[data-material-trigger]");
  const panel = root?.querySelector("[data-material-panel]");
  const input = root?.querySelector('input[name="materialId"]');
  const search = root?.querySelector("[data-material-search]");
  const categoryButtons = [...(root?.querySelectorAll("[data-material-category]") || [])];
  const optionButtons = [...(root?.querySelectorAll("[data-material-option]") || [])];
  if (!root || !trigger || !panel || !input) return;

  let activeCategory = "Все";
  const products = new Map(installerMaterials().map((product) => [product.id, product]));

  const close = () => {
    root.classList.remove("is-open");
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
  };
  const open = () => {
    root.classList.add("is-open");
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    search?.focus();
  };
  const applyFilters = () => {
    const query = String(search?.value || "").trim().toLowerCase();
    optionButtons.forEach((button) => {
      const categoryMatch = activeCategory === "Все" || button.dataset.materialCategoryValue === activeCategory;
      const searchMatch = !query || String(button.dataset.materialSearchValue || "").includes(query);
      button.hidden = !(categoryMatch && searchMatch);
    });
  };
  const selectMaterial = (productId) => {
    const product = products.get(productId);
    if (!product) return;
    input.value = product.id;
    trigger.innerHTML = materialTriggerContent(product);
    optionButtons.forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.materialOption === product.id);
    });
    close();
  };

  trigger.addEventListener("click", () => {
    if (panel.hidden) open();
    else close();
  });
  search?.addEventListener("input", applyFilters);
  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.materialCategory || "Все";
      categoryButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      applyFilters();
    });
  });
  optionButtons.forEach((button) => {
    button.addEventListener("click", () => selectMaterial(button.dataset.materialOption));
  });
  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) close();
  });
}

function bindInstallerSketch() {
  const board = document.getElementById("sketchBoard");
  const meta = document.getElementById("sketchMeta");
  const builder = document.getElementById("sketchBuilder");
  const dimensions = document.getElementById("sketchDimensions");
  if (!board) return;
  let dragIndex = null;
  let dragMoved = false;
  let suppressNextClick = false;

  const renderSketch = () => {
    cleanSketchAfterPointChange();
    normalizeSketchDimensionState();
    board.innerHTML = sketchTemplate();
    if (meta) meta.innerHTML = sketchMetaTemplate();
    if (builder) builder.innerHTML = sketchBuilderTemplate();
    if (dimensions) dimensions.innerHTML = sketchDimensionsTemplate();
    bindSketchDimensionInputs();
  };

  board.addEventListener("click", (event) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    const pointNode = event.target.closest("[data-sketch-point]");
    if (pointNode) return;
    const edgeNode = event.target.closest("[data-sketch-edge]");
    if (edgeNode) {
      selectSketchEdge(edgeNode.dataset.sketchEdge);
      renderSketch();
      return;
    }
    const svg = event.target.closest(".sketch-svg");
    if (!svg) return;
    const point = pointerToSketchPoint(svg, event);
    const edge = nearestSketchEdge(point);
    if (edge && edge.distance <= 92) {
      selectSketchEdge(edge.key);
      renderSketch();
    }
  });

  board.addEventListener("pointerdown", (event) => {
    const pointNode = event.target.closest("[data-sketch-point]");
    const svg = event.target.closest(".sketch-svg");
    if (!pointNode || !svg) return;
    dragIndex = Number(pointNode.dataset.sketchPoint);
    dragMoved = false;
    board.setPointerCapture?.(event.pointerId);
  });

  board.addEventListener("pointermove", (event) => {
    if (dragIndex === null) return;
    const svg = board.querySelector(".sketch-svg");
    if (!svg) return;
    state.installerSketch.points[dragIndex] = {
      ...state.installerSketch.points[dragIndex],
      ...pointerToSketchPoint(svg, event)
    };
    dragMoved = true;
    board.innerHTML = sketchTemplate();
    if (meta) meta.innerHTML = sketchMetaTemplate();
  });

  board.addEventListener("pointerup", (event) => {
    if (dragIndex !== null && dragMoved) {
      suppressNextClick = true;
      state.installerSketch.shapeType = "custom";
      state.installerSketch.aiDraft = false;
      applySketchDimensionsToGeometry();
      renderSketch();
    }
    dragIndex = null;
    board.releasePointerCapture?.(event.pointerId);
  });

  document.querySelector("[data-sketch-reset]")?.addEventListener("click", () => {
    state.installerSketch = createDefaultSketch();
    renderSketch();
  });

  document.querySelectorAll("[data-sketch-template]").forEach((button) => {
    button.addEventListener("click", () => {
      state.installerSketch = button.dataset.sketchTemplate === "lshape" ? createLShapeSketch() : createDefaultSketch();
      renderSketch();
    });
  });

  document.querySelector("[data-sketch-autofit]")?.addEventListener("click", () => {
    repairSketchLayout();
    renderSketch();
  });

  document.querySelector("[data-sketch-undo]")?.addEventListener("click", () => {
    if (state.installerSketch.points.length > 4) state.installerSketch.points.pop();
    cleanSketchAfterPointChange();
    renderSketch();
  });

  document.querySelector("[data-ai-draft]")?.addEventListener("click", async (event) => {
    const note = document.getElementById("installerNote");
    if (!state.installerPhoto) return setNote(note, "Сначала прикрепите фото чертежа.", true);
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "AI анализирует фото...";
    setNote(note, "AI распознает контур, размеры и отверстия. Подождите немного.", false);
    try {
      const response = await fetch("/api/installer-ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photo: state.installerPhoto })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI не смог распознать фото");
      applyInstallerAiDraft(data.draft || {});
      renderSketch();
      const confidence = data.draft?.confidence ? ` Уверенность: ${Math.round(data.draft.confidence * 100)}%.` : "";
      const warnings = data.draft?.warnings?.length ? ` Проверьте: ${data.draft.warnings.join("; ")}.` : "";
      setNote(note, `AI-черновик готов.${confidence}${warnings}`, false);
    } catch (error) {
      setNote(note, error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Распознать фото в чертеж";
    }
  });

  normalizeSketchDimensionState();
  bindSketchDimensionInputs();
}

function applyInstallerAiDraft(draft) {
  const points = Array.isArray(draft.points) && draft.points.length >= 3
    ? draft.points.slice(0, 24).map((point, index) => clampSketchPoint({
        label: String.fromCharCode(65 + index),
        x: Number(point.x),
        y: Number(point.y)
      }))
    : createDefaultSketch().points;

  state.installerSketch = {
    points,
    dimensions: draft.dimensions && typeof draft.dimensions === "object" ? draft.dimensions : {},
    diagonals: draft.diagonals && typeof draft.diagonals === "object" ? draft.diagonals : {},
    holes: Array.isArray(draft.holes) ? draft.holes.map((hole) => ({
      type: ["pipe", "lamp", "spot", "other"].includes(hole.type) ? hole.type : "other",
      label: hole.label || holeTypeLabel(hole.type),
      x: clampSketchPoint({ x: Number(hole.x), y: Number(hole.y) }).x,
      y: clampSketchPoint({ x: Number(hole.x), y: Number(hole.y) }).y,
      diameterCm: Number(hole.diameterCm || 0)
    })) : [],
    aiConfidence: Number(draft.confidence || 0),
    warnings: Array.isArray(draft.warnings) ? draft.warnings : [],
    note: draft.notes || "",
    activeEdgeKey: "A-B",
    shapeType: normalizeAiShapeType(draft.shapeType, points.length),
    aiDraft: true
  };

  normalizeSketchDimensionState();
  if (state.installerSketch.shapeType !== "custom") {
    repairSketchLayout();
    return;
  }
  cleanSketchAfterPointChange();
  applySketchDimensionsToGeometry();
}

function bindSketchDimensionInputs() {
  const rerenderSketchSurface = () => {
    const board = document.getElementById("sketchBoard");
    const meta = document.getElementById("sketchMeta");
    const builder = document.getElementById("sketchBuilder");
    const dimensions = document.getElementById("sketchDimensions");
    if (board) board.innerHTML = sketchTemplate();
    if (meta) meta.innerHTML = sketchMetaTemplate();
    if (builder) builder.innerHTML = sketchBuilderTemplate();
    if (dimensions) dimensions.innerHTML = sketchDimensionsTemplate();
    bindSketchDimensionInputs();
  };

  document.querySelectorAll("[data-sketch-dimension]").forEach((input) => {
    input.addEventListener("change", () => {
      const value = parseDimension(input.value);
      if (value) state.installerSketch.dimensions[input.dataset.sketchDimension] = value;
      else delete state.installerSketch.dimensions[input.dataset.sketchDimension];
      applySketchDimensionsToGeometry();
      rerenderSketchSurface();
    });
  });

  document.querySelectorAll("[data-sketch-diagonal]").forEach((input) => {
    input.addEventListener("change", () => {
      const value = parseDimension(input.value);
      if (value) state.installerSketch.diagonals[input.dataset.sketchDiagonal] = value;
      else delete state.installerSketch.diagonals[input.dataset.sketchDiagonal];
      applySketchDimensionsToGeometry();
      rerenderSketchSurface();
    });
  });

  document.querySelectorAll("[data-select-edge]").forEach((button) => {
    button.addEventListener("click", () => {
      selectSketchEdge(button.dataset.selectEdge);
      rerenderSketchSurface();
    });
  });

  document.querySelectorAll("[data-add-notch]").forEach((button) => {
    button.addEventListener("click", () => {
      insertNotchOnActiveEdge(button.dataset.addNotch);
      rerenderSketchSurface();
    });
  });

  document.querySelectorAll("[data-add-hole]").forEach((button) => {
    button.addEventListener("click", () => {
      addSketchHole(button.dataset.addHole);
      rerenderSketchSurface();
    });
  });
}

function bindInstallerPhoto() {
  const input = document.getElementById("installerPhoto");
  const label = document.getElementById("installerPhotoLabel");
  const preview = document.getElementById("installerPhotoPreview");
  const note = document.getElementById("installerNote");
  input?.addEventListener("change", () => {
    const file = input.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      input.value = "";
      return setNote(note, "Фото должно быть PNG, JPG или WEBP.", true);
    }
    if (file.size > 4 * 1024 * 1024) {
      input.value = "";
      return setNote(note, "Фото слишком большое. Загрузите файл до 4 МБ.", true);
    }

    const reader = new FileReader();
    reader.onload = () => {
      state.installerPhoto = {
        name: file.name,
        type: file.type,
        dataUrl: String(reader.result || "")
      };
      if (label) label.textContent = file.name;
      if (preview) {
        preview.innerHTML = `<img src="${escapeHtml(state.installerPhoto.dataUrl)}" alt="Фото чертежа">`;
        preview.classList.add("has-image");
      }
      setNote(note, "Фото прикреплено.", false);
    };
    reader.readAsDataURL(file);
  });
}

async function submitCheckout(event) {
  event.preventDefault();
  const lines = getCartLines();
  const note = document.getElementById("checkoutNote");
  if (!lines.length) return setNote(note, "Корзина пустая.", true);

  const form = new FormData(event.currentTarget);
  const method = form.get("method");
  const readyDate = form.get("readyDate");
  const readyTime = form.get("readyTime");
  if (!readyDate || !readyTime) return setNote(note, "Выберите дату и время готовности заказа.", true);
  if (isSundayDate(readyDate)) return setNote(note, "В воскресенье магазин не работает. Выберите другую дату.", true);

  const payload = {
    type: "cart",
    customer: {
      name: form.get("name"),
      phone: form.get("phone"),
      address: method === "delivery" ? form.get("address") : ""
    },
    fulfillment: {
      method,
      payment: "after_call",
      readyDate,
      readyTime,
      timeZone: KYRGYZ_TIME_ZONE
    },
    comment: form.get("comment"),
    items: lines.map(({ product, qty }) => ({ productId: product.id, qty }))
  };

  await submitOrder(payload, note, (order) => {
    state.cart = {};
    saveCart();
    saveLastOrder(order);
    navigate(`/success?order=${encodeURIComponent(order.id)}`);
  });
}

async function submitMeasure(event) {
  event.preventDefault();
  const note = document.getElementById("measureNote");
  const form = new FormData(event.currentTarget);
  const area = Number(form.get("area"));
  if (area < 50) return setNote(note, "Онлайн-заявка доступна от 50 м².", true);

  const payload = {
    type: "measurement",
    area,
    customer: {
      name: form.get("name"),
      phone: form.get("phone"),
      address: form.get("address")
    },
    fulfillment: { method: "delivery", payment: "after_call" },
    comment: form.get("comment")
  };

  await submitOrder(payload, note, (order) => {
    saveLastOrder(order);
    navigate(`/success?order=${encodeURIComponent(order.id)}`);
  });
}

async function submitInstallerRequest(event) {
  event.preventDefault();
  const note = document.getElementById("installerNote");
  const form = new FormData(event.currentTarget);
  const readyDate = form.get("readyDate");
  const readyTime = form.get("readyTime");
  const method = form.get("method");
  const materialId = form.get("materialId");
  const measuredStats = sketchMeasuredStats(state.installerSketch.points);
  const objectArea = form.get("area") || measuredStats.area;
  const objectPerimeter = form.get("perimeter") || measuredStats.perimeter;

  if (!materialId) return setNote(note, "Выберите материал.", true);
  if (!readyDate || !readyTime) return setNote(note, "Выберите дату и время готовности.", true);
  if (isSundayDate(readyDate)) return setNote(note, "В воскресенье магазин не работает. Выберите другую дату.", true);
  const missingDimensions = sketchEdges(state.installerSketch.points)
    .filter((edge) => !Number(state.installerSketch.dimensions[edge.key]))
    .map((edge) => edge.key);
  if (missingDimensions.length) {
    return setNote(note, `Введите точные размеры сторон: ${missingDimensions.join(", ")}.`, true);
  }

  const payload = {
    installer: {
      name: form.get("name"),
      phone: form.get("phone")
    },
    managerId: form.get("managerId"),
    materialId,
    object: {
      address: form.get("objectAddress"),
      area: objectArea,
      perimeter: objectPerimeter,
      comment: form.get("comment")
    },
    fulfillment: {
      method,
      deliveryAddress: method === "delivery" ? form.get("deliveryAddress") : "",
      readyDate,
      readyTime,
      timeZone: KYRGYZ_TIME_ZONE
    },
    sketch: {
      points: state.installerSketch.points,
      dimensions: state.installerSketch.dimensions,
      diagonals: state.installerSketch.diagonals,
      holes: state.installerSketch.holes || [],
      area: objectArea,
      perimeter: objectPerimeter,
      aiConfidence: state.installerSketch.aiConfidence || 0,
      warnings: state.installerSketch.warnings || [],
      aiDraft: state.installerSketch.aiDraft,
      note: state.installerSketch.note || (state.installerPhoto ? "К заявке прикреплено фото чертежа." : "")
    },
    sketchPhoto: state.installerPhoto
  };

  setNote(note, "Отправляем заявку менеджеру...", false);
  try {
    const response = await fetch("/api/installer-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Не удалось отправить заявку");
    state.installerPhoto = null;
    state.installerSketch = createDefaultSketch();
    saveLastOrder({ id: data.request?.id });
    navigate(`/success?order=${encodeURIComponent(data.request?.id || "")}`);
  } catch (error) {
    setNote(note, error.message, true);
  }
}

async function submitOrder(payload, note, onSuccess) {
  setNote(note, "Отправляем заказ...", false);
  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Не удалось отправить заказ");
    onSuccess(data.order);
  } catch (error) {
    setNote(note, error.message, true);
  }
}

function addToCart(productId, qtyValue) {
  const product = findProduct(productId);
  if (!product) return toast("Товар не найден.");
  const qty = normalizeQty(product, qtyValue || defaultQty(product));
  state.cart[productId] = normalizeQty(product, (state.cart[productId] || 0) + qty);
  saveCart();
  updateCartCount();
  toast(`Добавлено в корзину: ${product.title} · ${formatQty(qty)} ${product.unit || "шт"}`);
}

function setQty(productId, qty, shouldRenderCart = true) {
  const product = findProduct(productId);
  const numericQty = parseQty(qty);
  if (numericQty <= 0 || !product) delete state.cart[productId];
  else state.cart[productId] = normalizeQty(product, numericQty);
  saveCart();
  updateCartCount();
  if (shouldRenderCart) renderCartPage();
}

function setCatalogQty(productId, qty) {
  setQty(productId, qty, false);
  refreshProductCardControls(productId);
}

function refreshProductCardControls(productId) {
  const product = findProduct(productId);
  if (!product) return;
  document.querySelectorAll("[data-card-control]").forEach((node) => {
    if (node.dataset.cardControl !== productId) return;
    node.innerHTML = productCardCartControl(product);
  });
  bindProductButtons();
}

function getCartLines() {
  const products = getStoreProducts();
  return Object.entries(state.cart)
    .map(([productId, qty]) => {
      const product = products.find((item) => item.id === productId && item.active !== false);
      return product ? { product, qty } : null;
    })
    .filter(Boolean);
}

function getStoreProducts() {
  return state.products.length ? state.products : previewProducts;
}

function getHomeProducts() {
  const products = getStoreProducts();
  return products.length ? products.slice(0, 4) : previewProducts;
}

function findProduct(productId) {
  return getStoreProducts().find((item) => item.id === productId);
}

function productImageFit(product) {
  if (product.imageFit === "cover" || product.imageFit === "contain") return product.imageFit;
  return String(product.image || "").toLowerCase().endsWith(".png") ? "contain" : "cover";
}

function cartTotal(lines = getCartLines()) {
  return lines.reduce((sum, { product, qty }) => sum + Number(product.price || 0) * qty, 0);
}

function cartQuantityControl(product, qty) {
  const unit = product.unit || "шт";
  if (isMeasuredUnit(unit)) {
    return `
      <div class="qty-control is-measured">
        <label>
          <span>${escapeHtml(unit)}</span>
          <input type="number" min="0.1" step="0.1" inputmode="decimal" value="${escapeHtml(inputQtyValue(qty))}" data-qty-input="${escapeHtml(product.id)}">
        </label>
        <button type="button" data-remove="${escapeHtml(product.id)}">×</button>
      </div>
    `;
  }

  return `
    <div class="qty-control">
      <button type="button" data-minus="${escapeHtml(product.id)}">−</button>
      <strong>${formatQty(qty)}</strong>
      <button type="button" data-plus="${escapeHtml(product.id)}">+</button>
    </div>
  `;
}

function isMeasuredUnit(unit) {
  const normalized = String(unit || "").toLowerCase();
  return normalized.includes("м²") || normalized.includes("м2") || normalized.includes("кв") || normalized.includes("пог") || normalized === "м";
}

function defaultQty(product) {
  return isMeasuredUnit(product.unit) ? 1 : 1;
}

function qtyStep(productId) {
  const product = findProduct(productId);
  return product && isMeasuredUnit(product.unit) ? 0.1 : 1;
}

function parseQty(value) {
  const number = Number(String(value || "").replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function normalizeQty(product, value) {
  const number = parseQty(value);
  if (number <= 0) return 0;
  const max = 99999;
  if (isMeasuredUnit(product.unit)) return Math.min(max, Math.round(number * 10) / 10);
  return Math.min(max, Math.max(1, Math.round(number)));
}

function formatQty(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10).replace(".", ",");
}

function sketchEdges(points) {
  if (!Array.isArray(points) || points.length < 2) return [];
  return points.map((point, index) => {
    const next = points[(index + 1) % points.length];
    return {
      key: `${point.label}-${next.label}`,
      index,
      fromIndex: index,
      toIndex: (index + 1) % points.length,
      from: point,
      to: next,
      midpoint: {
        x: Math.round((point.x + next.x) / 2),
        y: Math.round((point.y + next.y) / 2)
      },
      length: Math.hypot(next.x - point.x, next.y - point.y),
      estimated: Math.round((Math.hypot(next.x - point.x, next.y - point.y) / 20) * 100) / 100
    };
  });
}

function sketchDiagonals(points) {
  if (!Array.isArray(points) || points.length < 4) return [];
  const diagonals = [];
  for (let fromIndex = 0; fromIndex < points.length; fromIndex += 1) {
    for (let toIndex = fromIndex + 1; toIndex < points.length; toIndex += 1) {
      const isNeighbor = toIndex === fromIndex + 1 || (fromIndex === 0 && toIndex === points.length - 1);
      if (isNeighbor) continue;
      const from = points[fromIndex];
      const to = points[toIndex];
      diagonals.push({
        key: `${from.label}-${to.label}`,
        fromIndex,
        toIndex,
        from,
        to,
        midpoint: {
          x: Math.round((from.x + to.x) / 2),
          y: Math.round((from.y + to.y) / 2)
        },
        estimated: Math.round((Math.hypot(to.x - from.x, to.y - from.y) / 20) * 100) / 100
      });
    }
  }
  return diagonals;
}

function resolveSketchEdge(edges = sketchEdges(state.installerSketch.points)) {
  if (!edges.length) return null;
  const active = edges.find((edge) => edge.key === state.installerSketch.activeEdgeKey);
  if (active) return active;
  state.installerSketch.activeEdgeKey = edges[0].key;
  return edges[0];
}

function selectSketchEdge(edgeKey) {
  const edge = sketchEdges(state.installerSketch.points).find((item) => item.key === edgeKey);
  if (!edge) return;
  state.installerSketch.activeEdgeKey = edge.key;
}

function insertNotchOnActiveEdge(mode) {
  const edge = resolveSketchEdge();
  if (!edge) return;
  insertNotchOnEdge(edge.key, mode);
}

function insertNotchOnEdge(edgeKey, mode = "in") {
  const oldPoints = state.installerSketch.points;
  const oldEdges = sketchEdges(oldPoints);
  const edge = oldEdges.find((item) => item.key === edgeKey);
  if (!edge || oldPoints.length >= 20) {
    toast("Для этого чертежа уже достаточно точек.");
    return;
  }

  const dx = edge.to.x - edge.from.x;
  const dy = edge.to.y - edge.from.y;
  const length = Math.hypot(dx, dy);
  if (length < 120) {
    toast("Сторона короткая. Выберите более длинную сторону.");
    return;
  }

  const unit = { x: dx / length, y: dy / length };
  let normal = { x: -unit.y, y: unit.x };
  const center = sketchCentroid(oldPoints);
  const midpointToCenter = { x: center.x - edge.midpoint.x, y: center.y - edge.midpoint.y };
  if (normal.x * midpointToCenter.x + normal.y * midpointToCenter.y < 0) {
    normal = { x: -normal.x, y: -normal.y };
  }
  if (mode === "out") normal = { x: -normal.x, y: -normal.y };

  const notchWidthPx = Math.max(58, Math.min(length * 0.42, length - 72));
  const sidePx = Math.max(28, (length - notchWidthPx) / 2);
  const depthPx = Math.max(42, Math.min(96, length * 0.18));
  const startDistance = sidePx;
  const endDistance = Math.min(length - 28, sidePx + notchWidthPx);

  const start = {
    label: "",
    x: edge.from.x + unit.x * startDistance,
    y: edge.from.y + unit.y * startDistance
  };
  const end = {
    label: "",
    x: edge.from.x + unit.x * endDistance,
    y: edge.from.y + unit.y * endDistance
  };
  const innerStart = {
    label: "",
    x: start.x + normal.x * depthPx,
    y: start.y + normal.y * depthPx
  };
  const innerEnd = {
    label: "",
    x: end.x + normal.x * depthPx,
    y: end.y + normal.y * depthPx
  };

  const nextPoints = [
    ...oldPoints.slice(0, edge.index + 1),
    clampSketchPoint(start),
    clampSketchPoint(innerStart),
    clampSketchPoint(innerEnd),
    clampSketchPoint(end),
    ...oldPoints.slice(edge.index + 1)
  ];
  relabelSketchPoints(nextPoints);

  const oldDimensions = { ...(state.installerSketch.dimensions || {}) };
  state.installerSketch.points = fitSketchPoints(nextPoints);
  relabelSketchPoints(state.installerSketch.points);
  state.installerSketch.dimensions = remapDimensionsAfterNotch(oldEdges, edge.index, oldDimensions, {
    sideRatio: sidePx / length,
    notchRatio: (endDistance - startDistance) / length,
    depthMeters: Math.max(0.25, Math.min(0.9, (oldDimensions[edge.key] || edge.estimated || 2.5) * 0.18))
  });
  state.installerSketch.diagonals = {};
  state.installerSketch.shapeType = "custom";
  state.installerSketch.aiDraft = false;
  const newEdges = sketchEdges(state.installerSketch.points);
  state.installerSketch.activeEdgeKey = newEdges[edge.index + 2]?.key || newEdges[edge.index]?.key || newEdges[0]?.key;
  normalizeSketchDimensionState();
}

function insertBendOnEdge(edgeKey, explicitPoint) {
  if (!explicitPoint) {
    insertNotchOnEdge(edgeKey, "in");
    return;
  }
  const oldPoints = state.installerSketch.points;
  const oldEdges = sketchEdges(oldPoints);
  const edge = oldEdges.find((item) => item.key === edgeKey);
  if (!edge || oldPoints.length >= 24) return;

  const point = explicitPoint || offsetPointFromEdge(edge, oldPoints);
  const nextPoints = [
    ...oldPoints.slice(0, edge.index + 1),
    { label: "", ...point },
    ...oldPoints.slice(edge.index + 1)
  ];
  relabelSketchPoints(nextPoints);
  const oldDimensions = { ...(state.installerSketch.dimensions || {}) };
  state.installerSketch.points = nextPoints;
  state.installerSketch.dimensions = remapDimensionsAfterInsert(oldEdges, edge.index, oldDimensions);
  state.installerSketch.diagonals = {};
  state.installerSketch.shapeType = "custom";
  state.installerSketch.aiDraft = false;
  applySketchDimensionsToGeometry();
}

function remapDimensionsAfterNotch(oldEdges, insertIndex, oldDimensions, split) {
  const newEdges = sketchEdges(state.installerSketch.points);
  const nextDimensions = {};
  oldEdges.forEach((oldEdge, oldIndex) => {
    const value = Number(oldDimensions[oldEdge.key] || oldEdge.estimated || 0);
    if (!value) return;
    if (oldIndex < insertIndex) {
      nextDimensions[newEdges[oldIndex].key] = roundDimension(value);
    } else if (oldIndex === insertIndex) {
      const side = roundDimension(value * split.sideRatio);
      const notch = roundDimension(value * split.notchRatio);
      const after = Math.max(0.01, roundDimension(value - side - notch));
      nextDimensions[newEdges[oldIndex].key] = side;
      nextDimensions[newEdges[oldIndex + 1].key] = roundDimension(split.depthMeters);
      nextDimensions[newEdges[oldIndex + 2].key] = notch;
      nextDimensions[newEdges[oldIndex + 3].key] = roundDimension(split.depthMeters);
      nextDimensions[newEdges[oldIndex + 4].key] = after;
    } else if (newEdges[oldIndex + 4]) {
      nextDimensions[newEdges[oldIndex + 4].key] = roundDimension(value);
    }
  });
  return nextDimensions;
}

function addSketchHole(type) {
  const holes = state.installerSketch.holes || [];
  const edge = resolveSketchEdge();
  const point = defaultHolePoint(type, edge, holes.length);
  holes.push({
    type: ["pipe", "lamp", "spot"].includes(type) ? type : "other",
    label: holeTypeLabel(type),
    x: point.x,
    y: point.y,
    diameterCm: type === "lamp" ? 30 : type === "pipe" ? 8 : 6
  });
  state.installerSketch.holes = holes;
  state.installerSketch.aiDraft = false;
}

function defaultHolePoint(type, edge, index) {
  if (type === "lamp") {
    const center = sketchCentroid(state.installerSketch.points);
    return clampSketchPoint({ x: center.x, y: center.y });
  }
  if (edge) {
    const center = sketchCentroid(state.installerSketch.points);
    const dx = edge.to.x - edge.from.x;
    const dy = edge.to.y - edge.from.y;
    const length = Math.hypot(dx, dy) || 1;
    let normal = { x: -dy / length, y: dx / length };
    const midpointToCenter = { x: center.x - edge.midpoint.x, y: center.y - edge.midpoint.y };
    if (normal.x * midpointToCenter.x + normal.y * midpointToCenter.y < 0) {
      normal = { x: -normal.x, y: -normal.y };
    }
    const shift = 44 + (index % 3) * 24;
    return clampSketchPoint({
      x: edge.midpoint.x + normal.x * shift,
      y: edge.midpoint.y + normal.y * shift
    });
  }
  const center = sketchCentroid(state.installerSketch.points);
  return clampSketchPoint({ x: center.x + (index % 3) * 26, y: center.y + Math.floor(index / 3) * 26 });
}

function offsetPointFromEdge(edge, points) {
  const midpoint = edge.midpoint;
  const center = sketchCentroid(points);
  const dx = edge.to.x - edge.from.x;
  const dy = edge.to.y - edge.from.y;
  const length = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / length, y: dx / length };
  const optionA = clampSketchPoint({
    x: midpoint.x + normal.x * 58,
    y: midpoint.y + normal.y * 58
  });
  const optionB = clampSketchPoint({
    x: midpoint.x - normal.x * 58,
    y: midpoint.y - normal.y * 58
  });
  return distance(optionA, center) >= distance(optionB, center) ? optionA : optionB;
}

function remapDimensionsAfterInsert(oldEdges, insertIndex, oldDimensions) {
  const newEdges = sketchEdges(state.installerSketch.points);
  const nextDimensions = {};
  oldEdges.forEach((oldEdge, oldIndex) => {
    const value = oldDimensions[oldEdge.key];
    if (!value) return;
    if (oldIndex < insertIndex) {
      nextDimensions[newEdges[oldIndex].key] = value;
    } else if (oldIndex === insertIndex) {
      nextDimensions[newEdges[oldIndex].key] = Math.round((value / 2) * 100) / 100;
      nextDimensions[newEdges[oldIndex + 1].key] = Math.round((value / 2) * 100) / 100;
    } else if (newEdges[oldIndex + 1]) {
      nextDimensions[newEdges[oldIndex + 1].key] = value;
    }
  });
  return nextDimensions;
}

function nearestSketchEdge(point) {
  return sketchEdges(state.installerSketch.points)
    .map((edge) => ({
      ...edge,
      distance: distanceToSegment(point, edge.from, edge.to)
    }))
    .sort((a, b) => a.distance - b.distance)[0];
}

function repairSketchLayout() {
  cleanSketchAfterPointChange();
  const count = state.installerSketch.points.length;
  if (state.installerSketch.shapeType === "lshape") {
    return repairLShapeLayout();
  }
  if (state.installerSketch.shapeType === "rectangle" || count === 4) {
    return repairRectangleLayout();
  }
  state.installerSketch.points = fitSketchPoints(orderPointsAroundCentroid(state.installerSketch.points));
  relabelSketchPoints(state.installerSketch.points);
  state.installerSketch.shapeType = "custom";
  normalizeSketchDimensionState();
}

function repairRectangleLayout() {
  const oldDimensions = { ...(state.installerSketch.dimensions || {}) };
  const edgeValues = sketchEdges(state.installerSketch.points).map((edge) => oldDimensions[edge.key] || edge.estimated || 0);
  const widthMeters = edgeValues[0] || edgeValues[2] || 4;
  const heightMeters = edgeValues[1] || edgeValues[3] || 2.6;
  const width = Math.max(210, Math.min(520, widthMeters * 125));
  const height = Math.max(150, Math.min(300, heightMeters * 105));
  const left = 320 - width / 2;
  const top = 210 - height / 2;
  state.installerSketch.points = [
    { label: "A", x: Math.round(left), y: Math.round(top) },
    { label: "B", x: Math.round(left + width), y: Math.round(top) },
    { label: "C", x: Math.round(left + width), y: Math.round(top + height) },
    { label: "D", x: Math.round(left), y: Math.round(top + height) }
  ];
  state.installerSketch.dimensions = {
    "A-B": roundDimension(widthMeters),
    "B-C": roundDimension(heightMeters),
    "C-D": roundDimension(edgeValues[2] || widthMeters),
    "D-A": roundDimension(edgeValues[3] || heightMeters)
  };
  state.installerSketch.diagonals = {};
  state.installerSketch.shapeType = "rectangle";
  normalizeSketchDimensionState();
}

function repairLShapeLayout() {
  const values = lShapeDimensionValues();
  const width = 500;
  const height = 280;
  const left = 70;
  const top = 70;
  const right = left + width;
  const bottom = top + height;
  const notchXFromBottom = right - width * Math.min(0.82, Math.max(0.28, values.bottom / values.top));
  const notchXFromInner = left + width * Math.min(0.72, Math.max(0.18, values.innerHorizontal / values.top));
  const notchX = Math.round((notchXFromBottom + notchXFromInner) / 2);
  const notchYFromInner = bottom - height * Math.min(0.86, Math.max(0.22, values.innerVertical / values.right));
  const notchYFromLeft = top + height * Math.min(0.78, Math.max(0.16, values.left / values.right));
  const notchY = Math.round((notchYFromInner + notchYFromLeft) / 2);

  state.installerSketch.points = [
    { label: "A", x: left, y: top },
    { label: "B", x: right, y: top },
    { label: "C", x: right, y: bottom },
    { label: "D", x: notchX, y: bottom },
    { label: "E", x: notchX, y: notchY },
    { label: "F", x: left, y: notchY }
  ];
  state.installerSketch.dimensions = {
    "A-B": roundDimension(values.top),
    "B-C": roundDimension(values.right),
    "C-D": roundDimension(values.bottom),
    "D-E": roundDimension(values.innerVertical),
    "E-F": roundDimension(values.innerHorizontal),
    "F-A": roundDimension(values.left)
  };
  state.installerSketch.diagonals = {};
  state.installerSketch.shapeType = "lshape";
  normalizeSketchDimensionState();
}

function lShapeDimensionValues() {
  const defaults = { top: 3.45, right: 2.9, bottom: 2.2, innerVertical: 2.2, innerHorizontal: 1.2, left: 0.75 };
  const edges = sketchEdges(state.installerSketch.points);
  const dimensions = state.installerSketch.dimensions || {};
  const byIndex = (index, fallback) => Number(dimensions[edges[index]?.key]) || fallback;
  return {
    top: byIndex(0, Number(dimensions["A-B"]) || defaults.top),
    right: byIndex(1, Number(dimensions["B-C"]) || defaults.right),
    bottom: byIndex(2, Number(dimensions["C-D"]) || defaults.bottom),
    innerVertical: byIndex(3, Number(dimensions["D-E"]) || defaults.innerVertical),
    innerHorizontal: byIndex(4, Number(dimensions["E-F"]) || defaults.innerHorizontal),
    left: byIndex(5, Number(dimensions["F-A"]) || defaults.left)
  };
}

function cleanSketchAfterPointChange() {
  const points = state.installerSketch.points || [];
  const cleaned = [];
  for (const point of points) {
    const next = clampSketchPoint(point);
    const previous = cleaned[cleaned.length - 1];
    if (previous && distance(previous, next) < 18) continue;
    cleaned.push(next);
  }
  if (cleaned.length > 2 && distance(cleaned[0], cleaned[cleaned.length - 1]) < 18) cleaned.pop();
  state.installerSketch.points = cleaned.length >= 2 ? cleaned : createDefaultSketch().points;
  relabelSketchPoints(state.installerSketch.points);
  normalizeSketchDimensionState();
}

function orderPointsAroundCentroid(points) {
  const center = sketchCentroid(points);
  return [...points].sort((a, b) => Math.atan2(a.y - center.y, a.x - center.x) - Math.atan2(b.y - center.y, b.x - center.x));
}

function roundDimension(value) {
  const number = Number(value || 0);
  return Math.round(number * 100) / 100;
}

function useStructuredLayoutForDimensions() {
  const count = state.installerSketch.points.length;
  return state.installerSketch.shapeType === "rectangle"
    || state.installerSketch.shapeType === "lshape"
    || count === 4;
}

function applySketchDimensionsToGeometry() {
  normalizeSketchDimensionState();
  if (useStructuredLayoutForDimensions()) {
    repairSketchLayout();
    return;
  }
  const points = state.installerSketch.points.map((point) => ({ ...point }));
  if (points.length < 2) return;

  const constraints = [
    ...sketchEdges(points)
      .filter((edge) => Number(state.installerSketch.dimensions[edge.key]) > 0)
      .map((edge) => ({
        fromIndex: edge.fromIndex,
        toIndex: edge.toIndex,
        meters: Number(state.installerSketch.dimensions[edge.key])
      })),
    ...sketchDiagonals(points)
      .filter((diagonal) => Number(state.installerSketch.diagonals[diagonal.key]) > 0)
      .map((diagonal) => ({
        fromIndex: diagonal.fromIndex,
        toIndex: diagonal.toIndex,
        meters: Number(state.installerSketch.diagonals[diagonal.key])
      }))
  ];
  if (!constraints.length) return;

  const pixelsPerMeter = sketchPixelsPerMeter(points, constraints);
  for (let iteration = 0; iteration < 90; iteration += 1) {
    for (const constraint of constraints) {
      const from = points[constraint.fromIndex];
      const to = points[constraint.toIndex];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const current = Math.hypot(dx, dy) || 1;
      const target = constraint.meters * pixelsPerMeter;
      const ratio = (current - target) / current;
      const moveX = dx * ratio * 0.42;
      const moveY = dy * ratio * 0.42;
      from.x += moveX;
      from.y += moveY;
      to.x -= moveX;
      to.y -= moveY;
    }
  }

  state.installerSketch.points = fitSketchPoints(points);
  relabelSketchPoints(state.installerSketch.points);
}

function sketchPixelsPerMeter(points, constraints) {
  const ratios = constraints
    .map((constraint) => {
      const from = points[constraint.fromIndex];
      const to = points[constraint.toIndex];
      const meters = Number(constraint.meters);
      if (!meters) return 0;
      return Math.hypot(to.x - from.x, to.y - from.y) / meters;
    })
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const median = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 58;
  return Math.max(18, Math.min(110, median));
}

function fitSketchPoints(points) {
  const bounds = sketchBounds(points);
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(1.35, 520 / width, 320 / height);
  const offsetX = 320 - ((bounds.minX + bounds.maxX) / 2) * scale;
  const offsetY = 210 - ((bounds.minY + bounds.maxY) / 2) * scale;
  return points.map((point) => clampSketchPoint({
    ...point,
    x: point.x * scale + offsetX,
    y: point.y * scale + offsetY
  }));
}

function sketchBounds(points) {
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x),
    maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y),
    maxY: Math.max(bounds.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

function sketchCentroid(points) {
  const total = points.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
  const count = Math.max(1, points.length);
  return { x: total.x / count, y: total.y / count };
}

function relabelSketchPoints(points) {
  points.forEach((point, index) => {
    point.label = String.fromCharCode(65 + index);
  });
}

function clampSketchPoint(point) {
  return {
    ...point,
    x: Math.max(28, Math.min(612, Math.round(point.x))),
    y: Math.max(28, Math.min(392, Math.round(point.y)))
  };
}

function clampLabelPoint(point) {
  return {
    x: Math.max(64, Math.min(576, Math.round(point.x))),
    y: Math.max(38, Math.min(382, Math.round(point.y)))
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
}

function normalizeSketchDimensionState() {
  state.installerSketch.dimensions = state.installerSketch.dimensions || {};
  state.installerSketch.diagonals = state.installerSketch.diagonals || {};
  const edges = sketchEdges(state.installerSketch.points);
  const edgeKeys = new Set(edges.map((edge) => edge.key));
  const diagonalKeys = new Set(sketchDiagonals(state.installerSketch.points).map((diagonal) => diagonal.key));
  for (const key of Object.keys(state.installerSketch.dimensions)) {
    if (!edgeKeys.has(key)) delete state.installerSketch.dimensions[key];
  }
  for (const key of Object.keys(state.installerSketch.diagonals)) {
    if (!diagonalKeys.has(key)) delete state.installerSketch.diagonals[key];
  }
  if (!edgeKeys.has(state.installerSketch.activeEdgeKey)) {
    state.installerSketch.activeEdgeKey = edges[0]?.key || "A-B";
  }
}

function parseDimension(value) {
  const number = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.round(number * 100) / 100;
}

function pointerToSketchPoint(svg, event) {
  const rect = svg.getBoundingClientRect();
  return clampSketchPoint({
    x: Math.max(24, Math.min(616, Math.round(((event.clientX - rect.left) / rect.width) * 640))),
    y: Math.max(24, Math.min(396, Math.round(((event.clientY - rect.top) / rect.height) * 420)))
  });
}

function sketchStats(points) {
  if (!Array.isArray(points) || points.length < 2) return { area: 0, perimeter: 0 };
  const perimeter = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    if (!next) return sum;
    const distance = Math.hypot(next.x - point.x, next.y - point.y) / 20;
    return sum + distance;
  }, 0);
  const area = points.length < 3
    ? 0
    : Math.abs(points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + point.x * next.y - next.x * point.y;
      }, 0)) / 2 / 400;
  return {
    area: Math.round(area * 10) / 10,
    perimeter: Math.round(perimeter * 10) / 10
  };
}

function sketchMeasuredStats(points) {
  if (!Array.isArray(points) || points.length < 2) return { area: 0, perimeter: 0 };
  const edges = sketchEdges(points);
  const dimensions = state.installerSketch.dimensions || {};
  const ratios = edges
    .map((edge) => {
      const value = Number(dimensions[edge.key] || 0);
      return value > 0 ? edge.length / value : 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  const scale = ratios.length ? ratios[Math.floor(ratios.length / 2)] : 20;
  const perimeter = edges.reduce((sum, edge) => {
    const value = Number(dimensions[edge.key] || 0);
    return sum + (value > 0 ? value : edge.length / scale);
  }, 0);
  const metricPoints = sketchMetricPoints(edges, dimensions, scale);
  const area = metricPoints.length >= 3
    ? polygonArea(metricPoints)
    : polygonArea(points) / (scale * scale);
  return {
    area: Math.round(area * 10) / 10,
    perimeter: Math.round(perimeter * 10) / 10
  };
}

function sketchMetricPoints(edges, dimensions, fallbackScale) {
  if (!edges.length) return [];
  const metricPoints = [{ x: 0, y: 0 }];
  for (let index = 0; index < edges.length - 1; index += 1) {
    const edge = edges[index];
    const previous = metricPoints[metricPoints.length - 1];
    const length = Number(dimensions[edge.key] || 0) || edge.length / fallbackScale;
    const direction = dominantMetricDirection(edge);
    metricPoints.push({
      x: previous.x + direction.x * length,
      y: previous.y + direction.y * length
    });
  }
  return metricPoints;
}

function dominantMetricDirection(edge) {
  const dx = edge.to.x - edge.from.x;
  const dy = edge.to.y - edge.from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return { x: dx >= 0 ? 1 : -1, y: 0 };
  return { x: 0, y: dy >= 0 ? 1 : -1 };
}

function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

function inputQtyValue(value) {
  if (value === "" || value === null || value === undefined) return "";
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 10) / 10);
}

function filterProducts(products) {
  return products.filter((product) => {
    const categoryMatch = state.category === "Все" || product.category === state.category;
    const text = `${product.title || ""} ${product.category || ""} ${product.description || ""}`.toLowerCase();
    return categoryMatch && text.includes(state.search);
  });
}

function catalogCategories(products) {
  const categories = products.length
    ? ["Все", ...new Set(products.map((product) => product.category || "Без категории"))]
    : ["Все"];
  if (!categories.includes(state.category)) state.category = "Все";
  return categories;
}

function updateCartCount() {
  pruneCart();
  const count = Object.keys(state.cart).length;
  if (elements.cartCount) elements.cartCount.textContent = count;
}

function pruneCart() {
  const validProductIds = new Set(getStoreProducts().map((product) => product.id));
  let changed = false;
  for (const productId of Object.keys(state.cart)) {
    if (!validProductIds.has(productId)) {
      delete state.cart[productId];
      changed = true;
    }
  }
  if (changed) saveCart();
}

function updateActiveNav(route) {
  document.querySelectorAll(".nav-links a, .bottom-nav a").forEach((link) => {
    const path = normalizePath(new URL(link.href).pathname);
    link.classList.toggle("is-active", path === route);
  });
}

function updateHeader() {
  const top = window.scrollY || document.documentElement.scrollTop;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  elements.header.classList.toggle("is-solid", top > 18);
  elements.progress.style.width = `${max > 0 ? (top / max) * 100 : 0}%`;
}

function observeReveal() {
  const nodes = document.querySelectorAll(".reveal:not(.is-visible)");
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12 });
  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      node.classList.add("is-visible");
      return;
    }
    observer.observe(node);
  });
}

function navigate(path) {
  window.history.pushState({}, "", path);
  renderRoute();
}

function normalizePath(path) {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

function applyTheme(theme) {
  state.theme = "dark";
  document.body.dataset.theme = state.theme;
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("lr-cart") || "{}");
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem("lr-cart", JSON.stringify(state.cart));
}

function loadLastOrder() {
  try {
    return JSON.parse(sessionStorage.getItem("lr-last-order") || "null");
  } catch {
    return null;
  }
}

function saveLastOrder(order) {
  state.lastOrder = order;
  sessionStorage.setItem("lr-last-order", JSON.stringify(order));
}

function whatsAppLink(message) {
  return `https://wa.me/996990883883?text=${encodeURIComponent(message)}`;
}

function formatMoney(value) {
  return `${money.format(Number(value || 0))} сом`;
}

function kyrgyzInputDateTime(offsetMinutes = 0) {
  const now = getKyrgyzParts(new Date());
  const target = getKyrgyzParts(new Date(Date.now() + offsetMinutes * 60 * 1000));
  const orderDate = nextWorkingDate(`${target.year}-${target.month}-${target.day}`);
  return {
    today: `${now.year}-${now.month}-${now.day}`,
    date: orderDate,
    time: `${target.hour}:${target.minute}`
  };
}

function getKyrgyzParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KYRGYZ_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === "24" ? "00" : values.hour,
    minute: values.minute
  };
}

function calendarTemplate(selectedDate, monthValue) {
  const selected = parseDateValue(selectedDate);
  const month = parseDateValue(monthValue);
  const today = kyrgyzInputDateTime().today;
  const firstDay = new Date(month.year, month.monthIndex, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const start = new Date(month.year, month.monthIndex, 1 - firstWeekday);
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    const value = dateValueFromParts(date.getFullYear(), date.getMonth(), date.getDate());
    const isCurrentMonth = date.getMonth() === month.monthIndex;
    const isSelected = value === selectedDate;
    const isToday = value === today;
    const isClosedDay = isSundayDate(date);
    const isDisabled = value < today || isClosedDay;
    return `
      <button
        type="button"
        class="${isCurrentMonth ? "" : "is-muted"} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""} ${isClosedDay ? "is-closed-day" : ""}"
        data-calendar-date="${value}"
        ${isClosedDay ? 'title="В воскресенье магазин не работает"' : ""}
        ${isDisabled ? "disabled" : ""}
      >${date.getDate()}</button>
    `;
  }).join("");

  return `
    <div class="ready-calendar-head">
      <button type="button" data-calendar-nav="-1" aria-label="Предыдущий месяц">‹</button>
      <strong>${escapeHtml(calendarMonthTitle(month))}</strong>
      <button type="button" data-calendar-nav="1" aria-label="Следующий месяц">›</button>
    </div>
    <div class="ready-calendar-week">
      ${["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => `<span>${day}</span>`).join("")}
    </div>
    <div class="ready-calendar-days">${days}</div>
  `;
}

function parseDateValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) {
    const today = kyrgyzInputDateTime().today;
    return parseDateValue(today);
  }
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3])
  };
}

function addCalendarMonths(value, amount) {
  const date = new Date(value.year, value.monthIndex + amount, 1);
  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: 1
  };
}

function dateValueFromParts(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextWorkingDate(value) {
  const parsed = parseDateValue(value);
  const date = new Date(parsed.year, parsed.monthIndex, parsed.day);
  while (isSundayDate(date)) {
    date.setDate(date.getDate() + 1);
  }
  return dateValueFromParts(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSundayDate(value) {
  const date = value instanceof Date ? value : (() => {
    const parsed = parseDateValue(value);
    return new Date(parsed.year, parsed.monthIndex, parsed.day);
  })();
  return date.getDay() === 0;
}

function calendarMonthTitle(value) {
  const label = new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric"
  }).format(new Date(value.year, value.monthIndex, 1));
  return label[0].toUpperCase() + label.slice(1);
}

function formatReadyDateLabel(value) {
  const date = parseDateValue(value);
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "long"
  }).format(new Date(date.year, date.monthIndex, date.day)).replace(",", "");
}

function timeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return 9 * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(value) {
  const day = 24 * 60;
  const minutes = (value % day + day) % day;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function initials(value) {
  return String(value || "LR").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function toast(message) {
  if (!elements.toast) return;
  elements.toast.classList.remove("is-visible");
  elements.toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">✓</span>
    <span class="toast-text">${escapeHtml(message)}</span>
  `;
  void elements.toast.offsetWidth;
  elements.toast.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => elements.toast.classList.remove("is-visible"), 3000);
}

function setNote(node, message, isError) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("is-error", Boolean(isError));
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
