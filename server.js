require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");
const { sendBookingReceipt } = require("./mailer");

const app = express();

app.use(cors());
app.use(express.json());

// Serve the website (public/index.html) from the same server.
app.use(express.static(path.join(__dirname, "public")));

// ----------------------------------
// CONFIG
// ----------------------------------

const PORT = process.env.PORT || 3000;
const RATE_PER_HOUR = 50; // INR per hour
const MAX_BOOKING_HOURS = 24;
const PAST_GRACE_MINUTES = 5;
const MAX_ADVANCE_DAYS = 90;
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || "admin").toLowerCase();

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

// Rejects impossible dates such as 2026-02-31 or 25:00.
function isRealDateTime(v) {
    const [datePart, timePart] = v.split(" ");
    const [y, m, d] = datePart.split("-").map(Number);
    const [hh, mm, ss] = timePart.split(":").map(Number);

    const dt = new Date(y, m - 1, d, hh, mm, ss || 0);

    return (
        dt.getFullYear() === y &&
        dt.getMonth() === m - 1 &&
        dt.getDate() === d &&
        dt.getHours() === hh &&
        dt.getMinutes() === mm
    );
}

function normalizeDateTime(value) {
    if (typeof value !== "string" || !DATETIME_REGEX.test(value.trim())) return null;

    const v = value.trim();
    const full = v.length === 16 ? v + ":00" : v;

    return isRealDateTime(full) ? full : null;
}

function toDate(dateTimeString) {
    return new Date(dateTimeString.replace(" ", "T"));
}

// Sends the booking receipt email. Never blocks or breaks a booking.
async function sendReceiptFor(bookingId) {
    const [rows] = await db.query(
        `SELECT b.booking_id, b.start_time, b.end_time, b.amount,
                u.username, u.email,
                l.lot_name, l.address,
                s.floor_number, s.slot_number,
                v.vehicle_number
         FROM bookings b
         JOIN users u ON u.user_id = b.user_id
         JOIN parking_lots l ON l.lot_id = b.lot_id
         JOIN parking_slots s ON s.slot_id = b.slot_id
         JOIN vehicles v ON v.vehicle_id = b.vehicle_id
         WHERE b.booking_id = ?`,
        [bookingId]
    );

    if (rows.length) await sendBookingReceipt(rows[0]);
}

