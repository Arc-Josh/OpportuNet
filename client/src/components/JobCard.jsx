import React from 'react';

const JobCard = ({ job }) => {

  return (
    <div className="job-card">

      {/* Header */}
      <div className="job-header">
        <div className="company-logo">
          <div className="logo-placeholder">
            {job.company ? job.company[0] : "?"}
          </div>
        </div>

        <div className="company-info">
          <h2>{job.jobTitle}</h2>
          <h3>{job.company}</h3>

          <div className="meta">
            <span className="location">{job.jobLocation}</span>
            {job.salary && <span className="salary-badge">{job.salary}</span>}
          </div>
        </div>
      </div>

      {/* Description */}
      {job.description && (
      <>
        <h4>Description:</h4>
        <p>{job.description}</p>
      </>
    )}

      {/* Responsibilities */}
      {job.responsibilities?.length > 0 && (
        <>
          <h4>Responsibilities:</h4>
          <ul>
            {job.responsibilities.map((r, idx) => <li key={idx}>{r}</li>)}
          </ul>
        </>
      )}

      {/* Qualifications */}
      {job.qualifications.length > 0 && (
      <>
        <h4>Qualifications:</h4>
        <ul>
          {job.qualifications.map((q, idx) => (
            <li key={idx}>{q}</li>
          ))}
        </ul>
      </>
    )}

      {/* Preferences */}
      {job.preferences.length > 0 && (
      <>
        <h4>Preferences:</h4>
        <ul>
          {job.preferences.map((p, idx) => <li key={idx}>{p}</li>)}
        </ul>
      </>
    )}

      {/* Benefits */}
      {job.benefits.length > 0 && (
      <>
        <h4>Benefits:</h4>
        <ul>
          {job.benefits.map((b, idx) => <li key={idx}>{b}</li>)}
        </ul>
      </>
    )}

      {job.application_link && (
        <div className="job-link">
          <a href={job.application_link} target="_blank" rel="noopener noreferrer">
            View Full Job Posting
          </a>
        </div>
      )}
    </div>
  );
};

export default JobCard;
