import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js";

const canvas = document.getElementById("promoScene");
const root = document.getElementById("promoRoot");
const titleNode = document.getElementById("promoTitle");
const textNode = document.getElementById("promoText");
const kickerNode = document.getElementById("promoKicker");
const subtitleNode = document.getElementById("promoSubtitle");
const progressNode = document.getElementById("promoProgress");
const toggleButton = document.getElementById("promoToggle");
const voiceButton = document.getElementById("promoVoice");
const restartButton = document.getElementById("promoRestart");
const timelineButtons = [...document.querySelectorAll("[data-scene]")];

const scenes = [
  {
    center: 0,
    duration: 5.6,
    kicker: "Линия Роста",
    title: "сайт, который продает",
    text: "Современный магазин отделочных решений: каталог, корзина и заявки в Telegram.",
    voice: "Линия Роста запускает современный сайт. Клиент выбирает материалы, собирает корзину и отправляет заказ за несколько секунд."
  },
  {
    center: 9,
    duration: 6.2,
    kicker: "для клиентов",
    title: "каталог как маркетплейс",
    text: "Фото, цена, описание, м2 и штуки. Добавление в корзину без лишних шагов.",
    voice: "В каталоге все понятно: фото товара, описание, цена, единицы измерения и быстрый переход в корзину."
  },
  {
    center: 18,
    duration: 5.8,
    kicker: "замер онлайн",
    title: "объекты от 50 м2",
    text: "Большие заказы отправляются отдельно: адрес, контакты, дата и время готовности.",
    voice: "Для больших объектов есть отдельная заявка на замер от пятидесяти квадратных метров. Менеджер получает данные сразу."
  },
  {
    center: 27,
    duration: 7.2,
    kicker: "мастерская",
    title: "чертеж прямо на сайте",
    text: "Монтажник строит контур, выбирает пленку, менеджера, доптовары и отправляет заявку.",
    voice: "Монтажники работают в мастерской: строят чертеж, вводят точные размеры, выбирают полотно, менеджера и доп товары."
  },
  {
    center: 36,
    duration: 6.2,
    kicker: "Telegram",
    title: "заявка у нужного менеджера",
    text: "Заявки мастерской уходят только выбранному менеджеру. Обычные заказы остаются отдельно.",
    voice: "Заявка из мастерской приходит только выбранному менеджеру в Telegram. Все четко, быстро и без лишнего шума."
  }
];

const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
const sceneStarts = scenes.reduce((list, scene, index) => {
  list.push(index ? list[index - 1] + scenes[index - 1].duration : 0);
  return list;
}, []);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07111a, 0.028);

const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 140);
camera.position.set(0, 2.2, 10);

const world = new THREE.Group();
scene.add(world);

const loader = new THREE.TextureLoader();
const floaters = [];
const spinTargets = [];
const timelineGroups = [];

setupLights();
createStarfield();
createFloor();
createBrandScene(scenes[0].center);
createCatalogScene(scenes[1].center);
createMeasureScene(scenes[2].center);
createInstallerScene(scenes[3].center);
createTelegramScene(scenes[4].center);

let startTime = performance.now();
let pausedAt = 0;
let paused = false;
let activeSceneIndex = -1;
let voiceEnabled = false;

resize();
setSceneCopy(0);
renderer.setAnimationLoop(animate);

window.addEventListener("resize", resize);

toggleButton.addEventListener("click", () => {
  paused = !paused;
  if (paused) {
    pausedAt = performance.now();
    toggleButton.textContent = "Продолжить";
    window.speechSynthesis?.pause();
  } else {
    startTime += performance.now() - pausedAt;
    toggleButton.textContent = "Пауза";
    window.speechSynthesis?.resume();
  }
});

voiceButton.addEventListener("click", () => {
  voiceEnabled = !voiceEnabled;
  voiceButton.textContent = voiceEnabled ? "Голос включен" : "Включить голос";
  if (!voiceEnabled) {
    window.speechSynthesis?.cancel();
    subtitleNode.textContent = "Озвучка выключена.";
    return;
  }
  speakScene(activeSceneIndex < 0 ? 0 : activeSceneIndex);
});

restartButton.addEventListener("click", () => {
  startTime = performance.now();
  paused = false;
  activeSceneIndex = -1;
  toggleButton.textContent = "Пауза";
  if (voiceEnabled) window.speechSynthesis?.cancel();
});

timelineButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const index = Number(button.dataset.scene);
    const target = sceneStarts[index] || 0;
    startTime = performance.now() - target * 1000;
    paused = false;
    activeSceneIndex = -1;
    toggleButton.textContent = "Пауза";
  });
});

function setupLights() {
  scene.add(new THREE.AmbientLight(0x9db7c8, 1.25));
  const key = new THREE.DirectionalLight(0xf3dca8, 3.4);
  key.position.set(-5, 8, 8);
  scene.add(key);
  const cyan = new THREE.PointLight(0x63e6ff, 16, 32);
  cyan.position.set(5, 3, 4);
  scene.add(cyan);
  const gold = new THREE.PointLight(0xd9ad68, 12, 36);
  gold.position.set(25, 3, -5);
  scene.add(gold);
}

function createStarfield() {
  const count = 900;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 94;
    positions[index * 3 + 1] = Math.random() * 18 - 4;
    positions[index * 3 + 2] = (Math.random() - 0.5) * 48;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0x9eddec,
    size: 0.035,
    transparent: true,
    opacity: 0.62
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  spinTargets.push({ object: points, speed: 0.012 });
}

function createFloor() {
  const grid = new THREE.GridHelper(90, 80, 0x315469, 0x1b3445);
  grid.position.set(18, -2.25, -1);
  grid.material.transparent = true;
  grid.material.opacity = 0.34;
  world.add(grid);

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(92, 14),
    new THREE.MeshBasicMaterial({
      color: 0x0e2632,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide
    })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(18, -2.3, 0);
  world.add(runway);
}

function createBrandScene(x) {
  const group = makeSceneGroup(x);
  const logo = new THREE.Mesh(
    new THREE.CircleGeometry(1.28, 72),
    imageMaterial("/assets/logo.png", true)
  );
  logo.position.set(0, 1.05, 0);
  group.add(logo);
  floaters.push({ object: logo, base: logo.position.clone(), amp: 0.16, speed: 1.8, offset: 0 });

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.56, 0.018, 8, 96),
    new THREE.MeshBasicMaterial({ color: 0xf3dca8, transparent: true, opacity: 0.78 })
  );
  ring.position.copy(logo.position);
  group.add(ring);
  spinTargets.push({ object: ring, speed: 0.9 });

  const title = textPlane("ЛИНИЯ РОСТА", "интернет-магазин + мастерская монтажника", 4.8, 1.25, {
    accent: "#f3dca8",
    fontSize: 82
  });
  title.position.set(0, -1.0, 0.2);
  group.add(title);

  const chips = [
    ["каталог", -2.5, 0.1, -0.65],
    ["корзина", 2.45, 0.1, -0.75],
    ["Telegram", -2.1, 2.35, -0.9],
    ["чертеж", 2.15, 2.25, -0.9]
  ];
  chips.forEach(([label, px, py, pz], index) => {
    const chip = textPlane(label, "", 1.35, 0.46, { fontSize: 42, accent: index % 2 ? "#63e6ff" : "#f3dca8" });
    chip.position.set(px, py, pz);
    chip.rotation.y = px > 0 ? -0.32 : 0.32;
    group.add(chip);
    floaters.push({ object: chip, base: chip.position.clone(), amp: 0.08, speed: 2.2, offset: index });
  });
}

function createCatalogScene(x) {
  const group = makeSceneGroup(x);
  const phone = createPhoneMockup();
  phone.position.set(-2.2, 0.45, 0);
  phone.rotation.y = 0.32;
  group.add(phone);
  floaters.push({ object: phone, base: phone.position.clone(), amp: 0.09, speed: 1.6, offset: 1 });

  const products = [
    ["ПВХ пленка", "/assets/product-film-1.png", "м2"],
    ["SPC ламинат", "/assets/product-laminate-1.jpg", "м2"],
    ["Профиль Air", "/assets/product-profile-1.png", "пог. м"],
    ["Инструмент", "/assets/product-tool-1.png", "шт"]
  ];
  products.forEach(([title, image, unit], index) => {
    const card = createProductCard(title, unit, image);
    const col = index % 2;
    const row = Math.floor(index / 2);
    card.position.set(1.15 + col * 2.1, 1.1 - row * 1.8, -0.25 - row * 0.2);
    card.rotation.y = -0.24 + col * 0.12;
    card.rotation.z = (index - 1.5) * 0.04;
    group.add(card);
    floaters.push({ object: card, base: card.position.clone(), amp: 0.09, speed: 1.8, offset: index * 0.7 });
  });

  const cart = textPlane("корзина", "товары, м2, количество", 2.25, 0.82, { accent: "#63e6ff", fontSize: 58 });
  cart.position.set(2.35, -1.95, 0.25);
  cart.rotation.x = -0.08;
  group.add(cart);
}

