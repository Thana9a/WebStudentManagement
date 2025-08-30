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
  ssl: { rejectUnauthorized: false }, // Always use SSL for Supabase
};

// Create PostgreSQL client
let client = null;
let isDbConnected = false;

async function connectDB() {
  // Check if client exists and is still connected
  if (isDbConnected && client) {
    try {
      await client.query("SELECT 1"); // Test connection
      return; // Already connected and healthy
    } catch (testErr) {
      console.warn(
        "Existing DB connection failed test, attempting reconnect:",
        testErr.message
      );
      isDbConnected = false;
      if (client) {
        try {
          client.end();
        } catch (e) {
          console.error("Error ending client:", e);
        }
      }
    }
  }

  // Attempt to connect if not connected or connection failed test
  if (!isDbConnected) {
    try {
      client = new Client(dbConfig);
      await client.connect();
      console.log("Connected to Supabase PostgreSQL database");
      isDbConnected = true;
    } catch (err) {
      console.error("Database connection error:", err.message);
      isDbConnected = false;
      // In production, you might want to implement a more robust retry mechanism
    }
  }
}

// Connect to DB on startup (for local dev)
// In Vercel serverless, this might run on each invocation, so connectDB handles re-connection
if (process.env.NODE_ENV !== "production") {
  connectDB();
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
// This middleware should come first to handle requests for index.html, style.css, script.js
app.use(express.static(path.join(__dirname, "public")));

// API routes
// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).send("Server is healthy!");
});

// Database test endpoint
app.get("/api/test-db", async (req, res) => {
  await connectDB(); // Ensure connection is attempted
  if (isDbConnected) {
    try {
      const result = await client.query("SELECT NOW()");
      res
        .status(200)
        .json({
          message: "Database connection successful!",
          time: result.rows[0].now,
        });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Database query failed!", error: err.message });
    }
  } else {
    res.status(500).json({ message: "Database not connected." });
  }
});

// Get all students
app.get("/api/students", async (req, res) => {
  await connectDB();
  if (!isDbConnected)
    return res.status(500).json({ message: "Database not connected." });
  try {
    const result = await client.query(
      "SELECT * FROM students ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching students:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching students", error: err.message });
  }
});

// Get student by ID
app.get("/api/students/:id", async (req, res) => {
  await connectDB();
  if (!isDbConnected)
    return res.status(500).json({ message: "Database not connected." });
  try {
    const { id } = req.params;
    const result = await client.query("SELECT * FROM students WHERE id = $1", [
      id,
    ]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    console.error("Error fetching student by ID:", err.message);
    res
      .status(500)
      .json({ message: "Error fetching student", error: err.message });
  }
});

// Add a new student
app.post("/api/students", async (req, res) => {
  await connectDB();
  if (!isDbConnected)
    return res.status(500).json({ message: "Database not connected." });
  try {
    const { name, age, gender, midterm, final } = req.body;
    const result = await client.query(
      "INSERT INTO students (name, age, gender, midterm, final) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, age, gender, midterm, final]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding student:", err.message);
    res
      .status(500)
      .json({ message: "Error adding student", error: err.message });
  }
});

// Update a student
app.put("/api/students/:id", async (req, res) => {
  await connectDB();
  if (!isDbConnected)
    return res.status(500).json({ message: "Database not connected." });
  try {
    const { id } = req.params;
    const { name, age, gender, midterm, final } = req.body;
    const result = await client.query(
      "UPDATE students SET name = $1, age = $2, gender = $3, midterm = $4, final = $5 WHERE id = $6 RETURNING *",
      [name, age, gender, midterm, final, id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    console.error("Error updating student:", err.message);
    res
      .status(500)
      .json({ message: "Error updating student", error: err.message });
  }
});

// Delete a student
app.delete("/api/students/:id", async (req, res) => {
  await connectDB();
  if (!isDbConnected)
    return res.status(500).json({ message: "Database not connected." });
  try {
    const { id } = req.params;
    const result = await client.query(
      "DELETE FROM students WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length > 0) {
      res.status(204).send(); // No content
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (err) {
    console.error("Error deleting student:", err.message);
    res
      .status(500)
      .json({ message: "Error deleting student", error: err.message });
  }
});

// Catch-all for SPA routing: serve index.html for any other route
// This should come AFTER express.static and all API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
