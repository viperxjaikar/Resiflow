import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./LostFound.css";

const getSavedUser = () => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function LostFoundPost() {
  const { type } = useParams();
  const navigate = useNavigate();
  const savedUser = useMemo(getSavedUser, []);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    imageFile: null,
  });
  const [status, setStatus] = useState(null);

  const itemType = type === "found" ? "found" : "lost";
  const heading = itemType === "lost" ? "Post a Lost Item" : "Post a Found Item";

  const handleChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "image") {
      setFormData((prev) => ({ ...prev, imageFile: files && files[0] ? files[0] : null }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus(null);

    const payload = new FormData();
    payload.append("itemType", itemType);
    payload.append("title", formData.title);
    payload.append("description", formData.description);
    payload.append("location", formData.location);
    payload.append("userId", savedUser?.id || "");
    payload.append("hostel", savedUser?.hostel || "H4");
    if (formData.imageFile) {
      payload.append("image", formData.imageFile);
    }

    try {
      const response = await fetch("http://localhost:5000/api/lostfound", {
        method: "POST",
        body: payload,
      });

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("API returned non-JSON response.");
      }

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create post");
      }

      setStatus({ success: true });
      navigate(`/lost-found/item/${result.item.id}`);
    } catch (error) {
      setStatus({ error: error.message });
    }
  };

  return (
    <div className="lf-page">
      <div className="lf-shell">
        <header className="lf-header">
          <h1 className="lf-title">{heading}</h1>
          <p className="lf-subtitle">
            Share the details so others can match it quickly.
          </p>
        </header>

        <form className="lf-form" onSubmit={handleSubmit}>
          <label className="lf-field">
            Item Name
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Blue water bottle"
              required
            />
          </label>

          <label className="lf-field">
            Item Description
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Size, brand, any distinctive marks"
              rows={4}
              required
            />
          </label>

          <label className="lf-field">
            Location (where to come?)
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Hostel lobby, security desk"
              required
            />
          </label>

          <label className="lf-field">
            Image (optional)
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
            />
          </label>

          {status?.error && <p className="lf-error">{status.error}</p>}
          {status?.success && <p className="lf-success">Posted successfully.</p>}

          <button className="lf-button" type="submit">Post</button>
        </form>
      </div>
    </div>
  );
}

export default LostFoundPost;
