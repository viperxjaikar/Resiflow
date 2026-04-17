import { Link, useParams } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import RequestForm from "./RequestForm";
import ResponseSharing from "./ResponseSharing";
import "./LostFound.css";
import "./ResourceSharing.css";

function ResourceSharing({ user }) {
  const { mode } = useParams();
  const [notifications, setNotifications] = useState([]);
  const [userNameMap, setUserNameMap] = useState({});

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get(`http://localhost:5000/api/requests/notifications/${user.id}`);
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, [user]);

  useEffect(() => {
    if (user && !mode) {
      fetchNotifications();
      // Auto-refresh notifications every 5 seconds
      const interval = setInterval(fetchNotifications, 5000);
      return () => clearInterval(interval);
    }
  }, [user, mode, fetchNotifications]);

  useEffect(() => {
    const loadUsernames = async () => {
      const ids = new Set();
      const names = new Set();
      notifications.forEach((notification) => {
        const firstLine = (notification.message || "").split("\n")[0];
        const withIdMatch = firstLine.match(/^user_(\d+)\s+(.+?)\s+has what you requested\.$/);
        if (withIdMatch) {
          ids.add(withIdMatch[1]);
          return;
        }

        const plainMatch = firstLine.match(/^(.+?)\s+has what you requested\.$/);
        if (plainMatch) {
          names.add(plainMatch[1].trim().toLowerCase());
        }
      });

      const idsToFetch = Array.from(ids).filter((id) => !userNameMap[`id:${id}`]);
      const namesToFetch = Array.from(names).filter((name) => !userNameMap[`name:${name}`]);
      if (!idsToFetch.length && !namesToFetch.length) {
        return;
      }

      try {
        const idResults = await Promise.all(
          idsToFetch.map((id) => axios.get(`http://localhost:5000/api/auth/users/${id}`))
        );

        const nameResults = await Promise.all(
          namesToFetch.map((name) =>
            axios
              .get(`http://localhost:5000/api/auth/users/by-name/${encodeURIComponent(name)}`)
              .catch(() => null)
          )
        );

        const nextMap = { ...userNameMap };
        idResults.forEach((res) => {
          const userData = res.data?.user;
          if (!userData?.id) return;
          const username = String(userData.email || "").split("@")[0] || String(userData.id);
          nextMap[`id:${String(userData.id)}`] = username;
        });

        nameResults.forEach((res) => {
          const userData = res?.data?.user;
          if (!userData?.name || !userData?.email) return;
          const username = String(userData.email || "").split("@")[0] || String(userData.id);
          nextMap[`name:${String(userData.name).trim().toLowerCase()}`] = username;
        });

        setUserNameMap(nextMap);
      } catch (error) {
        console.error("Error fetching user profiles:", error);
      }
    };

    if (notifications.length) {
      loadUsernames();
    }
  }, [notifications, userNameMap]);

  if (!user) {
    return (
      <div className="lf-page rs-page">
        <div className="lf-shell rs-shell">
          <header className="lf-header">
            <p className="lf-eyebrow">Resource Sharing</p>
            <h1 className="lf-title">Please login to continue</h1>
            <p className="lf-subtitle">Sign in to request or respond to resources.</p>
          </header>
          <Link to="/login" className="lf-button">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (mode === "request") {
    return <RequestForm user={user} fullPage />;
  }

  if (mode === "response") {
    return <ResponseSharing user={user} onNotificationUpdate={fetchNotifications} />;
  }

  return (
    <div className="lf-page rs-page">
      <div className="lf-shell rs-shell">
        <header className="lf-header">
          <p className="lf-eyebrow">Resource Sharing</p>
          <h1 className="lf-title">Find help or lend a hand</h1>
          <p className="lf-subtitle">Choose a flow to request a resource or respond to others.</p>
        </header>

        <section className="lf-buttons">
          <div className="lf-card">
            <h3>Request</h3>
            <p>Ask for a resource you need right now.</p>
            <Link to="/resources/request" className="lf-button">
              Request
            </Link>
          </div>
          <div className="lf-card">
            <h3>Response</h3>
            <p>Offer a resource to someone who needs it.</p>
            <Link to="/resources/response" className="lf-button">
              Response
            </Link>
          </div>
        </section>

        <section className="lf-toolbar">
          <div className="lf-post">
            <p>Notifications</p>
          </div>
          <div className="lf-list">
            {notifications.length === 0 ? (
              <p className="lf-empty">No accepted responses yet.</p>
            ) : (
              notifications.map((notification) => {
                const parts = (notification.message || "").split("\n");
                const firstLine = parts[0] || "";
                const match = firstLine.match(/^user_(\d+)\s+(.+?)\s+has what you requested\.$/);
                const plainMatch = firstLine.match(/^(.+?)\s+has what you requested\.$/);
                let displayMessage = firstLine;

                if (match) {
                  const [, userId, userName] = match;
                  const username = userNameMap[`id:${userId}`];
                  displayMessage = (
                    <span>
                      {username ? (
                        <Link className="lf-user-link" to={`/profile/${username}`}>
                          {userName}
                        </Link>
                      ) : (
                        userName
                      )}
                      {" has what you requested."}
                    </span>
                  );
                } else if (plainMatch) {
                  const plainName = plainMatch[1].trim();
                  const username = userNameMap[`name:${plainName.toLowerCase()}`];
                  displayMessage = (
                    <span>
                      {username ? (
                        <Link className="lf-user-link" to={`/profile/${username}`}>
                          {plainName}
                        </Link>
                      ) : (
                        plainName
                      )}
                      {" has what you requested."}
                    </span>
                  );
                }

                return (
                  <article key={notification.id} className="lf-item">
                    <p>{displayMessage}</p>
                    {parts[1] && <p className="lf-user">{parts[1]}</p>}
                    <p className="lf-user">{new Date(notification.created_at).toLocaleString()}</p>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ResourceSharing;