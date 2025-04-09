Zmiana w pliku script.js
Zmiana 1: Funkcja do ładowania listy plików scen
javascript// Funkcja pobierająca listę dostępnych plików konfiguracji scen
async function loadScenesList() {
  try {
    // Możemy użyć fetch aby pobrać listę plików JSON z określonego katalogu
    // W tym przypadku zakładamy, że mamy statyczną listę plików scen
    // Ponieważ przeglądanie zawartości katalogu przez JS jest ograniczone przez zabezpieczenia
    const scenesList = ['default']; // Domyślnie zawsze jest scena default
    
    // Próba pobrania dodatkowych scen, jeśli istnieje plik scenes/list.json
    try {
      const response = await fetch('scenes/list.json');
      if (response.ok) {
        const additionalScenes = await response.json();
        scenesList.push(...additionalScenes.filter(scene => scene !== 'default'));
      }
    } catch (listError) {
      console.warn('Nie znaleziono listy dodatkowych scen, używam tylko sceny domyślnej');
    }
    
    return scenesList;
  } catch (error) {
    console.error('❌ Błąd ładowania listy scen:', error);
    return ['default']; // Zawsze zwracamy domyślną scenę
  }
}
Zmiana 2: Modyfikacja funkcji setupUI() aby dodać interfejs wyboru scen
javascriptfunction setupUI() {
  // Istniejący kod...
  
  // Dodanie sekcji wyboru scen w panelu oświetlenia
  const lightingSection = document.querySelector('.lighting-section');
  if (lightingSection) {
    // Utworzenie kontenera dla wyboru scen
    const scenesHeader = document.createElement('h2');
    scenesHeader.textContent = 'Wybór sceny';
    
    const scenesContainer = document.createElement('div');
    scenesContainer.className = 'scenes-container';
    
    const scenesSelect = document.createElement('select');
    scenesSelect.id = 'scenesSelect';
    scenesSelect.className = 'scenes-select';
    
    // Dodanie obsługi zmiany sceny
    scenesSelect.addEventListener('change', (e) => {
      const selectedScene = e.target.value;
      loadSceneConfig(selectedScene).then(config => {
        if (config) {
          applySceneConfig(config);
        }
      });
    });
    
    scenesContainer.appendChild(scenesSelect);
    lightingSection.prepend(scenesContainer);
    lightingSection.prepend(scenesHeader);
    
    // Załadowanie listy scen
    loadAvailableScenes();
  }
  
  // Pozostały istniejący kod...
}
Zmiana 3: Funkcja do ładowania dostępnych scen i populacji interfejsu
javascript// Funkcja ładująca i populująca listę dostępnych scen
async function loadAvailableScenes() {
  try {
    // Pobierz listę scen
    const scenesList = await loadScenesList();
    
    // Populacja selektora scen
    const scenesSelect = document.getElementById('scenesSelect');
    if (scenesSelect) {
      scenesSelect.innerHTML = '';
      
      scenesList.forEach(sceneName => {
        const option = document.createElement('option');
        option.value = sceneName;
        // Formatowanie nazwy sceny (pierwsza litera wielka, podkreślenia zamienione na spacje)
        const displayName = sceneName
          .replace(/_/g, ' ')
          .replace(/\b\w/g, char => char.toUpperCase());
        
        option.textContent = displayName;
        scenesSelect.appendChild(option);
      });
      
      // Ustawienie domyślnej sceny
      if (currentSceneConfig && currentSceneConfig.name) {
        // Znajdź odpowiednią opcję dla aktualnie załadowanej sceny
        const sceneName = currentSceneConfig.name.toLowerCase().replace(/ /g, '_');
        const matchingOption = Array.from(scenesSelect.options).find(
          option => option.value.toLowerCase() === sceneName
        );
        
        if (matchingOption) {
          scenesSelect.value = matchingOption.value;
        }
      }
    }
  } catch (error) {
    console.error('❌ Błąd ładowania listy scen:', error);
  }
}
Zmiana 4: Funkcja do aplikowania konfiguracji sceny
javascript// Funkcja do aplikowania konfiguracji sceny
function applySceneConfig(config) {
  if (!config) return;
  
  console.log('🔄 Aplikowanie konfiguracji sceny:', config.name || 'bez nazwy');
  
  // Ustawienie tła sceny
  if (config.background && config.background.color) {
    scene.background = new THREE.Color(config.background.color);
    console.log('🎨 Ustawiono kolor tła:', config.background.color);
  }
  
  // Ustawienie świateł
  applyLightingConfig(config);
  
  // Ustawienie kamery
  if (config.cameras && config.cameras.default && controls) {
    const defaultCam = config.cameras.default;
    console.log('📷 Ustawiam domyślną pozycję kamery:', defaultCam.position);
    camera.position.set(
      defaultCam.position.x,
      defaultCam.position.y,
      defaultCam.position.z
    );

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
  
  // Aktualizacja materiału podłogi, jeśli scena zawiera konfigurację materiału
  if (config.materials && config.materials.floor) {
    updateFloorMaterial(config.materials.floor);
  }
  
  currentSceneConfig = config;
}
Zmiana 5: Funkcja do aktualizacji materiału podłogi
javascript// Funkcja do aktualizacji materiału podłogi
function updateFloorMaterial(materialConfig) {
  // Znajdź obiekt podłogi w scenie
  const floor = scene.children.find(child => 
    child.isMesh && child.geometry instanceof THREE.PlaneGeometry);
  
  if (!floor) {
    console.warn('⚠️ Nie znaleziono obiektu podłogi w scenie');
    return;
  }
  
  console.log('🔄 Aktualizacja materiału podłogi:', materialConfig);
  
  // Stwórz nowy materiał na podstawie konfiguracji
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(materialConfig.color || '#121212'),
    roughness: materialConfig.roughness || 0.8,
    metalness: materialConfig.metalness || 0.2,
    transparent: materialConfig.transparent || false,
    side: THREE.DoubleSide
  });
  
  // Załaduj mapę przezroczystości, jeśli została zdefiniowana
  if (materialConfig.alphaMap) {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      materialConfig.alphaMap,
      (texture) => {
        floorMaterial.alphaMap = texture;
        floorMaterial.transparent = true;
        floorMaterial.needsUpdate = true;
      },
      undefined,
      (error) => {
        console.error('❌ Błąd ładowania mapy przezroczystości:', error);
      }
    );
  }
  
  // Zastosuj nowy materiał
  floor.material = floorMaterial;
}
Zmiana 6: Modyfikacja funkcji loadSceneConfig() aby sprawdzała, czy plik istnieje
javascript// Funkcja wczytująca konfigurację sceny
async function loadSceneConfig(sceneName = 'default') {
  try {
    const configPath = `scenes/${sceneName}.json`;
    console.log('🔄 Ładowanie konfiguracji sceny:', configPath);
    
    const response = await fetch(configPath);
    if (!response.ok) {
      console.warn(
        `⚠️ Nie udało się załadować konfiguracji sceny: ${configPath} (status: ${response.status})`
      );
      
      // Jeśli nie udało się załadować wybranej sceny, próbujemy załadować domyślną
      if (sceneName !== 'default') {
        console.log('🔄 Próba załadowania domyślnej konfiguracji...');
        return loadSceneConfig('default');
      }
      
      return null;
    }

    try {
      const config = await response.json();
      console.log('✅ Załadowana konfiguracja:', config);
      currentSceneConfig = config;
      return config;
    } catch (parseError) {
      console.error(
        `❌ Błąd parsowania JSON z pliku ${configPath}:`,
        parseError
      );
      return null;
    }
  } catch (error) {
    console.error('❌ Błąd wczytywania konfiguracji sceny:', error);
    return null;
  }
}
Zmiana 7: Dodanie stylu CSS dla selektora scen
W pliku style.css dodaj następujący kod:
css/* Styl dla wyboru scen */
.scenes-container {
  margin-bottom: 1rem;
}

