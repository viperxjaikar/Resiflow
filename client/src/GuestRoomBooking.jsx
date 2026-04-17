import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./GuestRoom.css";

function GuestRoomBooking({ user }) {
  const navigate = useNavigate();
  const [availableRooms, setAvailableRooms] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studentName: "",
    phoneNumber: "",
    numberOfPeople: "",
    numberOfRooms: "",
    checkInDate: "",
    checkOutDate: ""
  });

  useEffect(() => {
    if (user && user.hostel) {
      fetchAvailableRooms();
    }
  }, [user]);

  const fetchAvailableRooms = async () => {
    try {
      console.log("Fetching rooms for hostel:", user.hostel);
      const response = await fetch(`http://localhost:5000/api/guest-room/available?hostel=${user.hostel}`);
      const data = await response.json();
      console.log("Available rooms response:", data);
      setAvailableRooms(data.availableCount);
    } catch (error) {
      console.error("Error fetching available rooms:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 0;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = Math.abs(outDate - inDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getMaxAllowedPeople = () => {
    const rooms = parseInt(formData.numberOfRooms) || 0;
    return rooms * 3;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.studentName || !formData.phoneNumber || !formData.checkInDate || !formData.checkOutDate) {
      alert("Please fill all required fields");
      return;
    }

    const numberOfRooms = parseInt(formData.numberOfRooms);
    const numberOfPeople = parseInt(formData.numberOfPeople);

    if (isNaN(numberOfRooms) || numberOfRooms < 1) {
      alert("Please select at least 1 room");
      return;
    }

    if (numberOfRooms > availableRooms) {
      alert(`Only ${availableRooms} rooms are available in ${user.hostel}. Please reduce the number of rooms.`);
      return;
    }

    if (isNaN(numberOfPeople) || numberOfPeople < 1) {
      alert("Please enter number of people");
      return;
    }
    
    const maxPeople = numberOfRooms * 3;
    if (numberOfPeople > maxPeople) {
      alert(`Maximum ${maxPeople} people allowed for ${numberOfRooms} room(s) (3 people per room). Please reduce the number of people or book more rooms.`);
      return;
    }

    if (!/^\d{10}$/.test(formData.phoneNumber)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    const duration = calculateDuration(formData.checkInDate, formData.checkOutDate);
    if (duration < 1) {
      alert("Check-out date must be after check-in date");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/guest-room/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          studentName: formData.studentName,
          phoneNumber: formData.phoneNumber,
          numberOfPeople: numberOfPeople,
          numberOfRooms: numberOfRooms,
          checkInDate: formData.checkInDate,
          checkOutDate: formData.checkOutDate,
          durationDays: duration,
          hostel: user.hostel  // This is the key fix!
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`Booking successful! Booking Reference: ${data.booking.booking_reference}`);
        navigate("/");
      } else {
        alert(data.error || "Booking failed. Please try again.");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="guest-room-page">
        <div className="guest-room-card">
          <h2>Please Login to Book Guest Room</h2>
          <Link to="/login" className="btn-primary">Login</Link>
        </div>
      </div>
    );
  }

  const numberOfRooms = parseInt(formData.numberOfRooms) || 0;
  const numberOfPeople = parseInt(formData.numberOfPeople) || 0;
  const maxPeople = getMaxAllowedPeople();
  const showSummary = formData.numberOfRooms && formData.numberOfPeople;

  return (
    <div className="guest-room-page">
      <div className="guest-room-card">
        <h2>🏠 Book Guest Room - {user.hostel}</h2>
        <div className="availability-badge">
          Available Rooms in {user.hostel}: <strong>{availableRooms}</strong> / 10
        </div>
        
        <form onSubmit={handleSubmit} className="guest-room-form">
          <div className="form-group">
            <label>Student Name *</label>
            <input
              type="text"
              name="studentName"
              value={formData.studentName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="Enter 10-digit phone number"
              pattern="\d{10}"
              maxLength="10"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Number of Rooms Required *</label>
              <input
                type="number"
                name="numberOfRooms"
                min="1"
                max={availableRooms}
                value={formData.numberOfRooms}
                onChange={handleChange}
                placeholder="Enter number of rooms"
                required
              />
              <small>Maximum {availableRooms} rooms available in {user.hostel}</small>
            </div>

            <div className="form-group">
              <label>Total Number of People *</label>
              <input
                type="number"
                name="numberOfPeople"
                min="1"
                value={formData.numberOfPeople}
                onChange={handleChange}
                placeholder="Enter total people"
                required
              />
              {numberOfRooms > 0 && (
                <small>Maximum {maxPeople} people allowed for {numberOfRooms} room(s) (3 per room)</small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Check-in Date *</label>
              <input
                type="date"
                name="checkInDate"
                value={formData.checkInDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            <div className="form-group">
              <label>Check-out Date *</label>
              <input
                type="date"
                name="checkOutDate"
                value={formData.checkOutDate}
                onChange={handleChange}
                min={formData.checkInDate || new Date().toISOString().split('T')[0]}
                required
              />
            </div>
          </div>

          {showSummary && (
            <div className="booking-summary" style={{
              background: "rgba(139, 92, 246, 0.1)",
              padding: "15px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              marginTop: "10px"
            }}>
              <h4 style={{ margin: "0 0 10px 0", color: "#8B5CF6" }}>Booking Summary</h4>
              <p><strong>Hostel:</strong> {user.hostel}</p>
              <p><strong>Rooms:</strong> {numberOfRooms}</p>
              <p><strong>Total People:</strong> {numberOfPeople}</p>
              <p><strong>People per room:</strong> {(numberOfPeople / numberOfRooms).toFixed(1)} (Max 3 per room)</p>
              {formData.checkInDate && formData.checkOutDate && (
                <p><strong>Duration:</strong> {calculateDuration(formData.checkInDate, formData.checkOutDate)} days</p>
              )}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Booking..." : "Confirm Booking"}
          </button>
        </form>

        <Link to="/" className="btn-secondary" style={{ marginTop: "15px", display: "inline-block", textAlign: "center" }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default GuestRoomBooking;