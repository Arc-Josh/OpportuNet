// components/Scholarship.jsx
import React, { useState, useEffect } from "react";
import ScholarshipCard from "./ScholarshipCard";
import ScholarshipFilters from "../components/ScholarshipFilters";
import "../styles/dashboardStyles.css";
import { getToken } from "../storage/token";

const Scholarship = () => {
  const [scholarships, setScholarships] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    q: "",
    min_amount: "",
    max_amount: "",
    deadline_before: "",
    deadline_after: "",
  });

  const fetchScholarships = async (filters) => {
    try {
      setLoading(true);
      setError(null);

      const token = getToken();
      if (!token) throw new Error("No authentication token found");

      const params = new URLSearchParams();
      if (filters.q) params.append("q", filters.q);
      if (filters.min_amount) params.append("min_amount", filters.min_amount);
      if (filters.max_amount) params.append("max_amount", filters.max_amount);
      if (filters.deadline_before) params.append("deadline_before", filters.deadline_before);
      if (filters.deadline_after) params.append("deadline_after", filters.deadline_after);

      const response = await fetch(
        `http://localhost:8000/scholarships?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok)
        throw new Error(`Failed to fetch scholarships: ${response.status}`);

      const data = await response.json();
      setScholarships(data);
      setCurrentIndex(0);
    } catch (err) {
      setError(err.message);
      console.error("Scholarship fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships(filters);
  }, []);

  const applyFilters = () => {
    fetchScholarships(filters);
  };

  const handleSave = async () => {
    try {
      const token = getToken();
      const scholarship = scholarships[currentIndex];

      const response = await fetch(
        `http://localhost:8000/save-scholarship/${scholarship.scholarship_id}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error(data.detail || "Failed to save scholarship");
      }
    } catch (error) {
      console.error("Save scholarship error:", error);
    }

    goToNextScholarship();
  };

  const handleSkip = () => {
    goToNextScholarship();
  };

  const goToNextScholarship = () => {
    setCurrentIndex((prev) =>
      prev < scholarships.length - 1 ? prev + 1 : 0
    );
  };

  if (loading) return <div className="loading">Loading scholarships...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="dashboard-container">
      <ScholarshipFilters currentFilters={filters} onFilterApply={(newFilters) => { setFilters(newFilters); applyFilters(); }} />

      <div className="job-view">
        {scholarships.length > 0 ? (
          <>
            <ScholarshipCard scholarship={scholarships[currentIndex]} />
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
            <p>No scholarships found matching your criteria.</p>
            <button onClick={() => setFilters({})}>Reset Filters</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scholarship;
