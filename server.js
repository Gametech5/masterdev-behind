const express = require("express");
const fs = require("fs");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require('cors')
const app = express();
const PORT = 3000;
const SECRET_KEY = "my_secret_key"; // 🔑 Zorg ervoor dat deze veilig blijft!

const USERS_FILE = "users.json";
const CODE_FILE= "code.json";
const PROJECTS_FILE = "projects.json";
const FEEDBACK_FILE = 'feedback.json';

const multer = require('multer');
const path = require('path');

//Middleware
app.use(bodyParser.json());
app.use(cors());

// Map waar geüploade bestanden worden opgeslagen
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer configuratie
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Geen bestand ontvangen' });
  res.json({ url: `/uploads/${req.file.filename}` }); // ✅ JSON response
});

function readFeedback() {
  try {
    return JSON.parse(fs.readFileSync(FEEDBACK_FILE));
  } catch {
    return [];
  }
}

function writeFeedback(data) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2));
}

// 👉 Feedback ophalen
app.get('/feedback', (req, res) => {
  const feedback = readFeedback();
  res.json(feedback);
});

// 👉 Feedback toevoegen
app.post('/submit-feedback', (req, res) => {
    const { name, email, feedback } = req.body;
    if (!name || !email || !feedback) {
        return res.status(400).json({ error: 'Vul alle velden in' });
    }

    const feedbackData = readFeedback();
    feedbackData.push({ name, email, feedback, time: new Date().toISOString() });
    writeFeedback(feedbackData);

    res.json({ success: true });
});





// Verwijderfunctie
function deleteImage(imageUrl) {
  const filePath = path.join(uploadDir, path.basename(imageUrl)); // Zorgt dat alleen de bestandsnaam gebruikt wordt

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Fout bij verwijderen afbeelding:', err);
    } else {
      console.log('Afbeelding verwijderd:', filePath);
    }
  });
}

// Statische bestanden serveren
app.use('/uploads', express.static(uploadDir));

// 📂 Helperfunctie om JSON-bestanden te lezen
const readJSON = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (err) {
        console.error(`❌ Fout bij lezen van ${file}:`, err);
        return [];
    }
};

// 💾 Helperfunctie om JSON-bestanden te schrijven
const writeJSON = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        console.log(`✅ Gegevens opgeslagen in ${file}`);
    } catch (err) {
        console.error(`🚨 Schrijffout in ${file}:`, err);
    }
};

// 👤 **Check of gebruiker al bestaat**
const userExists = (username) => {
    let users = readJSON(USERS_FILE);
    return users.some(user => user.username === username);
};

app.get('/health-check', (req, res) => {
    res.status(200).send('Server is up!');
});


// ✅ **Controleer of gebruikersnaam al bestaat (real-time validatie)**
app.post("/check-username", (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: "Gebruikersnaam is vereist!" });
    }

    if (userExists(username)) {
        return res.status(409).json({ error: "Gebruikersnaam is al in gebruik!" }); // 409 = Conflict
    }

    res.json({ message: "Gebruikersnaam beschikbaar" });
});
 

// Unlike a project
app.post("/unlike-project", (req, res) => {
    const ipAddress = req.ip;
    const { name } = req.body;
    
    let projects = readJSON(PROJECTS_FILE);
    
    let project = projects.find(p => p.name === name);
    if (!project) {
        return res.status(404).json({ error: "Project niet gevonden!" });
    }

    if (!project.likedBy || !project.likedBy.includes(ipAddress)) {
        return res.status(400).json({ error: "Je hebt dit project niet geliket!" });
    }

    project.likedBy = project.likedBy.filter(ip => ip !== ipAddress);
    project.likes = Math.max((project.likes || 0) - 1, 0); // Prevent negative likes

    writeJSON(PROJECTS_FILE, projects);
    res.json({ name: project.name, likes: project.likes });
});


app.get("/user-status", (req, res) => {
    const ipAddress = req.ip;
    let projects = readJSON(PROJECTS_FILE);

    let likedProjects = projects.filter(p => p.likedBy?.includes(ipAddress)).map(p => p.name);
    let dislikedProjects = projects.filter(p => p.dislikedBy?.includes(ipAddress)).map(p => p.name);

    res.json({ liked: likedProjects, disliked: dislikedProjects });
});


