import React from 'react';

const Filters = ({ currentFilters, onFilterChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange({ ...currentFilters, [name]: value });
  };

  return (
    <div className="filters-panel">
      <h3>Filter Jobs</h3>
      
      <div className="filter-group">
        <label>Salary Range</label>
        <select 
          name="salary" 
          value={currentFilters.salary} 
          onChange={handleChange}
        >
          <option value="">Any Salary</option>
          <option value="50k">$50,000+</option>
          <option value="80k">$80,000+</option>
          <option value="100k">$100,000+</option>
          <option value="120k">$120,000+</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>Location</label>
        <select 
          name="location" 
          value={currentFilters.location} 
          onChange={handleChange}
        >
          <option value="">Any Location</option>
          <option value="remote">Remote Only</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>Experience Level</label>
        <select 
          name="experience" 
          value={currentFilters.experience} 
          onChange={handleChange}
        >
          <option value="">Any Experience</option>
          <option value="intern">Internship</option>
          <option value="junior">Junior (0-2 yrs)</option>
          <option value="mid">Mid (2-5 yrs)</option>
          <option value="senior">Senior (5+ yrs)</option>
        </select>
      </div>
      
      <button 
        className="reset-filters" 
        onClick={() => onFilterChange({})}
      >
        Reset All Filters
      </button>
    </div>
  );
};

export default Filters;