import { useState } from "react";
import { Link } from "react-router-dom";
import "./LostFound.css";
import "./Attendance.css";

function Attendance({ user }) {
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [attended, setAttended] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [attemptId, setAttemptId] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);

  const requestOtp = async ({ latitude, longitude, accuracy }) => {
    try {
      const response = await fetch("http://localhost:5000/api/attendance/request-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          latitude,
          longitude,
          accuracy,
        }),
      });

      const data = await response.json();
      setStatusMessage(data.message || "Unexpected response from server.");

      if (response.ok) {
        setAttemptId(data.attemptId);
        setOtpSent(true);
        setExpiresAt(data.expiresAt || null);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to reach the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = () => {
    if (!navigator.geolocation) {
      setStatusMessage("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setStatusMessage("Getting location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        if (accuracy && accuracy > 150) {
          setLoading(false);
          setStatusMessage(
            `Low GPS accuracy (~${Math.round(accuracy)}m). Please try again from an open area.`
          );
          return;
        }

        requestOtp({ latitude, longitude, accuracy });
      },
      (error) => {
        setLoading(false);
        if (error.code === 1) {
          setStatusMessage("Location permission denied.");
        } else if (error.code === 2) {
          setStatusMessage("Unable to determine your location.");
        } else {
          setStatusMessage("Location error. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const handleVerifyOtp = async () => {
    if (!attemptId || !otpValue.trim()) {
      setStatusMessage("Please enter the OTP sent to your email.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/attendance/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          attemptId,
          otp: otpValue.trim(),
        }),
      });

      const data = await response.json();
      setStatusMessage(data.message || "Unexpected response from server.");

      if (response.ok) {
        setAttended(true);
        setOtpSent(false);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to reach the server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="lf-page attendance-page">
        <div className="attendance-shell">
          <div className="attendance-card">
            <header className="attendance-header">
              <p className="attendance-eyebrow">Hostel Services</p>
              <h2 className="attendance-title">Attendance</h2>
              <p className="attendance-subtitle">Please log in to mark attendance.</p>
            </header>
            <Link to="/login" className="lf-button">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-page attendance-page">
      <div className="attendance-shell">
        <div className="attendance-card">
          <header className="attendance-header">
            <p className="attendance-eyebrow">Hostel Services</p>
            <h2 className="attendance-title">Hostel Attendance</h2>
            <p className="attendance-subtitle">
              Mark your attendance using GPS location when you are at the hostel.
            </p>
          </header>

          <button
            className="lf-button"
            onClick={handleMarkAttendance}
            disabled={loading || attended}
            type="button"
          >
            {attended ? "Attendance Marked" : loading ? "Checking..." : "Mark Attendance"}
          </button>

          {otpSent && !attended && (
            <div className="attendance-otp">
              <label className="attendance-label" htmlFor="attendance-otp-input">
                Enter OTP
              </label>
              <div className="attendance-otp-row">
                <input
                  id="attendance-otp-input"
                  className="attendance-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="6-digit OTP"
                  value={otpValue}
                  onChange={(event) => setOtpValue(event.target.value)}
                  maxLength={6}
                />
                <button
                  className="lf-button secondary"
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={loading}
                >
                  Verify OTP
                </button>
              </div>
              {expiresAt && (
                <p className="attendance-hint">OTP expires in 30 seconds.</p>
              )}
            </div>
          )}

          {statusMessage && (
            <div className="attendance-message">{statusMessage}</div>
          )}

          {attended && (
            <div className="attendance-success">
              Your attendance has been recorded for today.
            </div>
          )}

          <Link to="/" className="lf-button secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Attendance;