function createMeasureScene(x) {
  const group = makeSceneGroup(x);
  const big = textPlane("50 м2+", "онлайн-заявка на большие объекты", 4.8, 1.55, {
    accent: "#f3dca8",
    fontSize: 120,
    align: "center"
  });
  big.position.set(0, 0.8, 0);
  group.add(big);

  for (let index = 0; index < 4; index += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.3 + index * 0.48, 0.012, 8, 128),
      new THREE.MeshBasicMaterial({
        color: index % 2 ? 0x63e6ff : 0xf3dca8,
        transparent: true,
        opacity: 0.48 - index * 0.07
      })
    );
    ring.rotation.x = Math.PI / 2.4;
    ring.position.set(0, 0.75, -0.35);
    group.add(ring);
    spinTargets.push({ object: ring, speed: (index + 1) * 0.22 });
  }

  const data = [
    ["адрес объекта", -2.8, -1.05],
    ["телефон", -0.75, -1.52],
    ["дата готовности", 1.35, -1.05],
    ["Кыргызстан", 3.1, -1.52]
  ];
  data.forEach(([label, px, py], index) => {
    const chip = textPlane(label, "", 1.75, 0.5, { fontSize: 34, accent: index % 2 ? "#f3dca8" : "#63e6ff" });
    chip.position.set(px, py, 0.2);
    chip.rotation.y = (index - 1.5) * 0.1;
    group.add(chip);
  });
}

function createInstallerScene(x) {
  const group = makeSceneGroup(x);
  const sketch = createSketch3d();
  sketch.position.set(-1.9, 0.35, 0.1);
  sketch.rotation.y = 0.28;
  group.add(sketch);

  const panel = textPlane("МАСТЕРСКАЯ", "чертеж + пленка + менеджер", 3.2, 1.0, {
    accent: "#f3dca8",
    fontSize: 70
  });
  panel.position.set(2.0, 1.35, 0.1);
  panel.rotation.y = -0.22;
  group.add(panel);

  const items = [
    ["точные стороны", 2.3, 0.3],
    ["доптовары", 2.05, -0.55],
    ["несколько чертежей", 2.55, -1.4]
  ];
  items.forEach(([label, px, py], index) => {
    const item = textPlane(label, "", 2.4, 0.45, { fontSize: 36, accent: index === 1 ? "#63e6ff" : "#f3dca8" });
    item.position.set(px, py, -0.05);
    item.rotation.y = -0.2;
    group.add(item);
  });
}

function createTelegramScene(x) {
  const group = makeSceneGroup(x);
  const manager = textPlane("Telegram", "выбранный менеджер получает заявку", 4.0, 1.1, {
    accent: "#63e6ff",
    fontSize: 84
  });
  manager.position.set(-1.75, 1.05, 0.1);
  manager.rotation.y = 0.22;
  group.add(manager);

  const request = textPlane("MR-1001", "чертеж SVG · материал · дата · телефон", 3.45, 1.1, {
    accent: "#f3dca8",
    fontSize: 72
  });
  request.position.set(1.9, 0.15, 0);
  request.rotation.y = -0.25;
  group.add(request);

  const cta = textPlane("liniya-rosta-store.onrender.com", "каталог, замер и мастерская уже работают", 5.2, 1.0, {
    accent: "#f3dca8",
    fontSize: 52
  });
  cta.position.set(0, -1.7, 0.2);
  group.add(cta);

  const logo = new THREE.Mesh(
    new THREE.CircleGeometry(0.76, 64),
    imageMaterial("/assets/logo.png", true)
  );
  logo.position.set(-3.55, 0.05, 0.32);
  group.add(logo);
  spinTargets.push({ object: logo, speed: 0.46 });
}

function makeSceneGroup(x) {
  const group = new THREE.Group();
  group.position.x = x;
  world.add(group);
  timelineGroups.push(group);
  return group;
}

