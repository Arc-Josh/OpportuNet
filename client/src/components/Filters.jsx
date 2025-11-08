import React, { useState } from 'react';

const cities = [
  "Dallas, TX",
  "Lewisville, TX",
  "Plano, TX",
  "Allen, TX",
  "Denton, TX",
  "Frisco, TX",
  "Richardson, TX",
  "Mckinney, TX"
];

const Filters = ({ currentFilters, onFilterChange }) => {
  const [local, setLocal] = useState(currentFilters);

  const update = (name, value) => {
    setLocal(prev => ({ ...prev, [name]: value }));
  };

  const applyFilters = () => {
    onFilterChange({ ...local, page: 1 }); // reset to page 1 on each filter apply
  };

  const resetFilters = () => {
    const reset = {
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
    };
    setLocal(reset);
    onFilterChange(reset);
  };

  return (
    <div className="filters-panel">
      <h3 className="filters-title">Filters</h3>
      <hr />

      <div className="filter-group">
        <label>Company</label>
        <input
          type="text"
          placeholder="e.g. Google, Amazon"
          value={local.company}
          onChange={(e) => update("company", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Position / Role</label>
        <input
          type="text"
          placeholder="e.g. Data Engineer, Backend, Intern"
          value={local.position}
          onChange={(e) => update("position", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>City</label>
        <select
          value={local.location}
          onChange={(e) => update("location", e.target.value)}
        >
          <option value="">Any</option>
          {cities.map(city => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Work Setting</label>
        <select
          value={local.locationType}
          onChange={(e) => update("locationType", e.target.value)}
        >
          <option value="">Any</option>
          <option value="Remote">Remote</option>
          <option value="Hybrid">Hybrid</option>
          <option value="On-site">On-site</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Salary Range ($/year)</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="number"
            placeholder="Min"
            value={local.salaryMin}
            onChange={(e) => update("salaryMin", e.target.value)}
          />
          <input
            type="number"
            placeholder="Max"
            value={local.salaryMax}
            onChange={(e) => update("salaryMax", e.target.value)}
          />
        </div>
      </div>

      <div className="filter-group">
        <label>Sort</label>
        <select
          value={local.sort}
          onChange={(e) => update("sort", e.target.value)}
        >
          <option value="new">Newest</option>
          <option value="salary_high">Salary High → Low</option>
          <option value="salary_low">Salary Low → High</option>
        </select>
      </div>

      <button className="reset-filters" onClick={resetFilters}>
        Reset Filters
      </button>

      <button className="apply-filters" onClick={applyFilters}>
        Apply Filters
      </button>
    </div>
  );
};

export default Filters;
