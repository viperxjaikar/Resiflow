import express from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Auth route working");
});

router.get("/users/by-username/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim().toLowerCase();
    if (!username) {
      return res.status(400).json({ error: "Invalid username" });
    }

    const query = `
      SELECT id, role, email, roll_no AS room_no, name, hostel, phone, created_at
      FROM users
      WHERE split_part(lower(email), '@', 1) = $1
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [username]);
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("User profile error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/by-name/:name", async (req, res) => {
  try {
    const name = String(req.params.name || "").trim();
    if (!name) {
      return res.status(400).json({ error: "Invalid name" });
    }

    const query = `
      SELECT id, role, email, roll_no AS room_no, name, hostel, phone, created_at
      FROM users
      WHERE lower(name) = lower($1)
      ORDER BY id DESC
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [name]);
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("User profile error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const query = `
      SELECT id, role, email, roll_no AS room_no, name, hostel, phone, created_at
      FROM users
      WHERE id = $1
    `;

    const { rows } = await pool.query(query, [userId]);
    if (!rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("User profile error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { role, email, password, name, hostel, phone } = req.body;

    if (!role || !email || !password || !name || !hostel || !phone) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.endsWith("@iiitdmj.ac.in")) {
      return res.status(400).json({ error: "Only IIITDMJ emails allowed" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: "Phone number must be 10 digits" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const rollNo = normalizedEmail.split("@")[0];
    const insert = `
      INSERT INTO users (role, email, roll_no, password_hash, name, hostel, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, role, email, roll_no, name, hostel, phone, created_at
    `;

    const values = [role, normalizedEmail, rollNo, passwordHash, name.trim(), hostel, phone.trim()];

    const { rows } = await pool.query(insert, values);
    return res.status(201).json({ success: true, user: rows[0] });
  } catch (error) {
    console.error("Register error", error);
    if (error.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const query = `SELECT id, role, email, roll_no, name, hostel, phone, password_hash FROM users WHERE email=$1`;
    const { rows } = await pool.query(query, [normalizedEmail]);

    if (!rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { password_hash, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("Login error", error);
    return res.status(500).json({ error: "Server error"});
  }
});

router.use((req, res) => {
  res.status(404).json({ error: "Auth route not found" });
});

export default router;