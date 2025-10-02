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
              {/* Logo */}
              <div className="company-logo">
                <div className="logo-placeholder">
                  {sch.provider ? sch.provider[0] : "?"}
                </div>
              </div>

              {/* Details */}
              <div className="saved-info">
                <h3>{sch.name}</h3>
                <p>{sch.provider}</p>
                <div className="meta">
                  <span>{sch.deadline}</span>
                  <span className="salary-badge">{sch.amount}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="job-actions">
                {sch.application_link && (
                  <a
                    href={sch.application_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="apply-link"
                  >
                    Apply Here
                  </a>
                )}
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
