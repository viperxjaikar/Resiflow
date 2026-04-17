import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function Register({ onLogin }) {
  const [role, setRole] = useState("student");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    hostel: "H4",
  });
  const [submitted, setSubmitted] = useState(null);

  const hostelOptions = ["H4", "H3", "H1", "Panini", "Ma Saraswati"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = formData.email.trim().toLowerCase();
    if (!normalizedEmail.endsWith("@iiitdmj.ac.in")) {
      setSubmitted({ error: "Enter valid college email (@iiitdmj.ac.in)" });
      return;
    }

    try {
      const payload = { role, ...formData, email: normalizedEmail };

      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        const message = result.error || "Failed to register";
        setSubmitted({ error: message });
        return;
      }

      setSubmitted({ success: true, user: result.user });
      if (onLogin) {
        onLogin(result.user);
      }
      navigate("/");
    } catch (err) {
      console.error(err);
      setSubmitted({ error: "Unable to reach server" });
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2 className="title">Create Account</h2>

        <div className="tabs">
          <div
            className={`tab ${role === "student" ? "active" : ""}`}
            onClick={() => setRole("student")}
          >
            Student
          </div>
          <div
            className={`tab ${role === "caretaker" ? "active" : ""}`}
            onClick={() => setRole("caretaker")}
          >
            Caretaker
          </div>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          <label>
            College Email
            <input
              type="email"
              name="email"
              placeholder="you@college.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </label>

          <label>
            Name
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Phone Number
            <input
              type="tel"
              name="phone"
              placeholder="10-digit mobile"
              value={formData.phone}
              onChange={handleChange}
              pattern="[0-9]{10}"
              required
            />
          </label>

          <label>
            Hostel
            <select name="hostel" value={formData.hostel} onChange={handleChange}>
              {hostelOptions.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </label>

          <button type="submit" className="submit-button">Register</button>

          {submitted && (
            <div className="submitted-data">
              {submitted.error ? (
                <p style={{ color: "#B91C1C", fontWeight: 600 }}>{submitted.error}</p>
              ) : (
                <>
                  <p style={{ color: "#047857", fontWeight: 600 }}>Registration successful!</p>
                  <pre>{JSON.stringify(submitted.user, null, 2)}</pre>
                </>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default Register;