.scenes-select {
  width: 100%;
  padding: 0.5rem;
  background: #2d2d2d;
  color: #e0e0e0;
  border: 1px solid #404040;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23e0e0e0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;
}

.scenes-select:hover {
  background-color: #404040;
}

.scenes-select:focus {
  outline: none;
  border-color: #bb86fc;
  box-shadow: 0 0 0 2px rgba(187, 134, 252, 0.3);
}
Zmiana 8: Utworzenie pliku scenes/list.json
Stwórz prosty plik scenes/list.json zawierający listę dostępnych scen (bez rozszerzeń):
json["default", "studio", "outdoor", "dark"]
Za każdym razem, gdy dodasz nowy plik konfiguracyjny sceny, możesz zaktualizować ten plik. Alternatywnie, możesz stworzyć skrypt do generowania tego pliku automatycznie (np. w Node.js), jeśli wolisz.
Podsumowanie zmian w skrypcie.js
Zidentyfikowałem, że implementacja konfiguracji sceny w default.json jest prawidłowa. Zaproponowane zmiany pozwolą na:

Dynamiczne ładowanie listy dostępnych scen z pliku scenes/list.json
Dodanie interfejsu wyboru scen w panelu oświetlenia
Poprawne ładowanie i aplikowanie konfiguracji wybranej sceny
Obsługę błędów, gdy plik konfiguracyjny nie istnieje

Wszystkie te zmiany są zaimplementowane w czystym JavaScript, bez potrzeby używania PHP czy innych technologii serwerowych.