import json

PROJECTS_FILE = "projects.json"  # Pas dit aan naar de juiste bestandslocatie

def ensure_likes_field():
    with open(PROJECTS_FILE, "r", encoding="utf-8") as file:
        projects = json.load(file)

    for project in projects:
        if "likes" not in project:
            project["likes"] = 0  # Zet likes op 0 als het niet bestaat

    with open(PROJECTS_FILE, "w", encoding="utf-8") as file:
        json.dump(projects, file, indent=2)

    print("Alle projecten hebben nu een likes-veld!")

ensure_likes_field()
