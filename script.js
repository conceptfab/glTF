let scene, camera, renderer, model, controls;
let lights = {};
let stats;
let currentModelPath = null;
let modelConfigs = new Map();
let axis; // Zmienna dla grupy osi
let currentSceneConfig = null;

function createGradientTexture(
  size = 512,
  innerRadius = 0.1,
  outerRadius = 1.0
) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Tworzenie gradientu radialnego
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0, // Początek gradientu (środek)
    size / 2,
    size / 2,
    (size / 2) * outerRadius // Koniec gradientu (krawędzie)
  );

  // Definicja punktów przejścia gradientu
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Środek - w pełni widoczny
  gradient.addColorStop(innerRadius, 'rgba(255, 255, 255, 1)'); // Początek rozmycia
  gradient.addColorStop(outerRadius, 'rgba(255, 255, 255, 0)'); // Krawędzie - w pełni przezroczyste

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

// Funkcja wczytująca konfigurację sceny
async function loadSceneConfig(sceneName = 'default') {
  try {
    console.log('🔄 Ładowanie konfiguracji sceny:', `scenes/${sceneName}.json`);
    const response = await fetch(`scenes/${sceneName}.json`);

    if (!response.ok) {
      throw new Error(
        `Nie można załadować konfiguracji sceny (status ${response.status})`
      );
    }

    const config = await response.json();
    console.log('✅ Załadowana konfiguracja:', config);
    currentSceneConfig = config;

    // Aplikuj konfigurację sceny
    if (scene && config.background) {
      console.log('🎨 Ustawiam kolor tła:', config.background.color);
      scene.background = new THREE.Color(config.background.color);
    }

    return config;
  } catch (error) {
    console.error('❌ Błąd wczytywania konfiguracji sceny:', error);
    // Zwróć domyślną konfigurację lub null
    return null;
  }
}

// Funkcja aplikująca ustawienia świateł
function applyLightingConfig(config) {
  if (!config || !config.lights) return;

  // Usuwanie istniejących świateł
  Object.values(lights).forEach((light) => {
    if (light.parent) light.parent.remove(light);
  });
  lights = {};

  // Tworzenie nowych świateł na podstawie konfiguracji
  Object.entries(config.lights).forEach(([key, lightConfig]) => {
    let light;
    switch (lightConfig.type) {
      case 'DirectionalLight':
        light = new THREE.DirectionalLight(
          new THREE.Color(lightConfig.color),
          lightConfig.intensity
        );
        break;
      case 'AmbientLight':
        light = new THREE.AmbientLight(
          new THREE.Color(lightConfig.color),
          lightConfig.intensity
        );
        break;
      default:
        return;
    }

    if (lightConfig.position) {
      light.position.set(
        lightConfig.position.x,
        lightConfig.position.y,
        lightConfig.position.z
      );
    }

    light.castShadow = lightConfig.castShadow || false;
    light.visible = lightConfig.enabled;

    lights[key] = light;
    scene.add(light);

    // Tworzenie pomocniczych wskaźników świateł (tylko dla świateł kierunkowych)
    if (lightConfig.type === 'DirectionalLight') {
      const helper = new THREE.DirectionalLightHelper(light, 1);
      helper.visible = false; // Domyślnie ukryte
      scene.add(helper);
      lights[key + 'Helper'] = helper;
    }
  });

  // Aktualizacja kontrolek w interfejsie
  updateLightingControls();
}

