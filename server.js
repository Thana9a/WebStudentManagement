document.addEventListener("DOMContentLoaded", () => {
  /* ---------------- Theme Toggle ---------------- */
  const root = document.documentElement;
  const THEME_KEY = "bs-theme";
  const toggleBtn = document.querySelector(".dark-and-light");
  const savedTheme = localStorage.getItem(THEME_KEY);

  // Set initial theme
  if (savedTheme) {
    root.setAttribute("data-bs-theme", savedTheme);
  } else if (!root.getAttribute("data-bs-theme")) {
    root.setAttribute("data-bs-theme", "dark");
  }

  const moon = toggleBtn?.querySelector(".moon");
  const sun = toggleBtn?.querySelector(".sun");

  function updateThemeIcons() {
    const dark = root.getAttribute("data-bs-theme") === "dark";
    if (moon) moon.style.display = dark ? "none" : "inline";
    if (sun) sun.style.display = dark ? "inline" : "none";
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", dark ? "true" : "false");
      toggleBtn.title = dark ? "Switch to light mode" : "Switch to dark mode";
    }
  }
  updateThemeIcons();

  toggleBtn?.addEventListener("click", () => {
    const next =
      root.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-bs-theme", next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeIcons();
  });

  /* ---------------- Element References ---------------- */
  const form = document.querySelector(".student-form");
  const idInput = document.getElementById("student-id");
  const nameInput = document.getElementById("student-name");
  const ageInput = document.getElementById("student-age");
  const genderInput = document.getElementById("student-gender");
  const midInput = document.getElementById("student-midterm");
  const finalInput = document.getElementById("student-final");

  /* ---------------- Helper Functions ---------------- */
  function escapeHtml(str = "") {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function calcGrade(mid, fin) {
    if (mid == null || fin == null || mid === "" || fin === "") return "N/A";
    const avg = (Number(mid) + Number(fin)) / 2;
    if (isNaN(avg)) return "N/A";
    if (avg >= 90) return "A";
    if (avg >= 80) return "B";
    if (avg >= 70) return "C";
    if (avg >= 60) return "D";
    return "F";
  }

  function showErrorAlert(prefix, err) {
    console.error(prefix, err);
    alert(err?.message || prefix);
  }

  function showSuccessAlert(message) {
    alert(message);
  }

  /* ---------------- API Wrappers ---------------- */
  async function api(method, url, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);

    try {
      const res = await fetch(url, opts);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      return data;
    } catch (err) {
      throw new Error(err.message || "Network error");
    }
  }

  const createStudent = async (payload) => {
    return api("POST", "/api/students", payload);
  };

  const updateStudent = async (id, payload) => {
    return api("PUT", `/api/students/${id}`, payload);
  };

  const deleteStudent = async (id) => {
    return api("DELETE", `/api/students/${id}`);
  };

  /* ---------------- Form Helpers ---------------- */
  function startEdit(id) {
    if (!id) return;
    clearForm();
  }

  function clearForm() {
    if (idInput) idInput.value = "";
    form?.reset();
  }

  async function confirmDelete(id) {
    if (!id) return;
    if (!confirm("Delete this student?")) return;

    try {
      await deleteStudent(id);
      if (idInput && idInput.value === id) clearForm();
      showSuccessAlert("Student deleted successfully!");
    } catch (err) {
      showErrorAlert("Delete failed", err);
    }
  }

  /* ---------------- Form Submit ---------------- */
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: nameInput?.value.trim() || "",
      age: ageInput?.value ? Number(ageInput.value) : null,
      gender: genderInput?.value || "",
      midterm: midInput?.value ? Number(midInput.value) : null,
      final: finalInput?.value ? Number(finalInput.value) : null,
    };

    // Validation
    if (!payload.name) {
      alert("Name is required");
      return;
    }
    if (payload.age == null) {
      alert("Age is required");
      return;
    }
    if (!payload.gender) {
      alert("Gender is required");
      return;
    }
    if (payload.midterm == null) {
      alert("Midterm is required");
      return;
    }
    if (payload.final == null) {
      alert("Final is required");
      return;
    }

    try {
      if (idInput && idInput.value) {
        await updateStudent(idInput.value, payload);
        showSuccessAlert("Student updated successfully!");
      } else {
        await createStudent(payload);
        showSuccessAlert("Student created successfully!");
      }
      clearForm();
    } catch (err) {
      showErrorAlert("Save failed", err);
    }
  });

  form?.addEventListener("reset", () => {
    setTimeout(clearForm, 0);
  });

  /* ---------------- Initialize Footer Year ---------------- */
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  /* ---------------- Check API Status ---------------- */
  async function checkAPIStatus() {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      console.log("API Status:", data);

      if (data.mode === "demo") {
        console.log("Running in demo mode - no database connection");
      }
    } catch (err) {
      console.error("API check failed:", err);
    }
  }

  // Check API status on page load
  checkAPIStatus();
});
