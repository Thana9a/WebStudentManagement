const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

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
    database: "demo",
    mode: "demo",
    message: "Running in demo mode - no database required",
  });
});

// Get all students with search
app.get("/api/students", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();

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

    res.json(results);
  } catch (err) {
    console.error("GET /api/students error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get single student
app.get("/api/students/:id", async (req, res) => {
  try {
    const student = demoStudents.find((s) => s.id === parseInt(req.params.id));
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
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
    res.json(demoStudents[studentIndex]);
  } catch (err) {
    console.error("UPDATE error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Delete student
app.delete("/api/students/:id", async (req, res) => {
  try {
    const studentIndex = demoStudents.findIndex(
      (s) => s.id === parseInt(req.params.id)
    );
    if (studentIndex === -1)
      return res.status(404).json({ error: "Student not found" });

    demoStudents.splice(studentIndex, 1);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: Demo (no database required)`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
