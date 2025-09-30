import React, { useState, useEffect } from 'react';
import JobCard from './JobCard';
import Filters from './Filters';
import '../styles/dashboardStyles.css';
import { getToken } from '../storage/token';

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [currentJobIndex, setCurrentJobIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    salary: '',
    location: '',
    position: ''
  });

  const fetchJobs = async (filters) => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) throw new Error('No authentication token found');

      const params = new URLSearchParams();
      if (filters.salary) params.append('salary', filters.salary.replace('k', '000'));
      if (filters.location) params.append('location', filters.location);
      if (filters.position) params.append('position', filters.position);

      const response = await fetch(`http://localhost:8000/jobs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const data = await response.json();

      // Normalize data to match JobCard fields
      const normalizedJobs = data.map(job => ({
        job_id: job.job_id,
        jobTitle: job.jobTitle || job.job_name || "Untitled Job",
        company: job.company || "Unknown Company",
        jobLocation: job.jobLocation || job.location || "N/A",
        jobUrl: job.jobUrl || null,
        salary: job.salary || "Not Specified",
        description: job.description || "",
        benefits: job.benefits || "",
        qualifications: job.qualifications || "",
        preferences: job.preferences || "",
        mission_statement: job.mission_statement || "",
        hr_contact_number: job.hr_contact_number || ""
      }));

      setJobs(normalizedJobs);
      setCurrentJobIndex(0);
    } catch (err) {
      setError(err.message);
      console.error("Job fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs(filters);
  }, [filters]);

  const handleSave = async () => {
    try {
      const token = getToken();
      const job = jobs[currentJobIndex];
  
      const response = await fetch(`http://localhost:8000/save-job/${job.job_id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        alert("Job saved successfully!");
      } else {
        const data = await response.json();
        alert(data.detail || "Failed to save job");
      }
    } catch (error) {
      console.error("Save job error:", error);
      alert("Error saving job");
    }
  
    goToNextJob();
  };

  const handleSkip = () => {
    goToNextJob();
  };

  const goToNextJob = () => {
    setCurrentJobIndex(prev => (prev < jobs.length - 1 ? prev + 1 : 0));
  };

  if (loading) return <div className="loading">Loading jobs...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <Filters currentFilters={filters} onFilterChange={setFilters} />

      <div className="job-view">
        {jobs.length > 0 ? (
          <>
            <JobCard job={jobs[currentJobIndex]} />
            <div className="action-buttons">
              <button onClick={handleSkip} className="reject-btn">
                <span className="icon">✕</span>
              </button>
              <button onClick={handleSave} className="apply-btn">
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
