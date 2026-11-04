require("dotenv").config();

const mysql = require("mysql2");

// A pool (instead of a single connection) lets many requests run at once
// and is required for safe booking transactions.
// All times in the app are plain local times (no timezone conversion), so the
// database session must use the same clock as your users. Set DB_TIME_ZONE in
// .env as an offset like +05:30 (India). Without it, MySQL's own zone is used.
const TIME_ZONE = process.env.DB_TIME_ZONE || "+05:30";

if (!/^[+-]\d{2}:\d{2}$/.test(TIME_ZONE)) {
    throw new Error("DB_TIME_ZONE must look like +05:30");
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || "localhost",
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || "parkline_db",
    waitForConnections: true,
    connectionLimit: 10,
    // Return DATETIME columns as "YYYY-MM-DD HH:MM:SS" strings
    // so no timezone conversion happens on the way to the browser.
    dateStrings: true
});

pool.on("connection", connection => {
    connection.query(`SET time_zone = '${TIME_ZONE}'`);
});

// Fail loudly at startup if the database is unreachable.
pool.promise().query("SELECT 1")
    .then(() => console.log("Connected to Parkline MySQL database!"))
    .catch(err => console.error("MySQL connection failed:", err.message));

module.exports = pool.promise();
