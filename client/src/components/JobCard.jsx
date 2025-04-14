import React from 'react';

const JobCard = ({ job }) => {
  return (
    <div className="job-card">
      <div className="job-header">
        <div className="company-info">
          <h2>{job.job_name}</h2>
          <h3>{job.position}</h3>
          <div className="meta">
            <span className="location">{job.location}</span>
            <span className="salary">${job.salary}</span>
          </div>
        </div>
      </div>
      
      <div className="job-details">
        {job.qualifications && (
          <>
            <h4>Qualifications:</h4>
            <p>{job.qualifications}</p>
          </>
        )}
        
        {job.benefits && (
          <>
            <h4>Benefits:</h4>
            <p>{job.benefits}</p>
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