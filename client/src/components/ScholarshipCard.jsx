// components/ScholarshipCard.jsx
import React from "react";

const ScholarshipCard = ({ scholarship }) => {
  return (
    <div className="job-card">
      {/* Header */}
      <div className="job-header">
        <div className="company-logo">
          <div className="logo-placeholder">
            {scholarship.provider ? scholarship.provider[0] : "?"}
          </div>
        </div>
        <div className="company-info">
          <h2>{scholarship.name}</h2>
          <h3>{scholarship.provider || "Unknown Provider"}</h3>
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

        {scholarship.eligibility && (
          <>
            <h4>Eligibility:</h4>
            <p>{scholarship.eligibility}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default ScholarshipCard;
