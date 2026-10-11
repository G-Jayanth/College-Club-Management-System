// ==============================================================
// College Club Management System - Core Client JS
// ==============================================================

const API_BASE = "/api";

let currentMode = "login"; // "login" or "register"

// Switch between Login and Registration tabs
function switchAuthMode(mode) {
    currentMode = mode;
    const tabLogin = document.getElementById("tabLogin");
    const tabRegister = document.getElementById("tabRegister");
    const nameGroup = document.getElementById("nameGroup");
    const roleGroup = document.getElementById("roleGroup");
    const submitBtn = document.getElementById("submitBtn");
    const nameInput = document.getElementById("name");

    hideAlert();

    if (mode === "register") {
        tabLogin.classList.remove("active");
        tabRegister.classList.add("active");
        nameGroup.style.display = "block";
        roleGroup.style.display = "block";
        nameInput.required = true;
        submitBtn.innerText = "Create Account";
    } else {
        tabRegister.classList.remove("active");
        tabLogin.classList.add("active");
        nameGroup.style.display = "none";
        roleGroup.style.display = "none";
        nameInput.required = false;
        submitBtn.innerText = "Sign In";
    }
}

// Quick 1-click fill for testing and presentations
function quickFill(email, password) {
    switchAuthMode("login");
    document.getElementById("email").value = email;
    document.getElementById("password").value = password;
    hideAlert();
}

// Display alert messages
function showAlert(message, type = "danger") {
    const box = document.getElementById("alertBox");
    const text = document.getElementById("alertText");
    const icon = document.getElementById("alertIcon");

    if (!box) return;

    box.className = `alert alert-${type} fade-in`;
    box.style.display = "flex";
    text.innerText = message;
    icon.innerText = type === "success" ? "✅" : "⚠️";
}

function hideAlert() {
    const box = document.getElementById("alertBox");
    if (box) {
        box.style.display = "none";
    }
}

// Form Submission Handler
async function handleAuthSubmit(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = document.getElementById("submitBtn");

    if (!email || !password) {
        showAlert("Please enter both email and password");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    try {
        if (currentMode === "login") {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (data.success) {
                // Store user session
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.role);
                localStorage.setItem("name", data.name);
                localStorage.setItem("user", JSON.stringify(data.user));

                showAlert("Login successful! Redirecting...", "success");

                setTimeout(() => {
                    const role = (data.role || "").toLowerCase();
                    if (role.includes("admin")) {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "dashboard.html";
                    }
                }, 600);
            } else {
                showAlert(data.message || "Invalid credentials");
                submitBtn.disabled = false;
                submitBtn.innerText = "Sign In";
            }
        } else {
            // Register mode
            const name = document.getElementById("name").value.trim();
            const role = document.getElementById("role").value;

            if (!name) {
                showAlert("Please enter your full name");
                submitBtn.disabled = false;
                submitBtn.innerText = "Create Account";
                return;
            }

            const res = await fetch(`${API_BASE}/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password, role })
            });

            const data = await res.json();

            if (data.success) {
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.role);
                localStorage.setItem("name", data.name);
                localStorage.setItem("user", JSON.stringify(data.user));

                showAlert("Registration successful! Redirecting...", "success");

                setTimeout(() => {
                    const role = (data.role || "").toLowerCase();
                    if (role.includes("admin")) {
                        window.location.href = "admin.html";
                    } else {
                        window.location.href = "dashboard.html";
                    }
                }, 600);
            } else {
                showAlert(data.message || "Registration failed");
                submitBtn.disabled = false;
                submitBtn.innerText = "Create Account";
            }
        }
    } catch (err) {
        console.error("Auth error:", err);
        showAlert("Server connection error. Make sure the server is running.");
        submitBtn.disabled = false;
        submitBtn.innerText = currentMode === "login" ? "Sign In" : "Create Account";
    }
}

// Global Logout
function logout() {
    localStorage.clear();
    window.location.href = "login.html";
}

// Shared check for authenticated views
function requireAuth(allowedRoles = []) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token) {
        window.location.href = "login.html";
        return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        // Redirect to appropriate portal based on their role
        if (role && role.includes("admin")) {
            window.location.href = "admin.html";
        } else {
            window.location.href = "dashboard.html";
        }
        return null;
    }

    return {
        token,
        role,
        name: localStorage.getItem("name") || "User"
    };
}