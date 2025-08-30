const express = require("express");
const { Client } = require("pg");
const path = require("path");
const cors = require("cors");

const app = express();

// Database configuration
const dbConfig = {
  host: process.env.SUPABASE_HOST || "db.qshxvmdokakmbukpovpv.supabase.co",
  port: process.env.SUPABASE_PORT || 5432,
  database: process.env.SUPABASE_DB || "postgres",
  user: process.env.SUPABASE_USER || "postgres",
  password: process.env.SUPABASE_PASSWORD,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
};

// Create PostgreSQL client
const client = new Client(dbConfig);

// Connect to database
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to Supabase PostgreSQL database");
    
    // Initialize database tables
    await initDatabase();
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}

// Initialize database tables
async function initDatabase() {
  try {
    // Create students table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        grade TEXT,
        notes TEXT,
        midterm REAL,
        final REAL,
        gender TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log("Database initialized successfully");
  } catch (err) {
    console.error("Database initialization error:", err);
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Get all students with search
app.get("/api/students", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    let query, params;
    
    if (q) {
      const maybeId = Number(q);
      if (!Number.isNaN(maybeId)) {
        query = `
          SELECT * FROM students 
          WHERE name ILIKE $1 OR id = $2 
          ORDER BY created_at DESC
        `;
        params = [`%${q}%`, maybeId];
      } else {
        query = `
          SELECT * FROM students 
          WHERE name ILIKE $1 
          ORDER BY created_at DESC
        `;
        params = [`%${q}%`];
      }
    } else {
      query = "SELECT * FROM students ORDER BY created_at DESC";
      params = [];
    }
    
    const result = await client.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/students error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single student
app.get("/api/students/:id", async (req, res) => {
  try {
    const result = await client.query(
      "SELECT * FROM students WHERE id = $1",
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET student error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new student
app.post("/api/students", async (req, res) => {
  try {
    const { name, age, gender, midterm, final } = req.body;
    
    if (!name) return res.status(400).json({ error: "Name required" });
    if (age == null) return res.status(400).json({ error: "Age required" });
    if (!gender) return res.status(400).json({ error: "Gender required" });
    if (midterm == null) return res.status(400).json({ error: "Midterm required" });
    if (final == null) return res.status(400).json({ error: "Final required" });

    const result = await client.query(
      `INSERT INTO students (name, age, gender, midterm, final) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [name, age, gender, midterm, final]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/students error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update student
app.put("/api/students/:id", async (req, res) => {
  try {
    const { name, age, gender, midterm, final } = req.body;
    
    if (!name) return res.status(400).json({ error: "Name required" });
    if (age == null) return res.status(400).json({ error: "Age required" });
    if (!gender) return res.status(400).json({ error: "Gender required" });
    if (midterm == null) return res.status(400).json({ error: "Midterm required" });
    if (final == null) return res.status(400).json({ error: "Final required" });

    const result = await client.query(
      `UPDATE students 
       SET name = $1, age = $2, gender = $3, midterm = $4, final = $5 
       WHERE id = $6 
       RETURNING *`,
      [name, age, gender, midterm, final, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PUT error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete("/api/students/:id", async (req, res) => {
  try {
    const result = await client.query(
      "DELETE FROM students WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Fallback route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await client.end();
  process.exit(0);
});