// Funkcja aktualizująca kontrolki w interfejsie
function updateLightingControls() {
  const lightingControls = document.querySelector('.lighting-controls');

  // Zachowujemy oryginalne checkboxy
  const mainLight = document.createElement('div');
  mainLight.className = 'light-option';
  mainLight.innerHTML = `
    <label>
      <input type="checkbox" checked />
      Światło główne
    </label>
  `;

  const auxiliaryLight = document.createElement('div');
  auxiliaryLight.className = 'light-option';
  auxiliaryLight.innerHTML = `
    <label>
      <input type="checkbox" checked />
      Światło pomocnicze
    </label>
  `;

  const intensityControl = document.createElement('div');
  intensityControl.className = 'light-intensity';
  intensityControl.innerHTML = `
    <label>
      Intensywność
      <input type="range" min="0" max="100" value="50" />
    </label>
  `;

  lightingControls.appendChild(mainLight);
  lightingControls.appendChild(auxiliaryLight);
  lightingControls.appendChild(intensityControl);

  // Dodajemy obsługę zdarzeń dla checkboxów
  mainLight.querySelector('input').addEventListener('change', (e) => {
    if (lights.keyLight) {
      lights.keyLight.visible = e.target.checked;
      if (lights.keyLightSphere)
        lights.keyLightSphere.visible = e.target.checked;
    }
  });

  auxiliaryLight.querySelector('input').addEventListener('change', (e) => {
    if (lights.fillLight) {
      lights.fillLight.visible = e.target.checked;
      if (lights.fillLightSphere)
        lights.fillLightSphere.visible = e.target.checked;
    }
    if (lights.rimLight) {
      lights.rimLight.visible = e.target.checked;
      if (lights.rimLightSphere)
        lights.rimLightSphere.visible = e.target.checked;
    }
  });

  intensityControl.querySelector('input').addEventListener('input', (e) => {
    const intensity = e.target.value / 100;
    if (lights.keyLight) lights.keyLight.intensity = intensity * 2.0;
    if (lights.fillLight) lights.fillLight.intensity = intensity * 0.4;
    if (lights.rimLight) lights.rimLight.intensity = intensity * 0.3;
  });
}

// Funkcja tworząca etykiety osi
function createAxisLabel(text, color, position, rotation) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = 'Bold 80px Arial';
  ctx.fillStyle = '#' + new THREE.Color(color).getHexString();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);

  sprite.position.copy(position);
  sprite.rotation.copy(rotation);
  sprite.scale.set(1, 1, 1);

  axis.add(sprite);
  return sprite;
}

function createAxis() {
  // Tworzymy grupę dla osi
  axis = new THREE.Group();
  axis.visible = false; // Domyślnie ukryte

  // Tworzymy osie
  const axisLength = 5;
  const axisWidth = 0.05;

  // Oś X (czerwona)
  const xGeometry = new THREE.CylinderGeometry(
    axisWidth,
    axisWidth,
    axisLength
  );
  const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const xAxis = new THREE.Mesh(xGeometry, xMaterial);
  xAxis.rotation.z = -Math.PI / 2;
  xAxis.position.x = axisLength / 2;
  axis.add(xAxis);

  // Oś Y (zielona)
  const yGeometry = new THREE.CylinderGeometry(
    axisWidth,
    axisWidth,
    axisLength
  );
  const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  const yAxis = new THREE.Mesh(yGeometry, yMaterial);
  yAxis.position.y = axisLength / 2;
  axis.add(yAxis);

  // Oś Z (niebieska)
  const zGeometry = new THREE.CylinderGeometry(
    axisWidth,
    axisWidth,
    axisLength
  );
  const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
  const zAxis = new THREE.Mesh(zGeometry, zMaterial);
  zAxis.rotation.x = Math.PI / 2;
  zAxis.position.z = axisLength / 2;
  axis.add(zAxis);

  // Strzałki na końcach osi
  const arrowLength = 0.3;
  const arrowWidth = 0.15;

  // Strzałka X
  const xArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength);
  const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
  xArrow.rotation.z = -Math.PI / 2;
  xArrow.position.x = axisLength;
  axis.add(xArrow);

  // Strzałka Y
  const yArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength);
  const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
  yArrow.position.y = axisLength;
  axis.add(yArrow);

  // Strzałka Z
  const zArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength);
  const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
  zArrow.rotation.x = Math.PI / 2;
  zArrow.position.z = axisLength;
  axis.add(zArrow);

  // Dodajemy etykiety osi
  createAxisLabel(
    'X',
    0xff0000,
    new THREE.Vector3(axisLength + 0.5, 0, 0),
    new THREE.Euler(0, 0, 0)
  );
  createAxisLabel(
    'Y',
    0x00ff00,
    new THREE.Vector3(0, axisLength + 0.5, 0),
    new THREE.Euler(0, 0, 0)
  );
  createAxisLabel(
    'Z',
    0x0000ff,
    new THREE.Vector3(0, 0, axisLength + 0.5),
    new THREE.Euler(0, 0, 0)
  );

  scene.add(axis);
  return axis;
}

