import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/homePageStyles.css'; // We'll create this CSS file next

const HomePage = () => {
  return (
    <div className="homepage">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Swipe Your Way to Your Dream Tech Job</h1>
          <p>Opportunet helps you find CS/IT jobs that match your skills and preferences</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-secondary">Login</Link>
          </div>
        </div>
        <div className="hero-image">
          {/* Placeholder for an illustration */}
          <div className="mockup-phone">
            <div className="screen">
              {/* This would show a mockup of your app */}
            </div>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2>Why Choose Opportunet?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">💼</div>
            <h3>Curated Tech Jobs</h3>
            <p>Only CS/IT positions from top companies</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👆</div>
            <h3>Tinder-like Interface</h3>
            <p>Swipe right to apply, left to skip</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔍</div>
            <h3>Smart Filters</h3>
            <p>Find jobs by salary, location, and skills</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;