require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

// ----------------------------------
// CONFIG
// ----------------------------------

const PORT = process.env.PORT || 3000;
const RATE_PER_HOUR = 50; // INR per hour
const MAX_BOOKING_HOURS = 24;
const PAST_GRACE_MINUTES = 5;

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET is not set in .env. Using an insecure development secret.");
}

const VEHICLE_TYPES = ["EV", "SCOOTER", "FOUR_WHEELER", "HEAVY"];
const DATETIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/;
const PLATE_REGEX = /^[A-Z]{2} \d{1,2} [A-Z]{1,3} \d{1,4}$/;

// ----------------------------------
// HELPERS
// ----------------------------------

// Wrap async route handlers so errors go to the error handler below.
const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function normalizeDateTime(value) {
    if (typeof value !== "string" || !DATETIME_REGEX.test(value.trim())) return null;

    const v = value.trim();

    return v.length === 16 ? v + ":00" : v;
}

function toDate(dateTimeString) {
    return new Date(dateTimeString.replace(" ", "T"));
}

function signToken(user) {
    return jwt.sign(
        { user_id: user.user_id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

function publicUser(user) {
    return {
        user_id: user.user_id,
        username: user.username,
        email: user.email
    };
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Please log in to continue" });
    }

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Your session has expired. Please log in again" });
    }
}

// ----------------------------------
// TEST ROUTE
// ----------------------------------

app.get("/api/health", (req, res) => {
    res.send("Parkline backend is running!");
});

// ----------------------------------
// PRICING
// ----------------------------------

app.get("/api/pricing", (req, res) => {
    res.json({ rate_per_hour: RATE_PER_HOUR });
});

// ----------------------------------
// AUTH
// ----------------------------------

app.post("/api/auth/signup", wrap(async (req, res) => {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
        return res.status(400).json({ error: "Enter a valid email address." });
    }

    if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: "Username must be 3 to 50 characters." });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: "Use a password with at least 6 characters." });
    }

    const [existing] = await db.query(
        "SELECT user_id FROM users WHERE email = ? OR username = ? LIMIT 1",
        [email, username]
    );

    if (existing.length) {
        return res.status(409).json({ error: "That email or username is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let result;

    try {
        [result] = await db.query(
            "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
            [username, email, passwordHash]
        );
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "That email or username is already registered." });
        }
        throw err;
    }

    const user = { user_id: result.insertId, username, email };

    res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

