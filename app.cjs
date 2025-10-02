
const express = require("express");
const fs = require("fs").promises;
const path = require("path");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 5000;

// --- Paths
const DATA_DIR = path.join(__dirname, "data");
const SUBMISSIONS_PATH = path.join(DATA_DIR, "submissions.json");
const APPROVED_PATH = path.join(DATA_DIR, "approvedSubmissions.json");
const ADMINS_PATH = path.join(DATA_DIR, "admin.json");
const ADMIN_DIR = path.join(__dirname, "admin");
const PUBLIC_DIR = path.join(__dirname, "public");

// --- Helpers
async function readJSON(fp, fallback) {
  try {
    const txt = await fs.readFile(fp, "utf-8");
    return JSON.parse(txt);
  } catch (err) {
    if (fallback !== undefined) return fallback;
    throw err;
  }
}
async function writeJSON(fp, data) {
  const txt = JSON.stringify(data, null, 2);
  await fs.writeFile(fp, txt, "utf-8");
}
function makeId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function validEmail(s) {
  return /^[^\s]+@[^\s]+\.(com|org|gov|edu|net)$/i.test(s);
}

// --- Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan(":method :url :status :res[content-length] - :response-time ms"));

// Static files
app.use(express.static(PUBLIC_DIR));

// --- Public routes
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.post("/home", (req, res) => {
  // After "Make new account" button, show the public home page
  res.sendFile(path.join(PUBLIC_DIR, "home.html"));
});

// Form on home.html posts here
app.post("/submissions", async (req, res) => {
  try {
    const { name, email, newsOrInfo } = req.body || {};
    if (!name || !email || !newsOrInfo) {
      return res.status(400).json({ error: "name, email, newsOrInfo are required" });
    }
    if (!validEmail(email)) {
      return res.status(400).json({ error: "Invalid email (must end with common TLD like .com/.edu)" });
    }
    const submissions = await readJSON(SUBMISSIONS_PATH, []);
    const item = {
      id: makeId(),
      name: String(name).trim(),
      email: String(email).trim(),
      newsOrInfo: String(newsOrInfo).trim(),
      status: "new",
    };
    submissions.push(item);
    await writeJSON(SUBMISSIONS_PATH, submissions);
    // For a simple UX, send them back to home
    res.status(201).json({ ok: true, submission: item });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save submission" });
  }
});

// --- Admin auth + assets
// Basic form POST auth; reads from data/admin.json
app.post("/admin", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const admins = await readJSON(ADMINS_PATH, []);
    const ok = admins.some(a => a.username === username && a.password === password);
    if (!ok) return res.status(401).send("Unauthorized");
    res.sendFile(path.join(ADMIN_DIR, "admin.html"));
  } catch (err) {
    console.error(err);
    res.status(500).send("Error during login");
  }
});

// Allow GET /admin to open the dashboard (no auth for classroom demo)
app.get("/admin", (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, "admin.html"));
});

// Serve admin static helpers
app.get("/admin/css", (req, res) => res.sendFile(path.join(ADMIN_DIR, "admin.css")));
app.get("/admin/script", (req, res) => res.sendFile(path.join(ADMIN_DIR, "admin.js")));
app.get("/admin/node", (req, res) => res.type("application/javascript").send("// helper reserved"));

// --- Admin data APIs (use relative paths in admin.js like './data/notApproved')
app.get("/admin/data/notApproved", async (req, res) => {
  try {
    const submissions = await readJSON(SUBMISSIONS_PATH, []);
    res.json(submissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read submissions" });
  }
});

app.get("/admin/data/real", async (req, res) => {
  try {
    const approved = await readJSON(APPROVED_PATH, []);
    res.json(approved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to read approved submissions" });
  }
});

app.post("/admin/approve/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const submissions = await readJSON(SUBMISSIONS_PATH, []);
    const idx = submissions.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: "Not found" });
    const [item] = submissions.splice(idx, 1);
    const approved = await readJSON(APPROVED_PATH, []);
    approved.push({ ...item, status: "approved" });
    await writeJSON(SUBMISSIONS_PATH, submissions);
    await writeJSON(APPROVED_PATH, approved);
    res.json({ ok: true, approved: item.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to approve" });
  }
});

app.delete("/admin/notApproved/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const submissions = await readJSON(SUBMISSIONS_PATH, []);
    const next = submissions.filter(x => x.id != id);
    if (next.length === submissions.length) return res.status(404).json({ error: "Not found" });
    await writeJSON(SUBMISSIONS_PATH, next);
    res.json({ ok: true, deleted: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

app.delete("/admin/approved/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const approved = await readJSON(APPROVED_PATH, []);
    const next = approved.filter(x => x.id != id);
    if (next.length === approved.length) return res.status(404).json({ error: "Not found" });
    await writeJSON(APPROVED_PATH, next);
    res.json({ ok: true, deleted: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete approved item" });
  }
});

// 404 JSON for unknown API routes
app.use((req, res) => {
  res.status(404).json({ error: "Page not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