function isAdminName(username) {
    return String(username || "").toLowerCase() === ADMIN_USERNAME;
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
        email: user.email,
        is_admin: isAdminName(user.username)
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

function requireAdmin(req, res, next) {
    if (!isAdminName(req.user && req.user.username)) {
        return res.status(403).json({ error: "Admin access only" });
    }

    next();
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

    if (isAdminName(username)) {
        return res.status(409).json({ error: "That username is reserved." });
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

        const [timeRows] = await conn.query(
            `SELECT
                (? < NOW() - INTERVAL ? MINUTE) AS in_past,
                (? > NOW() + INTERVAL ? DAY) AS too_far`,
            [startTime, PAST_GRACE_MINUTES, startTime, MAX_ADVANCE_DAYS]
        );

        if (Number(timeRows[0].in_past) === 1) {
            await conn.rollback();
            return res.status(400).json({ error: "The start time has already passed." });
        }

        if (Number(timeRows[0].too_far) === 1) {
            await conn.rollback();
            return res.status(400).json({
                error: `Bookings can be made up to ${MAX_ADVANCE_DAYS} days ahead.`
            });
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

        // Fire and forget: a failed email must not fail the booking.
        sendReceiptFor(bookingResult.insertId).catch(err =>
            console.error("Receipt email failed:", err.message)
        );

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
// ADMIN ANALYTICS
// ----------------------------------

const num = v => Number(v) || 0;

function lastNDays(todayString, n) {
    const [y, m, d] = todayString.split("-").map(Number);
    const days = [];

    for (let i = n - 1; i >= 0; i--) {
        days.push(new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10));
    }

    return days;
}

const ACTIVE_NOW = "b.status IN ('PENDING', 'CONFIRMED') AND b.start_time <= NOW() AND b.end_time > NOW()";

app.get("/api/admin/analytics", requireAuth, requireAdmin, wrap(async (req, res) => {

    const [
        [[today]],
        [[money]],
        [[pay]],
        [[book]],
        [[slotTotals]],
        [slotTypes],
        [byLot],
        [byDay],
        [byHour],
        [byStatus],
        [[people]],
        [recent]
    ] = await Promise.all([

        db.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today"),

        db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN status <> 'CANCELLED' THEN amount END), 0) AS total,
                COALESCE(SUM(CASE WHEN status <> 'CANCELLED' AND DATE(start_time) = CURDATE() THEN amount END), 0) AS today,
                COALESCE(SUM(CASE WHEN status <> 'CANCELLED'
                    AND start_time >= DATE_FORMAT(NOW(), '%Y-%m-01') THEN amount END), 0) AS month
            FROM bookings`),

        db.query(`
            SELECT
                COALESCE(SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount END), 0) AS collected,
                COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN amount END), 0) AS pending,
                COALESCE(SUM(CASE WHEN payment_status = 'REFUNDED' THEN amount END), 0) AS refunded
            FROM payments`),

        db.query(`
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(status <> 'CANCELLED'), 0) AS valid,
                COALESCE(SUM(status = 'CANCELLED'), 0) AS cancelled,
                COALESCE(SUM(status IN ('PENDING', 'CONFIRMED')
                    AND start_time <= NOW() AND end_time > NOW()), 0) AS active_now,
                COALESCE(SUM(status IN ('PENDING', 'CONFIRMED') AND start_time > NOW()), 0) AS upcoming
            FROM bookings`),

        db.query(`
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(s.is_active = TRUE AND l.is_active = TRUE), 0) AS active
            FROM parking_slots s
            JOIN parking_lots l ON l.lot_id = s.lot_id`),

        db.query(`
            SELECT
                s.vehicle_type,
                COUNT(*) AS total,
                COALESCE(SUM(EXISTS (
                    SELECT 1 FROM bookings b
                    WHERE b.slot_id = s.slot_id AND ${ACTIVE_NOW}
                )), 0) AS occupied
            FROM parking_slots s
            JOIN parking_lots l ON l.lot_id = s.lot_id
            WHERE s.is_active = TRUE AND l.is_active = TRUE
            GROUP BY s.vehicle_type
            ORDER BY s.vehicle_type`),

        db.query(`
            SELECT
                l.lot_id,
                l.lot_name,
                (SELECT COUNT(*) FROM parking_slots s
                    WHERE s.lot_id = l.lot_id AND s.is_active = TRUE) AS total_slots,
                (SELECT COUNT(DISTINCT b.slot_id) FROM bookings b
                    WHERE b.lot_id = l.lot_id AND ${ACTIVE_NOW}) AS occupied,
                (SELECT COUNT(*) FROM bookings b
                    WHERE b.lot_id = l.lot_id AND b.status <> 'CANCELLED') AS bookings,
                (SELECT COALESCE(SUM(b.amount), 0) FROM bookings b
                    WHERE b.lot_id = l.lot_id AND b.status <> 'CANCELLED') AS revenue
            FROM parking_lots l
            WHERE l.is_active = TRUE
            ORDER BY revenue DESC, l.lot_name ASC`),

        db.query(`
            SELECT
                DATE_FORMAT(start_time, '%Y-%m-%d') AS day,
                COUNT(*) AS bookings,
                SUM(amount) AS revenue
            FROM bookings
            WHERE status <> 'CANCELLED'
              AND start_time >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
              AND start_time < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
            GROUP BY DATE_FORMAT(start_time, '%Y-%m-%d')`),

        db.query(`
            SELECT HOUR(start_time) AS hr, COUNT(*) AS total
            FROM bookings
            WHERE status <> 'CANCELLED'
            GROUP BY HOUR(start_time)`),

        db.query(`
            SELECT status, COUNT(*) AS total
            FROM (
                SELECT CASE
                    WHEN status IN ('PENDING', 'CONFIRMED') AND end_time <= NOW() THEN 'COMPLETED'
                    ELSE status
                END AS status
                FROM bookings
            ) t
            GROUP BY status`),

        db.query(`
            SELECT
                (SELECT COUNT(*) FROM users WHERE LOWER(username) <> ?) AS users,
                (SELECT COUNT(*) FROM vehicles) AS vehicles`,
            [ADMIN_USERNAME]),

        db.query(`
            SELECT
                b.booking_id,
                u.username,
                l.lot_name,
                s.floor_number,
                s.slot_number,
                v.vehicle_number,
                b.start_time,
                b.end_time,
                b.amount,
                CASE
                    WHEN b.status IN ('PENDING', 'CONFIRMED') AND b.end_time <= NOW() THEN 'COMPLETED'
                    ELSE b.status
                END AS status
            FROM bookings b
            JOIN users u ON u.user_id = b.user_id
            JOIN parking_lots l ON l.lot_id = b.lot_id
            JOIN parking_slots s ON s.slot_id = b.slot_id
            JOIN vehicles v ON v.vehicle_id = b.vehicle_id
            ORDER BY b.created_at DESC, b.booking_id DESC
            LIMIT 10`)
    ]);

    const dayMap = new Map(byDay.map(r => [r.day, r]));
    const hourMap = new Map(byHour.map(r => [Number(r.hr), num(r.total)]));

    const by_type = slotTypes.map(r => ({
        vehicle_type: r.vehicle_type,
        total: num(r.total),
        occupied: num(r.occupied),
        available: num(r.total) - num(r.occupied)
    }));

    const occupied = by_type.reduce((sum, r) => sum + r.occupied, 0);
    const activeSlots = num(slotTotals.active);
    const validBookings = num(book.valid);

    res.json({
        rate_per_hour: RATE_PER_HOUR,
        revenue: {
            total: num(money.total),
            today: num(money.today),
            month: num(money.month),
            average_booking: validBookings ? num(money.total) / validBookings : 0,
            collected: num(pay.collected),
            pending: num(pay.pending),
            refunded: num(pay.refunded)
        },
        bookings: {
            total: num(book.total),
            valid: validBookings,
            cancelled: num(book.cancelled),
            active_now: num(book.active_now),
            upcoming: num(book.upcoming)
        },
        slots: {
            total: num(slotTotals.total),
            active: activeSlots,
            inactive: num(slotTotals.total) - activeSlots,
            occupied,
            available: Math.max(activeSlots - occupied, 0),
            by_type
        },
        people: {
            users: num(people.users),
            vehicles: num(people.vehicles)
        },
        by_lot: byLot.map(r => ({
            lot_id: r.lot_id,
            lot_name: r.lot_name,
            total_slots: num(r.total_slots),
            occupied: num(r.occupied),
            available: Math.max(num(r.total_slots) - num(r.occupied), 0),
            bookings: num(r.bookings),
            revenue: num(r.revenue)
        })),
        revenue_by_day: lastNDays(today.today, 14).map(day => ({
            day,
            revenue: num(dayMap.get(day)?.revenue),
            bookings: num(dayMap.get(day)?.bookings)
        })),
        bookings_by_hour: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            bookings: hourMap.get(hour) || 0
        })),
        status_breakdown: byStatus.map(r => ({ status: r.status, total: num(r.total) })),
        recent_bookings: recent.map(r => ({
            booking_id: r.booking_id,
            username: r.username,
            lot_name: r.lot_name,
            floor_number: r.floor_number,
            slot_number: r.slot_number,
            vehicle_number: r.vehicle_number,
            start_time: r.start_time,
            end_time: r.end_time,
            amount: num(r.amount),
            status: r.status
        }))
    });
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
