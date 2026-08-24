# Линия Роста Store

Интернет-магазин для компании "Линия Роста": отдельный каталог, полноценная корзина, отдельное оформление заказа, анимированный экран успешной заявки, онлайн-замер от 50 м² и Telegram-админка для товаров/заказов.

## Запуск

1. Скопируйте `.env.example` в `.env`.
2. Укажите новый `TELEGRAM_BOT_TOKEN` из BotFather.
3. Для открытой админки поставьте `TELEGRAM_ADMIN_OPEN_ACCESS=true`; для закрытой укажите `TELEGRAM_ADMIN_IDS`.
4. Запустите:

```bash
npm start
```

По умолчанию сайт откроется на `http://localhost:4177`.

Локально бот удобнее запускать в polling-режиме:

```env
PUBLIC_BASE_URL=http://localhost:4177
TELEGRAM_BOT_MODE=polling
TELEGRAM_DELETE_WEBHOOK_ON_POLLING=false
```

Если используется тот же токен, что и на Render, локальный polling не должен удалять production webhook. Для настоящего локального polling лучше создать отдельного тестового бота.

## Страницы

- `/` - главная с video-hero, отзывами, шоурумом и картой.
- `/catalog` - каталог товаров в формате marketplace-карточек.
- `/cart` - отдельная корзина с количеством, суммой и переходом к оформлению.
- `/checkout` - отдельная страница оформления: имя, телефон, адрес, доставка/самовывоз и комментарий.
- `/measure` - заявка на онлайн-замер от 50 м².
- `/installer` - визуализация и просчет потолка для клиентов: загрузка или построение чертежей, выбор пленки, доптовары и отправка заявки менеджеру.
- `/success` - анимированный экран после отправки заказа.

## Telegram-админка

Бот работает в двух режимах:

- `Войти в админ-панель` - вход по логину и паролю, затем управление товарами и заказами.
- `Наблюдать за заказами` - чат просто получает новые заказы с сайта.

Админ-панель внутри Telegram:

- `➕ Добавить товар` или `/addproduct` - пошаговая загрузка товара с финальным подтверждением.
- `✏️ Изменить товар` или `/edit` - редактирование названия, категории, цены, единицы, описания, фото и видимости.
- `📦 Товары` или `/products` - список активных товаров.
- `🧾 Последние заказы` или `/orders` - последние заказы с кнопками статуса.
- `📊 Сводка за неделю` или `/week` - заказы, сумма и популярные позиции за 7 дней.
- `/price ID 1800` - изменить цену.
- `/stock ID в наличии` - изменить наличие.
- `/hide ID` - скрыть товар с сайта.

Когда клиент оформляет корзину или заявку на замер, заказ сохраняется в `data/orders.json` и отправляется владельцу в Telegram. Статусы: новый, принят, в работе, доставлен, отменен.

Админ-панель открывается без логина и пароля. Если включить открытый режим,
доступ получит любой пользователь, который напишет боту:

```env
TELEGRAM_ADMIN_OPEN_ACCESS=true
```

Для закрытого режима оставьте `TELEGRAM_ADMIN_OPEN_ACCESS=false` и укажите ID или username:

```env
TELEGRAM_ADMIN_IDS=ваш_telegram_id
TELEGRAM_ADMIN_USERNAMES=telegram_username_без_@
TELEGRAM_ADMIN_SESSION_HOURS=12
```

Если нужно несколько админов, укажите ID через запятую.

## Менеджеры заявок на расчет

Раздел `/installer` отправляет заявку на расчет выбранному менеджеру. Менеджер один раз открывает Telegram-бота, нажимает `Менеджер` или пишет `/manager`, вводит только свой пароль, и бот привязывает этот Telegram-чат к менеджеру. После этого выбранные клиентами заявки приходят именно этому менеджеру. Если менеджер еще не привязал Telegram, заявка придет администраторам.

Нужно настроить 4 менеджеров через переменные окружения:

```env
TELEGRAM_MANAGER_SESSION_HOURS=12
TELEGRAM_MANAGER_1_NAME=Катерина
TELEGRAM_MANAGER_1_PASSWORD=пароль_менеджера_1
TELEGRAM_MANAGER_2_NAME=Тая
TELEGRAM_MANAGER_2_PASSWORD=пароль_менеджера_2
TELEGRAM_MANAGER_3_NAME=Диана
TELEGRAM_MANAGER_3_PASSWORD=пароль_менеджера_3
TELEGRAM_MANAGER_4_NAME=Татьяна
TELEGRAM_MANAGER_4_PASSWORD=пароль_менеджера_4
```

Пароли менеджеров тоже не хранить в GitHub. На локальном запуске, если пароли не заданы и это не Render, включаются демо-пароли `285801`-`285804`. На Render демо-пароли не включаются.

Текущий временный список менеджеров:

