import React from "react";

const ScholarshipCard = ({ scholarship }) => {
  // Support both legacy (name, provider) and canonical (scholarship_title) fields
  const title = scholarship.scholarship_title || scholarship.name || "Untitled Scholarship";
  const provider = scholarship.provider || null;
  
  return (
    <div className="job-card">
      {/* Header */}
      <div className="job-header">
        <div className="company-logo">
          <div className="logo-placeholder">
            {title ? title[0].toUpperCase() : "S"}
          </div>
        </div>
        <div className="company-info">
          <h2>{title}</h2>
          {provider && <h3>{provider}</h3>}
          <div className="meta">
            {scholarship.deadline && <span>Deadline: {scholarship.deadline}</span>}
            {scholarship.amount && (
              <span className="salary-badge">{scholarship.amount}</span>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="job-details">
        {scholarship.description && (
          <>
            <h4>Description:</h4>
            <p>{scholarship.description}</p>
          </>
        )}

        {scholarship.details && (
          <>
            <h4>Details:</h4>
            <p>{scholarship.details}</p>
          </>
        )}

        {scholarship.eligibility && (
          <>
            <h4>Eligibility:</h4>
            <p>{scholarship.eligibility}</p>
          </>
        )}

        {scholarship.url && (
          <div className="apply-section">
            <a href={scholarship.url} target="_blank" rel="noopener noreferrer" className="apply-button">
              View Scholarship
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScholarshipCard;