// Funkcja ładująca listę modeli
async function loadModelsList() {
  try {
    const response = await fetch('models/list.json');
    if (!response.ok) throw new Error('Nie można załadować listy modeli');

    const modelsList = await response.json();
    const modelsListElement = document.getElementById('modelsList');

    if (!modelsListElement) {
      console.error('Nie znaleziono elementu listy modeli w DOM');
      return;
    }

    modelsListElement.innerHTML = '';

    modelsList.forEach((model) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = model.name;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        loadModel(model.path);
      });
      li.appendChild(a);
      modelsListElement.appendChild(li);
    });
  } catch (error) {
    console.error('Błąd ładowania listy modeli:', error);
    const modelsListElement = document.getElementById('modelsList');
    if (modelsListElement) {
      modelsListElement.innerHTML =
        '<div class="error">Nie można załadować listy modeli</div>';
    }
  }
}

async function init() {
  console.log('🚀 Inicjalizacja aplikacji...');

  // Inicjalizacja statystyk
  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  stats.dom.style.display = 'none';

  // Tworzenie sceny
  scene = new THREE.Scene();
  console.log('🎬 Utworzono scenę');

  // Dodanie czerwonego sześcianu
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  scene.add(cube);

  // Wczytanie i aplikacja konfiguracji sceny
  console.log('📥 Wczytuję konfigurację sceny...');
  const sceneConfig = await loadSceneConfig();
  if (sceneConfig) {
    console.log('✅ Załadowano konfigurację sceny:', sceneConfig);
    currentSceneConfig = sceneConfig;
    scene.background = new THREE.Color(sceneConfig.background.color);
    console.log('🎨 Ustawiono kolor tła:', sceneConfig.background.color);
    applyLightingConfig(sceneConfig);
  } else {
    console.warn('⚠️ Brak konfiguracji sceny, używam domyślnych ustawień');
    scene.background = new THREE.Color(0x121212);
    const defaultLights = setupLights();
    Object.values(defaultLights).forEach((light) => {
      if (light instanceof THREE.Light) {
        scene.add(light);
      }
    });
  }

  // Konfiguracja kamery
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  // Ustawienie początkowej pozycji kamery z konfiguracji
  if (
    currentSceneConfig &&
    currentSceneConfig.cameras &&
    currentSceneConfig.cameras.default
  ) {
    const defaultCam = currentSceneConfig.cameras.default;
    camera.position.set(
      defaultCam.position.x,
      defaultCam.position.y,
      defaultCam.position.z
    );
  } else {
    camera.position.set(5, 5, 5);
  }

  // Konfiguracja renderera
  renderer = new THREE.WebGLRenderer();

  // Zastosuj ustawienia z konfiguracji sceny
  if (currentSceneConfig && currentSceneConfig.renderer) {
    const rendererConfig = currentSceneConfig.renderer;

    renderer.setPixelRatio(
      rendererConfig.pixelRatio === 'devicePixelRatio'
        ? window.devicePixelRatio
        : rendererConfig.pixelRatio
    );

    renderer.antialias = rendererConfig.antialias;
    renderer.logarithmicDepthBuffer = rendererConfig.logarithmicDepthBuffer;

    if (rendererConfig.shadowMap) {
      renderer.shadowMap.enabled = rendererConfig.shadowMap.enabled;
      renderer.shadowMap.type =
        THREE[rendererConfig.shadowMap.type + 'ShadowMap'];

      // Konfiguracja mapy cieni dla światła głównego
      if (lights.keyLight) {
        lights.keyLight.shadow.mapSize.width = rendererConfig.shadowMap.width;
        lights.keyLight.shadow.mapSize.height = rendererConfig.shadowMap.height;
        lights.keyLight.shadow.radius = rendererConfig.shadowMap.radius;
        lights.keyLight.shadow.blurSamples =
          rendererConfig.shadowMap.blurSamples;
        lights.keyLight.shadow.bias = rendererConfig.shadowMap.bias;
        lights.keyLight.shadow.normalBias = rendererConfig.shadowMap.normalBias;
      }
    }

    renderer.outputEncoding = THREE[rendererConfig.outputEncoding + 'Encoding'];
    renderer.toneMapping = THREE[rendererConfig.toneMapping + 'ToneMapping'];
    renderer.toneMappingExposure = rendererConfig.toneMappingExposure;
  } else {
    // Fallback do domyślnych ustawień
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.antialias = true;
    renderer.logarithmicDepthBuffer = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
  }

  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('container').appendChild(renderer.domElement);

  // Inicjalizacja kontrolek kamery
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 1000;
  controls.minDistance = 1;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.target.set(0, 0, 0);
  controls.update();

  // Dodanie płaszczyzny podłogi
  console.log('🏗️ Tworzenie podłogi...');
  const floorGeometry = new THREE.PlaneGeometry(25, 25, 25, 25);

  // Stwórz materiał podłogi z konfiguracji
  let floorMaterial;
  if (
    currentSceneConfig &&
    currentSceneConfig.materials &&
    currentSceneConfig.materials.floor
  ) {
    console.log('📦 Tworzenie materiału podłogi z konfiguracji...');
    const floorMaterialConfig = currentSceneConfig.materials.floor;
    console.log('⚙️ Konfiguracja materiału podłogi:', floorMaterialConfig);

    floorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(floorMaterialConfig.color),
      roughness: floorMaterialConfig.roughness,
      metalness: floorMaterialConfig.metalness,
      transparent: floorMaterialConfig.transparent,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    console.log('✅ Utworzono materiał podłogi:', floorMaterial);

    // Załaduj mapę przezroczystości
    if (floorMaterialConfig.alphaMap) {
      console.log(
        '🖼️ Ładowanie mapy przezroczystości:',
        floorMaterialConfig.alphaMap
      );
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        floorMaterialConfig.alphaMap,
        (texture) => {
          console.log('✅ Załadowano mapę przezroczystości');
          floorMaterial.alphaMap = texture;
          floorMaterial.needsUpdate = true;
        },
        undefined,
        (error) => {
          console.error('❌ Błąd ładowania mapy przezroczystości:', error);
        }
      );
    }
  } else {
    console.warn('⚠️ Brak konfiguracji materiału podłogi, używam domyślnego');
    floorMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#121212'),
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
  }

  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);
  console.log('✅ Dodano podłogę do sceny');

  // Tworzenie osi
  createAxis();

  // Inicjalizacja interfejsu
  setupUI();

  // Załadowanie listy modeli
  await loadModelsList();

  // Obsługa zmiany rozmiaru okna
  window.addEventListener('resize', onWindowResize, false);

  // Rozpoczęcie animacji
  animate();
}