app.post("/api/auth/login", wrap(async (req, res) => {
    const identity = String(req.body.identity || "").trim();
    const password = String(req.body.password || "");

    if (!identity || !password) {
        return res.status(400).json({ error: "Enter your email/username and password." });
    }

    const [rows] = await db.query(
        "SELECT user_id, username, email, password_hash FROM users WHERE email = ? OR username = ? LIMIT 1",
        [identity.toLowerCase(), identity]
    );

    const user = rows[0];

    let valid = false;

    if (user) {
        try {
            valid = await bcrypt.compare(password, user.password_hash);
        } catch {
            valid = false;
        }
    }

    if (!valid) {
        return res.status(401).json({ error: "Account not found or password is incorrect." });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
}));

app.get("/api/auth/me", requireAuth, wrap(async (req, res) => {
    const [rows] = await db.query(
        "SELECT user_id, username, email FROM users WHERE user_id = ?",
        [req.user.user_id]
    );

    if (!rows.length) {
        return res.status(401).json({ error: "Account no longer exists. Please log in again" });
    }

    res.json({ user: publicUser(rows[0]) });
}));

// ----------------------------------
// GET ALL ACTIVE PARKING LOCATIONS
// ----------------------------------

app.get("/api/parking-lots", wrap(async (req, res) => {
    const [results] = await db.query(
        "SELECT * FROM parking_lots WHERE is_active = TRUE ORDER BY lot_name ASC"
    );

    res.json(results);
}));

// ----------------------------------
// GET PARKING SLOTS
// ----------------------------------

app.get("/api/parking-slots", wrap(async (req, res) => {
    const { lot_id, floor_number, vehicle_type } = req.query;
    const start_time = req.query.start_time ? normalizeDateTime(req.query.start_time) : null;
    const end_time = req.query.end_time ? normalizeDateTime(req.query.end_time) : null;

    if (!lot_id || floor_number === undefined) {
        return res.status(400).json({ error: "lot_id and floor_number are required" });
    }

    if (!Number.isInteger(Number(lot_id)) || !Number.isInteger(Number(floor_number))) {
        return res.status(400).json({ error: "Invalid lot_id or floor_number" });
    }

    if ((req.query.start_time && !start_time) || (req.query.end_time && !end_time)) {
        return res.status(400).json({ error: "Invalid start_time or end_time" });
    }

    if ((start_time && !end_time) || (!start_time && end_time)) {
        return res.status(400).json({ error: "Both start_time and end_time are required" });
    }

    if (start_time && end_time && start_time >= end_time) {
        return res.status(400).json({ error: "End time must be after start time" });
    }

    if (vehicle_type && !VEHICLE_TYPES.includes(vehicle_type)) {
        return res.status(400).json({ error: "Invalid vehicle_type" });
    }

    let reservationCondition;
    const params = [];

    if (start_time && end_time) {
        reservationCondition = "b.start_time < ? AND b.end_time > ?";
        params.push(end_time, start_time);
    } else {
        reservationCondition = "b.start_time <= NOW() AND b.end_time > NOW()";
    }

    params.push(Number(lot_id), Number(floor_number));

    let typeCondition = "";

    if (vehicle_type) {
        typeCondition = "AND s.vehicle_type = ?";
        params.push(vehicle_type);
    }

    const sql = `
        SELECT
            s.slot_id,
            s.lot_id,
            l.lot_name,
            s.floor_number,
            s.slot_number,
            s.vehicle_type,
            s.is_active,

            EXISTS (
                SELECT 1
                FROM bookings b
                WHERE b.slot_id = s.slot_id
                AND b.lot_id = s.lot_id
                AND b.status IN ('PENDING', 'CONFIRMED')
                AND ${reservationCondition}
            ) AS is_reserved

        FROM parking_slots s

        JOIN parking_lots l
            ON s.lot_id = l.lot_id

        WHERE
            s.lot_id = ?
            AND s.floor_number = ?
            AND s.is_active = TRUE
            AND l.is_active = TRUE
            ${typeCondition}

        ORDER BY s.slot_number ASC
    `;

    const [results] = await db.query(sql, params);

    res.json(results);
}));

// ----------------------------------
// VEHICLES (logged-in user only)
// ----------------------------------

app.get("/api/vehicles", requireAuth, wrap(async (req, res) => {
    const [rows] = await db.query(
        `SELECT vehicle_id, vehicle_number, rto, vehicle_type, make, model
         FROM vehicles
         WHERE user_id = ?
         ORDER BY vehicle_id ASC`,
        [req.user.user_id]
    );

    res.json(rows);
}));

app.post("/api/vehicles", requireAuth, wrap(async (req, res) => {
    const vehicle_number = String(req.body.vehicle_number || "").trim().toUpperCase().replace(/\s+/g, " ");
    const rto = String(req.body.rto || "").trim();
    const vehicle_type = String(req.body.vehicle_type || "");
    const make = String(req.body.make || "").trim();
    const model = String(req.body.model || "").trim();

    if (!PLATE_REGEX.test(vehicle_number) || vehicle_number.length > 20) {
        return res.status(400).json({ error: "Enter a valid vehicle number, e.g. KL 60 K 8991." });
    }

    if (!rto || rto.length > 20) {
        return res.status(400).json({ error: "Enter the RTO registration (max 20 characters)." });
    }

    if (!VEHICLE_TYPES.includes(vehicle_type)) {
        return res.status(400).json({ error: "Choose a valid vehicle type." });
    }

    if (!make || !model || make.length > 50 || model.length > 50) {
        return res.status(400).json({ error: "Choose the vehicle make and model." });
    }

    try {
        const [result] = await db.query(
            `INSERT INTO vehicles (user_id, vehicle_number, rto, vehicle_type, make, model)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.user_id, vehicle_number, rto, vehicle_type, make, model]
        );

        res.status(201).json({
            vehicle_id: result.insertId,
            vehicle_number,
            rto,
            vehicle_type,
            make,
            model
        });
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "This vehicle number is already registered." });
        }
        throw err;
    }
}));

app.delete("/api/vehicles/:id", requireAuth, wrap(async (req, res) => {
    const vehicleId = Number(req.params.id);

    if (!Number.isInteger(vehicleId)) {
        return res.status(400).json({ error: "Invalid vehicle id" });
    }

    try {
        const [result] = await db.query(
            "DELETE FROM vehicles WHERE vehicle_id = ? AND user_id = ?",
            [vehicleId, req.user.user_id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({ error: "Vehicle not found" });
        }

        res.json({ success: true });
    } catch (err) {
        // bookings reference vehicles without ON DELETE CASCADE
        if (err.code === "ER_ROW_IS_REFERENCED_2" || err.code === "ER_ROW_IS_REFERENCED") {
            return res.status(409).json({
                error: "This vehicle has booking history and cannot be removed."
            });
        }
        throw err;
    }
}));

// ----------------------------------
// BOOKINGS (logged-in user only)
// ----------------------------------

app.get("/api/bookings", requireAuth, wrap(async (req, res) => {
    const [rows] = await db.query(
        `SELECT
            b.booking_id,
            l.lot_name,
            s.floor_number,
            s.slot_number,
            v.vehicle_number,
            b.start_time,
            b.end_time,
            b.amount,
            CASE
                WHEN b.status IN ('PENDING', 'CONFIRMED') AND b.end_time <= NOW()
                    THEN 'COMPLETED'
                ELSE b.status
            END AS status,
            b.created_at
         FROM bookings b
         JOIN parking_lots l ON l.lot_id = b.lot_id
         JOIN parking_slots s ON s.slot_id = b.slot_id
         JOIN vehicles v ON v.vehicle_id = b.vehicle_id
         WHERE b.user_id = ?
         ORDER BY b.start_time DESC, b.booking_id DESC`,
        [req.user.user_id]
    );

    res.json(rows);
}));

app.post("/api/bookings", requireAuth, wrap(async (req, res) => {
    const vehicleId = Number(req.body.vehicle_id);
    const slotId = Number(req.body.slot_id);
    const startTime = normalizeDateTime(req.body.start_time);
    const endTime = normalizeDateTime(req.body.end_time);

    if (!Number.isInteger(vehicleId) || !Number.isInteger(slotId)) {
        return res.status(400).json({ error: "vehicle_id and slot_id are required" });
    }

    if (!startTime || !endTime) {
        return res.status(400).json({ error: "Valid start_time and end_time are required" });
    }

    if (startTime >= endTime) {
        return res.status(400).json({ error: "End time must be after start time" });
    }

    const minutes = (toDate(endTime) - toDate(startTime)) / 60000;

    if (minutes > MAX_BOOKING_HOURS * 60) {
        return res.status(400).json({ error: `Bookings cannot exceed ${MAX_BOOKING_HOURS} hours.` });
    }

    const amount = Math.round((minutes / 60) * RATE_PER_HOUR * 100) / 100;

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // Lock the slot row so two people cannot book it at the same moment.
        const [slotRows] = await conn.query(
            `SELECT s.slot_id, s.lot_id, s.vehicle_type, s.is_active, l.is_active AS lot_active
             FROM parking_slots s
             JOIN parking_lots l ON l.lot_id = s.lot_id
             WHERE s.slot_id = ?
             FOR UPDATE OF s`,
            [slotId]
        );

        const slot = slotRows[0];

        if (!slot || !slot.is_active || !slot.lot_active) {
            await conn.rollback();
            return res.status(404).json({ error: "This parking space is not available." });
        }

        const [vehicleRows] = await conn.query(
            "SELECT vehicle_id, vehicle_type FROM vehicles WHERE vehicle_id = ? AND user_id = ?",
            [vehicleId, req.user.user_id]
        );

        const vehicle = vehicleRows[0];

        if (!vehicle) {
            await conn.rollback();
            return res.status(404).json({ error: "Vehicle not found on your account." });
        }

        if (vehicle.vehicle_type !== slot.vehicle_type) {
            await conn.rollback();
            return res.status(400).json({ error: "This space is not suitable for your vehicle type." });
        }

        const [pastRows] = await conn.query(
            "SELECT (? < NOW() - INTERVAL ? MINUTE) AS in_past",
            [startTime, PAST_GRACE_MINUTES]
        );

        if (Number(pastRows[0].in_past) === 1) {
            await conn.rollback();
            return res.status(400).json({ error: "The start time has already passed." });
        }

        const [slotClash] = await conn.query(
            `SELECT 1 FROM bookings
             WHERE slot_id = ?
             AND status IN ('PENDING', 'CONFIRMED')
             AND start_time < ? AND end_time > ?
             LIMIT 1`,
            [slotId, endTime, startTime]
        );

        if (slotClash.length) {
            await conn.rollback();
            return res.status(409).json({ error: "Sorry, this space was just reserved for that time." });
        }

        const [vehicleClash] = await conn.query(
            `SELECT 1 FROM bookings
             WHERE vehicle_id = ?
             AND status IN ('PENDING', 'CONFIRMED')
             AND start_time < ? AND end_time > ?
             LIMIT 1`,
            [vehicleId, endTime, startTime]
        );

        if (vehicleClash.length) {
            await conn.rollback();
            return res.status(409).json({ error: "This vehicle already has a booking in that time range." });
        }

        const [bookingResult] = await conn.query(
            `INSERT INTO bookings
                (user_id, vehicle_id, lot_id, slot_id, start_time, end_time, amount, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
            [req.user.user_id, vehicleId, slot.lot_id, slotId, startTime, endTime, amount]
        );

        // Payment record is created as PENDING until a real payment flow is added.
        await conn.query(
            "INSERT INTO payments (booking_id, amount, payment_status) VALUES (?, ?, 'PENDING')",
            [bookingResult.insertId, amount]
        );

        await conn.commit();

        res.status(201).json({
            booking_id: bookingResult.insertId,
            amount,
            status: "CONFIRMED"
        });

    } catch (err) {
        try { await conn.rollback(); } catch { /* ignore */ }
        throw err;
    } finally {
        conn.release();
    }
}));

// ----------------------------------
// ERROR HANDLER
// ----------------------------------

app.use("/api", (req, res) => {
    res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Invalid JSON body" });
    }

    res.status(500).json({ error: "Something went wrong on the server" });
});

// ----------------------------------
// START SERVER
// ----------------------------------

app.listen(PORT, () => {
    console.log(`Parkline server running at http://localhost:${PORT}`);
});
