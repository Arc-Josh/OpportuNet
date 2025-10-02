import React, { useState } from "react";
import "../styles/dashboardStyles.css";

const ScholarshipFilters = ({ currentFilters, onFilterChange }) => {
  const [filters, setFilters] = useState(currentFilters);

  const handleChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
    onFilterChange(updated);
  };

  return (
    <div className="filters-panel">
      <h3 className="filters-title">Scholarship Filters</h3>

      {/* Field of Study */}
      <div className="filter-group">
        <label>Field of Study</label>
        <div>
          <input
            type="checkbox"
            checked={filters.field?.includes("CS") || false}
            onChange={(e) => {
              const newFields = e.target.checked
                ? [...(filters.field || []), "CS"]
                : (filters.field || []).filter((f) => f !== "CS");
              handleChange("field", newFields);
            }}
          />
          Computer Science
        </div>
        <div>
          <input
            type="checkbox"
            checked={filters.field?.includes("IT") || false}
            onChange={(e) => {
              const newFields = e.target.checked
                ? [...(filters.field || []), "IT"]
                : (filters.field || []).filter((f) => f !== "IT");
              handleChange("field", newFields);
            }}
          />
          Information Technology
        </div>
      </div>

      {/* Deadline */}
      <div className="filter-group">
        <label>Deadline</label>
        <input
          type="date"
          value={filters.deadline || ""}
          onChange={(e) => handleChange("deadline", e.target.value)}
        />
      </div>

      {/* GPA Requirement */}
      <div className="filter-group">
        <label>GPA Requirement</label>
        <select
          value={filters.gpa || ""}
          onChange={(e) => handleChange("gpa", e.target.value)}
        >
          <option value="">Any</option>
          <option value="2.5">2.5+</option>
          <option value="3.0">3.0+</option>
          <option value="3.5">3.5+</option>
        </select>
      </div>

      {/* Location */}
      <div className="filter-group">
        <label>Location</label>
        <select
          value={filters.location || ""}
          onChange={(e) => handleChange("location", e.target.value)}
        >
          <option value="">Any</option>
          <option value="US">United States</option>
          <option value="Canada">Canada</option>
          <option value="Remote">Remote / Global</option>
        </select>
      </div>

      {/* Funding Amount */}
      <div className="filter-group">
        <label>Funding Amount ($)</label>
        <input
          type="range"
          min="500"
          max="50000"
          step="500"
          value={filters.amount || 5000}
          onChange={(e) => handleChange("amount", e.target.value)}
        />
        <span>{filters.amount || 5000}</span>
      </div>

      {/* Residency Status */}
      <div className="filter-group">
        <label>Residency Status</label>
        <select
          value={filters.residency || ""}
          onChange={(e) => handleChange("residency", e.target.value)}
        >
          <option value="">Any</option>
          <option value="Citizen">Citizen</option>
          <option value="Permanent Resident">Permanent Resident</option>
          <option value="International">International Student</option>
        </select>
      </div>

      <button
        className="reset-filters"
        onClick={() => {
          setFilters({});
          onFilterChange({});
        }}
      >
        Reset Filters
      </button>
    </div>
  );
};

export default ScholarshipFilters;
