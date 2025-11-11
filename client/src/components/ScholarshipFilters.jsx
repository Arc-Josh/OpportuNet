import React, { useState } from "react";
import "../styles/dashboardStyles.css";

const ScholarshipFilters = ({ currentFilters, onFilterApply }) => {
  const [filters, setFilters] = useState(currentFilters);

  const handleChange = (key, value) => {
    const updated = { ...filters, [key]: value };
    setFilters(updated);
  };

  return (
    <div className="filters-panel">
      <h3 className="filters-title">Scholarship Filters</h3>

      {/* Search */}
      <div className="filter-group">
        <label>Keyword Search</label>
        <input
          type="text"
          placeholder="e.g. Women in STEM, Cybersecurity"
          value={filters.q || ""}
          onChange={(e) => handleChange("q", e.target.value)}
        />
      </div>

      {/* Funding Amount */}
      <div className="filter-group">
        <label>Minimum Amount ($)</label>
        <input
          type="number"
          value={filters.min_amount || ""}
          onChange={(e) => handleChange("min_amount", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Maximum Amount ($)</label>
        <input
          type="number"
          value={filters.max_amount || ""}
          onChange={(e) => handleChange("max_amount", e.target.value)}
        />
      </div>

      {/* Deadline */}
      <div className="filter-group">
        <label>Deadline On/Before</label>
        <input
          type="date"
          value={filters.deadline_before || ""}
          onChange={(e) => handleChange("deadline_before", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Deadline On/After</label>
        <input
          type="date"
          value={filters.deadline_after || ""}
          onChange={(e) => handleChange("deadline_after", e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <div className="filter-actions">
        <button
          className="apply-filters"
          onClick={() => onFilterApply(filters)}
        >
          Apply Filters
        </button>

        <button
          className="reset-filters"
          onClick={() => {
            const reset = {
              q: "",
              min_amount: "",
              max_amount: "",
              deadline_before: "",
              deadline_after: "",
            };
            setFilters(reset);
            onFilterApply(reset);
          }}
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default ScholarshipFilters;
