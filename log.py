from flask import Flask, request, redirect, url_for
import json
import os

app = Flask(__name__)

# Pad naar het JSON-bestand
ranks_file = 'ranks.json'

# Functie om het JSON-bestand te laden
def load_ranks():
    if os.path.exists(ranks_file):
        with open(ranks_file, 'r') as file:
            return json.load(file)
    return {}

# Functie om het JSON-bestand op te slaan
def save_ranks(ranks):
    with open(ranks_file, 'w') as file:
        json.dump(ranks, file, indent=4)

# HTML template als string
html_template = """
<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rank Beheer</title>
</head>
<body>
    <h1>Rank Beheer</h1>

    <h2>Bestaande Ranks:</h2>
    <ul>
        {ranks_list}
    </ul>

    <h2>Voeg een nieuwe Rank toe:</h2>
    <form method="POST" action="/add_rank">
        <label for="name">Rank Naam:</label>
        <input type="text" id="name" name="name" required>
        <br>
        <label for="points">Puntwaarde:</label>
        <input type="number" id="points" name="points" required>
        <br>
        <button type="submit">Voeg Rank toe</button>
    </form>
</body>
</html>
"""

# Functie om de lijst van ranks om te zetten in een HTML-lijst
def generate_ranks_list(ranks):
    ranks_html = ""
    for rank, points in ranks.items():
        ranks_html += f'''
            <li>
                <strong>{rank}</strong> - {points} punten
                <form method="POST" action="/edit_rank/{rank}" style="display:inline;">
                    <input type="number" name="points" value="{points}" required>
                    <button type="submit">Bewerk</button>
                </form>
                <a href="/delete_rank/{rank}">Verwijder</a>
            </li>
        '''
    return ranks_html

# Homepagina
@app.route('/')
def index():
    ranks = load_ranks()
    ranks_list = generate_ranks_list(ranks)
    return html_template.replace("{ranks_list}", ranks_list)

# Route om een rank toe te voegen of bij te werken via formulier
@app.route('/add_rank', methods=['POST'])
def add_rank():
    rank_name = request.form['name']
    rank_points = request.form['points']
    try:
        rank_points = int(rank_points)  # Zorg ervoor dat de punten een integer zijn
    except ValueError:
        return "Puntwaarde moet een getal zijn!", 400

    ranks = load_ranks()

    if rank_name:
        ranks[rank_name] = rank_points
        save_ranks(ranks)
        return redirect(url_for('index'))
    return "Rank naam is vereist!", 400

# Route om een rank te verwijderen
@app.route('/delete_rank/<rank_name>', methods=['GET'])
def delete_rank(rank_name):
    ranks = load_ranks()

    if rank_name in ranks:
        del ranks[rank_name]
        save_ranks(ranks)
        return redirect(url_for('index'))
    return "Rank niet gevonden!", 404

# Route om een rank te bewerken (puntwaarde)
@app.route('/edit_rank/<rank_name>', methods=['POST'])
def edit_rank(rank_name):
    new_points = request.form['points']
    try:
        new_points = int(new_points)
    except ValueError:
        return "Puntwaarde moet een getal zijn!", 400

    ranks = load_ranks()

    if rank_name in ranks:
        ranks[rank_name] = new_points
        save_ranks(ranks)
        return redirect(url_for('index'))
    return "Rank niet gevonden!", 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
