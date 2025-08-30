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
  ssl: { rejectUnauthorized: false },
};

// Create PostgreSQL client
let client = null;
let dbConnected = false;

// Connect to database
async function connectDB() {
  try {
    if (!process.env.SUPABASE_PASSWORD) {
      console.log("No database password - running in demo mode");
      return;
    }

    client = new Client(dbConfig);
    await client.connect();
    dbConnected = true;
    console.log("Connected to Supabase database!");

    // Create table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        gender TEXT,
        midterm REAL,
        final REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Table created/verified successfully");
  } catch (err) {
    console.error("Database connection failed:", err.message);
    dbConnected = false;
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    database: dbConnected ? "connected" : "demo",
    message: dbConnected ? "Database connected" : "Running in demo mode",
  });
});

// Get all students
app.get("/api/students", async (req, res) => {
  try {
    if (dbConnected) {
      const result = await client.query(
        "SELECT * FROM students ORDER BY created_at DESC"
      );
      res.json(result.rows);
    } else {
      res.json([]);
    }
  } catch (err) {
    console.error("Error getting students:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new student
app.post("/api/students", async (req, res) => {
  try {
    const { name, age, gender, midterm, final } = req.body;

    if (!name || age == null || !gender || midterm == null || final == null) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (dbConnected) {
      const result = await client.query(
        "INSERT INTO students (name, age, gender, midterm, final) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [name, age, gender, midterm, final]
      );
      res.status(201).json(result.rows[0]);
    } else {
      res.status(500).json({ error: "Database not connected" });
    }
  } catch (err) {
    console.error("Error creating student:", err);
    res.status(500).json({ error: err.message });
  }
});

// Update student
app.put("/api/students/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, gender, midterm, final } = req.body;

    if (!dbConnected) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const result = await client.query(
      "UPDATE students SET name = $1, age = $2, gender = $3, midterm = $4, final = $5 WHERE id = $6 RETURNING *",
      [name, age, gender, midterm, final, id]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (err) {
    console.error("Error updating student:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete("/api/students/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!dbConnected) {
      return res.status(500).json({ error: "Database not connected" });
    }

    const result = await client.query(
      "DELETE FROM students WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Student not found" });
    }
  } catch (err) {
    console.error("Error deleting student:", err);
    res.status(500).json({ error: err.message });
  }
});

// Catch-all route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database: ${dbConnected ? "Connected" : "Demo Mode"}`);
  });
});
