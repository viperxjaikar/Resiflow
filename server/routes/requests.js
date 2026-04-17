import express from "express";
import pool from "../db.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

// Create a new request
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { title, category, description, requesterId } = req.body;

    if (!title || !category || !requesterId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const insert = `
      INSERT INTO requests (requester_id, title, category, description, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [requesterId, title.trim(), category.trim(), description?.trim() || null, imageUrl];

    const { rows } = await pool.query(insert, values);
    return res.status(201).json({ success: true, request: rows[0] });
  } catch (error) {
    console.error("Create request error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Get all requests
router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT r.*, u.name as requester_name, u.hostel
      FROM requests r
      JOIN users u ON r.requester_id = u.id
      ORDER BY r.created_at DESC
    `;

    const { rows } = await pool.query(query);
    return res.json({ success: true, requests: rows });
  } catch (error) {
    console.error("Get requests error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Get requests by user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT * FROM requests
      WHERE requester_id = $1
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, [userId]);
    return res.json({ success: true, requests: rows });
  } catch (error) {
    console.error("Get user requests error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

// Update request status
router.put("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['open', 'fulfilled', 'closed'].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const update = `
      UPDATE requests
      SET status = $1, updated_at = now()
      WHERE id = $2
      RETURNING *
    `;

    const { rows } = await pool.query(update, [status, id]);

    if (!rows.length) {
      return res.status(404).json({ error: "Request not found" });
    }

    return res.json({ success: true, request: rows[0] });
  } catch (error) {
    console.error("Update request status error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;