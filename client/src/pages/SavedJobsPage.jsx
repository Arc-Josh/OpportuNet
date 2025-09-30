// pages/SavedJobsPage.jsx
import React, { useEffect, useState } from "react";
import { getToken } from "../storage/token";
import "../styles/savedJobsStyles.css";

const SavedJobsPage = () => {
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedJobs();
  }, []);

  const fetchSavedJobs = async () => {
    try {
      const token = getToken();
      const response = await fetch("http://localhost:8000/saved-jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch saved jobs");

      const data = await response.json();
      setSavedJobs(data);
    } catch (error) {
      console.error("Error fetching saved jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (jobId) => {
    try {
      const token = getToken();
      const response = await fetch(`http://localhost:8000/saved-jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to remove job");

      setSavedJobs((prev) => prev.filter((job) => job.job_id !== jobId));
    } catch (error) {
      console.error("Error removing job:", error);
    }
  };

  if (loading) return <p className="loading">Loading saved jobs...</p>;

  return (
    <div className="saved-jobs-container">
      <h2 className="saved-title">Saved Jobs</h2>

      {savedJobs.length > 0 ? (
        <div className="saved-jobs-list">
          {savedJobs.map((job) => (
            <div key={job.job_id} className="saved-card">
              {/* Header with logo + info */}
              <div className="saved-header">
                <div className="logo-placeholder">
                  {job.company_name ? job.company_name[0] : "?"}
                </div>
                <div>
                  <h3>{job.job_name}</h3>
                  <p>{job.company_name}</p>
                  <div className="meta">
                    <span>{job.location}</span>
                    <span className="salary-badge">{job.salary}</span>
                  </div>
                </div>
              </div>

              {/* Actions row */}
              <div className="job-actions">
                {job.application_link && (
                  <a
                    href={job.application_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="apply-link"
                  >
                    Apply Here
                  </a>
                )}

                <button
                  className="remove-btn"
                  onClick={() => handleRemove(job.job_id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-jobs">No saved jobs yet.</p>
      )}
    </div>
  );
};

export default SavedJobsPage;
