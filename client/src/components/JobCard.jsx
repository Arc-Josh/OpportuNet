import React from 'react';

const JobCard = ({ job }) => {
  return (
    <div className="job-card">
      <div className="job-header">
        <div className="company-logo">
          {/* Placeholder for logo, can replace with real logo field */}
          <div className="logo-placeholder">{job.job_name[0]}</div>
        </div>
        <div className="company-info">
          <h2>{job.job_name}</h2>
          <h3>{job.position}</h3>
          <div className="meta">
            <span className="location">{job.location}</span>
            <span className="salary-badge">${job.salary}</span>
          </div>
        </div>
      </div>
      
      <div className="job-details">
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
        
        {job.hr_contact_number && (
          <div className="contact">
            <h4>Contact:</h4>
            <p>{job.hr_contact_number}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCard;
