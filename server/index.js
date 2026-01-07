import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { initDb, run, get, all } from "./db.js";

dotenv.config();
initDb();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/", express.static(path.join(__dirname, "..", "public")));

function nowIso() {
  return new Date().toISOString();
}

function formatTimeIL(date = new Date()) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function msToHours(ms) {
  const h = ms / (1000 * 60 * 60);
  return Math.round(h * 100) / 100;
}

function formatDateIL(date) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

async function sendOwnerEmail(subject, html) {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, OWNER_EMAIL } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !OWNER_EMAIL) {
    console.warn("Email not configured. Skipping owner notification.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE).toLowerCase() === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  await transporter.sendMail({
    from: `"דוואם" <${SMTP_USER}>`,
    to: OWNER_EMAIL,
    subject,
    html
  });
}

// ===== Admin auth (simple token) =====
function makeToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
const adminTokens = new Set();

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ ok: false, message: "Unauthorized" });
  }
  next();
}

app.post("/api/admin/login", (req, res) => {
  const pass = String(req.body?.password ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ ok: false, message: "ADMIN_PASSWORD missing" });
  }
  if (pass !== process.env.ADMIN_PASSWORD) return res.status(401).json({ ok: false });

  const token = makeToken();
  adminTokens.add(token);
  res.json({ ok: true, token });
});

app.post("/api/admin/employees", requireAdmin, async (req, res) => {
  try {
    const full_name = String(req.body?.full_name ?? "").trim();
    const phone = String(req.body?.phone ?? "").trim();
    const password = String(req.body?.password ?? "");

    if (!full_name || !phone || !password) {
      return res.status(400).json({ ok: false, message: "Missing fields" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await run(
      `INSERT INTO employees (full_name, phone, password_hash) VALUES (?, ?, ?)`,
      [full_name, phone, password_hash]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ ok: false, message: "Phone already exists or invalid data" });
  }
});

app.get("/api/admin/employees", requireAdmin, async (req, res) => {
  const rows = await all(`SELECT id, full_name, phone, is_active FROM employees ORDER BY id DESC`);
  res.json({ ok: true, employees: rows });
});

// ===== Employee auth (phone + password) =====
app.post("/api/auth", async (req, res) => {
  try {
    const phone = String(req.body?.phone ?? "").trim();
    const password = String(req.body?.password ?? "");

    if (!phone || !password) return res.status(400).json({ ok: false });

    const emp = await get(
      `SELECT id, full_name, phone, password_hash FROM employees WHERE phone = ? AND is_active = 1`,
      [phone]
    );
    if (!emp) return res.status(401).json({ ok: false });

    const ok = await bcrypt.compare(password, emp.password_hash);
    if (!ok) return res.status(401).json({ ok: false });

    res.json({ ok: true, employee: { id: emp.id, full_name: emp.full_name, phone: emp.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// ===== Summary (last 30 days) =====
app.get("/api/summary", async (req, res) => {
  try {
    const employee_id = Number(req.query.employee_id);
    if (!employee_id) return res.status(400).json({ ok: false });

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const rows = await all(
      `SELECT check_in_at, check_out_at
       FROM attendance
       WHERE employee_id = ?
         AND check_in_at IS NOT NULL
         AND check_out_at IS NOT NULL
         AND check_in_at >= ?
       ORDER BY check_in_at DESC`,
      [employee_id, since]
    );

    const byDay = new Map();
    let totalMs = 0;

    for (const r of rows) {
      const start = new Date(r.check_in_at);
      const end = new Date(r.check_out_at);
      const dur = Math.max(0, end - start);

      totalMs += dur;

      const dayKey = formatDateIL(start);
      byDay.set(dayKey, (byDay.get(dayKey) || 0) + dur);
    }

    const days = Array.from(byDay.entries()).map(([date, ms]) => ({
      date,
      hours: msToHours(ms)
    }));

    res.json({ ok: true, days, total_hours: msToHours(totalMs) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// ===== Check-in =====
app.post("/api/checkin", async (req, res) => {
  try {
    const employee_id = Number(req.body?.employee_id);
    if (!employee_id) return res.status(400).json({ ok: false });

    const openShift = await get(
      `SELECT * FROM attendance
       WHERE employee_id = ?
         AND check_in_at IS NOT NULL
         AND check_out_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [employee_id]
    );

    if (openShift) {
      return res.json({
        ok: true,
        already: true,
        attendance_id: openShift.id,
        time: formatTimeIL(new Date(openShift.check_in_at))
      });
    }

    const check_in_at = nowIso();
    const result = await run(
      `INSERT INTO attendance (employee_id, check_in_at, check_out_at, created_at)
       VALUES (?, ?, NULL, ?)`,
      [employee_id, check_in_at, nowIso()]
    );

    const emp = await get(`SELECT full_name FROM employees WHERE id = ?`, [employee_id]);
    const timeStr = formatTimeIL(new Date(check_in_at));

    await sendOwnerEmail(
      "דוואם — כניסה למשמרת",
      `<div dir="rtl" style="font-family:Arial">
        <h2 style="margin:0;color:#0b2a4a;">כניסה למשמרת</h2>
        <p style="margin:8px 0 0;">העובד/ת <b>${emp?.full_name ?? ""}</b> נכנס/ה בשעה <b>${timeStr}</b>.</p>
      </div>`
    );

    res.json({ ok: true, attendance_id: result.lastID, time: timeStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

// ===== Check-out =====
app.post("/api/checkout", async (req, res) => {
  try {
    const employee_id = Number(req.body?.employee_id);
    if (!employee_id) return res.status(400).json({ ok: false });

    const openShift = await get(
      `SELECT * FROM attendance
       WHERE employee_id = ?
         AND check_in_at IS NOT NULL
         AND check_out_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      [employee_id]
    );

    if (!openShift) return res.status(400).json({ ok: false, message: "No open shift" });

    const check_out_at = nowIso();
    await run(`UPDATE attendance SET check_out_at = ? WHERE id = ?`, [check_out_at, openShift.id]);

    const shiftMs = Math.max(0, new Date(check_out_at) - new Date(openShift.check_in_at));
    const shift_hours = msToHours(shiftMs);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const rows = await all(
      `SELECT check_in_at, check_out_at
       FROM attendance
       WHERE employee_id = ?
         AND check_in_at IS NOT NULL
         AND check_out_at IS NOT NULL
         AND check_in_at >= ?`,
      [employee_id, since]
    );

    let totalMs = 0;
    for (const r of rows) {
      totalMs += Math.max(0, new Date(r.check_out_at) - new Date(r.check_in_at));
    }
    const total_hours_30d = msToHours(totalMs);

    const emp = await get(`SELECT full_name FROM employees WHERE id = ?`, [employee_id]);
    const timeStr = formatTimeIL(new Date(check_out_at));

    await sendOwnerEmail(
      "דוואם — יציאה מהמשמרת",
      `<div dir="rtl" style="font-family:Arial">
        <h2 style="margin:0;color:#0b2a4a;">יציאה מהמשמרת</h2>
        <p style="margin:8px 0 0;">העובד/ת <b>${emp?.full_name ?? ""}</b> יצא/ה בשעה <b>${timeStr}</b>.</p>
        <p style="margin:8px 0 0;">משך משמרת: <b>${shift_hours}</b> שעות | סה״כ 30 ימים: <b>${total_hours_30d}</b> שעות</p>
      </div>`
    );

    res.json({ ok: true, time: timeStr, shift_hours, total_hours_30d });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`דוואם running on http://localhost:${port}`);
});
