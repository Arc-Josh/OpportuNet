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
          {scholarship.url ? (
            <h2>
              <a href={scholarship.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", color: "#1976d2" }}>
                {title}
              </a>
            </h2>
          ) : (
            <h2>{title}</h2>
          )}
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

        {scholarship.eligibility && (() => {
          const items = (scholarship.eligibility || '')
            .split(/\n|;/g)
            .map(s => s.replace(/^[\s*•\-]+/, '').trim())
            .filter(Boolean);
          return (
            <>
              <h4>Eligibility:</h4>
              {items.length > 0 ? (
                <ul className="eligibility-list">
                  {items.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              ) : (
                <p>{scholarship.eligibility}</p>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default ScholarshipCard;
