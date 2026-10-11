// ==============================================================
// College Club Management System - Server
// ==============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "college_club_management_secret_key_2026";

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

// Request logger for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

// ===============================
// AUTH MIDDLEWARES
// ===============================
const verifyToken = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        return res.status(401).json({ success: false, message: "Authorization token required" });
    }

    const token = header.startsWith("Bearer ") ? header.slice(7) : header;
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: "Invalid or expired token" });
        }
        req.user = decoded;
        next();
    });
};

const optionalToken = (req, res, next) => {
    const header = req.headers.authorization;
    if (header) {
        const token = header.startsWith("Bearer ") ? header.slice(7) : header;
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
            if (!err) {
                req.user = decoded;
            }
            next();
        });
    } else {
        req.user = null;
        next();
    }
};

const requireAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== "club_admin" && req.user.role !== "super_admin")) {
        return res.status(403).json({ success: false, message: "Admin access required" });
    }
    next();
};

// ===============================
// HEALTH CHECK
// ===============================
app.get("/api/health", async (req, res) => {
    try {
        await db.query("SELECT 1");
        res.json({ success: true, status: "healthy", database: "connected" });
    } catch (err) {
        res.status(500).json({ success: false, status: "error", error: err.message });
    }
});

// ===============================
// AUTHENTICATION ROUTES
// ===============================

// 1. REGISTER
app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRole = role === "club_admin" || role === "super_admin" ? role : "student";

        // Check if user already exists
        const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "An account with this email already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name.trim(), normalizedEmail, hashedPassword, userRole]
        );

        const newUserId = result.insertId;

        // Generate token
        const token = jwt.sign(
            { id: newUserId, email: normalizedEmail, name: name.trim(), role: userRole },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            success: true,
            message: "Registration successful ✅",
            token,
            role: userRole,
            name: name.trim(),
            user: { id: newUserId, name: name.trim(), email: normalizedEmail, role: userRole }
        });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ success: false, message: "Internal server error during registration" });
    }
});

// 2. ADMIN REGISTER ALIAS (FOR ADMIN REGISTER FORM)
app.post("/api/admin/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const userRole = role === "super_admin" ? "super_admin" : "club_admin";

        const [existing] = await db.query("SELECT id FROM users WHERE email = ?", [normalizedEmail]);
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Email is already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
            [name.trim(), normalizedEmail, hashedPassword, userRole]
        );

        const token = jwt.sign(
            { id: result.insertId, email: normalizedEmail, name: name.trim(), role: userRole },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({
            success: true,
            message: "Admin registered successfully ✅",
            token,
            role: userRole,
            name: name.trim(),
            user: { id: result.insertId, name: name.trim(), email: normalizedEmail, role: userRole }
        });
    } catch (err) {
        console.error("Admin Register Error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// 3. LOGIN
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [normalizedEmail]);

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const user = rows[0];

        // Support both hashed passwords and legacy plain text passwords
        let isMatch = false;
        if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            success: true,
            message: "Login successful ✅",
            token,
            role: user.role,
            name: user.name,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ success: false, message: "Internal server error during login" });
    }
});

// 4. GET CURRENT USER PROFILE
app.get("/api/auth/me", verifyToken, async (req, res) => {
    try {
        const [rows] = await db.query(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ success: true, user: rows[0] });
    } catch (err) {
        console.error("Get Profile Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// ===============================
// CLUBS & MEMBERSHIPS ROUTES
// ===============================

// 1. GET ALL ACTIVE CLUBS (WITH MEMBER COUNTS & OPTIONAL USER MEMBERSHIP STATUS)
app.get("/api/clubs", optionalToken, async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;

        let query = `
            SELECT 
                c.id, 
                c.name, 
                c.description, 
                c.category, 
                c.admin_id, 
                c.is_active, 
                c.created_at,
                u.name AS admin_name,
                COUNT(DISTINCT CASE WHEN m.status = 'approved' THEN m.id END) AS member_count
        `;

        if (userId) {
            query += `, (
                SELECT status FROM memberships 
                WHERE club_id = c.id AND user_id = ? 
                LIMIT 1
            ) AS my_status`;
        }

        query += `
            FROM clubs c
            LEFT JOIN users u ON c.admin_id = u.id
            LEFT JOIN memberships m ON c.id = m.club_id
            WHERE c.is_active = 1
            GROUP BY c.id
            ORDER BY c.name ASC
        `;

        const params = userId ? [userId] : [];
        const [clubs] = await db.query(query, params);

        res.json({ success: true, clubs });
    } catch (err) {
        console.error("Get Clubs Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch clubs" });
    }
});

