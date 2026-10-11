async function register() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;
    const message = document.getElementById("message");

    if (!name || !email || !password) {
        message.style.color = "#ef4444";
        message.innerText = "Please fill in all fields";
        return;
    }

    try {
        const res = await fetch("/api/admin/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password, role })
        });

        const data = await res.json();

        if (data.success) {
            // Save token and user details so admin is properly authenticated!
            localStorage.setItem("token", data.token);
            localStorage.setItem("role", data.role);
            localStorage.setItem("name", data.name);
            localStorage.setItem("user", JSON.stringify(data.user));

            message.style.color = "#10b981";
            message.innerText = "Registered successfully ✅ Redirecting to Admin Panel...";

            setTimeout(() => {
                window.location.href = "admin.html";
            }, 800);
        } else {
            message.style.color = "#ef4444";
            message.innerText = data.message || "Registration failed";
        }
    } catch (err) {
        console.error("Register Error:", err);
        message.style.color = "#ef4444";
        message.innerText = "Server connection error";
    }
}