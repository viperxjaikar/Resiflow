import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RequestForm.css";

function RequestForm({ user, fullPage }) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    otherCategory: "",
    description: "",
    image: null
  });
const [successMessage, setSuccessMessage] = useState("");
const [errorMessage, setErrorMessage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const categories = ["medicines", "food", "electronic items", "sports resources", "other"];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.category) {
      alert("Please fill in all required fields");
      return;
    }

    if (formData.category === "other" && !formData.otherCategory) {
      alert("Please specify the other category");
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append("requesterId", user.id);
    formDataToSend.append("title", formData.title);
    formDataToSend.append("category", formData.category === "other" ? formData.otherCategory : formData.category);
    formDataToSend.append("description", formData.description || "");

    if (formData.image) {
      formDataToSend.append("image", formData.image);
    }

    try {
      await axios.post("http://localhost:5000/api/requests", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      setSuccessMessage("✅ Request added successfully!");
setErrorMessage("");
      // Reset form
      setFormData({
        title: "",
        category: "",
        otherCategory: "",
        description: "",
        image: null
      });
      setImagePreview(null);

    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Error submitting request. Please try again.");
    }
  };

  const formContent = (
    <>
      <h3>Request Resources</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">What do you need? *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g., Paracetamol tablets, Rice, Laptop charger"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="category">Category *</label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
          >
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {formData.category === "other" && (
          <div className="form-group">
            <label htmlFor="otherCategory">Please specify *</label>
            <input
              type="text"
              id="otherCategory"
              name="otherCategory"
              value={formData.otherCategory}
              onChange={handleInputChange}
              placeholder="e.g., Clothing, Books, Tools"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="description">Description (Optional)</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide more details about what you need..."
            rows="4"
          />
        </div>

        <div className="form-group">
          <label htmlFor="image">Add Image (Optional)</label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
          />
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" style={{ maxWidth: "200px", maxHeight: "200px" }} />
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary">Submit Request</button>
      </form>
    </>
  );

  if (fullPage) {
    return (
      <div className="request-form-fullpage">
        <div className="request-form request-form-modal">
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="request-form">
      {formContent}
    </div>
  );
}

export default RequestForm;