// Like a project
app.post("/like-project", (req, res) => {
    const ipAddress = req.ip;
    const { name } = req.body;
    
    let projects = readJSON(PROJECTS_FILE);
    
    let project = projects.find(p => p.name === name);
    if (!project) {
        return res.status(404).json({ error: "Project niet gevonden!" });
    }

    // Check if the IP has already liked the project
    if (!project.likedBy) {
        project.likedBy = [];
    }

    if (project.likedBy.includes(ipAddress)) {
        return res.status(400).json({ error: "Je hebt dit project al geliket!" });
    }

    project.likedBy.push(ipAddress);
    project.likes = (project.likes || 0) + 1;

    writeJSON(PROJECTS_FILE, projects);
    res.json({ name: project.name, likes: project.likes });
});

// Undo dislike
app.post("/undislike-project", (req, res) => {
    const ipAddress = req.ip;
    const { name } = req.body;

    let projects = readJSON(PROJECTS_FILE);
    let project = projects.find(p => p.name === name);
    if (!project) {
        return res.status(404).json({ error: "Project niet gevonden!" });
    }

    if (!project.dislikedBy) project.dislikedBy = [];
    if (!project.dislikes) project.dislikes = 0; // <-- Fix voor NaN

    const index = project.dislikedBy.indexOf(ipAddress);
    if (index === -1) {
        return res.status(400).json({ error: "Je hebt dit project niet gedisliket!" });
    }

    project.dislikedBy.splice(index, 1);
    project.dislikes = Math.max(0, project.dislikes - 1); // <-- Zorgt ervoor dat het nooit onder 0 gaat

    writeJSON(PROJECTS_FILE, projects);
    res.json({ name: project.name, dislikes: project.dislikes });
});

// Dislike een project
app.post("/dislike-project", (req, res) => {
    const ipAddress = req.ip;
    const { name } = req.body;

    let projects = readJSON(PROJECTS_FILE);
    let project = projects.find(p => p.name === name);
    if (!project) {
        return res.status(404).json({ error: "Project niet gevonden!" });
    }

    if (!project.dislikedBy) project.dislikedBy = [];
    if (!project.likedBy) project.likedBy = [];
    if (!project.dislikes) project.dislikes = 0; // <-- Fix voor NaN

    if (project.dislikedBy.includes(ipAddress)) {
        return res.status(400).json({ error: "Je hebt dit project al gedisliket!" });
    }

    project.dislikedBy.push(ipAddress);
    project.dislikes += 1;

    writeJSON(PROJECTS_FILE, projects);
    res.json({ name: project.name, dislikes: project.dislikes });
});




app.post("/sign", async (req, res) => {
    const { username, password, role, mentor } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Gebruikersnaam en wachtwoord zijn verplicht!" });
    }

    if (userExists(username)) {
        return res.status(409).json({ error: "Gebruiker bestaat al!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let users = readJSON(USERS_FILE);

    users.push({ 
        username, 
        password: hashedPassword, 
        rank: "broke",  
        role: role || "user",
        tokens: -1000,  // 🎉 Elke nieuwe gebruiker krijg 0 tokens
	mentor: mentor || ""
    });

    writeJSON(USERS_FILE, users);
    res.json({ message: "Account succesvol aangemaakt, log in!" });
});

// 🔑 **Inloggen en JWT-token genereren**
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    let users = readJSON(USERS_FILE);

    const user = users.find((u) => u.username === username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Ongeldige inloggegevens!" });
    }
    console.log(username, password);
    const token = jwt.sign({ username, mentor: user.mentor, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ token });
});

// 🛡️ **Middleware om JWT te controleren**
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(403).json({ error: "Geen token verstrekt" });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(401).json({ error: "Ongeldige token" });

        req.user = decoded;
        next();
    });
};

