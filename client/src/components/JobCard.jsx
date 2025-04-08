import React from 'react';

const JobCard = ({ job }) => {
  return (
    <div className="job-card">
      <div className="job-header">
        <div className="company-info">
          <h2>{job.title}</h2>
          <h3>{job.company}</h3>
          <div className="meta">
            <span className="location">{job.location}</span>
            <span className="salary">{job.salary}</span>
            <span className="posted">{job.posted}</span>
          </div>
        </div>
      </div>
      
      <div className="job-details">
        <p className="description">{job.description}</p>
        
        <div className="skills">
          {job.skills.map((skill, index) => (
            <span key={index} className="skill-tag">{skill}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JobCard;