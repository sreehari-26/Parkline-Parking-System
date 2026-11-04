require("dotenv").config();

const nodemailer = require("nodemailer");

// Email is optional: if SMTP settings are missing, bookings still work
// and the receipt is simply skipped (a note is logged).
const enabled = Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
);

const port = Number(process.env.SMTP_PORT || 587);

const transporter = enabled
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
    : null;

if (!enabled) {
    console.warn("Email is not configured (SMTP_* missing in .env). Booking receipts will not be sent.");
}

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

function floorLabel(n) {
    return Number(n) === 0 ? "Ground floor · G" : `Level 0${Number(n)}`;
}

async function sendBookingReceipt(b) {
    if (!enabled) return;

    const amount = Number(b.amount).toFixed(2);
    const start = String(b.start_time).slice(0, 16);
    const end = String(b.end_time).slice(0, 16);

    const rows = [
        ["Booking ID", "#" + b.booking_id],
        ["Location", b.lot_name],
        ["Address", b.address],
        ["Floor", floorLabel(b.floor_number)],
        ["Parking space", b.slot_number],
        ["Vehicle", b.vehicle_number],
        ["From", start],
        ["Until", end],
        ["Amount due", "₹" + amount]
    ];

    const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#222">
      <h2 style="margin-bottom:4px">Your parking is booked</h2>
      <p style="margin-top:0">Hi ${esc(b.username)}, your reservation with Parkline is confirmed.</p>
      <table style="width:100%;border-collapse:collapse">
        ${rows.map(([k, v]) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #eee;color:#666">${esc(k)}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right"><strong>${esc(v)}</strong></td>
          </tr>`).join("")}
      </table>
      <p style="color:#666;font-size:13px">Payment status: pending. Please keep this email as your booking reference.</p>
    </div>`;

    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

    await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: b.email,
        subject: `Parkline booking confirmed – #${b.booking_id}`,
        text: `Hi ${b.username}, your parking reservation is confirmed.\n\n${text}\n\nPayment status: pending.`,
        html
    });
}

module.exports = { sendBookingReceipt };
