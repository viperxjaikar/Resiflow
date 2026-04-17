import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "./LostFound.css";

function Profile() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const endpoint = `http://localhost:5000/api/auth/users/by-username/${username}`;
        const response = await fetch(endpoint);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("API returned non-JSON response.");
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to fetch profile");
        }
        setProfile(result.user);
      } catch (err) {
        setError(err.message);
      }
    };

    loadProfile();
  }, [username]);

  return (
    <div className="lf-page">
      <div className="lf-shell">
        {error && <p className="lf-error">{error}</p>}
        {!error && !profile && <p className="lf-empty">Loading...</p>}

        {profile && (
          <div className="lf-profile">
            <div className="lf-avatar">{profile.name ? profile.name.charAt(0).toUpperCase() : "U"}</div>
            <h1 className="lf-title">{profile.name}</h1>
            <p className="lf-subtitle">{profile.role}</p>

            <div className="lf-profile-grid">
              <div className="lf-profile-card">
                <p className="lf-detail-label">Email</p>
                <p>{profile.email}</p>
              </div>
              <div className="lf-profile-card">
                <p className="lf-detail-label">Phone</p>
                <p>{profile.phone}</p>
              </div>
              <div className="lf-profile-card">
                <p className="lf-detail-label">Hostel</p>
                <p>{profile.hostel}</p>
              </div>

              {profile.role === "student" && (
                <div className="lf-profile-card">
                  <p className="lf-detail-label">Room No.</p>
                  <p>{profile.room_no || "Not set"}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
