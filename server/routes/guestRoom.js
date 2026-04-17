import express from "express";
import pool from "../db.js";

const router = express.Router();

// Generate unique booking reference
function generateBookingRef() {
  return 'GR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Get available rooms count for specific hostel
router.get("/available", async (req, res) => {
  try {
    const { hostel } = req.query;
    
    console.log("=== AVAILABLE ROOMS REQUEST ===");
    console.log("Requested hostel:", hostel);
    
    if (!hostel) {
      return res.status(400).json({ error: "Hostel parameter required" });
    }
    
    const result = await pool.query(`
      SELECT COUNT(*) FROM guest_rooms 
      WHERE is_available = true AND hostel = $1
    `, [hostel]);
    
    console.log(`Found ${result.rows[0].count} available rooms for ${hostel}`);
    console.log("================================");
    
    res.json({ availableCount: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error("Error in /available:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// Book guest room
router.post("/book", async (req, res) => {
  const { userId, studentName, phoneNumber, numberOfPeople, numberOfRooms, checkInDate, checkOutDate, durationDays, hostel } = req.body;
  
  console.log("=== BOOKING REQUEST ===");
  console.log("Booking for hostel:", hostel);
  console.log("Rooms requested:", numberOfRooms);
  console.log("People:", numberOfPeople);
  console.log("Dates:", checkInDate, "to", checkOutDate);
  
  try {
    if (!userId || !studentName || !phoneNumber || !numberOfPeople || !numberOfRooms || !checkInDate || !checkOutDate || !hostel) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    await pool.query('BEGIN');
    
    // Get available rooms for this specific hostel
    const availableRooms = await pool.query(`
      SELECT room_number FROM guest_rooms 
      WHERE is_available = true 
      AND hostel = $1
      ORDER BY room_number
      LIMIT $2
    `, [hostel, numberOfRooms]);
    
    console.log(`Found ${availableRooms.rows.length} available rooms in ${hostel}`);
    console.log("Available rooms:", availableRooms.rows.map(r => r.room_number));
    
    if (availableRooms.rows.length < numberOfRooms) {
      await pool.query('ROLLBACK');
      return res.status(400).json({ error: `Only ${availableRooms.rows.length} rooms available in ${hostel}. Please reduce number of rooms.` });
    }
    
    const roomNumbers = availableRooms.rows.map(r => r.room_number);
    const bookingRef = generateBookingRef();
    
    console.log("Assigning rooms:", roomNumbers);
    console.log("Booking reference:", bookingRef);
    
    // Create booking with hostel
    const booking = await pool.query(`
      INSERT INTO guest_room_bookings 
      (user_id, student_name, phone_number, number_of_people, number_of_rooms, 
       room_numbers, check_in_date, check_out_date, duration_days, booking_reference, status, hostel)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11)
      RETURNING *
    `, [userId, studentName, phoneNumber, numberOfPeople, numberOfRooms, 
        roomNumbers, checkInDate, checkOutDate, durationDays, bookingRef, hostel]);
    
    // Mark EACH room as unavailable individually
    for (const room of roomNumbers) {
      await pool.query(`
        UPDATE guest_rooms SET is_available = false 
        WHERE room_number = $1
      `, [room]);
      console.log(`Marked ${room} as unavailable`);
    }
    
    await pool.query('COMMIT');
    console.log("Booking successful! ID:", booking.rows[0].id);
    console.log("Assigned rooms:", roomNumbers.join(', '));
    console.log("=========================");
    res.json({ success: true, booking: booking.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Booking error:", error.message);
    res.status(500).json({ error: "Booking failed: " + error.message });
  }
});

// Get my bookings
router.get("/my-bookings/:userId", async (req, res) => {
  try {
    const bookings = await pool.query(`
      SELECT * FROM guest_room_bookings 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `, [req.params.userId]);
    res.json({ bookings: bookings.rows });
  } catch (error) {
    console.error("Error fetching my bookings:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// Get all bookings (caretaker only)
router.get("/all-bookings", async (req, res) => {
  try {
    const bookings = await pool.query(`
      SELECT gb.*, u.name as user_name, u.email 
      FROM guest_room_bookings gb
      JOIN users u ON gb.user_id = u.id
      ORDER BY created_at DESC
    `);
    res.json({ bookings: bookings.rows });
  } catch (error) {
    console.error("Error fetching all bookings:", error.message);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

// Update booking status
router.put("/booking/:bookingId/status", async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;
  
  console.log("=== UPDATE STATUS ===");
  console.log("Booking ID:", bookingId);
  console.log("New status:", status);
  
  try {
    await pool.query('BEGIN');
    
    // Get the booking details first
    const booking = await pool.query(`
      SELECT room_numbers, hostel FROM guest_room_bookings WHERE id = $1
    `, [bookingId]);
    
    if (booking.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: "Booking not found" });
    }
    
    const roomNumbers = booking.rows[0].room_numbers;
    
    // If cancelling or checking out, free up the rooms
    if (status === 'cancelled' || status === 'checked_out') {
      console.log("Freeing up rooms:", roomNumbers);
      
      // Mark each room as available individually
      for (const room of roomNumbers) {
        await pool.query(`
          UPDATE guest_rooms SET is_available = true 
          WHERE room_number = $1
        `, [room]);
        console.log(`Freed ${room}`);
      }
    }
    
    const result = await pool.query(`
      UPDATE guest_room_bookings 
      SET status = $1, updated_at = now()
      WHERE id = $2
      RETURNING *
    `, [status, bookingId]);
    
    await pool.query('COMMIT');
    console.log("Status updated successfully!");
    console.log("======================");
    res.json({ success: true, booking: result.rows[0] });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error updating status:", error.message);
    res.status(500).json({ error: "Update failed: " + error.message });
  }
});

export default router;