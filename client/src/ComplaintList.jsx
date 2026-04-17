import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./LostFound.css";
import "./Complaint.css";

function ComplaintList({ user }) {
  const [complaints, setComplaints] = useState([]);
  const [status, setStatus] = useState({ loading: false, error: null });
  const [activeType, setActiveType] = useState("all");
  const [resolvingComplaintId, setResolvingComplaintId] = useState(null);
  const [userNameMap, setUserNameMap] = useState({});

  const filteredComplaints = complaints.filter((complaint) => {
    if (activeType === "all") return true;
    return String(complaint.complaint_type || "").toLowerCase() === activeType;
  });

  const formatType = (value) => {
    const label = String(value || "").toLowerCase();
    if (!label) return "Unknown";
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const getPriorityClassName = (label) => {
    if (label === "High" || label === "P0 Emergency" || label === "P1 High") {
      return "priority-chip priority-p0";
    }
    if (label === "Mid" || label === "P2 Medium") {
      return "priority-chip priority-p2";
    }
    return "priority-chip priority-p3";
  };

  const handleResolveComplaint = async (complaintId) => {
    if (!complaintId) {
      alert("Invalid complaint id");
      return;
    }

    const confirmed = window.confirm("Mark this complaint as resolved and delete it?");
    if (!confirmed) return;

    setResolvingComplaintId(complaintId);
    try {
      const response = await fetch(
        `http://localhost:5000/api/complaints/${complaintId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caretakerId: user.id }),
        }
      );

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Resolve API returned non-JSON response.");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to resolve complaint");
      }

      setComplaints((prev) => prev.filter((item) => item.id !== complaintId));
    } catch (error) {
      alert(error.message || "Failed to resolve complaint");
    } finally {
      setResolvingComplaintId(null);
    }
  };

  useEffect(() => {
    if (!user || user.role !== "caretaker") {
      return;
    }

    const loadComplaints = async () => {
      setStatus({ loading: true, error: null });
      try {
        const response = await fetch(
          `http://localhost:5000/api/complaints?userId=${user.id}`
        );
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Complaints API returned non-JSON response.");
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to fetch complaints");
        }
        setComplaints(Array.isArray(result.complaints) ? result.complaints : []);
      } catch (err) {
        setStatus({ loading: false, error: err.message });
        return;
      }

      setStatus({ loading: false, error: null });
    };

    loadComplaints();
  }, [user]);

  useEffect(() => {
    const idsToFetch = Array.from(
      new Set(
        complaints
          .filter((item) => !item.student_username && item.student_id && !userNameMap[item.student_id])
          .map((item) => item.student_id)
      )
    );

    if (!idsToFetch.length) {
      return;
    }

    const loadUsernames = async () => {
      try {
        const responses = await Promise.all(
          idsToFetch.map((id) => fetch(`http://localhost:5000/api/auth/users/${id}`))
        );

        const payloads = await Promise.all(
          responses.map(async (response) => {
            const result = await response.json();
            return response.ok ? result : null;
          })
        );

        const nextMap = { ...userNameMap };
        payloads.forEach((payload) => {
          const userData = payload?.user;
          if (!userData?.id) return;
          nextMap[userData.id] = String(userData.email || "").split("@")[0];
        });

        setUserNameMap(nextMap);
      } catch (error) {
        console.error("Unable to resolve complaint profile usernames", error);
      }
    };

    loadUsernames();
  }, [complaints, userNameMap]);

  if (!user) {
    return (
      <div className="lf-page">
        <div className="lf-shell">
          <div className="lf-card">
            <h2>Complaints</h2>
            <p>Please log in to view complaints.</p>
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
      <div className="lf-page">
        <div className="lf-shell">
          <div className="lf-card">
            <h2>Access Restricted</h2>
            <p>This page is only available to caretakers.</p>
            <Link to="/" className="lf-button">
              Back to Home
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
          <p className="lf-eyebrow">Caretaker Portal</p>
          <h1 className="lf-title">Complaints</h1>
          <p className="lf-subtitle">Review all complaints submitted by students.</p>
        </header>

        {status.loading && <p>Loading complaints...</p>}
        {status.error && <p className="lf-error">{status.error}</p>}

        {!status.loading && !status.error && complaints.length === 0 && (
          <p>No complaints yet.</p>
        )}

        {!status.loading && !status.error && complaints.length > 0 && (
          <div className="lf-search complaint-filter">
            <label htmlFor="complaint-type-filter">Filter</label>
            <select
              id="complaint-type-filter"
              value={activeType}
              onChange={(event) => setActiveType(event.target.value)}
            >
              <option value="all">All types</option>
              <option value="electrical">Electrical</option>
              <option value="plumbing">Plumbing</option>
              <option value="lan">LAN</option>
              <option value="carpenter">Carpenter</option>
              <option value="cleaning">Cleaning</option>
              <option value="insects">Insects</option>
              <option value="others">Others</option>
            </select>
          </div>
        )}

        {!status.loading && !status.error && filteredComplaints.length === 0 && complaints.length > 0 && (
          <p>No complaints for this category.</p>
        )}

        {!status.loading && !status.error && filteredComplaints.length > 0 && (
          <div className="lf-list">
            {filteredComplaints.map((complaint) => {
              const complaintId = complaint.id ?? complaint.complaint_id;
              const createdAt = complaint.created_at
                ? new Date(complaint.created_at).toLocaleString()
                : "";
              return (
                <article
                  key={complaintId || `${complaint.student_name}-${createdAt}`}
                  className="lf-item"
                >
                  <div className="lf-item-top">
                    {(() => {
                      const profileUsername =
                        complaint.student_username || userNameMap[complaint.student_id];

                      return (
                    <h4>
                      {profileUsername ? (
                        <Link className="lf-user-link" to={`/profile/${profileUsername}`}>
                          {complaint.student_name || profileUsername}
                        </Link>
                      ) : (
                        complaint.student_name || "Student"
                      )}
                    </h4>
                      );
                    })()}
                    <div className="complaint-tags">
                      <span
                        className={getPriorityClassName(
                          complaint.complexity_label || complaint.priority_label
                        )}
                      >
                        {complaint.complexity_label || complaint.priority_label || "Low"}
                      </span>
                      <span className="complaint-badge">
                        {formatType(complaint.complaint_type)}
                      </span>
                    </div>
                  </div>
                  <p>{complaint.description}</p>
                  <div className="lf-meta">
                    <span>{complaint.location}</span>
                    <span>{complaint.hostel}</span>
                    <span>{createdAt}</span>
                  </div>
                  <div className="complaint-actions">
                    <button
                      type="button"
                      className="complaint-resolve-btn"
                      disabled={!complaintId || resolvingComplaintId === complaintId}
                      onClick={() => handleResolveComplaint(complaintId)}
                    >
                      {resolvingComplaintId === complaintId
                        ? "Resolving..."
                        : "Mark Resolved"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <Link to="/" className="lf-button secondary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default ComplaintList;
