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
    search: '',
    company: '',
    salaryMin: '',
    salaryMax: '',
    location: '',
    locationType: '',   
    position: '',       
    sort: 'new',
    page: 1,
    pageSize: 25,
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
      if (filters.salaryMin) params.append('min_salary', String(filters.salaryMin));
      if (filters.salaryMax) params.append('max_salary', String(filters.salaryMax));
      if (filters.location) params.append('location', filters.location);
      if (filters.position) params.append('position', filters.position);
      if (filters.locationType) params.append('location_type', filters.locationType);
      if (filters.search) params.append('search', filters.search);
      if (filters.company) params.append('company', filters.company);
      if (filters.sort) params.append('sort', filters.sort);         
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('page_size', String(filters.pageSize));

      params.append("sort", filters.sort || "new");
      params.append("page", filters.page || 1);
      params.append("page_size", filters.pageSize || 25);

      const response = await fetch(`http://localhost:8000/jobs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch jobs: ${response.status}`);
      }

      const data = await response.json();

  
      const normalizeList = (val) => {
        if (!val) return [];
        return val
          .split("\n")
          .map(line => line.replace(/^•\s*/, "").trim())
          .filter(Boolean);
      };
      
      const normalizedJobs = data.map(job => ({
        job_id: job.job_id,
        jobTitle: job.job_name ?? "Untitled Job",
        company: job.company_name ?? "Unknown Company",
        jobLocation: job.location ?? "N/A",
        jobUrl: job.application_link ?? null,
        salary: job.salary ?? "Not Specified",
        description: job.description ?? "",
      
        responsibilities: normalizeList(job.responsibilities),
        qualifications: normalizeList(job.qualifications),
        preferences: normalizeList(job.preferences),
        benefits: normalizeList(job.benefits),
      
        mission_statement: job.mission_statement ?? "",
        hr_contact_number: job.hr_contact_number ?? ""
      }));

      setJobs(normalizedJobs);
      setCurrentJobIndex(0);
      console.log("Raw job response:", data[0]);
      console.log("Normalized job:", normalizedJobs[0]);
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

      if (!response.ok) {
        const data = await response.json();
        console.error("Save job error:", data.detail || "Failed to save job");
      }
    } catch (error) {
      console.error("Save job error:", error);
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
