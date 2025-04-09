Na podstawie dostarczonych dokumentów przeanalizowałem kod i przygotowałem zmiany potrzebne do poprawnego działania funkcji przeszukiwania folderów z modelami. Oto niezbędne modyfikacje:
Zmiany w pliku generate_config.py
pythondef generate_config(gltf_file):
    """Generuje plik konfiguracyjny dla modelu GLTF"""
    # Tworzenie katalogu dla modelu jeśli nie istnieje
    model_dir = gltf_file.parent
    if not model_dir.exists():
        model_dir.mkdir(parents=True)

    # Tworzenie domyślnej konfiguracji
    config = {
        "center": {"x": True, "y": True, "z": True},
        "position": {
            "method": "floor",  # Możliwe wartości: "floor", "center", "topEdge"
            "value": 0,
            "yOffset": 0,  # Dodanie brakującego parametru yOffset
        },
        "scale": {
            "method": "fixed",  # Zmiana z "auto" na "fixed" zgodnie z plikiem config.json
            "fixedScale": 0.025,  # Zmiana wartości zgodnie z plikiem config.json
        },
        "rotation": {
            "x": 0,  # Obrót wokół osi X w stopniach
            "y": 0,  # Obrót wokół osi Y w stopniach
            "z": 0,  # Obrót wokół osi Z w stopniach
        },
    }

    # Zapisanie konfiguracji do pliku
    config_path = model_dir / "config.json"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)

    print(f"Wygenerowano konfigurację dla {gltf_file.name}")
