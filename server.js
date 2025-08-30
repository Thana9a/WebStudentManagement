const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const cors = require("cors");

const app = express();

// Supabase configuration with anon key
const supabaseUrl = "https://qshxvmdokakmbukpovpv.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFzaHh2bWRva2FrbWJ1a3BvdnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NzcyNTIsImV4cCI6MjA3MjA1MzI1Mn0.OthNk61qiGtxlzZk8er0qGCbPgwFaEn9UhWh66LVYWY";

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    database: "connected",
    message: "Connected to Supabase with anon key",
    supabaseUrl: supabaseUrl,
  });
});

// Get all students
app.get("/api/students", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data || []);
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

    const { data, error } = await supabase
      .from("students")
      .insert([{ name, age, gender, midterm, final }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
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

    const { data, error } = await supabase
      .from("students")
      .update({ name, age, gender, midterm, final })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (data) {
      res.json(data);
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

    const { error } = await supabase.from("students").delete().eq("id", id);

    if (error) throw error;
    res.json({ success: true });
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Connected to Supabase: ${supabaseUrl}`);
});
