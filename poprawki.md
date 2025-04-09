Analiza błędów w kodzie
Witam! Przeanalizowałem kod i znalazłem główną przyczynę problemu, a także kilka innych kwestii, które warto poprawić. Przedstawiam listę zmian do wprowadzenia:
1. Brak konstruktora OrbitControls
Plik: script.js
Linia: około 387
Problem: Błąd THREE.OrbitControls is not a constructor wskazuje, że biblioteka OrbitControls nie jest prawidłowo załadowana lub nie jest dostępna jako właściwość obiektu THREE.
Proponowane rozwiązanie:
javascript// Zmień
controls = new THREE.OrbitControls(camera, renderer.domElement);

// Na
controls = new OrbitControls(camera, renderer.domElement);
Dodatkowo należy poprawić import biblioteki w pliku index.html:
html<!-- Zmień -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r132/examples/js/controls/OrbitControls.js"></script>

<!-- Na -->
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/controls/OrbitControls.min.js"></script>
2. Brak importu funkcji loadModelsList
Plik: script.js
Linia: około 629
Problem: Funkcja loadModelsList() jest wywoływana, ale nie jest zdefiniowana w kodzie.
Proponowane rozwiązanie:
Należy dodać tę funkcję przed użyciem:
javascript// Funkcja ładująca listę modeli
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
    
    modelsList.forEach(model => {
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
      modelsListElement.innerHTML = '<div class="error">Nie można załadować listy modeli</div>';
    }
  }
}
3. Brak funkcji createAxisLabel
Plik: script.js
Linia: około 165-169
Problem: Funkcja createAxisLabel() jest wywoływana, ale nie jest zdefiniowana w kodzie.
Proponowane rozwiązanie:
javascript// Funkcja tworząca etykiety osi
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
4. Aktualizacja GLTFLoader
Plik: index.html
Linia: około 183
Problem: Import GLTFLoader może być niezgodny z wersją Three.js.
Proponowane rozwiązanie:
html<!-- Zmień -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r132/examples/js/loaders/GLTFLoader.js"></script>

<!-- Na -->
<script src="https://cdn.jsdelivr.net/npm/three@0.132.2/examples/js/loaders/GLTFLoader.min.js"></script>
5. Problem z Tailwind CSS
Linia: (index):64
Problem: Ostrzeżenie o używaniu cdn.tailwindcss.com w środowisku produkcyjnym.
Proponowane rozwiązanie:
html<!-- Zmień -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Na (wersja dla developmentu) -->
<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">

<!-- Lub lepiej, w produkcji użyj lokalnej instalacji Tailwind CSS -->
6. Poprawka funkcji ładującej konfigurację sceny
Plik: script.js
Linia: około 43
Problem: Funkcja loadSceneConfig ma problemy z obsługą błędów.
Proponowane rozwiązanie:
javascriptasync function loadSceneConfig(sceneName = 'default') {
  try {
    console.log('🔄 Ładowanie konfiguracji sceny:', `scenes/${sceneName}.json`);
    const response = await fetch(`scenes/${sceneName}.json`);
    
    if (!response.ok) {
      throw new Error(`Nie można załadować konfiguracji sceny (status ${response.status})`);
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
Te zmiany powinny rozwiązać główne problemy z kodem i umożliwić prawidłowe działanie aplikacji. Głównym błędem było nieprawidłowe importowanie i użycie klasy OrbitControls, która powinna być używana bezpośrednio, a nie jako właściwość obiektu THREE.
Czy potrzebujesz wyjaśnienia którejkolwiek z tych zmian lub pomocy w implementacji innych funkcji?