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
        <label>Location Type</label>
        <select 
          name="location" 
          value={currentFilters.location} 
          onChange={handleChange}
        >
          <option value="">Any Location</option>
          <option value="Remote">Remote</option>
          <option value="Hybrid">Hybrid</option>
          <option value="On-site">On-site</option>
        </select>
      </div>
      
      <div className="filter-group">
        <label>Position</label>
        <select 
          name="position" 
          value={currentFilters.position} 
          onChange={handleChange}
        >
          <option value="">Any Position</option>
          <option value="Frontend">Frontend</option>
          <option value="Backend">Backend</option>
          <option value="Fullstack">Fullstack</option>
          <option value="Intern">Intern</option>
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