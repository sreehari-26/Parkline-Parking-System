require("dotenv").config();

const mysql = require("mysql2");

// A pool (instead of a single connection) lets many requests run at once
// and is required for safe booking transactions.
const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "parkline_db",
    waitForConnections: true,
    connectionLimit: 10,
    // Return DATETIME columns as "YYYY-MM-DD HH:MM:SS" strings
    // so no timezone conversion happens on the way to the browser.
    dateStrings: true
});

// Fail loudly at startup if the database is unreachable.
pool.promise().query("SELECT 1")
    .then(() => console.log("Connected to Parkline MySQL database!"))
    .catch(err => console.error("MySQL connection failed:", err.message));

module.exports = pool.promise();
