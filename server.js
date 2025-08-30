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
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
};

// Create PostgreSQL client
let client = null;
let dbConnected = false;

// Connect to database with error handling
async function connectDB() {
  try {
    // Check if we have database credentials
    if (!process.env.SUPABASE_PASSWORD) {
      console.log("Warning: No database password found. Running in demo mode.");
      console.log(
        "Tip: Set SUPABASE_PASSWORD in Vercel environment variables to enable database."
      );
      return;
    }

    client = new Client(dbConfig);
    await client.connect();
    dbConnected = true;
    console.log("Connected to Supabase PostgreSQL database");

    // Initialize database tables
    await initDatabase();
  } catch (err) {
    console.error("Database connection error:", err);
    console.log("Running in demo mode without database.");
    dbConnected = false;
  }
}

// Initialize database tables
async function initDatabase() {
  try {
    if (!client || !dbConnected) return;

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

// Serve static files with proper MIME types
app.use("/style.css", express.static(path.join(__dirname, "style.css")));
app.use("/script.js", express.static(path.join(__dirname, "script.js")));
app.use("/index.html", express.static(path.join(__dirname, "index.html")));

// Demo data for when database is not available
const demoStudents = [
  {
    id: 1,
    name: "John Doe",
    age: 20,
    gender: "M",
    midterm: 85.5,
    final: 88.0,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Jane Smith",
    age: 19,
    gender: "F",
    midterm: 92.0,
    final: 89.5,
    created_at: new Date().toISOString(),
  },
];

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    database: dbConnected ? "connected" : "disconnected",
    mode: dbConnected ? "production" : "demo",
    message: dbConnected
      ? "Connected to Supabase database"
      : "Running in demo mode",
  });
});

// Get all students with search
app.get("/api/students", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();

    if (!dbConnected) {
      // Demo mode - filter demo data
      let results = demoStudents;
      if (q) {
        const maybeId = Number(q);
        if (!Number.isNaN(maybeId)) {
          results = demoStudents.filter(
            (s) =>
              s.name.toLowerCase().includes(q.toLowerCase()) || s.id === maybeId
          );
        } else {
          results = demoStudents.filter((s) =>
            s.name.toLowerCase().includes(q.toLowerCase())
          );
        }
      }
      return res.json(results);
    }

    // Production mode with database
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
    if (!dbConnected) {
      // Demo mode
      const student = demoStudents.find(
        (s) => s.id === parseInt(req.params.id)
      );
      if (!student) return res.status(404).json({ error: "Student not found" });
      return res.json(student);
    }

    // Production mode
    const result = await client.query("SELECT * FROM students WHERE id = $1", [
      req.params.id,
    ]);

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
    if (midterm == null)
      return res.status(400).json({ error: "Midterm required" });
    if (final == null) return res.status(400).json({ error: "Final required" });

    if (!dbConnected) {
      // Demo mode - add to demo data
      const newStudent = {
        id: demoStudents.length + 1,
        name,
        age,
        gender,
        midterm,
        final,
        created_at: new Date().toISOString(),
      };
      demoStudents.push(newStudent);
      return res.status(201).json(newStudent);
    }

    // Production mode
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
    if (midterm == null)
      return res.status(400).json({ error: "Midterm required" });
    if (final == null) return res.status(400).json({ error: "Final required" });

    if (!dbConnected) {
      // Demo mode
      const studentIndex = demoStudents.findIndex(
        (s) => s.id === parseInt(req.params.id)
      );
      if (studentIndex === -1)
        return res.status(404).json({ error: "Student not found" });

      demoStudents[studentIndex] = {
        ...demoStudents[studentIndex],
        name,
        age,
        gender,
        midterm,
        final,
      };
      return res.json(demoStudents[studentIndex]);
    }

    // Production mode
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
    console.error("UPDATE error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete("/api/students/:id", async (req, res) => {
  try {
    if (!dbConnected) {
      // Demo mode
      const studentIndex = demoStudents.findIndex(
        (s) => s.id === parseInt(req.params.id)
      );
      if (studentIndex === -1)
        return res.status(404).json({ error: "Student not found" });

      demoStudents.splice(studentIndex, 1);
      return res.json({ success: true });
    }

    // Production mode
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

// Serve main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${dbConnected ? "Connected" : "Demo Mode"}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  if (client) {
    await client.end();
  }
  process.exit(0);
});