function createPhoneMockup() {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.45, 4.4, 0.18),
    new THREE.MeshPhysicalMaterial({
      color: 0x101b25,
      roughness: 0.24,
      metalness: 0.18,
      clearcoat: 0.7,
      clearcoatRoughness: 0.22
    })
  );
  group.add(frame);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.16, 4.02),
    new THREE.MeshBasicMaterial({ map: phoneTexture(), transparent: true })
  );
  screen.position.z = 0.1;
  group.add(screen);
  return group;
}

function createProductCard(title, unit, image) {
  const group = new THREE.Group();
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 2.25, 0.08),
    new THREE.MeshPhysicalMaterial({
      color: 0x152432,
      roughness: 0.34,
      metalness: 0.08,
      clearcoat: 0.55,
      transparent: true,
      opacity: 0.96
    })
  );
  group.add(back);

  const imagePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1.42, 0.92),
    imageMaterial(image)
  );
  imagePlane.position.set(0, 0.48, 0.065);
  group.add(imagePlane);

  const label = textPlane(title, `1000 ${unit} · добавить`, 1.42, 0.7, {
    fontSize: 40,
    accent: "#f3dca8",
    compact: true
  });
  label.position.set(0, -0.56, 0.07);
  group.add(label);
  return group;
}

function createSketch3d() {
  const group = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(3.35, 3.35),
    new THREE.MeshBasicMaterial({ map: sketchBoardTexture(), transparent: true })
  );
  board.position.z = -0.035;
  group.add(board);

  const points = [
    new THREE.Vector3(-1.1, 0.95, 0.02),
    new THREE.Vector3(1.06, 0.82, 0.02),
    new THREE.Vector3(1.0, -0.7, 0.02),
    new THREE.Vector3(0.26, -0.74, 0.02),
    new THREE.Vector3(0.08, -1.14, 0.02),
    new THREE.Vector3(-1.18, -0.98, 0.02)
  ];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints([...points, points[0]]);
  const line = new THREE.Line(
    lineGeometry,
    new THREE.LineBasicMaterial({ color: 0x63e6ff, linewidth: 4 })
  );
  group.add(line);

  points.forEach((point, index) => {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 24, 16),
      new THREE.MeshBasicMaterial({ color: index % 2 ? 0xf3dca8 : 0x63e6ff })
    );
    dot.position.copy(point);
    group.add(dot);
  });

  const label = textPlane("A-B 3,45 м", "площадь 10 м2", 1.55, 0.48, { fontSize: 34, accent: "#f3dca8" });
  label.position.set(0.1, 1.3, 0.06);
  group.add(label);
  return group;
}

function imageMaterial(src, transparent = false) {
  const texture = loader.load(src);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: transparent ? 0.98 : 1,
    side: THREE.DoubleSide
  });
}

function textPlane(title, body, width, height, options = {}) {
  const texture = textTexture(title, body, options);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  return mesh;
}

function textTexture(title, body = "", options = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const accent = options.accent || "#f3dca8";
  const compact = Boolean(options.compact);
  roundRect(ctx, 18, 18, canvas.width - 36, canvas.height - 36, compact ? 42 : 70);
  const grd = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grd.addColorStop(0, "rgba(255,255,255,0.16)");
  grd.addColorStop(1, "rgba(255,255,255,0.035)");
  ctx.fillStyle = grd;
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = `900 ${Math.max(36, options.fontSize || 76)}px Arial, sans-serif`;
  ctx.textAlign = options.align || "left";
  ctx.textBaseline = "middle";
  const x = options.align === "center" ? canvas.width / 2 : 72;
  const y = body ? (compact ? 190 : 198) : canvas.height / 2;
  wrapText(ctx, title, x, y, canvas.width - 144, options.fontSize || 76, options.align === "center");

  if (body) {
    ctx.fillStyle = "rgba(246,251,255,0.86)";
    ctx.font = `800 ${compact ? 34 : 42}px Arial, sans-serif`;
    wrapText(ctx, body, x, compact ? 334 : 344, canvas.width - 144, compact ? 38 : 48, options.align === "center");
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function phoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1340;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#07111a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawScreenCard(ctx, 42, 58, 636, 174, "Линия Роста", "Каталог · Корзина · Заказ");
  drawScreenCard(ctx, 42, 270, 300, 390, "Пленка ПВХ", "100 сом / м2");
  drawScreenCard(ctx, 378, 270, 300, 390, "SPC ламинат", "1800 сом / м2");
  drawScreenCard(ctx, 42, 704, 636, 180, "Корзина", "2 товара · оформление");
  drawScreenCard(ctx, 42, 928, 636, 250, "Спасибо!", "Заказ отправлен менеджеру");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function sketchBoardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 900;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(8,14,22,0.96)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= 900; i += 72) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 900);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(900, i);
    ctx.stroke();
  }
  roundRect(ctx, 45, 45, 810, 810, 58);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 7;
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function drawScreenCard(ctx, x, y, width, height, title, body) {
  roundRect(ctx, x, y, width, height, 36);
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#f3dca8";
  ctx.font = "900 46px Arial, sans-serif";
  ctx.fillText(title, x + 34, y + 72);
  ctx.fillStyle = "#d6e3ec";
  ctx.font = "800 34px Arial, sans-serif";
  ctx.fillText(body, x + 34, y + 124);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, centered = false) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.slice(0, 3).forEach((item, index) => {
    ctx.fillText(item, centered ? x : x, startY + index * lineHeight);
  });
}

