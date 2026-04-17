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

function Found() {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState(null);
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
        const response = await fetch("http://localhost:5000/api/lostfound/lost");
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("API returned non-JSON response. Is the server running on port 5000?");
        }
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Unable to fetch items");
        }
        setItems(result.items || []);
      } catch (err) {
        setError(err.message);
      }
    };

    loadItems();
  }, []);

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
          <p className="lf-eyebrow">Found Flow</p>
          <h1 className="lf-title">Check what others lost</h1>
          <p className="lf-subtitle">
            Browse lost posts from other users. If nothing matches, post what you found.
          </p>
        </header>

        <div className="lf-toolbar">
          <div className="lf-post">
            <p>Didn't find anything? Post here.</p>
            <button className="lf-button" type="button" onClick={() => navigate("/lost-found/post/found")}>Post</button>
          </div>

          <div className="lf-search">
            <input
              type="text"
              placeholder="Search lost items"
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
              {searchQuery.trim() ? "No close matches found." : "No lost items yet."}
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
                  {savedUser?.id === item.userId && (
                    <button
                      className="lf-button secondary lf-delete-button"
                      type="button"
                      onClick={(event) => handleDelete(event, item.id)}
                    >
                      Delete
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
    </div>
  );
}

export default Found;