// Funkcja inicjalizująca interfejs
function setupUI() {
  // Obsługa przycisku chowania/pokazywania panelu
  const toggleButton = document.getElementById('togglePanel');
  const modelsPanel = document.querySelector('.models-panel');
  const container = document.getElementById('container');
  let isPanelVisible = true;

  if (toggleButton && modelsPanel) {
    toggleButton.addEventListener('click', () => {
      isPanelVisible = !isPanelVisible;
      modelsPanel.classList.toggle('hidden');
      container.style.marginRight = isPanelVisible ? '300px' : '0';
      onWindowResize();
    });
  }

  // Przyciski widoku
  document.getElementById('Przód').addEventListener('click', () => {
    setCameraPosition('Przód');
    updateViewButtons('Przód');
  });
  document.getElementById('Tył').addEventListener('click', () => {
    setCameraPosition('Tył');
    updateViewButtons('Tył');
  });
  document.getElementById('Góra').addEventListener('click', () => {
    setCameraPosition('Góra');
    updateViewButtons('Góra');
  });

  // Obsługa przycisków dodatkowych
  const showAxisButton = document.getElementById('showAxis');
  const showBoundingBoxButton = document.getElementById('showBoundingBox');
  const showStatsButton = document.getElementById('showStats');

  if (showAxisButton) {
    showAxisButton.addEventListener('click', () => {
      showAxisButton.classList.toggle('active');
      if (axis) {
        axis.visible = !axis.visible;
      }
    });
  }

  if (showBoundingBoxButton) {
    showBoundingBoxButton.addEventListener('click', () => {
      showBoundingBoxButton.classList.toggle('active');
      if (model && model.boundingBoxHelper) {
        model.boundingBoxHelper.visible = !model.boundingBoxHelper.visible;
      }
    });
  }

  if (showStatsButton) {
    showStatsButton.addEventListener('click', () => {
      showStatsButton.classList.toggle('active');
      stats.dom.style.display =
        stats.dom.style.display === 'none' ? 'block' : 'none';
    });
  }
}

function setupLights() {
  // Światło otoczenia
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  // Funkcja pomocnicza do tworzenia kuli świetlnej
  function createLightSphere(position, color = 0xffff00) {
    const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.copy(position);
    scene.add(sphere);
    return sphere;
  }

  // Światło główne (key light)
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(3, 3, 2);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 4096;
  keyLight.shadow.mapSize.height = 4096;
  keyLight.shadow.radius = 8;
  keyLight.shadow.blurSamples = 16;
  keyLight.shadow.bias = -0.0001;
  keyLight.shadow.normalBias = 0.02;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 500;
  keyLight.shadow.camera.left = -100;
  keyLight.shadow.camera.right = 100;
  keyLight.shadow.camera.top = 100;
  keyLight.shadow.camera.bottom = -100;
  scene.add(keyLight);
  const keyLightSphere = createLightSphere(keyLight.position, 0xff0000);

  // Światło wypełniające (fill light)
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);
  const fillLightSphere = createLightSphere(fillLight.position, 0x00ff00);

  // Światło konturowe (rim light)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, 3, -4);
  scene.add(rimLight);
  const rimLightSphere = createLightSphere(rimLight.position, 0x0000ff);

  return {
    ambientLight,
    keyLight,
    fillLight,
    rimLight,
    keyLightSphere,
    fillLightSphere,
    rimLightSphere,
  };
}

function setLightingVariant(variant) {
  // Reset wszystkich świateł
  lights.ambientLight.intensity = 0;
  lights.keyLight.intensity = 0;
  lights.fillLight.intensity = 0;
  lights.rimLight.intensity = 0;

  // Ukryj/pokaż kule świetlne
  lights.keyLightSphere.visible = false;
  lights.fillLightSphere.visible = false;
  lights.rimLightSphere.visible = false;

  switch (variant) {
    case 2: // Oświetlenie studyjne
      lights.ambientLight.intensity = 0.3;
      lights.keyLight.intensity = 2.0;
      lights.fillLight.intensity = 0.4;
      lights.rimLight.intensity = 0.3;
      lights.keyLightSphere.visible = true;
      lights.fillLightSphere.visible = true;
      lights.rimLightSphere.visible = true;
      break;
  }
}

function setCameraPosition(viewName) {
  if (!currentSceneConfig || !currentSceneConfig.cameras) return;

  const views = currentSceneConfig.cameras.views;
  if (!views || !views[viewName]) return;

  const view = views[viewName];
  if (view.position && view.target) {
    camera.position.set(view.position.x, view.position.y, view.position.z);
    controls.target.set(view.target.x, view.target.y, view.target.z);
    controls.update();
  }
}

