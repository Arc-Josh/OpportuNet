import React from 'react';

const JobCard = ({ job }) => {
  return (
    <div className="job-card">
      {/* Header Section */}
      <div className="job-header">
        <div className="company-logo">
          {/* Placeholder for logo, you can replace with job.companyLogo if available */}
          <div className="logo-placeholder">{job.company ? job.company[0] : "?"}</div>
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

      {/* Job Details */}
      <div className="job-details">
        {job.description && (
          <>
            <h4>Description:</h4>
            <p>{job.description}</p>
          </>
        )}

        {job.qualifications && (
          <>
            <h4>Qualifications:</h4>
            <ul>
              {job.qualifications.split(',').map((q, idx) => (
                <li key={idx}>{q.trim()}</li>
              ))}
            </ul>
          </>
        )}

        {job.preferences && (
          <>
            <h4>Preferences:</h4>
            <ul>
              {job.preferences.split(',').map((p, idx) => (
                <li key={idx}>{p.trim()}</li>
              ))}
            </ul>
          </>
        )}

        {job.benefits && (
          <>
            <h4>Benefits:</h4>
            <ul>
              {job.benefits.split(',').map((b, idx) => (
                <li key={idx}>{b.trim()}</li>
              ))}
            </ul>
          </>
        )}

        {job.mission_statement && (
          <>
            <h4>Mission:</h4>
            <p>{job.mission_statement}</p>
          </>
        )}
        
      </div>

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
