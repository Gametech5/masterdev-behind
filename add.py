import json

PROJECTS_FILE = 'projects.json'

# Functie om de projecten te laden uit het JSON-bestand
def load_projects():
    try:
        with open(PROJECTS_FILE, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return []  # Als het bestand niet bestaat, begin met een lege lijst

# Functie om projecten op te slaan in het JSON-bestand
def save_projects(projects):
    with open(PROJECTS_FILE, 'w') as f:
        json.dump(projects, f, indent=4)

# Toevoegen van een nieuw project
def add_project():
    name = input("Voer de naam van het nieuwe project in: ")
    description = input("Voer een beschrijving voor het project in: ")
    full_description = input("Voer een inhoud in voor het project: ")
    status = input("Voer de status van het project in: ")
    
    projects = load_projects()
    new_project = {"name": name, "description": description, "full_des": full_description, "status": status}
    projects.append(new_project)
    save_projects(projects)
    print(f"Project '{name}' toegevoegd!")

# Verwijderen van een project
def delete_project():
    projects = load_projects()
    if not projects:
        print("Geen projecten beschikbaar om te verwijderen.")
        return

    print("\nBeschikbare projecten om te verwijderen:")
    for i, project in enumerate(projects, 1):
        print(f"{i}. Naam: {project['name']}, Beschrijving: {project['description']}")

    choice = input("\nVoer het nummer in van het project dat je wilt verwijderen: ")
    try:
        index = int(choice) - 1
        if 0 <= index < len(projects):
            deleted_project = projects.pop(index)
            save_projects(projects)
            print(f"Project '{deleted_project['name']}' verwijderd!")
        else:
            print("Ongeldige keuze!")
    except ValueError:
        print("Ongeldige invoer, probeer het opnieuw.")

# Bewerken van een project
def edit_project():
    projects = load_projects()
    if not projects:
        print("Geen projecten beschikbaar om te bewerken.")
        return

    print("\nBeschikbare projecten om te bewerken:")
    for i, project in enumerate(projects, 1):
        print(f"{i}. Naam: {project['name']}, Beschrijving: {project['description']}")

    choice = input("\nVoer het nummer in van het project dat je wilt bewerken: ")
    try:
        index = int(choice) - 1
        if 0 <= index < len(projects):
            new_description = input(f"Voer de nieuwe beschrijving in voor '{projects[index]['name']}': ")
            new_full_des = input ("Voer een nieuwe volledige beschrijving in: ")
            new_status = input("Voer de nieuwe status in: ")
            projects[index]['description'] = new_description
            projects[index]['status'] = new_status
            projects[index]['full_des'] = new_full_des
            save_projects(projects)
            print(f"Project '{projects[index]['name']}' bijgewerkt!")
        else:
            print("Ongeldige keuze!")
    except ValueError:
        print("Ongeldige invoer, probeer het opnieuw.")

# Weergave van alle projecten
def list_projects():
    projects = load_projects()
    if projects:
        print("\nHuidige projecten:")
        for project in projects:
            print(f"Naam: {project['name']}, Beschrijving: {project['description']}, status: {project['status']}")
    else:
        print("Geen projecten gevonden.")

# Functie om het menu weer te geven en gebruikersinput te verwerken
def show_menu():
    while True:
        print("\nMasterDev behind")
        print("1. Voeg een nieuw project toe")
        print("2. Verwijder een project")
        print("3. Bewerk een project")
        print("4. Bekijk alle projecten")
        print("5. Stop")

        choice = input("Voer je keuze in (1-5): ")

        if choice == '1':
            add_project()
        elif choice == '2':
            delete_project()
        elif choice == '3':
            edit_project()
        elif choice == '4':
            list_projects()
        elif choice == '5':
            print("Tot ziens!")
            break
        else:
            print("Ongeldige keuze, probeer het opnieuw.")

if __name__ == '__main__':
    show_menu()