Zmiany w pliku script.js
1. Modyfikacja funkcji scanModelsDirectory
javascript// Funkcja przeszukująca folder w poszukiwaniu modeli
async function scanModelsDirectory() {
  try {
    const models = [];

    // Funkcja pomocnicza do przeszukiwania podfolderów
    async function scanDirectory(directory) {
      try {
        // Dodajemy trailing slash jeśli go nie ma
        if (!directory.endsWith('/')) {
          directory += '/';
        }

        const response = await fetch(directory);
        if (!response.ok) {
          console.warn(`⚠️ Nie można otworzyć katalogu ${directory}`);
          return;
        }

        const text = await response.text();
        const parser = new DOMParser();
        const html = parser.parseFromString(text, 'text/html');

        // Znajdź wszystkie linki do plików
        const links = Array.from(html.querySelectorAll('a'))
          .map((a) => a.getAttribute('href'))
          .filter((href) => href && !href.startsWith('?') && href !== '../');

        for (const link of links) {
          const fullPath = `${directory}${link}`;

          // Jeśli to folder, przeszukaj go rekurencyjnie
          if (link.endsWith('/')) {
            await scanDirectory(fullPath);
          }
          // Jeśli to plik modelu, dodaj go do listy
          else if (
            link.toLowerCase().endsWith('.glb') ||
            link.toLowerCase().endsWith('.gltf')
          ) {
            const modelName = link
              .split('/')
              .pop()
              .replace(/\.(glb|gltf)$/i, '');
            const modelPath = fullPath;

            models.push({
              name: modelName,
              path: modelPath,
              directory: directory,
            });
            
            // Sprawdzenie czy istnieje plik config.json dla modelu
            try {
              const configPath = `${directory}config.json`;
              const configResponse = await fetch(configPath, { method: 'HEAD' });
              
              // Jeśli plik config.json nie istnieje, wygeneruj go
              if (!configResponse.ok) {
                console.log(`⚠️ Brak pliku konfiguracyjnego dla ${modelName}, generuję domyślny...`);
                
                // Używamy domyślnej konfiguracji z pliku config.json
                const defaultConfig = {
                  "center": {"x": true, "y": true, "z": true},
                  "position": {
                    "method": "floor",
                    "value": 0,
                    "yOffset": 0
                  },
                  "scale": {
                    "method": "fixed", 
                    "fixedScale": 0.025
                  },
                  "rotation": {
                    "x": 0,
                    "y": 0,
                    "z": 0
                  }
                };
                
                // Zapisz domyślną konfigurację dla modelu
                // Implementacja zapisu po stronie klienta nie jest możliwa ze względów bezpieczeństwa
                // W praktyce należałoby użyć endpointu API lub generować pliki po stronie serwera
                console.log(`ℹ️ Konfiguracja dla ${modelName} powinna zostać utworzona na serwerze`);
              }
            } catch (configError) {
              console.error(`❌ Błąd sprawdzania pliku config.json dla modelu ${modelName}:`, configError);
            }
          }
        }
      } catch (error) {
        console.error(
          `❌ Błąd podczas skanowania katalogu ${directory}:`,
          error
        );
      }
    }

    // Rozpocznij skanowanie od głównego katalogu models
    await scanDirectory('models/');

    console.log('✅ Znaleziono modele:', models);
    return models;
  } catch (error) {
    console.error('❌ Błąd podczas skanowania katalogów modeli:', error);
    return [];
  }
}
2. Funkcja do aktualizacji interfejsu na podstawie znalezionych modeli
javascript// Aktualizacja interfejsu użytkownika po znalezieniu modeli
function updateModelsList(models) {
  const modelsListElement = document.getElementById('modelsList');
  if (!modelsListElement) {
    console.error('❌ Nie znaleziono elementu listy modeli w DOM');
    return;
  }

  // Wyczyść listę modeli
  modelsListElement.innerHTML = '';

  if (models.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'error';
    emptyMessage.textContent = 'Nie znaleziono żadnych modeli 3D';
    modelsListElement.appendChild(emptyMessage);
    return;
  }

  // Sortuj modele alfabetycznie według nazwy
  models.sort((a, b) => a.name.localeCompare(b.name));

  // Dodaj każdy model do listy
  models.forEach((modelInfo) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = modelInfo.name;
    a.dataset.path = modelInfo.path;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Usuń klasę active ze wszystkich linków
      document.querySelectorAll('.models-list a').forEach(link => {
        link.classList.remove('active');
      });
      
      // Dodaj klasę active do klikniętego linku
      e.target.classList.add('active');
      
      // Załaduj model
      loadModel(modelInfo.path);
    });
    li.appendChild(a);
    modelsListElement.appendChild(li);
  });
}
3. Modyfikacja funkcji loadModelConfig
javascript// Funkcja ładująca konfigurację modelu
async function loadModelConfig(modelDir) {
  try {
    console.log(`🔍 Próba ładowania konfiguracji z: ${modelDir}/config.json`);
    const response = await fetch(`${modelDir}/config.json`);
    if (!response.ok) {
      console.warn(
        `⚠️ Nie znaleziono pliku konfiguracyjnego dla ${modelDir}, używam domyślnych ustawień`
      );
      return {
        center: { x: true, y: true, z: true },
        position: {
          method: 'floor',
          value: 0,
          yOffset: 0
        },
        scale: {
          method: 'fixed',
          fixedScale: 0.025
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0
        }
      };
    }

    const config = await response.json();
    console.log(`✅ Załadowano konfigurację dla ${modelDir}:`, config);
    modelConfigs.set(modelDir, config);
    return config;
  } catch (error) {
    console.error(`❌ Błąd ładowania konfiguracji dla ${modelDir}:`, error);
    return {
      center: { x: true, y: true, z: true },
      position: {
        method: 'floor',
        value: 0,
        yOffset: 0
      },
      scale: {
        method: 'fixed',
        fixedScale: 0.025
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0
      }
    };
  }
}
4. Modyfikacja funkcji loadModel uwzględniająca parametr yOffset
javascript// Funkcja do ładowania modelu
async function loadModel(modelPath) {
  if (!modelPath) {
    console.warn('⚠️ Nie podano ścieżki do modelu');
    return;
  }

  console.log(`🔄 Ładowanie modelu: ${modelPath}`);

  if (model) {
    scene.remove(model);
    if (model.boundingBoxHelper) {
      scene.remove(model.boundingBoxHelper);
    }
  }

  currentModelPath = modelPath;
  const modelDir = modelPath.substring(0, modelPath.lastIndexOf('/') + 1);

  try {
    // Ładowanie konfiguracji modelu
    const config = await loadModelConfig(modelDir);
    console.log(`📋 Konfiguracja modelu:`, config);

    const loader = new THREE.GLTFLoader();
    const gltf = await loader.loadAsync(modelPath);
    model = gltf.scene;

    // Centrowanie modelu zgodnie z konfiguracją
    if (config.center) {
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      if (config.center.x) {
        model.position.x = -center.x;
      }
      if (config.center.y) {
        model.position.y = -center.y;
      }
      if (config.center.z) {
        model.position.z = -center.z;
      }
    }

    // Zastosowanie rotacji zgodnie z konfiguracją
    if (config.rotation) {
      model.rotation.x = THREE.MathUtils.degToRad(config.rotation.x || 0);
      model.rotation.y = THREE.MathUtils.degToRad(config.rotation.y || 0);
      model.rotation.z = THREE.MathUtils.degToRad(config.rotation.z || 0);
    }

    // Zastosowanie skalowania zgodnie z konfiguracją
    if (config && config.scale) {
      if (config.scale.method === 'fixed') {
        const scale = config.scale.fixedScale || 0.025;
        console.log(`🔍 Używam stałej skali: ${scale} (metoda: fixed)`);
        model.scale.set(scale, scale, scale);
      } else if (config.scale.method === 'auto') {
        // Najpierw obliczamy bounding box dla oryginalnego modelu
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // Wybierz największy wymiar jako referencyjny
        const maxDimension = Math.max(size.x, size.y, size.z);
        const targetSize = config.scale.targetSize || 100;
        
        // Ogranicz skalę do min/max jeśli określono
        let scale = targetSize / maxDimension;
        
        if (config.scale.maxSize && (targetSize > config.scale.maxSize)) {
          scale = config.scale.maxSize / maxDimension;
        }
        
        if (config.scale.minSize && (targetSize < config.scale.minSize)) {
          scale = config.scale.minSize / maxDimension;
        }
        
        console.log(`🔍 Używam automatycznej skali: ${scale} (metoda: auto, targetSize: ${targetSize})`);
        model.scale.set(scale, scale, scale);
      }
    }

    // Obliczenie bounding boxa po zastosowaniu skali i rotacji
    const box = new THREE.Box3().setFromObject(model);

    // Zastosowanie metody ustawiania pozycji
    if (config.position) {
      const yOffset = config.position.yOffset || 0;
      
      switch (config.position.method) {
        case 'floor':
          // Najniższy punkt modelu na poziomie podłogi + offset
          model.position.y = -box.min.y + yOffset;
          break;
        case 'center':
          // Środek modelu na poziomie podłogi + offset
          const height = box.max.y - box.min.y;
          model.position.y = height / 2 + yOffset;
          break;
        case 'topEdge':
          // Górna krawędź modelu na określonej wysokości
          const value = config.position.value || 0;
          model.position.y = value - box.max.y + yOffset;
          break;
        default:
          // Domyślnie: najniższy punkt na poziomie podłogi
          model.position.y = -box.min.y + yOffset;
      }
    }

    scene.add(model);

    // Dodanie wizualizacji bounding boxa
    model.boundingBoxHelper = createBoundingBoxHelper(model);
    scene.add(model.boundingBoxHelper);

    // Ustawienie widoczności bounding boxa zgodnie z globalnym ustawieniem
    const showBoundingBoxButton = document.getElementById('showBoundingBox');
    if (showBoundingBoxButton) {
      model.boundingBoxHelper.visible = showBoundingBoxButton.classList.contains('active');
    } else {
      model.boundingBoxHelper.visible = false;
    }
    
    console.log(`✅ Model załadowany: ${modelPath}`);
  } catch (error) {
    console.error('❌ Błąd podczas ładowania modelu:', error);
  }
}
5. Modyfikacja funkcji init
javascript// W funkcji init() zamień obecny kod ładowania modeli na:
async function init() {
  // ... istniejący kod ...
  
  // Załadowanie listy modeli
  console.log('🔍 Skanowanie folderów w poszukiwaniu modeli...');
  const models = await scanModelsDirectory();
  updateModelsList(models);
  
  // ... istniejący kod ...
}
Modyfikacja pliku .gitignore
Aby umożliwić śledzenie plików modelowych, należy usunąć lub zmodyfikować te linie:
# Large files
*.glb
*.gltf
Po usunięciu tych linii modele GLTF i GLB będą uwzględniane w repozytorium. Nie zaleca się jednak usuwania tych wpisów, ponieważ pliki modelowe mogą być zbyt duże dla repozytoriów Git. Lepszym rozwiązaniem byłoby przechowywanie ich na zewnętrznym serwerze.
Podsumowanie zmian:

Dostosowano skrypt generate_config.py do generowania plików konfiguracyjnych zgodnych z formatem używanym w kodzie
Zaimplementowano poprawną funkcję scanModelsDirectory() do przeglądania katalogów z modelami
Dodano funkcję updateModelsList() do aktualizacji interfejsu użytkownika
Zmodyfikowano funkcję loadModelConfig() do obsługi brakującego parametru yOffset
Rozszerzono funkcję loadModel() o prawidłową obsługę wszystkich parametrów z pliku konfiguracyjnego
Zaktualizowano funkcję init() aby używała nowych funkcji skanowania katalogów

Powyższe zmiany powinny poprawnie implementować przeszukiwanie folderów i ładowanie modeli zgodnie z ich konfiguracją.