function animate(now) {
  if (paused) return;
  const seconds = ((now - startTime) / 1000) % totalDuration;
  const timeline = getTimeline(seconds);
  const current = scenes[timeline.index];
  if (timeline.index !== activeSceneIndex) setSceneCopy(timeline.index);

  const next = scenes[Math.min(timeline.index + 1, scenes.length - 1)];
  const transition = ease(saturate((timeline.local - 0.72) / 0.28));
  const focusX = lerp(current.center, next.center, transition);
  const drift = Math.sin(now * 0.00035) * 0.28;

  camera.position.set(focusX + drift, 1.7 + Math.sin(now * 0.0007) * 0.24, 8.2 - transition * 0.55);
  camera.lookAt(focusX, 0.15, 0);

  world.rotation.y = Math.sin(now * 0.00024) * 0.035;
  world.position.y = Math.sin(now * 0.0005) * 0.06;

  timelineGroups.forEach((group, index) => {
    const distance = Math.abs(group.position.x - focusX);
    const active = Math.max(0, 1 - distance / 12);
    group.rotation.y = Math.sin(now * 0.0006 + index) * 0.05;
    group.scale.setScalar(0.84 + active * 0.16);
  });

  floaters.forEach((item) => {
    item.object.position.y = item.base.y + Math.sin(now * 0.001 * item.speed + item.offset) * item.amp;
  });

  spinTargets.forEach((item) => {
    item.object.rotation.z += item.speed * 0.006;
  });

  progressNode.style.width = `${(seconds / totalDuration) * 100}%`;
  renderer.render(scene, camera);
}

function getTimeline(seconds) {
  let index = scenes.length - 1;
  for (let i = 0; i < scenes.length; i += 1) {
    const start = sceneStarts[i];
    const end = start + scenes[i].duration;
    if (seconds >= start && seconds < end) {
      index = i;
      break;
    }
  }
  const local = (seconds - sceneStarts[index]) / scenes[index].duration;
  return { index, local };
}

function setSceneCopy(index) {
  const item = scenes[index];
  activeSceneIndex = index;
  kickerNode.textContent = item.kicker;
  titleNode.textContent = item.title;
  textNode.textContent = item.text;
  root.dataset.scene = String(index);
  timelineButtons.forEach((button) => {
    button.classList.toggle("is-active", Number(button.dataset.scene) === index);
  });
  if (voiceEnabled) speakScene(index);
}

function speakScene(index) {
  if (!("speechSynthesis" in window)) {
    subtitleNode.textContent = "Озвучка не поддерживается этим браузером.";
    return;
  }
  const item = scenes[index];
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(item.voice);
  utterance.lang = "ru-RU";
  utterance.rate = 1.02;
  utterance.pitch = 0.92;
  utterance.volume = 1;
  subtitleNode.textContent = item.voice;
  window.speechSynthesis.speak(utterance);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function saturate(value) {
  return Math.max(0, Math.min(1, value));
}

function ease(value) {
  const x = saturate(value);
  return x * x * (3 - 2 * x);
}

function lerp(from, to, value) {
  return from + (to - from) * value;
}
