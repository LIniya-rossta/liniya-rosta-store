const routes = new Set(["/", "/catalog", "/cart", "/checkout", "/success", "/measure"]);
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
  theme: "dark"
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

          <div class="ready-field ready-date-field">
            <span>Дата готовности</span>
            <button class="ready-trigger" type="button" id="readyDateButton" aria-expanded="false" aria-controls="readyCalendar">
              <strong id="readyDateLabel">${escapeHtml(formatReadyDateLabel(ready.date))}</strong>
              <i aria-hidden="true"></i>
            </button>
            <input name="readyDate" type="hidden" value="${ready.date}" data-ready-date>
            <div class="ready-calendar" id="readyCalendar" hidden>
              ${calendarTemplate(ready.date, ready.date)}
            </div>
          </div>
          <div class="ready-field ready-time-field">
            <span>Время, Кыргызстан</span>
            <div class="ready-time-control">
              <button type="button" data-time-step="-15" aria-label="Уменьшить время">−</button>
              <strong id="readyTimeLabel">${escapeHtml(ready.time)}</strong>
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

function bindReadyControls() {
  const form = document.getElementById("checkoutForm");
  const dateInput = form?.querySelector("[data-ready-date]");
  const timeInput = form?.querySelector("[data-ready-time]");
  const dateButton = document.getElementById("readyDateButton");
  const dateLabel = document.getElementById("readyDateLabel");
  const calendar = document.getElementById("readyCalendar");
  const timeLabel = document.getElementById("readyTimeLabel");
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
    if (!event.target.closest(".ready-date-field")) closeCalendar();
  });

  renderCalendar();
  setSelectedTime(timeInput.value);
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
  toast(`${product.title} добавлен: ${formatQty(qty)} ${product.unit || "шт"}`);
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

function inputQtyValue(value) {
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
  nodes.forEach((node) => observer.observe(node));
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
  elements.toast.textContent = message;
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
