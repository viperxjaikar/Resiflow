import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./ResponseSharing.css";

function ResponseSharing({ user, onNotificationUpdate }) {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [pickupDescription, setPickupDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAllHostels, setShowAllHostels] = useState(false);
  const [dismissedRequests, setDismissedRequests] = useState(() => {
    const saved = localStorage.getItem("dismissedRequests_" + user?.id);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user, showAllHostels]);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, dismissedRequests]);

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/requests`, {
        params: {
          userId: user.id,
          userHostel: user.hostel,
          userRole: user.role,
          showAll: showAllHostels
        }
      });
      setRequests(response.data.requests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests.filter(req => !dismissedRequests.includes(req.id));
    
    if (!searchTerm) {
      setFilteredRequests(filtered);
      return;
    }

    filtered = filtered.filter(request =>
      request.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.sender_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRequests(filtered);
  };

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    setShowResponseForm(false);
    setPickupDescription("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
    setShowResponseForm(false);
  };

  const handleDoYouHaveIt = () => {
    setShowResponseForm(true);
  };

  const handleAccept = async () => {
    if (!pickupDescription.trim()) {
      alert("Please enter pickup description");
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/requests/${selectedRequest.id}/respond`, {
        responderId: user.id,
        pickupDescription
      });
      alert("Response sent successfully!");
      // Remove request from UI immediately after responding
      setRequests((prev) => prev.filter((request) => request.id !== selectedRequest.id));
      setFilteredRequests((prev) => prev.filter((request) => request.id !== selectedRequest.id));
      handleCloseModal();
      // Refresh notifications in parent component
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
    } catch (error) {
      console.error("Error responding to request:", error);
      alert("Error sending response");
    }
  };

  const handleDirectAccept = async () => {
    try {
      await axios.put(`http://localhost:5000/api/requests/${selectedRequest.id}/accept`, {
        accepterId: user.id
      });
      alert("Request accepted successfully!");
      // Remove request from UI immediately after accepting
      setRequests((prev) => prev.filter((request) => request.id !== selectedRequest.id));
      setFilteredRequests((prev) => prev.filter((request) => request.id !== selectedRequest.id));
      handleCloseModal();
      // Refresh notifications in parent component
      if (onNotificationUpdate) {
        onNotificationUpdate();
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      alert("Error accepting request");
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (window.confirm("Are you sure you want to delete this request?")) {
      try {
        await axios.delete(`http://localhost:5000/api/requests/${requestId}`, {
          data: { userId: user.id }
        });
        fetchRequests();
      } catch (error) {
        console.error("Error deleting request:", error);
        alert("Error deleting request");
      }
    }
  };

  const handleDismissRequest = (requestId) => {
    const updated = [...dismissedRequests, requestId];
    setDismissedRequests(updated);
    localStorage.setItem("dismissedRequests_" + user.id, JSON.stringify(updated));
  };

  if (!user) {
    return (
      <div className="resource-sharing">
        <nav className="navbar">
          <h1 className="logo">THE HOSTEL</h1>
          <Link to="/login" className="btn-primary">Login</Link>
        </nav>
        <div className="hero">
          <h2>Please login to access resource sharing</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="resource-sharing">
      {/* Navbar */}
      <nav className="navbar">
        <h1 className="logo">THE HOSTEL</h1>
        <div className="nav-links">
          <Link to="/" className="nav-link">Home</Link>
          <span className="user-info">Welcome, {user.name} ({user.hostel})</span>
          <button className="btn-primary" onClick={() => window.location.href = "/"}>Logout</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container">
        <h2>Resource Sharing Requests</h2>

        {/* Search and filter */}
        <div className="search-container">
          <input
            type="text"
            placeholder="Search by category, item name, or sender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button
            className="btn-secondary"
            onClick={() => setShowAllHostels((prev) => !prev)}
            style={{ marginLeft: '12px' }}
          >
            {showAllHostels ? 'Show hostel only' : 'Show all hostels'}
          </button>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="loading">Loading requests...</div>
        ) : (
          <div className="requests-list">
            {filteredRequests.length === 0 ? (
              <div className="no-requests">
                {searchTerm ? "No requests match your search." : "No active requests found."}
              </div>
            ) : (
              filteredRequests.map(request => (
                <div key={request.id} className="request-card">
                  <div className="request-content" onClick={() => handleRequestClick(request)}>
                    <div className="request-header">
                      <span className="sender">{request.sender_name} from {request.hostel}</span>
                      <span className="category">{request.category}</span>
                    </div>
                    <div className="request-body">
                      <h3>wants {request.item_name}</h3>
                    </div>
                  </div>
                  <div className="request-actions">
                    {request.sender_id === user.id && (
                      <button
                        className="delete-btn"
                        title="Delete your request"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRequest(request.id);
                        }}
                      >
                        🗑️
                      </button>
                    )}
                    <button
                      className="dismiss-btn"
                      title="Don't have it - hide from view"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDismissRequest(request.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedRequest.sender_name} from {selectedRequest.hostel} wants {selectedRequest.item_name}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="request-details">
                <p><strong>Category:</strong> {selectedRequest.category}</p>
                {selectedRequest.description && (
                  <p><strong>Description:</strong> {selectedRequest.description}</p>
                )}
                {selectedRequest.image_url && (
                  <div className="image-container">
                    <img src={selectedRequest.image_url} alt={selectedRequest.item_name} />
                  </div>
                )}
              </div>

              {!showResponseForm ? (
                <div className="action-buttons">
                  <button className="btn-primary" onClick={handleDoYouHaveIt}>
                    Do you have it?
                  </button>
                  
                </div>
              ) : (
                <div className="response-form">
                  <h4>Pickup Details</h4>
                  <textarea
                    placeholder="Describe where and when the sender can pick up the item..."
                    value={pickupDescription}
                    onChange={(e) => setPickupDescription(e.target.value)}
                    rows={4}
                  />
                  <button className="btn-primary"  onClick={handleAccept}>
                    Accept
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResponseSharing;