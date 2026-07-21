# Линия Роста Store

Интернет-магазин для компании "Линия Роста": отдельный каталог, полноценная корзина, отдельное оформление заказа, анимированный экран успешной заявки, онлайн-замер от 50 м² и Telegram-админка для товаров/заказов.

## Запуск

1. Скопируйте `.env.example` в `.env`.
2. Укажите новый `TELEGRAM_BOT_TOKEN` из BotFather.
3. Проверьте `TELEGRAM_ADMIN_IDS=8906052538`.
4. Запустите:

```bash
npm start
```

По умолчанию сайт откроется на `http://localhost:4177`.

Локально бот удобнее запускать в polling-режиме:

```env
PUBLIC_BASE_URL=http://localhost:4177
TELEGRAM_BOT_MODE=polling
```

## Страницы

- `/` - главная с video-hero, отзывами, шоурумом и картой.
- `/catalog` - каталог товаров в формате marketplace-карточек.
- `/cart` - отдельная корзина с количеством, суммой и переходом к оформлению.
- `/checkout` - отдельная страница оформления: имя, телефон, адрес, доставка/самовывоз и комментарий.
- `/measure` - заявка на онлайн-замер от 50 м².
- `/success` - анимированный экран после отправки заказа.

## Telegram-админка

Бот работает как админ-панель:

- `➕ Добавить товар` или `/addproduct` - пошаговая загрузка товара.
- `📦 Товары` или `/products` - список активных товаров.
- `🧾 Заказы` или `/orders` - последние заказы с кнопками статуса.
- `📊 Сводка` или `/summary` - общая статистика.
- `/price ID 1800` - изменить цену.
- `/stock ID в наличии` - изменить наличие.
- `/hide ID` - скрыть товар с сайта.

Когда клиент оформляет корзину или заявку на замер, заказ сохраняется в `data/orders.json` и отправляется владельцу в Telegram. Статусы: новый, принят, в работе, доставлен, отменен.

## Telegram по домену

Для боевого сайта с HTTPS-доменом укажите в `.env`:

```env
PUBLIC_BASE_URL=https://ваш-домен
TELEGRAM_BOT_MODE=webhook
TELEGRAM_WEBHOOK_SECRET=случайная_длинная_строка
```

При старте сервер сам подключит Telegram webhook на адрес:

```text
/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
```

На локальном `localhost` Telegram webhook не заработает без публичного HTTPS-адреса, поэтому для разработки оставлен `TELEGRAM_BOT_MODE=polling`.

## Каталог

`data/products.json` уже содержит импортированный каталог, а фото товаров лежат в `public/uploads/products`.
Новые товары, фото, цены и наличие можно дальше загружать через Telegram-бота.

`data/orders.json` не коммитится в GitHub: это рабочие заказы клиентов.

## Деплой на Render

GitHub Pages для этого проекта не подходит, потому что сайту нужен Node.js-сервер, API заказов и Telegram-бот. Правильная схема:

```text
GitHub -> Render Web Service -> HTTPS-домен -> Telegram webhook
```

В репозитории есть `render.yaml`, поэтому Render можно настроить через Blueprint:

1. Откройте Render Dashboard.
2. Нажмите `New` -> `Blueprint`.
3. Подключите репозиторий `LIniya-rossta/liniya-rosta-store`.
4. Оставьте Blueprint path: `render.yaml`.
5. В поле `TELEGRAM_BOT_TOKEN` вставьте новый токен из BotFather.
6. Нажмите `Apply`/`Create`.

Если создаете вручную через `New Web Service`, выбирайте именно `Web Services`, не `Static Sites`, и укажите:

```text
Build command: npm install --omit=dev
Start command: npm start
Health check path: /api/health
```

Для нормального магазина нужен persistent disk, иначе заказы, загруженные через Telegram товары и фото могут пропасть после redeploy/restart. В Render добавьте Disk:

```text
Mount path: /opt/render/project/src/storage
Size: 1 GB
```

Переменные окружения для Render:

```env
DATA_DIR=/opt/render/project/src/storage/data
UPLOAD_DIR=/opt/render/project/src/storage/uploads
ENABLE_TELEGRAM_BOT=true
TELEGRAM_BOT_MODE=webhook
TELEGRAM_ADMIN_IDS=8906052538
TELEGRAM_BOT_TOKEN=новый_токен_из_BotFather
TELEGRAM_WEBHOOK_SECRET=любая_длинная_случайная_строка
COMPANY_WHATSAPP=996990883883
```

Render сам выдаст `RENDER_EXTERNAL_URL`, и сервер использует его для подключения Telegram webhook. Реальный `.env` и Telegram token в GitHub не загружать.

## Видео на первом экране

В hero уже стоит настоящий video-slot. Чтобы включить видео шоурума, положите ролик сюда:

```text
public/assets/showroom-video.mp4
```

Пока видео нет, сайт показывает анимированную обложку на основе фото из 2ГИС.

## Важно по безопасности

Telegram token нельзя хранить в коде и публичных файлах. Если токен был отправлен в чат или кому-то показан, лучше сразу перевыпустить его в BotFather.