// 2. GET SINGLE CLUB DETAILS
app.get("/api/clubs/:id", async (req, res) => {
    try {
        const clubId = req.params.id;
        const [rows] = await db.query(
            `SELECT c.*, u.name AS admin_name 
             FROM clubs c 
             LEFT JOIN users u ON c.admin_id = u.id 
             WHERE c.id = ?`,
            [clubId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Club not found" });
        }

        res.json({ success: true, club: rows[0] });
    } catch (err) {
        console.error("Get Club Details Error:", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. JOIN CLUB REQUEST
app.post("/api/clubs/:id/join", verifyToken, async (req, res) => {
    try {
        const clubId = req.params.id;
        const userId = req.user.id;

        // Check if club exists
        const [clubRows] = await db.query("SELECT id FROM clubs WHERE id = ? AND is_active = 1", [clubId]);
        if (clubRows.length === 0) {
            return res.status(404).json({ success: false, message: "Club not found or inactive" });
        }

        // Check existing membership
        const [existing] = await db.query(
            "SELECT id, status FROM memberships WHERE user_id = ? AND club_id = ?",
            [userId, clubId]
        );

        if (existing.length > 0) {
            const currentStatus = existing[0].status;
            if (currentStatus === "approved") {
                return res.status(400).json({ success: false, message: "You are already an approved member of this club" });
            }
            if (currentStatus === "pending") {
                return res.status(400).json({ success: false, message: "Your membership request is already pending approval" });
            }
            // If rejected previously, allow re-applying
            await db.query(
                "UPDATE memberships SET status = 'pending', joined_at = CURRENT_TIMESTAMP WHERE id = ?",
                [existing[0].id]
            );
            return res.json({ success: true, message: "Membership request re-submitted ✅" });
        }

        // Insert new request
        await db.query(
            "INSERT INTO memberships (user_id, club_id, status) VALUES (?, ?, 'pending')",
            [userId, clubId]
        );

        res.json({ success: true, message: "Club membership request sent ✅" });
    } catch (err) {
        console.error("Join Club Error:", err);
        res.status(500).json({ success: false, message: "Failed to submit membership request" });
    }
});

// 4. GET CURRENT USER'S MEMBERSHIPS
app.get("/api/user/memberships", verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const query = `
            SELECT 
                m.id AS membership_id,
                m.status,
                m.joined_at,
                c.id AS club_id,
                c.name AS club_name,
                c.description AS club_description,
                c.category AS club_category
            FROM memberships m
            JOIN clubs c ON m.club_id = c.id
            WHERE m.user_id = ?
            ORDER BY m.joined_at DESC
        `;
        const [memberships] = await db.query(query, [userId]);
        res.json({ success: true, memberships });
    } catch (err) {
        console.error("User Memberships Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch user memberships" });
    }
});

// ===============================
// ADMIN MANAGEMENT ROUTES
// ===============================

// 1. GET CLUBS MANAGED BY LOGGED IN ADMIN
app.get("/api/admin/clubs", verifyToken, requireAdmin, async (req, res) => {
    try {
        let query;
        let params = [];

        if (req.user.role === "super_admin") {
            query = `
                SELECT c.*, 
                    COUNT(DISTINCT CASE WHEN m.status = 'approved' THEN m.id END) AS member_count,
                    COUNT(DISTINCT CASE WHEN m.status = 'pending' THEN m.id END) AS pending_count
                FROM clubs c
                LEFT JOIN memberships m ON c.id = m.club_id
                GROUP BY c.id
                ORDER BY c.name ASC
            `;
        } else {
            // Club admin: get clubs they manage, or fallback to all clubs if they are newly assigned
            query = `
                SELECT c.*, 
                    COUNT(DISTINCT CASE WHEN m.status = 'approved' THEN m.id END) AS member_count,
                    COUNT(DISTINCT CASE WHEN m.status = 'pending' THEN m.id END) AS pending_count
                FROM clubs c
                LEFT JOIN memberships m ON c.id = m.club_id
                WHERE c.admin_id = ? OR c.admin_id IS NULL
                GROUP BY c.id
                ORDER BY c.name ASC
            `;
            params = [req.user.id];
        }

        let [clubs] = await db.query(query, params);

        // If no clubs directly tied, fallback to all clubs for smooth management
        if (clubs.length === 0) {
            const [allClubs] = await db.query(`
                SELECT c.*, 
                    COUNT(DISTINCT CASE WHEN m.status = 'approved' THEN m.id END) AS member_count,
                    COUNT(DISTINCT CASE WHEN m.status = 'pending' THEN m.id END) AS pending_count
                FROM clubs c
                LEFT JOIN memberships m ON c.id = m.club_id
                GROUP BY c.id
                ORDER BY c.name ASC
            `);
            clubs = allClubs;
        }

        res.json({ success: true, clubs });
    } catch (err) {
        console.error("Admin Clubs Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch admin clubs" });
    }
});

// 2. GET CLUB MEMBERSHIP REQUESTS (PENDING OR ALL)
app.get("/api/clubs/:clubId/requests", verifyToken, requireAdmin, async (req, res) => {
    try {
        const clubId = req.params.clubId;
        const statusFilter = req.query.status || "pending";

        let query = `
            SELECT 
                m.id, 
                m.status, 
                m.joined_at, 
                u.id AS user_id, 
                u.name, 
                u.email
            FROM memberships m
            JOIN users u ON m.user_id = u.id
            WHERE m.club_id = ?
        `;
        const params = [clubId];

        if (statusFilter !== "all") {
            query += " AND m.status = ?";
            params.push(statusFilter);
        }

        query += " ORDER BY m.joined_at DESC";

        const [results] = await db.query(query, params);
        res.json({ success: true, requests: results });
    } catch (err) {
        console.error("Get Club Requests Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch requests" });
    }
});

