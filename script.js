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
    root.setAttribute("data-bs-theme", "dark"); // Changed from "light" to "dark"
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

    // Debug: Check if theme was actually applied
    console.log("Theme toggled to:", next);
    console.log("Current data-bs-theme:", root.getAttribute("data-bs-theme"));
  });

  // Test function to manually check dark mode
  window.testDarkMode = () => {
    console.log("=== Dark Mode Test ===");
    console.log("Current theme:", root.getAttribute("data-bs-theme"));
    console.log("CSS variables:");
    console.log("- --bg:", getComputedStyle(root).getPropertyValue("--bg"));
    console.log("- --card:", getComputedStyle(root).getPropertyValue("--card"));
    console.log(
      "- --muted:",
      getComputedStyle(root).getPropertyValue("--muted")
    );

    // Check if dark mode CSS is actually applied
    const headerTitle = document.querySelector(".header-title");
    const formTitle = document.querySelector(".form-title");
    if (headerTitle) {
      console.log("Header title color:", getComputedStyle(headerTitle).color);
    }
    if (formTitle) {
      console.log("Form title color:", getComputedStyle(formTitle).color);
    }

    // Force apply dark mode
    if (root.getAttribute("data-bs-theme") !== "dark") {
      root.setAttribute("data-bs-theme", "dark");
      console.log("Forced dark mode on");
    }
  };

  // Check if toggle button exists
  if (!toggleBtn) {
    console.warn("[StudentApp] Dark mode toggle button not found");
  }

  /* ---------------- Element References ---------------- */
  const form = document.querySelector(".student-form");
  const idInput = document.getElementById("student-id");
  const nameInput = document.getElementById("student-name");
  const ageInput = document.getElementById("student-age");
  const genderInput = document.getElementById("student-gender");
  const midInput = document.getElementById("student-midterm");
  const finalInput = document.getElementById("student-final");
  const cancelBtn = document.getElementById("cancel-edit"); // may be null (OK)

  // Warn if critical elements missing
  if (!form) console.warn("[StudentApp] Form not found");

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

  /* ---------------- API Wrappers ---------------- */
  async function api(method, url, body) {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    let res;
    try {
      res = await fetch(url, opts);
    } catch (netErr) {
      throw new Error("Network error (server down?)");
    }
    let data = null;
    const txt = await res.text();
    try {
      data = txt ? JSON.parse(txt) : null;
    } catch {
      /* leave data null */
    }
    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // Supabase helpers (optional)
  const supaUrl = window.SUPABASE_URL || "";
  const supaKey = window.SUPABASE_ANON_KEY || "";
  const supabaseClient =
    window.supabase && supaUrl && supaKey
      ? window.supabase.createClient(supaUrl, supaKey)
      : null;

  // Debug Supabase connection
  console.log("Supabase URL:", supaUrl);
  console.log("Supabase Key:", supaKey ? "Set" : "Missing");
  console.log("Supabase Client:", supabaseClient ? "Created" : "Failed");
  console.log("Window.supabase:", window.supabase ? "Available" : "Missing");

  const createStudent = async (payload) => {
    if (supabaseClient) {
      try {
        console.log("Attempting to insert student:", payload);
        const { data, error } = await supabaseClient
          .from("students")
          .insert(payload)
          .select("*")
          .single();
        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }
        console.log("Student created successfully:", data);
        return data;
      } catch (err) {
        console.error("Create student failed:", err);
        throw err;
      }
    }
    return api("POST", "/api/students", payload);
  };

  const updateStudent = async (id, payload) => {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from("students")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    }
    return api("PUT", `/api/students/${id}`, payload);
  };

  const deleteStudent = async (id) => {
    if (supabaseClient) {
      const { error } = await supabaseClient
        .from("students")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return { success: true };
    }
    return api("DELETE", `/api/students/${id}`);
  };

  /* ---------------- Form Helpers ---------------- */
  function startEdit(id) {
    if (!id) return;
    // For now, just clear form since no table to edit from
    clearForm();
  }

  function clearForm() {
    if (idInput) idInput.value = "";
    form?.reset();
    // Avoid error if cancelBtn missing
    if (cancelBtn) cancelBtn.style.display = "none";
  }

  async function confirmDelete(id) {
    if (!id) return;
    if (!confirm("Delete this student?")) return;
    try {
      await deleteStudent(id);
      // If deleting currently edited record, clear form
      if (idInput && idInput.value === id) clearForm();
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
      } else {
        await createStudent(payload);
      }
      clearForm();
      alert("Student saved successfully!");
    } catch (err) {
      showErrorAlert("Save failed", err);
    }
  });

  form?.addEventListener("reset", () => {
    // Allow browser to clear fields first
    setTimeout(clearForm, 0);
  });

  cancelBtn?.addEventListener("click", clearForm);

  /* ---------------- Initialize Footer Year ---------------- */
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});
