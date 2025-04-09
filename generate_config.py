import json
import os
from pathlib import Path


def generate_config(gltf_file):
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

    # Specjalne ustawienia dla GCS 13
    if "GCS 13 Rel z Bel" in str(gltf_file):
        config["position"] = {"method": "topEdge", "value": 72, "yOffset": 0}
        config["scale"] = {"method": "fixed", "fixedScale": 0.1}
        config["rotation"] = {"x": 0, "y": 0, "z": 0}  # Domyślne wartości dla GCS 13

    # Zapisanie konfiguracji do pliku
    config_path = model_dir / "config.json"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=4)

    print(f"Wygenerowano konfigurację dla {gltf_file.name}")


def process_models_directory(base_dir="models"):
    """Przetwarza wszystkie modele GLTF w katalogu models."""
    base_path = Path(base_dir)

    # Sprawdź czy katalog models istnieje
    if not base_path.exists():
        print(f"Katalog {base_dir} nie istnieje!")
        return

    print(f"Skanowanie katalogu {base_dir}...")

    # Znajdź wszystkie pliki .gltf
    gltf_files = list(base_path.rglob("*.gltf"))

    if not gltf_files:
        print("Nie znaleziono żadnych plików .gltf!")
        return

    print(f"Znaleziono {len(gltf_files)} modeli GLTF")

    for gltf_file in gltf_files:
        model_dir = gltf_file.parent
        print(f"\nPrzetwarzanie modelu: {gltf_file.name}")

        # Utwórz katalog dla modelu jeśli nie istnieje
        model_dir.mkdir(parents=True, exist_ok=True)

        # Wygeneruj config dla modelu
        generate_config(gltf_file)


def main():
    """Główna funkcja programu."""
    print("Generator konfiguracji modeli 3D")
    print("--------------------------------")
    process_models_directory()
    print("\nZakończono generowanie konfiguracji.")


if __name__ == "__main__":
    main()