// 3. APPROVE MEMBERSHIP
app.put("/api/memberships/:id/approve", verifyToken, requireAdmin, async (req, res) => {
    try {
        const membershipId = req.params.id;
        const [result] = await db.query(
            "UPDATE memberships SET status = 'approved' WHERE id = ?",
            [membershipId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Membership request not found" });
        }

        res.json({ success: true, message: "Membership Approved ✅" });
    } catch (err) {
        console.error("Approve Error:", err);
        res.status(500).json({ success: false, message: "Failed to approve membership" });
    }
});

// 4. REJECT MEMBERSHIP
app.put("/api/memberships/:id/reject", verifyToken, requireAdmin, async (req, res) => {
    try {
        const membershipId = req.params.id;
        const [result] = await db.query(
            "UPDATE memberships SET status = 'rejected' WHERE id = ?",
            [membershipId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Membership request not found" });
        }

        res.json({ success: true, message: "Membership Rejected ❌" });
    } catch (err) {
        console.error("Reject Error:", err);
        res.status(500).json({ success: false, message: "Failed to reject membership" });
    }
});

// ===============================
// ANNOUNCEMENTS
// ===============================

// 1. GET ANNOUNCEMENTS (ALL OR BY CLUB)
app.get("/api/announcements", async (req, res) => {
    try {
        const { club_id } = req.query;

        let query = `
            SELECT 
                a.id, 
                a.club_id, 
                a.title, 
                a.body, 
                a.created_at,
                c.name AS club_name,
                c.category AS club_category,
                u.name AS author_name
            FROM announcements a
            JOIN clubs c ON a.club_id = c.id
            LEFT JOIN users u ON a.created_by = u.id
        `;
        const params = [];

        if (club_id) {
            query += " WHERE a.club_id = ?";
            params.push(club_id);
        }

        query += " ORDER BY a.created_at DESC";

        const [announcements] = await db.query(query, params);
        res.json({ success: true, announcements });
    } catch (err) {
        console.error("Get Announcements Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch announcements" });
    }
});

// 2. CREATE ANNOUNCEMENT (ADMIN)
app.post("/api/announcements", verifyToken, requireAdmin, async (req, res) => {
    try {
        const { club_id, title, body } = req.body;

        if (!club_id || !title || !body) {
            return res.status(400).json({
                success: false,
                message: "Club ID, title, and announcement body are required"
            });
        }

        const [result] = await db.query(
            "INSERT INTO announcements (club_id, created_by, title, body) VALUES (?, ?, ?, ?)",
            [club_id, req.user.id, title.trim(), body.trim()]
        );

        res.status(201).json({
            success: true,
            message: "Announcement posted successfully 📢",
            announcementId: result.insertId
        });
    } catch (err) {
        console.error("Create Announcement Error:", err);
        res.status(500).json({ success: false, message: "Failed to post announcement" });
    }
});

// ===============================
// EVENTS
// ===============================

// 1. GET EVENTS (ALL OR BY CLUB)
app.get("/api/events", async (req, res) => {
    try {
        const { club_id } = req.query;

        let query = `
            SELECT 
                e.id, 
                e.club_id, 
                e.title, 
                e.venue, 
                e.event_date, 
                e.registration_open, 
                e.created_at,
                c.name AS club_name,
                c.category AS club_category,
                u.name AS creator_name
            FROM eventss e
            JOIN clubs c ON e.club_id = c.id
            LEFT JOIN users u ON e.created_by = u.id
        `;
        const params = [];

        if (club_id) {
            query += " WHERE e.club_id = ?";
            params.push(club_id);
        }

        query += " ORDER BY e.event_date ASC, e.created_at DESC";

        const [events] = await db.query(query, params);
        res.json({ success: true, events });
    } catch (err) {
        console.error("Get Events Error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch events" });
    }
});