```text
TELEGRAM_MANAGER_1_NAME=Катерина
TELEGRAM_MANAGER_1_PASSWORD=указать в Render Environment
TELEGRAM_MANAGER_2_NAME=Тая
TELEGRAM_MANAGER_2_PASSWORD=указать в Render Environment
TELEGRAM_MANAGER_3_NAME=Диана
TELEGRAM_MANAGER_3_PASSWORD=указать в Render Environment
TELEGRAM_MANAGER_4_NAME=Татьяна
TELEGRAM_MANAGER_4_PASSWORD=указать в Render Environment
```

## AI для чертежей

Кнопка распознавания фото в разделе визуализации и просчета работает через OpenAI Responses API. Код уже подключен, но на сервере должен быть задан API-ключ:

```env
OPENAI_API_KEY=ваш_openai_api_key
OPENAI_INSTALLER_AI_MODEL=gpt-4o-mini
```

Если `OPENAI_API_KEY` не задан, сайт честно покажет, что AI не подключен. После добавления ключа в Railway/Render нужно сделать redeploy.

Проверка настройки:

```text
https://ваш-домен/api/health
```

В ответе `setup.missing` должно быть пустым, `telegramManagers` должно быть `4`, а `installerAi` должно быть `true`.

## Telegram по домену

Для боевого сайта с HTTPS-доменом укажите в `.env`:

```env
PUBLIC_BASE_URL=https://ваш-домен
TELEGRAM_BOT_MODE=webhook
TELEGRAM_WEBHOOK_SECRET=случайная_длинная_строка
```

На Railway временно используйте рабочий домен Railway, пока `www.liniyarosta.com` не резолвится:

```env
PUBLIC_BASE_URL=https://liniya-rosta-store.up.railway.app
```

Не оставляйте старый адрес `onrender.com` в `PUBLIC_BASE_URL`, иначе Telegram-бот будет отправлять старые ссылки.

При старте сервер сам подключит Telegram webhook на адрес:

```text
/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>
```

Если `TELEGRAM_WEBHOOK_SECRET` не задан, сервер сам создаст стабильный секрет из Telegram bot token. Но вручную заданный секрет все равно лучше для production.

На локальном `localhost` Telegram webhook не заработает без публичного HTTPS-адреса, поэтому для разработки оставлен `TELEGRAM_BOT_MODE=polling`.

## Каталог

`data/products.json` уже содержит импортированный каталог, а фото товаров лежат в `public/uploads/products`.
Новые товары, фото, цены и наличие можно дальше загружать через Telegram-бота.

`data/orders.json` не коммитится в GitHub: это рабочие заказы клиентов.

## Чтобы изменения каталога не пропадали

На бесплатном Render файловая система временная: товар может появиться после загрузки через Telegram или скрыться через админ-панель, но после restart/redeploy каталог снова вернется к версии из GitHub, если изменение не сохранено во внешнее хранилище. В проекте есть два способа защиты:

1. Render Disk: задайте `DATA_DIR` и `UPLOAD_DIR` на persistent disk.
2. GitHub-бэкап каталога: задайте токен, и бот будет сохранять `data/products.json`, фото новых товаров, скрытие и редактирование товаров прямо в репозиторий.

Для GitHub-бэкапа добавьте в Render Environment:

```env
GITHUB_CATALOG_SYNC_TOKEN=github_fine_grained_token
GITHUB_CATALOG_SYNC_REPO=LIniya-rossta/liniya-rosta-store
GITHUB_CATALOG_SYNC_BRANCH=main
GITHUB_CATALOG_SYNC_ENABLED=true
```

Токен должен иметь доступ `Contents: Read and write` только к репозиторию `LIniya-rossta/liniya-rosta-store`. Не добавляйте токен в код или GitHub.

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
TELEGRAM_ADMIN_OPEN_ACCESS=true
TELEGRAM_ADMIN_IDS=8906052538
TELEGRAM_ADMIN_USERNAMES=anatmerin
TELEGRAM_OBSERVER_IDS=8906052538
TELEGRAM_ADMIN_SESSION_HOURS=12
TELEGRAM_MANAGER_SESSION_HOURS=12
TELEGRAM_MANAGER_1_NAME=Катерина
TELEGRAM_MANAGER_1_PASSWORD=пароль_менеджера_1
TELEGRAM_MANAGER_2_NAME=Тая
TELEGRAM_MANAGER_2_PASSWORD=пароль_менеджера_2
TELEGRAM_MANAGER_3_NAME=Диана
TELEGRAM_MANAGER_3_PASSWORD=пароль_менеджера_3
TELEGRAM_MANAGER_4_NAME=Татьяна
TELEGRAM_MANAGER_4_PASSWORD=пароль_менеджера_4
TELEGRAM_BOT_TOKEN=новый_токен_из_BotFather
TELEGRAM_WEBHOOK_SECRET=любая_длинная_случайная_строка
OPENAI_API_KEY=ваш_openai_api_key
OPENAI_INSTALLER_AI_MODEL=gpt-4o-mini
GITHUB_CATALOG_SYNC_TOKEN=github_fine_grained_token
GITHUB_CATALOG_SYNC_REPO=LIniya-rossta/liniya-rosta-store
GITHUB_CATALOG_SYNC_BRANCH=main
GITHUB_CATALOG_SYNC_ENABLED=true
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
