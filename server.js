const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Demo data
const demoStudents = [
  { id: 1, name: "John Doe", age: 20, gender: "M", midterm: 85.5, final: 88.0 },
];

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mode: "demo",
    message: "Running in demo mode - no database required",
  });
});

// Get students
app.get("/api/students", (req, res) => {
  try {
    res.json(demoStudents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create student
app.post("/api/students", (req, res) => {
  try {
    const { name, age, gender, midterm, final } = req.body;

    if (!name || age == null || !gender || midterm == null || final == null) {
      return res.status(400).json({ error: "All fields required" });
    }

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
    res.status(201).json(newStudent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update student
app.put("/api/students/:id", (req, res) => {
  try {
    const { name, age, gender, midterm, final } = req.body;
    const id = parseInt(req.params.id);

    const studentIndex = demoStudents.findIndex((s) => s.id === id);
    if (studentIndex === -1) {
      return res.status(404).json({ error: "Student not found" });
    }

    demoStudents[studentIndex] = {
      ...demoStudents[studentIndex],
      name,
      age,
      gender,
      midterm,
      final,
    };
    res.json(demoStudents[studentIndex]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete("/api/students/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const studentIndex = demoStudents.findIndex((s) => s.id === id);

    if (studentIndex === -1) {
      return res.status(404).json({ error: "Student not found" });
    }

    demoStudents.splice(studentIndex, 1);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: Demo (no database required)`);
});