// 2. CREATE EVENT (ADMIN)
app.post("/api/events", verifyToken, requireAdmin, async (req, res) => {
    try {
        const { club_id, title, venue, event_date, registration_open } = req.body;

        if (!club_id || !title || !venue || !event_date) {
            return res.status(400).json({
                success: false,
                message: "Club ID, title, venue, and event date are required"
            });
        }

        const isOpen = registration_open ? 1 : 0;

        const [result] = await db.query(
            "INSERT INTO eventss (club_id, created_by, title, venue, event_date, registration_open) VALUES (?, ?, ?, ?, ?, ?)",
            [club_id, req.user.id, title.trim(), venue.trim(), event_date, isOpen]
        );

        res.status(201).json({
            success: true,
            message: "Event scheduled successfully 🎯",
            eventId: result.insertId
        });
    } catch (err) {
        console.error("Create Event Error:", err);
        res.status(500).json({ success: false, message: "Failed to schedule event" });
    }
});

// ===============================
// FALLBACK ROUTE & SERVER START
// ===============================
app.get("/", (req, res) => {
    res.sendFile("login.html", { root: "public" });
});

// Global 404 handler for unmatched API routes
app.use("/api", (req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ success: false, message: "An unexpected server error occurred" });
});

app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 College Club Management Server is running!`);
    console.log(`🔗 Local URL: http://localhost:${PORT}`);
    console.log(`📁 Static files served from /public`);
    console.log(`====================================================`);
});