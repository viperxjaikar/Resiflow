import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./GuestRoom.css";

function GuestRoomBookingsList({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyBookings();
    }
  }, [user]);

  const fetchMyBookings = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/guest-room/my-bookings/${user.id}`);
      const data = await response.json();
      setBookings(data.bookings);
    } catch (error) {
      console.error("Error fetching my bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'pending': return '#fbbf24';
      case 'approved': return '#34d399';
      case 'checked_in': return '#60a5fa';
      case 'checked_out': return '#f87171';
      case 'cancelled': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  if (!user) {
    return (
      <div className="guest-room-page">
        <div className="guest-room-card">
          <h2>Please Login to View Bookings</h2>
          <Link to="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="guest-room-page">
      <div className="guest-room-card" style={{ maxWidth: "1200px" }}>
        <h2>My Guest Room Bookings</h2>

        {loading ? (
          <p>Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p>No bookings found. <Link to="/guest-room/book">Book a room now</Link></p>
        ) : (
          <div className="bookings-list">
            {bookings.map(booking => (
              <div key={booking.id} className="booking-card" style={{
                background: "rgba(145, 178, 231, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "20px",
                marginBottom: "15px",
                borderLeft: `4px solid ${getStatusColor(booking.status)}`
              }}>
                <div>
                  <h3 style={{ margin: "0 0 10px 0" }}>{booking.student_name}</h3>
                  <p><strong>Booking Ref:</strong> {booking.booking_reference}</p>
                  <p><strong>Phone:</strong> {booking.phone_number}</p>
                  <p><strong>People:</strong> {booking.number_of_people} | <strong>Rooms:</strong> {booking.number_of_rooms}</p>
                  <p><strong>Room Numbers:</strong> {booking.room_numbers?.join(", ")}</p>
                  <p><strong>Check-in:</strong> {new Date(booking.check_in_date).toLocaleDateString()}</p>
                  <p><strong>Check-out:</strong> {new Date(booking.check_out_date).toLocaleDateString()}</p>
                  <p><strong>Duration:</strong> {booking.duration_days} days</p>
                  <p><strong>Status:</strong> <span style={{ color: getStatusColor(booking.status), fontWeight: "bold" }}>{booking.status}</span></p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Link to="/" className="btn-secondary" style={{ marginTop: "20px", display: "inline-block" }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default GuestRoomBookingsList;