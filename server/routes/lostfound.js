import express from "express";
import multer from "multer";
import path from "path";
import pool from "../db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const baseName = path.basename(file.originalname || "file", ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${baseName}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const normalizeItem = (row) => ({
  id: row.id,
  itemType: row.item_type,
  title: row.title,
  description: row.description,
  hostel: row.hostel,
  location: row.location,
  imageUrl: row.image_url,
  createdAt: row.created_at,
  userId: row.user_id,
  userName: row.user_name,
  userUsername: row.user_username,
  claimedBy: row.claimed_by,
  claimedAt: row.claimed_at,
  claimedByName: row.claimed_by_name,
  claimedByUsername: row.claimed_by_username,
  claimProofImageUrl: row.claim_proof_image_url,
  contactPhone: row.contact_phone,
});

const listQuery = (itemType, excludeUserId) => {
  const base = `
    SELECT lfi.*,
      u.name AS user_name,
      split_part(u.email, '@', 1) AS user_username,
      claimant.name AS claimed_by_name,
      split_part(claimant.email, '@', 1) AS claimed_by_username
    FROM lost_found_items lfi
    LEFT JOIN users u ON u.id = lfi.user_id
    LEFT JOIN users claimant ON claimant.id = lfi.claimed_by
    WHERE lfi.item_type = $1
  `;

  if (excludeUserId) {
    return {
      text: `${base} AND lfi.user_id <> $2 ORDER BY (lfi.claimed_by IS NULL) DESC, lfi.created_at DESC`,
      values: [itemType, excludeUserId],
    };
  }

  return {
    text: `${base} ORDER BY (lfi.claimed_by IS NULL) DESC, lfi.created_at DESC`,
    values: [itemType],
  };
};

router.get("/found", async (req, res) => {
  try {
    const excludeUserId = req.query.excludeUserId ? Number(req.query.excludeUserId) : null;
    const query = listQuery("found", excludeUserId);
    const { rows } = await pool.query(query.text, query.values);
    res.json({ success: true, items: rows.map(normalizeItem) });
  } catch (error) {
    console.error("Lost/found list error", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/lost", async (req, res) => {
  try {
    const excludeUserId = req.query.excludeUserId ? Number(req.query.excludeUserId) : null;
    const query = listQuery("lost", excludeUserId);
    const { rows } = await pool.query(query.text, query.values);
    res.json({ success: true, items: rows.map(normalizeItem) });
  } catch (error) {
    console.error("Lost/found list error", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    if (!itemId) {
      return res.status(400).json({ error: "Invalid item id" });
    }

    const query = `
      SELECT lfi.*,
        u.name AS user_name,
        split_part(u.email, '@', 1) AS user_username,
        claimant.name AS claimed_by_name,
        split_part(claimant.email, '@', 1) AS claimed_by_username
      FROM lost_found_items lfi
      LEFT JOIN users u ON u.id = lfi.user_id
      LEFT JOIN users claimant ON claimant.id = lfi.claimed_by
      WHERE lfi.id = $1
    `;

    const { rows } = await pool.query(query, [itemId]);
    if (!rows.length) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ success: true, item: normalizeItem(rows[0]) });
  } catch (error) {
    console.error("Lost/found detail error", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { itemType, title, description, hostel, location, userId, contactPhone } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!itemType || !title || !description || !hostel) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (itemType !== "lost" && itemType !== "found") {
      return res.status(400).json({ error: "Invalid item type" });
    }

    const insert = `
      INSERT INTO lost_found_items (item_type, title, description, hostel, location, user_id, contact_phone, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `;

    const values = [
      itemType,
      title.trim(),
      description.trim(),
      hostel.trim(),
      location ? location.trim() : null,
      userId || null,
      contactPhone ? contactPhone.trim() : null,
      imageUrl,
    ];

    const insertResult = await pool.query(insert, values);
    const newId = insertResult.rows[0].id;

    const detailQuery = `
      SELECT lfi.*,
        u.name AS user_name,
        split_part(u.email, '@', 1) AS user_username,
        claimant.name AS claimed_by_name,
        split_part(claimant.email, '@', 1) AS claimed_by_username
      FROM lost_found_items lfi
      LEFT JOIN users u ON u.id = lfi.user_id
      LEFT JOIN users claimant ON claimant.id = lfi.claimed_by
      WHERE lfi.id = $1
    `;

    const { rows } = await pool.query(detailQuery, [newId]);
    res.status(201).json({ success: true, item: normalizeItem(rows[0]) });
  } catch (error) {
    console.error("Lost/found create error", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/:id/claim", upload.single("proof"), async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const userId = Number(req.body.userId);
    const claimProofImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!itemId || !userId) {
      return res.status(400).json({ error: "Invalid item or user" });
    }

    const update = `
      UPDATE lost_found_items
      SET claimed_by = $1, claimed_at = now(), claim_proof_image_url = $2
      WHERE id = $3 AND claimed_by IS NULL
      RETURNING id
    `;

    const updateResult = await pool.query(update, [userId, claimProofImageUrl, itemId]);
    if (!updateResult.rows.length) {
      return res.status(409).json({ error: "Item already claimed" });
    }

    const detailQuery = `
      SELECT lfi.*,
        u.name AS user_name,
        split_part(u.email, '@', 1) AS user_username,
        claimant.name AS claimed_by_name,
        split_part(claimant.email, '@', 1) AS claimed_by_username
      FROM lost_found_items lfi
      LEFT JOIN users u ON u.id = lfi.user_id
      LEFT JOIN users claimant ON claimant.id = lfi.claimed_by
      WHERE lfi.id = $1
    `;

    const { rows } = await pool.query(detailQuery, [itemId]);
    return res.json({ success: true, item: normalizeItem(rows[0]) });
  } catch (error) {
    console.error("Lost/found claim error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const userId = Number(req.body?.userId);

    if (!itemId || !userId) {
      return res.status(400).json({ error: "Invalid item or user" });
    }

    const result = await pool.query(
      "DELETE FROM lost_found_items WHERE id = $1 AND user_id = $2 RETURNING id",
      [itemId, userId]
    );

    if (!result.rows.length) {
      return res.status(403).json({ error: "You can only delete your own post" });
    }

    return res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    console.error("Lost/found delete error", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
