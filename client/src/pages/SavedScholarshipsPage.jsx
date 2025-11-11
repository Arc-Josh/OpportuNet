// pages/SavedScholarshipsPage.jsx
import React, { useEffect, useState } from "react";
import { getToken } from "../storage/token";
import "../styles/savedScholarshipsStyles.css";

const SavedScholarshipsPage = () => {
  const [savedScholarships, setSavedScholarships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedScholarships();
  }, []);

  const fetchSavedScholarships = async () => {
    try {
      const token = getToken();
      const response = await fetch("http://localhost:8000/saved-scholarships", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch saved scholarships");

      const data = await response.json();
      setSavedScholarships(data);
    } catch (error) {
      console.error("Error fetching saved scholarships:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (scholarshipId) => {
    try {
      const token = getToken();
      const response = await fetch(
        `http://localhost:8000/saved-scholarships/${scholarshipId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Failed to remove scholarship");

      setSavedScholarships((prev) =>
        prev.filter((sch) => sch.scholarship_id !== scholarshipId)
      );
    } catch (error) {
      console.error("Error removing scholarship:", error);
    }
  };

  if (loading) return <p className="loading">Loading saved scholarships...</p>;

  return (
    <div className="saved-scholarships-container">
      <h2 className="saved-title">Saved Scholarships</h2>

      {savedScholarships.length > 0 ? (
        <div className="saved-scholarships-list">
          {savedScholarships.map((sch) => (
            <div key={sch.scholarship_id} className="saved-card">
              {console.log(sch)}
              {/* Logo placeholder */}
              <div className="company-logo">
                <div className="logo-placeholder">
                  {sch.scholarship_title ? sch.scholarship_title[0] : "?"}
                </div>
              </div>

              {/* Details */}
              <div className="saved-info">
              <h3>{sch.scholarship_title}</h3>
              <div className="meta">
              {sch.amount && (
                <div className="meta-item">
                  <strong>Amount:</strong> {sch.amount}
                  </div>
                )}
                {sch.deadline && (
                <div className="meta-item">
                    <strong>Deadline:</strong> {sch.deadline}
                  </div>
                )}
              </div>
            </div>

              {/* Actions */}
              <div className="job-actions">
                  <a
                    href={sch.url || `https://www.google.com/search?q=${encodeURIComponent(sch.scholarship_title + ' apply')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="apply-link"
                  >
                    Apply Here
                  </a>
                
                <button
                  className="remove-btn"
                  onClick={() => handleRemove(sch.scholarship_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-jobs">No saved scholarships yet.</p>
      )}
    </div>
  );
};

export default SavedScholarshipsPage;
