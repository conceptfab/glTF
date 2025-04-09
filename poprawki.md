Analiza ładowania ustawień sceny z pliku default.json
Po przeanalizowaniu kodu znalazłem następujące problemy związane z ładowaniem ustawień sceny:
Problem 1: Niepoprawna ścieżka do pliku konfiguracyjnego
Plik: script.js
Funkcja: loadSceneConfig()
Aktualny kod:
javascriptasync function loadSceneConfig(sceneName = 'default') {
  try {
    console.log('🔄 Ładowanie konfiguracji sceny:', `scenes/${sceneName}.json`);
    const response = await fetch(`scenes/${sceneName}.json`);
    // ...
Ścieżka jest poprawna, ale nie ma dodatkowej walidacji czy plik istnieje w odpowiedniej lokalizacji.
Problem 2: Nieprawidłowe zastosowanie ustawień kamery
Plik: script.js
Funkcja: init()
javascript// Ustawienie początkowej pozycji kamery z konfiguracji
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
}
W powyższym kodzie brakuje ustawienia controls.target na podstawie defaultCam.target, co powoduje, że kamera może być skierowana w nieprawidłowym kierunku.
Problem 3: Brak pełnej obsługi właściwości renderera
Plik: script.js
Funkcja: init()
javascript// Zastosuj ustawienia z konfiguracji sceny
if (currentSceneConfig && currentSceneConfig.renderer) {
  const rendererConfig = currentSceneConfig.renderer;
  
  renderer.setPixelRatio(
    rendererConfig.pixelRatio === 'devicePixelRatio'
      ? window.devicePixelRatio
      : rendererConfig.pixelRatio
  );
  // ...
W tej części kodu, jeśli rendererConfig.pixelRatio nie jest ciągiem znaków "devicePixelRatio", używa wartości bezpośrednio zamiast sprawdzać, czy jest liczbą, co może prowadzić do błędów.
Propozycje zmian
Zmiana 1: Poprawa ładowania konfiguracji sceny
Plik: script.js
Funkcja: loadSceneConfig()
javascriptasync function loadSceneConfig(sceneName = 'default') {
  try {
    const configPath = `scenes/${sceneName}.json`;
    console.log('🔄 Ładowanie konfiguracji sceny:', configPath);
    const response = await fetch(configPath);

    if (!response.ok) {
      console.warn(`⚠️ Nie udało się załadować konfiguracji sceny: ${configPath} (status: ${response.status})`);
      return null;
    }

    try {
      const config = await response.json();
      console.log('✅ Załadowana konfiguracja:', config);
      currentSceneConfig = config;
      return config;
    } catch (parseError) {
      console.error(`❌ Błąd parsowania JSON z pliku ${configPath}:`, parseError);
      return null;
    }
  } catch (error) {
    console.error('❌ Błąd wczytywania konfiguracji sceny:', error);
    return null;
  }
}
Zmiana 2: Poprawne ustawienie kamery i jej celu
Plik: script.js
Funkcja: init()
javascript// Ustawienie początkowej pozycji kamery z konfiguracji
if (
  currentSceneConfig &&
  currentSceneConfig.cameras &&
  currentSceneConfig.cameras.default
) {
  const defaultCam = currentSceneConfig.cameras.default;
  console.log('📷 Ustawiam domyślną pozycję kamery:', defaultCam.position);
  camera.position.set(
    defaultCam.position.x,
    defaultCam.position.y,
    defaultCam.position.z
  );
  
  // Ustawienie celu kamery, jeśli został zdefiniowany
  if (defaultCam.target) {
    console.log('🎯 Ustawiam domyślny cel kamery:', defaultCam.target);
    controls.target.set(
      defaultCam.target.x,
      defaultCam.target.y,
      defaultCam.target.z
    );
    controls.update();
  }
}
Zmiana 3: Bezpieczniejsza obsługa właściwości renderera
Plik: script.js
Funkcja: init()
javascript// Zastosuj ustawienia z konfiguracji sceny
if (currentSceneConfig && currentSceneConfig.renderer) {
  const rendererConfig = currentSceneConfig.renderer;
  
  // Bezpieczne ustawienie pixelRatio
  if (rendererConfig.pixelRatio) {
    if (rendererConfig.pixelRatio === 'devicePixelRatio') {
      renderer.setPixelRatio(window.devicePixelRatio);
    } else if (typeof rendererConfig.pixelRatio === 'number') {
      renderer.setPixelRatio(rendererConfig.pixelRatio);
    } else {
      console.warn('⚠️ Nieprawidłowa wartość pixelRatio, używam domyślnej');
      renderer.setPixelRatio(window.devicePixelRatio);
    }
  }
  
  // Bezpieczne ustawienie pozostałych właściwości
  if (rendererConfig.antialias !== undefined) renderer.antialias = rendererConfig.antialias;
  if (rendererConfig.logarithmicDepthBuffer !== undefined) renderer.logarithmicDepthBuffer = rendererConfig.logarithmicDepthBuffer;
  
  // ... pozostała część kodu
}
W podsumowaniu, ładowanie ustawień sceny z pliku default.json generalnie działa, ale wymaga kilku poprawek, aby zapewnić bardziej niezawodne działanie i lepsze obsługiwanie błędów.