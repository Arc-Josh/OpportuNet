import React, { useState, useEffect } from 'react';
import JobCard from './JobCard';
import Filters from './Filters';
import '../styles/dashboardStyles.css';

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [filters, setFilters] = useState({
    salary: '',
    location: '',
    experience: ''
  });

  // Mock data - will be replaced with API call
  useEffect(() => {
    const mockJobs = [
      {
        id: 1,
        title: "Frontend Developer (React)",
        company: "Tech Innovations Inc.",
        location: "Remote",
        salary: "$90,000 - $120,000",
        description: "We're looking for a React developer with 3+ years experience to join our team building cutting-edge web applications.",
        posted: "2 days ago",
        skills: ["React", "JavaScript", "CSS"]
      },
      {
        id: 2,
        title: "Backend Engineer (Python)",
        company: "DataSystems Corp",
        location: "San Francisco, CA",
        salary: "$110,000 - $140,000",
        description: "Join our backend team to develop scalable microservices using Python and FastAPI.",
        posted: "1 week ago",
        skills: ["Python", "FastAPI", "AWS"]
      }
    ];
    setJobs(mockJobs);
  }, []);

  const handleApply = () => {
    console.log("Applied to:", jobs[currentJobIndex]);
    goToNextJob();
  };

  const handleReject = () => {
    console.log("Rejected:", jobs[currentJobIndex]);
    goToNextJob();
  };

  const goToNextJob = () => {
    if (currentJobIndex < jobs.length - 1) {
      setCurrentJobIndex(currentJobIndex + 1);
    } else {
      alert("You've seen all available jobs! Check back later or adjust your filters.");
      setCurrentJobIndex(0); // Reset or fetch more jobs
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Here you would typically fetch jobs with these filters
    console.log("Filters updated:", newFilters);
  };

  return (
    <div className="dashboard-container">
      <Filters currentFilters={filters} onFilterChange={handleFilterChange} />
      
      <div className="job-view">
        {jobs.length > 0 ? (
          <>
            <JobCard job={jobs[currentJobIndex]} />
            <div className="action-buttons">
              <button onClick={handleReject} className="reject-btn">
                <span className="icon">✕</span>
              </button>
              <button onClick={handleApply} className="apply-btn">
                <span className="icon">✓</span>
              </button>
            </div>
          </>
        ) : (
          <div className="no-jobs">
            <p>No jobs found matching your criteria.</p>
            <button onClick={() => setFilters({})}>Reset Filters</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;