// 🗑️ **Delete User**
app.post("/delete-user", authenticate, (req, res) => {
    let users = readJSON(USERS_FILE);  
    const username = req.user.username; // Get logged-in user

    // Filter out the current user
    const filteredUsers = users.filter(user => user.username !== username);

    if (filteredUsers.length === users.length) {
        return res.status(404).json({ error: "User not found" });
    }

    writeJSON(USERS_FILE, filteredUsers);
    res.json({ message: "User deleted" });
});

app.post("/show-rank", authenticate, (req, res) => {
    let users = readJSON(USERS_FILE);
    const user = users.find((u) => u.username === req.user.username);

    if (!user) {
        return res.status(404).json({ error: "Gebruiker niet gevonden" });
    }

    res.status(200).json({ rank: user.rank });  // 🔥 Geef de echte rank terug
});

app.get("/show-public", (req, res) => {
    let projects = readJSON(PROJECTS_FILE);
    let publicProjects = projects.filter(p => p.adver === true);
    res.json(publicProjects);
});

app.get('/projects-mentored', authenticate, (req, res) => {
    let projects = readJSON(PROJECTS_FILE);
    let shared = projects.filter(p => p.sharedWith?.includes(req.user.username));
    res.json(shared);
});


app.post("/buy-rank", authenticate, (req, res) => {
    let users = readJSON(USERS_FILE);
    let ranks = readJSON("ranks.json");

    const user = users.find((u) => u.username === req.user.username);
    if (!user) {
        return res.status(404).json({ error: "Gebruiker niet gevonden!" });
    }

    const { newRank } = req.body;
    
    if (!ranks[newRank]) {
        return res.status(400).json({ error: "Ongeldige rang gekozen!" });
    }

    const rankPrice = ranks[newRank];

    if (user.tokens < rankPrice) {
        return res.status(400).json({ error: "Niet genoeg tokens!" });
    }

    // Check of de nieuwe rank hoger is dan de huidige rank
    const rankList = Object.keys(ranks);
    if (rankList.indexOf(newRank) <= rankList.indexOf(user.rank)) {
        return res.status(400).json({ error: "Je kunt alleen een hogere rang kopen!" });
    }

    // Update tokens en rank
    user.tokens -= rankPrice;
    user.rank = newRank;
    writeJSON(USERS_FILE, users);

    res.json({ message: `Gefeliciteerd! Je bent nu ${newRank}`, tokens: user.tokens });
});

app.get("/check-rank", authenticate, (req, res) => {
    let users = readJSON(USERS_FILE);
    let ranks = readJSON("ranks.json");

    const user = users.find((u) => u.username === req.user.username);
    if (!user) {
        return res.status(404).json({ error: "Gebruiker niet gevonden!" });
    }

    const rankList = Object.keys(ranks);
    let currentRankIndex = rankList.indexOf(user.rank);

    if (currentRankIndex === -1 || currentRankIndex >= rankList.length - 1) {
        return res.json({ message: "Je hebt de hoogste rang!", rank: user.rank });
    }

    // Zoek de goedkoopste upgrade die de gebruiker zich kan veroorloven
    for (let i = currentRankIndex + 1; i < rankList.length; i++) {
        let nextRank = rankList[i];
        let price = ranks[nextRank];

        if (user.tokens >= price) {
            user.tokens -= price;
            user.rank = nextRank;
            writeJSON(USERS_FILE, users);

            return res.json({ message: `Gefeliciteerd! Je bent geüpgraded naar ${nextRank}`, rank: user.rank, tokens: user.tokens });
        }
    }

    res.json({ message: "Nog niet genoeg tokens voor een upgrade!", rank: user.rank, tokens: user.tokens });
});

// 🛒 **Koop tokens**
app.post("/buy-tokens", authenticate, (req, res) => {
    let users = readJSON(USERS_FILE);
    let amount = parseInt(req.body.amount, 10); // 👈 Zet om naar een integer

    if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Ongeldig aantal tokens!" });
    }

    const user = users.find(u => u.username === req.user.username);
    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden!" });

    user.tokens = (parseInt(user.tokens, 10) || 0) + amount; // 👈 Zet bestaande waarde om naar een integer

    writeJSON(USERS_FILE, users);

    res.json({ message: "Tokens toegevoegd!", tokens: user.tokens });
});

