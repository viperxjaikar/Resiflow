import { useState } from "react";
import { Link } from "react-router-dom";
import "./LostFound.css";
import "./Complaint.css";

const COMPLAINT_OPTIONS = [
  "electrical",
  "plumbing",
  "LAN",
  "carpenter",
  "cleaning",
  "Insects",
  "others",
];

function Complaint({ user }) {
  const [formData, setFormData] = useState({
    complaintType: "electrical",
    description: "",
    location: "",
  });
  const [status, setStatus] = useState({ loading: false, message: "", error: null });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user) {
      setStatus({ loading: false, message: "", error: "Please login first." });
      return;
    }

    setStatus({ loading: true, message: "", error: null });
    try {
      const payload = {
        userId: user.id,
        complaintType: formData.complaintType,
        description: formData.description.trim(),
        location: formData.location.trim(),
      };

      const response = await fetch("http://localhost:5000/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Complaint API returned non-JSON response.");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to submit complaint");
      }

      setStatus({ loading: false, message: "Complaint submitted successfully.", error: null });
      setFormData({ complaintType: "electrical", description: "", location: "" });
    } catch (err) {
      setStatus({ loading: false, message: "", error: err.message });
    }
  };

  if (!user) {
    return (
      <div className="lf-page">
        <div className="lf-shell">
          <div className="lf-card">
            <h2>Submit a Complaint</h2>
            <p>Please log in to raise a complaint.</p>
            <Link to="/login" className="lf-button">
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-page">
      <div className="lf-shell">
        <header className="lf-header">
          <p className="lf-eyebrow">Student Services</p>
          <h1 className="lf-title">Submit a Complaint</h1>
          <p className="lf-subtitle">Share the issue so the caretaker can resolve it quickly.</p>
        </header>

        <section className="lf-card">
          <form className="lf-form" onSubmit={handleSubmit}>
            <label className="lf-field">
              Complaint Type
              <select
                name="complaintType"
                value={formData.complaintType}
                onChange={handleChange}
              >
                {COMPLAINT_OPTIONS.map((option) => (
                  <option key={option} value={option.toLowerCase()}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="lf-field">
              Complaint
              <textarea
                name="description"
                placeholder="Describe the issue in detail"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                required
              />
            </label>

            <label className="lf-field">
              Location
              <input
                type="text"
                name="location"
                placeholder="Room no / Hostel / Block"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </label>

            <button type="submit" className="lf-button" disabled={status.loading}>
              {status.loading ? "Submitting..." : "Submit Complaint"}
            </button>

            {status.error && <p className="lf-error">{status.error}</p>}
            {status.message && <p className="lf-success">{status.message}</p>}
          </form>
        </section>
      </div>
    </div>
  );
}

export default Complaint;
