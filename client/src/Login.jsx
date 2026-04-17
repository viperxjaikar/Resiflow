import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Register.css";

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const normalizedEmail = formData.email.trim().toLowerCase();

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password: formData.password }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitted({ error: result.error || "Failed to login" });
        return;
      }

      setSubmitted({ success: true, user: result.user });
      if (onLogin) onLogin(result.user);
      navigate("/");
    } catch (err) {
      console.error(err);
      setSubmitted({ error: "Unable to reach server" });
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <h2 className="title">Login</h2>

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

          <button type="submit" className="submit-button">Login</button>

          {submitted && (
            <div className="submitted-data">
              {submitted.error ? (
                <p style={{ color: "#B91C1C", fontWeight: 600 }}>{submitted.error}</p>
              ) : (
                <>
                  <p style={{ color: "#047857", fontWeight: 600 }}>Login successful!</p>
                  <pre>{JSON.stringify(submitted.user, null, 2)}</pre>
                </>
              )}
            </div>
          )}

          <p>
            New user? <Link to="/register">Register here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;