function updateViewButtons(activeView) {
  // Resetowanie wszystkich przycisków
  ['Przód', 'Tył', 'Góra'].forEach((view) => {
    const button = document.getElementById(view);
    if (button) {
      button.classList.remove('active');
    }
  });

  // Aktywowanie wybranego przycisku
  const activeButton = document.getElementById(activeView);
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

// Funkcja pomocnicza do obliczania rozmiaru modelu
function getModelSize() {
  if (!model) return 10;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  return Math.max(size.x, size.y, size.z);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  if (controls) controls.update();
  renderer.render(scene, camera);
  stats.end();
}

// Dodanie inicjalizacji po załadowaniu dokumentu
document.addEventListener('DOMContentLoaded', init);

// Funkcja ładująca konfigurację modelu
async function loadModelConfig(modelDir) {
  try {
    const response = await fetch(`${modelDir}/config.json`);
    if (!response.ok) throw new Error('Nie znaleziono pliku konfiguracyjnego');
    const config = await response.json();
    modelConfigs.set(modelDir, config);
    return config;
  } catch (error) {
    console.warn(`Błąd ładowania konfiguracji dla ${modelDir}:`, error);
    return null;
  }
}

// Funkcja do tworzenia wizualizacji bounding boxa
function createBoundingBoxHelper(object) {
  const box = new THREE.Box3().setFromObject(object);
  const helper = new THREE.Box3Helper(box, 0xffff00);
  return helper;
}

// Funkcja do ładowania modelu
async function loadModel(modelPath) {
  if (!modelPath) {
    console.warn('Nie podano ścieżki do modelu');
    return;
  }

  if (model) {
    scene.remove(model);
    if (model.boundingBoxHelper) {
      scene.remove(model.boundingBoxHelper);
    }
  }

  currentModelPath = modelPath;
  const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/'));

  try {
    // Ładowanie konfiguracji modelu
    const config = await loadModelConfig(modelDir);

    const loader = new THREE.GLTFLoader();

    loader.load(
      modelPath,
      function (gltf) {
        model = gltf.scene;

        // Włączanie cieni dla wszystkich elementów modelu
        model.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            if (node.material) {
              node.material.needsUpdate = true;
              node.material.side = THREE.DoubleSide;
            }
          }
        });

        // Obliczanie wymiarów i środka modelu
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());

        // Zastosowanie skalowania zgodnie z konfiguracją
        if (config && config.scale) {
          if (config.scale.method === 'fixed') {
            const scale = (config.scale.fixedScale || 1.0) * 0.1; // 10x mniejsza skala
            model.scale.set(scale, scale, scale);
          } else if (config.scale.method === 'auto') {
            // Obliczanie skali automatycznej na podstawie największego wymiaru
            const maxDimension = Math.max(size.x, size.y, size.z);
            const targetSize = (config.scale.targetSize || 1.0) * 0.1; // 10x mniejsza skala
            const scale = targetSize / maxDimension;
            model.scale.set(scale, scale, scale);
          }
        }

        // Ponowne obliczenie bounding boxa po skalowaniu
        box.setFromObject(model);

        // Ustawienie pozycji modelu tak, aby najniższy punkt był w (0,0,0)
        model.position.y = -box.min.y;

        scene.add(model);

        // Dodanie wizualizacji bounding boxa
        model.boundingBoxHelper = createBoundingBoxHelper(model);
        scene.add(model.boundingBoxHelper);

        // Ustawienie widoczności bounding boxa zgodnie z globalnym ustawieniem
        const showBoundingBoxCheckbox =
          document.getElementById('showBoundingBox');
        if (showBoundingBoxCheckbox) {
          model.boundingBoxHelper.visible = showBoundingBoxCheckbox.checked;
        }
      },
      undefined,
      function (error) {
        console.error('Błąd podczas wczytywania modelu:', error);
      }
    );
  } catch (error) {
    console.error('Błąd podczas ładowania modelu:', error);
  }
}
