import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./LostFound.css";

function LostFoundDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadItem = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/lostfound/${id}`);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("API returned non-JSON response.");
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to fetch item");
        }
        setItem(result.item);
      } catch (err) {
        setError(err.message);
      }
    };

    loadItem();
  }, [id]);

  return (
    <div className="lf-page">
      <div className="lf-shell">
        {error && <p className="lf-error">{error}</p>}

        {!error && !item && <p className="lf-empty">Loading...</p>}

        {item && (
          <div className="lf-detail">
            <header className="lf-header">
              <h1 className="lf-title">{item.title}</h1>
              <p className="lf-subtitle">
                Posted by{" "}
                {item.userUsername ? (
                  <Link className="lf-user-link" to={`/profile/${item.userUsername}`}>
                    {item.userName || item.userUsername}
                  </Link>
                ) : (
                  <span>{item.userName || "Anonymous"}</span>
                )}
              </p>
            </header>

            <div className="lf-detail-body">
              <p className="lf-detail-label">Item Description</p>
              <p>{item.description}</p>

              <p className="lf-detail-label">Where to come?</p>
              <p>{item.location || "Not specified"}</p>

              {item.imageUrl && (
                <div className="lf-image-wrap">
                  <img
                    src={item.imageUrl.startsWith("http") ? item.imageUrl : `http://localhost:5000${item.imageUrl}`}
                    alt={item.title}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default LostFoundDetail;
