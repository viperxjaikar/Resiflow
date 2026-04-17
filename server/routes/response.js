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

// Get all requests for a user's hostel or all if caretaker
router.get("/", async (req, res) => {
  try {
    const { userId, userHostel, userRole } = req.query;

    if (!userId || !userHostel) {
      return res.status(400).json({ error: "User ID and hostel required" });
    }

    let query;
    let values;
    const normalizedRole = (userRole || '').toLowerCase().trim();

    if (normalizedRole === 'caretaker') {
      // Caretakers see all requests
      query = `
        SELECT r.*, u.name as sender_name
        FROM requests r
        JOIN users u ON r.sender_id = u.id
        WHERE r.status = 'active'
        ORDER BY r.created_at DESC
      `;
      values = [];
    } else {
      // Students see only their hostel's requests
      query = `
        SELECT r.*, u.name as sender_name
        FROM requests r
        JOIN users u ON r.sender_id = u.id
        WHERE r.hostel = $1 AND r.status = 'active'
        ORDER BY r.created_at DESC
      `;
      values = [userHostel];
    }

    const { rows } = await pool.query(query, values);
    res.json({ success: true, requests: rows });
  } catch (error) {
    console.error("Get requests error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Create a new request
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { requesterId, title, category, description } = req.body;

    if (!requesterId || !title || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get user's hostel
    const userQuery = `SELECT hostel FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [requesterId]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }
    const hostel = userResult.rows[0].hostel;

    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const insert = `
      INSERT INTO requests (sender_id, category, item_name, description, image_url, hostel)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [requesterId, category, title, description || '', imageUrl, hostel];
    const { rows } = await pool.query(insert, values);

    res.status(201).json({ success: true, request: rows[0] });
  } catch (error) {
    console.error("Create request error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Respond to a request (offer to provide)
router.post("/:id/respond", async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { responderId, pickupDescription } = req.body;

    if (!responderId || !pickupDescription) {
      return res.status(400).json({ error: "Responder ID and pickup description required" });
    }

    // 1. Save response
    const insert = `
      INSERT INTO responses (request_id, responder_id, pickup_description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [requestId, responderId, pickupDescription];
    const { rows } = await pool.query(insert, values);

    // 2. 🔥 GET request sender + responder name
    const requestQuery = `
      SELECT r.sender_id, u.name as responder_name
      FROM requests r
      JOIN users u ON u.id = $1
      WHERE r.id = $2
    `;
    const requestResult = await pool.query(requestQuery, [responderId, requestId]);

    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    const request = requestResult.rows[0];

    // 3. 🔥 CREATE NOTIFICATION
    const message = `${request.responder_name} has what you requested.\nPickup: ${pickupDescription}`;

    await pool.query(
      `INSERT INTO notifications (user_id, type, message, is_read)
       VALUES ($1, $2, $3, false)`,
      [
        request.sender_id,
        "request_fulfilled",
        message
      ]
    );

    // 4. Send response
    res.status(201).json({ success: true, response: rows[0] });

  } catch (error) {
    console.error("Respond to request error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Accept a response
router.put("/response/:id/accept", async (req, res) => {
  try {
    const { responseId } = req.params;

    // Update response status
    const update = `UPDATE responses SET status = 'accepted' WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(update, [responseId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Response not found" });
    }

    // Mark request as fulfilled
    await pool.query(`UPDATE requests SET status = 'fulfilled' WHERE id = $1`, [rows[0].request_id]);

    // Get request and accepter details
    const requestQuery = `SELECT r.sender_id, r.item_name, u.name as accepter_name FROM requests r JOIN users u ON u.id = $1 WHERE r.id = $2`;
    const requestResult = await pool.query(requestQuery, [rows[0].responder_id, rows[0].request_id]);
    const request = requestResult.rows[0];

    // Create notification for the sender
    const notifInsertSender = `
      INSERT INTO notifications (user_id, type, message, related_request_id, related_response_id)
      VALUES ($1, 'request_fulfilled', $2 || ' has what you requested.', $3, $4)
    `;
    await pool.query(notifInsertSender, [request.sender_id, request.accepter_name, rows[0].request_id, responseId]);

    res.json({ success: true, response: rows[0] });
  } catch (error) {
    console.error("Accept response error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Accept a request directly (for caretakers)
router.put("/:id/accept", async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { accepterId } = req.body;

    if (!accepterId) {
      return res.status(400).json({ error: "Accepter ID required" });
    }

    // Update request status to fulfilled
    const update = `UPDATE requests SET status = 'fulfilled' WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(update, [requestId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Request not found" });
    }

    // Get accepter's name
    const userQuery = `SELECT name FROM users WHERE id = $1`;
    const userResult = await pool.query(userQuery, [accepterId]);
    const accepterName = userResult.rows[0].name;

    // Create notification for the sender
    const notifInsert = `
      INSERT INTO notifications (user_id, type, message, related_request_id)
      VALUES ($1, 'request_fulfilled', 
        $2 || ' has what you requested.' || E'\nPickup: ' || $3, 
        $4
      )
    `;
    await pool.query(notifInsert, [
      rows[0].sender_id,
      accepterName,
      req.body.pickupDescription || "Check with responder",
      requestId
    ]);

    res.json({ success: true, request: rows[0] });
  } catch (error) {
    console.error("Accept request error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get notifications for a user
router.get("/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND type = 'request_fulfilled'
      ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, [userId]);
    res.json({ success: true, notifications: rows });
  } catch (error) {
    console.error("Get notifications error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark notification as read
router.put("/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    const update = `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`;
    const { rows } = await pool.query(update, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true, notification: rows[0] });
  } catch (error) {
    console.error("Mark notification read error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a notification
router.delete("/notifications/:id", async (req, res) => {
  try {
    const { id: notificationId } = req.params;

    const deleteQuery = `DELETE FROM notifications WHERE id = $1`;
    const { rowCount } = await pool.query(deleteQuery, [notificationId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete notification error", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a request
router.delete("/:id", async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { userId } = req.body;

    // Only allow sender to delete their own request
    const deleteQuery = `DELETE FROM requests WHERE id = $1 AND sender_id = $2`;
    const { rowCount } = await pool.query(deleteQuery, [requestId, userId]);

    if (rowCount === 0) {
      return res.status(404).json({ error: "Request not found or not authorized" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete request error", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;