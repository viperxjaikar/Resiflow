import express from "express";
import pool from "../db.js";

const router = express.Router();

// ✅ Get notifications for user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ notifications: result.rows});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Mark all as read
router.put("/read/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1`,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;