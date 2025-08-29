const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const cors = require("cors");

const app = express();
const DB_FILE = path.join(__dirname, "data.sqlite");
const db = new sqlite3.Database(DB_FILE);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // serves index.html, style.css, script.js

// Helper: run SQL (promise)
function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}
function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

// Initialize + migrate
async function init() {
  // Base table (original or new)
  await run(
    db,
    `CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    grade TEXT,          -- legacy (may be unused now)
    notes TEXT,          -- legacy
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`
  );

  // Check existing columns
  const cols = await all(db, `PRAGMA table_info(students)`);
  const names = cols.map((c) => c.name);
  const needed = [
    { name: "midterm", def: "REAL" },
    { name: "final", def: "REAL" },
    { name: "gender", def: "TEXT" },
  ];
  for (const col of needed) {
    if (!names.includes(col.name)) {
      console.log(`Migrating: adding column ${col.name}`);
      await run(db, `ALTER TABLE students ADD COLUMN ${col.name} ${col.def}`);
    }
  }
  console.log(
    "DB ready. Columns:",
    (await all(db, `PRAGMA table_info(students)`)).map((c) => c.name).join(", ")
  );
}

init().catch((err) => {
  console.error("Fatal DB init error:", err);
  process.exit(1);
});

// Routes
app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/students", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    let rows;
    if (q) {
      // Search by name (LIKE) or exact id match
      const like = `%${q.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      const maybeId = Number(q);
      if (!Number.isNaN(maybeId)) {
        rows = await all(
          db,
          `SELECT * FROM students
           WHERE name LIKE ? ESCAPE '\\' OR id = ?
           ORDER BY created_at DESC`,
          [like, maybeId]
        );
      } else {
        rows = await all(
          db,
          `SELECT * FROM students
           WHERE name LIKE ? ESCAPE '\\'
           ORDER BY created_at DESC`,
          [like]
        );
      }
    } else {
      rows = await all(db, "SELECT * FROM students ORDER BY created_at DESC");
    }
    res.json(rows);
  } catch (e) {
    console.error("GET /api/students error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/students/:id", async (req, res) => {
  try {
    const row = await get(db, "SELECT * FROM students WHERE id=?", [
      req.params.id,
    ]);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error("GET one error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const { name, age, gender, midterm, final } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    if (age == null) return res.status(400).json({ error: "Age required" });
    if (!gender) return res.status(400).json({ error: "Gender required" });
    if (midterm == null)
      return res.status(400).json({ error: "Midterm required" });
    if (final == null) return res.status(400).json({ error: "Final required" });

    // Insert (keep legacy columns NULL)
    const stmt = await run(
      db,
      "INSERT INTO students (name, age, gender, midterm, final) VALUES (?,?,?,?,?)",
      [name, age, gender, midterm, final]
    );
    const row = await get(db, "SELECT * FROM students WHERE id=?", [
      stmt.lastID,
    ]);
    res.status(201).json(row);
  } catch (e) {
    console.error("POST /api/students error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const { name, age, gender, midterm, final } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });
    if (age == null) return res.status(400).json({ error: "Age required" });
    if (!gender) return res.status(400).json({ error: "Gender required" });
    if (midterm == null)
      return res.status(400).json({ error: "Midterm required" });
    if (final == null) return res.status(400).json({ error: "Final required" });
    const r = await run(
      db,
      "UPDATE students SET name=?, age=?, gender=?, midterm=?, final=? WHERE id=?",
      [name, age, gender, midterm, final, req.params.id]
    );
    if (r.changes === 0) return res.status(404).json({ error: "Not found" });
    const row = await get(db, "SELECT * FROM students WHERE id=?", [
      req.params.id,
    ]);
    res.json(row);
  } catch (e) {
    console.error("PUT error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const r = await run(db, "DELETE FROM students WHERE id=?", [req.params.id]);
    if (r.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    console.error("DELETE error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Fallback (optional) -> if you navigate directly
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`));
