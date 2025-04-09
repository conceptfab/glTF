Oto poprawiona funkcja scanModelsDirectory(), która jest istotą problemu:
javascript// Funkcja pomocnicza do opóźnienia
function delay(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

// Funkcja przeszukująca folder w poszukiwaniu modeli
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

        // Oddzielna tablica dla folderów, aby najpierw przetwarzać pliki .gltf z aktualnego katalogu
        const folders = [];

        for (const link of links) {
          const fullPath = `${directory}${link}`;

          // Jeśli to folder, dodaj do listy folderów do późniejszego przeszukania
          if (link.endsWith('/')) {
            folders.push(fullPath);
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

            models.push({
              name: modelName,
              path: fullPath,
              directory: directory
            });
          }
        }

        // Przeszukaj wszystkie podfoldery po znalezieniu modeli w bieżącym katalogu
        for (const folder of folders) {
          await delay(50); // Opóźnienie 50ms między folderami
          await scanDirectory(folder);
        }
      } catch (error) {
        console.error(`❌ Błąd podczas skanowania katalogu ${directory}:`, error);
      }
    }

    // Rozpocznij skanowanie od głównego katalogu models
    await scanDirectory('models/');

    return models;

} catch (error) {
console.error('❌ Błąd podczas skanowania katalogów modeli:', error);
return [];
}
}
Kluczowa zmiana w powyższym kodzie to oddzielenie przeszukiwania folderów i plików, co może zapobiec problemom z zamykaniem kanału komunikacji.
Problem z komunikatem błędu "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received" może wskazywać na problemy z serwowanym katalogiem lub ograniczenia CORS. Upewnij się, że:

Twój serwer poprawnie obsługuje przeglądanie katalogów
Nie ma ograniczeń CORS blokujących odczyt zawartości katalogów
Pliki są dostępne pod podanymi ścieżkami

Jeśli problem nadal występuje, możesz spróbować dodać opóźnienie między skanowaniem poszczególnych folderów:
javascript// Dodaj tę funkcję pomocniczą przed scanDirectory
function delay(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

// A w funkcji scanDirectory dodaj opóźnienie przed rekurencyjnym wywołaniem:
for (const folder of folders) {
await delay(50); // Opóźnienie 50ms między folderami
await scanDirectory(folder);
}
Takie opóźnienie może pomóc uniknąć przeciążenia przeglądarki zbyt wieloma równoczesnymi żądaniami.
