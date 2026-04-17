import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./LostFound.css";

const getSavedUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const sortItems = (list) =>
  [...list].sort((a, b) => {
    if (!a.claimedBy && b.claimedBy) return -1;
    if (a.claimedBy && !b.claimedBy) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const termFrequency = (tokens) => {
  const freq = new Map();
  tokens.forEach((token) => {
    freq.set(token, (freq.get(token) || 0) + 1);
  });
  return freq;
};

const cosineSimilarity = (queryText, itemText) => {
  const queryTokens = tokenize(queryText);
  const itemTokens = tokenize(itemText);

  if (!queryTokens.length || !itemTokens.length) {
    return 0;
  }

  const queryVector = termFrequency(queryTokens);
  const itemVector = termFrequency(itemTokens);

  let dotProduct = 0;
  let queryNorm = 0;
  let itemNorm = 0;

  queryVector.forEach((value, key) => {
    queryNorm += value * value;
    dotProduct += value * (itemVector.get(key) || 0);
  });

  itemVector.forEach((value) => {
    itemNorm += value * value;
  });

  const denominator = Math.sqrt(queryNorm) * Math.sqrt(itemNorm);
  if (!denominator) {
    return 0;
  }

  return dotProduct / denominator;
};

const toSearchableText = (item) =>
  [
    item.title,
    item.description,
    item.hostel,
    item.location,
    item.userName,
    item.userUsername,
  ]
    .filter(Boolean)
    .join(" ");

function Lost() {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
  const [claimItem, setClaimItem] = useState(null);
  const [claimFile, setClaimFile] = useState(null);
  const [claimError, setClaimError] = useState(null);
  const navigate = useNavigate();
  const savedUser = useMemo(getSavedUser, []);

  const visibleItems = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) {
      return items;
    }

    return items
      .map((item) => ({
        item,
        score: cosineSimilarity(query, toSearchableText(item)),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (!a.item.claimedBy && b.item.claimedBy) return -1;
        if (a.item.claimedBy && !b.item.claimedBy) return 1;
        return new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime();
      })
      .map((entry) => entry.item);
  }, [items, searchQuery]);

  const handleCardKeyDown = (event, itemId) => {
    if (event.key === "Enter") {
      navigate(`/lost-found/item/${itemId}`);
    }
  };

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/lostfound/found");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("API returned non-JSON response. Is the server running on port 5000?");
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to fetch items");
        }
        setItems(sortItems(result.items || []));
      } catch (err) {
        setError(err.message);
      }
    };

    loadItems();
  }, []);

  const handleOpenClaim = (event, item) => {
    event.stopPropagation();
    setError(null);
    setClaimError(null);

    if (!savedUser?.id) {
      setError("Please login to claim this item.");
      return;
    }

    setClaimItem(item);
    setClaimFile(null);
  };

  const handleCloseClaim = () => {
    setClaimItem(null);
    setClaimFile(null);
    setClaimError(null);
  };

  const handleConfirmClaim = async () => {
    if (!claimItem) return;
    setClaimError(null);

    try {
      const payload = new FormData();
      payload.append("userId", savedUser?.id || "");
      if (claimFile) {
        payload.append("proof", claimFile);
      }

      const response = await fetch(`http://localhost:5000/api/lostfound/${claimItem.id}/claim`, {
        method: "POST",
        body: payload,
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("API returned non-JSON response. Is the server running on port 5000?");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to claim item");
      }

      setItems((prev) => sortItems(prev.map((item) => (item.id === claimItem.id ? result.item : item))));
      handleCloseClaim();
    } catch (err) {
      setClaimError(err.message);
    }
  };

  const handleDelete = async (event, itemId) => {
    event.stopPropagation();
    setError(null);

    if (!savedUser?.id) {
      setError("Please login to delete this post.");
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/lostfound/${itemId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: savedUser.id }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("API returned non-JSON response. Is the server running on port 5000?");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to delete post");
      }

      setItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="lf-page">
      <div className="lf-shell">
        <header className="lf-header">
          <h1 className="lf-title">See what others found</h1>
          <p className="lf-subtitle">
            Browse found items shared by other users. If nothing matches, post your lost item.
          </p>
        </header>

        <div className="lf-toolbar">
          <div className="lf-post">
            <p>Didn't find anything? Post here.</p>
            <button className="lf-button" type="button" onClick={() => navigate("/lost-found/post/lost")}>Post</button>
          </div>

          <div className="lf-search">
            <input
              type="text"
              placeholder="Search found items"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button className="lf-button secondary" type="button">Search</button>
          </div>
        </div>

        {error && <p className="lf-error">{error}</p>}

        <section className="lf-list">
          {visibleItems.length === 0 ? (
            <p className="lf-empty">
              {searchQuery.trim() ? "No close matches found." : "No found items yet."}
            </p>
          ) : (
            visibleItems.map((item) => (
              <article
                key={item.id}
                className="lf-item lf-item-link"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/lost-found/item/${item.id}`)}
                onKeyDown={(event) => handleCardKeyDown(event, item.id)}
              >
                <div className="lf-item-top">
                  <p className="lf-user">
                    Posted by{" "}
                    {item.userUsername ? (
                      <Link
                        className="lf-user-link"
                        to={`/profile/${item.userUsername}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {item.userName || item.userUsername}
                      </Link>
                    ) : (
                      <span>{item.userName || "Anonymous"}</span>
                    )}
                  </p>
                  {savedUser?.id === item.userId ? (
                    <button
                      className="lf-button secondary lf-delete-button"
                      type="button"
                      onClick={(event) => handleDelete(event, item.id)}
                    >
                      Delete
                    </button>
                  ) : item.claimedByUsername ? (
                    <span className="lf-claimed">
                      Claimed by{" "}
                      <Link
                        className="lf-user-link"
                        to={`/profile/${item.claimedByUsername}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {item.claimedByName || item.claimedByUsername}
                      </Link>
                    </span>
                  ) : (
                    <button
                      className="lf-button lf-claim-button"
                      type="button"
                      onClick={(event) => handleOpenClaim(event, item)}
                    >
                      Claim
                    </button>
                  )}
                </div>
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <div className="lf-meta">
                  <span>Hostel: {item.hostel}</span>
                  {item.location && <span>Location: {item.location}</span>}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
      {claimItem && (
        <div className="lf-modal-backdrop" onClick={handleCloseClaim}>
          <div className="lf-modal" onClick={(event) => event.stopPropagation()}>
            <h3>Confirm Claim</h3>
            <p>Upload proof of existence (optional).</p>
            <label className="lf-field">
              Proof of existence (image)
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setClaimFile(event.target.files?.[0] || null)}
              />
            </label>
            {claimError && <p className="lf-error">{claimError}</p>}
            <div className="lf-modal-actions">
              <button className="lf-button secondary" type="button" onClick={handleCloseClaim}>
                Cancel
              </button>
              <button className="lf-button" type="button" onClick={handleConfirmClaim}>
                Confirm Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Lost;