// 🔍 **Bekijk je tokensaldo**
app.get("/check-tokens", authenticate, (req, res) => {
    let users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === req.user.username);

    if (!user) return res.status(404).json({ error: "Gebruiker niet gevonden!" });

    res.json({ tokens: user.tokens || 0 });
});


// 📥 **Nieuwe projecten toevoegen**
app.post("/add-project", authenticate, (req, res) => {
    const { name, description, full_des, status, adver, imageUrl } = req.body;
    if (!name || !description || !full_des || !status) {
        return res.status(400).json({ error: "Alle velden zijn verplicht!" });
    }

    let projects = readJSON(PROJECTS_FILE);
    projects.push({ name, description, full_des, status, owner: req.user.username,sharedWith: [req.user.mentor], adver, imageUrl});

    writeJSON(PROJECTS_FILE, projects);
    res.json({ message: "Project toegevoegd" });
});


// 📥 **Nieuwe projecten toevoegen**
app.post("/add-code", authenticate, (req, res) => {
    const { name, description, full_des, status, adver } = req.body;
    if (!name || !description || !full_des || !status) {
        return res.status(400).json({ error: "Alle velden zijn verplicht!" });
    }

    let projects = readJSON(CODE_FILE);
    projects.push({ name, description, full_des, status, owner: req.user.username, adver });

    writeJSON(CODE_FILE, projects);
    res.json({ message: "Project toegevoegd" });
});

// 📤 **Projecten ophalen**
app.get("/projects", authenticate, (req, res) => {
    let projects = readJSON(PROJECTS_FILE);
    let userProjects = projects.filter((p) => p.owner === req.user.username);
    res.json(userProjects);
});



// 🗑️ **Project verwijderen inclusief afbeelding**
app.post("/delete-project", authenticate, (req, res) => {
    let projects = readJSON(PROJECTS_FILE);
    const { name } = req.body;

    const projectToDelete = projects.find(
        (p) => p.name === name && p.owner === req.user.username
    );

    if (!projectToDelete) {
        return res.status(404).json({ error: "Project niet gevonden of geen rechten" });
    }

    // Verwijder de afbeelding van de server (check of de URL bestaat)
    const imagePath = path.join(__dirname, projectToDelete.imageUrl.replace(/^uploads\//, ''));  // Zorg ervoor dat het juiste pad is
    console.log('Afbeeldingspad:', imagePath);  // Voeg dit toe om het pad te controleren

    // Controleer of het bestand bestaat voordat we het proberen te verwijderen
    fs.exists(imagePath, (exists) => {
        if (exists) {
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Fout bij het verwijderen van de afbeelding:', err);
                    return res.status(500).json({ error: "Fout bij het verwijderen van de afbeelding" });
                }

                console.log(`Afbeelding ${projectToDelete.imageUrl} succesvol verwijderd`);
            });
        } else {
            console.log(`Afbeelding niet gevonden op pad: ${imagePath}`);
        }
    });

    // Verwijder het project uit de lijst
    const filteredProjects = projects.filter(
        (p) => !(p.name === name && p.owner === req.user.username)
    );

    writeJSON(PROJECTS_FILE, filteredProjects);

    // Dit zorgt ervoor dat je niet meer twee keer een reactie verstuurt
    res.json({ message: "Project verwijderd" });
});



// ✏️ **Project bewerken**
app.post("/edit-project", authenticate, (req, res) => {
    let projects = readJSON(PROJECTS_FILE);
    const { name, description, full_des, status } = req.body;

    let project = projects.find((p) => p.name === name && p.owner === req.user.username);
    if (!project) {
        return res.status(404).json({ error: "Project niet gevonden of geen rechten" });
    }

    project.description = description;
    project.full_des = full_des;
    project.status = status;

    writeJSON(PROJECTS_FILE, projects);
    res.json({ message: "Project bijgewerkt" });
});

// 🚀 **Server starten**
app.listen(PORT, () => {
    console.log(`🚀 Server draait op poort ${PORT}`);
});
