import React, { useState } from "react";
import "../styles/dashboardStyles.css";

const ScholarshipFilters = ({ currentFilters, onFilterApply }) => {
  const [filters, setFilters] = useState(currentFilters);

  const update = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    const reset = {
      q: "",
      min_amount: "",
      max_amount: "",
      deadline_before: ""
    };
    setFilters(reset);
    onFilterApply(reset);
  };

  return (
    <div className="filters-panel">
      <h3 className="filters-title">Scholarship Filters</h3>

      {/* Keyword Search */}
      <div className="filter-group">
        <label>Keyword Search</label>
        <input
          type="text"
          placeholder="e.g. STEM, Women, First-gen"
          value={filters.q || ""}
          onChange={(e) => update("q", e.target.value)}
        />
      </div>

      {/* Min & Max Amount */}
      <div className="filter-group">
        <label>Minimum Amount ($)</label>
        <input
          type="number"
          value={filters.min_amount || ""}
          onChange={(e) => update("min_amount", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Maximum Amount ($)</label>
        <input
          type="number"
          value={filters.max_amount || ""}
          onChange={(e) => update("max_amount", e.target.value)}
        />
      </div>

      {/* Deadline */}
      <div className="filter-group">
        <label>Deadline On or Before</label>
        <input
          type="date"
          value={filters.deadline_before || ""}
          onChange={(e) => update("deadline_before", e.target.value)}
        />
      </div>

      {/* Buttons */}
      <button className="apply-filters" onClick={() => onFilterApply(filters)}>
        Apply Filters
      </button>

      <button className="reset-filters" onClick={resetFilters}>
        Reset Filters
      </button>
    </div>
  );
};

export default ScholarshipFilters;
