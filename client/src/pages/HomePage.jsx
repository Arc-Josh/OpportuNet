import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/homePageStyles.css';
import { expireToken } from '../storage/token';

const HomePage = () => {
  expireToken(); 
  return (
    <div className="homepage">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Find Your Next Tech Job</h1>
          <p>Opportunet helps you discover CS/IT jobs that match your skills and preferences</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-secondary">Login</Link>
          </div>
        </div>

        {/* NEW Illustration instead of phone */}
        <div className="hero-image">
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3135/3135673.png" 
            alt="Job Search Illustration" 
            className="hero-illustration"
          />
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <h2>Why Choose Opportunet?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-circle">💼</div>
            <h3>Curated Tech Jobs</h3>
            <p>Only CS/IT positions from top companies, filtered for quality and relevance.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-circle">✅</div>
            <h3>One-Click Apply</h3>
            <p>Accept or reject job postings easily with our streamlined interface.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-circle">🔍</div>
            <h3>Smart Filters</h3>
            <p>Quickly find jobs by salary range, location, and your top skills.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
