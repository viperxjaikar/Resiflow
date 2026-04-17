import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./LostFound.css";
import "./Attendance.css";

function AttendanceList({ user }) {
  const [markedNames, setMarkedNames] = useState([]);
  const [unmarkedNames, setUnmarkedNames] = useState([]);
  const [activeTab, setActiveTab] = useState("marked");
  const [status, setStatus] = useState({ loading: false, error: null });

  useEffect(() => {
    if (!user || user.role !== "caretaker") {
      return;
    }

    const loadAttendance = async () => {
      setStatus({ loading: true, error: null });
      try {
        const response = await fetch("http://localhost:5000/api/attendance/today");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Attendance API returned non-JSON response.");
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Unable to fetch attendance list");
        }
        setMarkedNames(Array.isArray(result.markedNames) ? result.markedNames : []);
        setUnmarkedNames(Array.isArray(result.unmarkedNames) ? result.unmarkedNames : []);
      } catch (err) {
        setStatus({ loading: false, error: err.message });
        return;
      }

      setStatus({ loading: false, error: null });
    };

    loadAttendance();
  }, [user]);

  if (!user) {
    return (
      <div className="lf-page attendance-page">
        <div className="attendance-shell">
          <div className="attendance-card">
            <header className="attendance-header">
              <p className="attendance-eyebrow">Caretaker Portal</p>
              <h2 className="attendance-title">Today&apos;s Attendance</h2>
              <p className="attendance-subtitle">Please log in to view attendance.</p>
            </header>
            <Link to="/login" className="lf-button">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "caretaker") {
    return (
      <div className="lf-page attendance-page">
        <div className="attendance-shell">
          <div className="attendance-card">
            <header className="attendance-header">
              <p className="attendance-eyebrow">Caretaker Portal</p>
              <h2 className="attendance-title">Access Restricted</h2>
              <p className="attendance-subtitle">
                This page is only available to caretakers.
              </p>
            </header>
            <Link to="/" className="lf-button secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }
  const today = new Date();
  const todayLabel = `${String(today.getDate()).padStart(2, "0")}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${today.getFullYear()}`;
  return (
    <div className="lf-page attendance-page">
      <div className="attendance-shell">
        <div className="attendance-card">
          <header className="attendance-header">
            <p className="attendance-eyebrow">Caretaker Portal</p>
            <h2 className="attendance-title">Today&apos;s Attendance</h2>
            <p className="attendance-subtitle">{todayLabel}</p>
          </header>

          {status.loading && <p className="lf-empty">Loading attendance...</p>}
          {status.error && <p className="lf-error">{status.error}</p>}

          {!status.loading && !status.error && (
            <div className="attendance-tabs">
              <button
                type="button"
                className={`attendance-tab ${activeTab === "marked" ? "active" : ""}`}
                onClick={() => setActiveTab("marked")}
              >
                Marked ({markedNames.length})
              </button>
              <button
                type="button"
                className={`attendance-tab ${activeTab === "unmarked" ? "active" : ""}`}
                onClick={() => setActiveTab("unmarked")}
              >
                Unmarked ({unmarkedNames.length})
              </button>
            </div>
          )}

          {!status.loading && !status.error && activeTab === "marked" && markedNames.length === 0 && (
            <p className="lf-empty">No attendance marked yet today.</p>
          )}

          {!status.loading && !status.error && activeTab === "unmarked" && unmarkedNames.length === 0 && (
            <p className="lf-empty">All students have marked attendance.</p>
          )}

          {!status.loading && !status.error && activeTab === "marked" && markedNames.length > 0 && (
            <div className="attendance-list">
              {markedNames.map((name) => (
                <article key={`marked-${name}`} className="attendance-item">
                  <div className="attendance-item-title">
                    <h4>{name || "Student"}</h4>
                    <span className="attendance-badge">Marked</span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!status.loading && !status.error && activeTab === "unmarked" && unmarkedNames.length > 0 && (
            <div className="attendance-list">
              {unmarkedNames.map((name) => (
                <article key={`unmarked-${name}`} className="attendance-item">
                  <div className="attendance-item-title">
                    <h4>{name || "Student"}</h4>
                    <span className="attendance-badge">Unmarked</span>
                  </div>
                </article>
              ))}
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

export default AttendanceList;
