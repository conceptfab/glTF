Zmiana w pliku script.js
W funkcji loadModel() sposób wykorzystania wartości skali jest nieprawidłowy:
javascript// Zmiana w pliku script.js, w funkcji loadModel():
    // Było (w części dotyczącej skalowania):
    if (config && config.scale) {
      if (config.scale.method === 'fixed') {
        const scale = config.scale.fixedScale || 1.0;
        console.log(`🔍 Używam stałej skali: ${scale} (metoda: fixed)`);
        model.scale.set(scale, scale, scale);
      } else if (config.scale.method === 'auto') {
        const maxDimension = Math.max(size.x, size.y, size.z);
        const targetSize = config.scale.targetSize || 100;
        const scale = targetSize / maxDimension;
        console.log(
          `🔍 Używam automatycznej skali: ${scale} (metoda: auto, targetSize: ${targetSize}, maxDimension: ${maxDimension})`
        );
        model.scale.set(scale, scale, scale);
      }
    }
    
    // Powinno być:
    if (config && config.scale) {
      if (config.scale.method === 'fixed') {
        const scale = config.scale.fixedScale || 1.0;
        console.log(`🔍 Używam stałej skali: ${scale} (metoda: fixed)`);
        model.scale.set(scale, scale, scale);
      } else if (config.scale.method === 'auto') {
        const maxDimension = Math.max(size.x, size.y, size.z);
        const targetSize = config.scale.targetSize || 100;
        const scale = targetSize / maxDimension;
        console.log(
          `🔍 Używam automatycznej skali: ${scale} (metoda: auto, targetSize: ${targetSize}, maxDimension: ${maxDimension})`
        );
        model.scale.set(scale, scale, scale);
      }
    }
W tym przypadku kod wygląda poprawnie, ale problem może leżeć w specyficznym przypadku modelu "GCS 13 Rel z Bel". Zauważyłem, że w funkcji generate_config.py dla tego modelu wartość skalowania jest ustawiona na 0.5, co może powodować konflikt z wartością 0.1 w pliku config.json:
python# Zmiana w pliku generate_config.py, w części dotyczącej GCS 13:
    # Było:
    if "GCS 13 Rel z Bel" in str(gltf_file):
        config["position"] = {"method": "topEdge", "value": 72, "yOffset": 0}
        config["scale"] = {"method": "fixed", "fixedScale": 0.5}
        config["rotation"] = {"x": 0, "y": 0, "z": 0}  # Domyślne wartości dla GCS 13
    
    # Powinno być:
    if "GCS 13 Rel z Bel" in str(gltf_file):
        config["position"] = {"method": "topEdge", "value": 72, "yOffset": 0}
        config["scale"] = {"method": "fixed", "fixedScale": 0.1}  # Zmiana na 0.1 zgodnie z config.json
        config["rotation"] = {"x": 0, "y": 0, "z": 0}
Zmiana w funkcji getDefaultConfig w pliku script.js
Domyślna konfiguracja również powinna zawierać poprawną wartość skali:
javascript// Zmiana w pliku script.js, w funkcji getDefaultConfig():
    // Było:
    function getDefaultConfig() {
      return {
        center: { x: true, y: true, z: true },
        position: {
          method: 'floor',
          value: 0,
        },
        scale: {
          method: 'fixed',
          fixedScale: 0.2,  // Nieprawidłowa wartość
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0,
        },
      };
    }
    
    // Powinno być:
    function getDefaultConfig() {
      return {
        center: { x: true, y: true, z: true },
        position: {
          method: 'floor',
          value: 0,
        },
        scale: {
          method: 'fixed',
          fixedScale: 0.1,  // Zmiana na 0.1 zgodnie z config.json
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0,
        },
      };
    }