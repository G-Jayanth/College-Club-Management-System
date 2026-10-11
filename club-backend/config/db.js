const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "jayanth_csd_6731",
  database: process.env.DB_NAME || "college_clubs",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test initial connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to MySQL database pool ✅");
    connection.release();
  } catch (err) {
    console.error("Database pool connection error:", err.message);
  }
})();

module.exports = pool;