import json
import os
from pathlib import Path


def normalize_path(path):
    """Konwertuje ścieżkę do formatu URL (zawsze używając slashów)"""
    return str(path).replace(os.sep, "/")


def generate_index():
    models_dir = Path("models")
    index_data = []

    # Przejście przez wszystkie foldery w katalogu models
    for folder in models_dir.iterdir():
        if not folder.is_dir():
            continue

        print(f"🔍 Przetwarzanie folderu: {folder.name}")

        model_data = {"name": folder.name, "gltf_files": [], "config_path": None}

        # Wyszukiwanie plików GLTF i GLB
        for ext in ["*.gltf", "*.glb"]:
            for file in folder.glob(ext):
                # Konwertuj ścieżkę do formatu URL
                rel_path = normalize_path(file.relative_to(models_dir))
                model_data["gltf_files"].append(rel_path)
                print(f"  ✅ Znaleziono plik: {rel_path}")

        # Sprawdzanie istnienia config.json
        config_path = folder / "config.json"
        if config_path.exists():
            # Konwertuj ścieżkę do formatu URL
            rel_config = normalize_path(config_path.relative_to(models_dir))
            model_data["config_path"] = rel_config
            print(f"  ✅ Znaleziono config.json: {rel_config}")

        # Walidacja danych
        if not model_data["gltf_files"]:
            print(f"  ⚠️ Brak plików GLTF/GLB w folderze {folder.name}")
            continue

        index_data.append(model_data)
        print("  ✅ Dodano model do index.json")

    # Zapisanie danych do pliku index.json w folderze models
    try:
        with open(models_dir / "index.json", "w", encoding="utf-8") as f:
            json.dump(index_data, f, indent=2, ensure_ascii=False)
        print("\n✅ Plik index.json został wygenerowany pomyślnie.")
    except Exception as e:
        print(f"\n❌ Błąd podczas zapisywania pliku index.json: {e}")


if __name__ == "__main__":
    try:
        generate_index()
    except Exception as e:
        print(f"\n❌ Błąd podczas generowania index.json: {e}")
