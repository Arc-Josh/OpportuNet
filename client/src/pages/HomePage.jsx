import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/homePageStyles.css';
import { expireToken } from '../storage/token';
import logo from '../assets/hero.jpg'; 

const HomePage = () => {
  expireToken(); 
  return (
    <div className="homepage">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Find Your Next Tech Job</h1>
          <p>Opportunet helps you discover CS and IT jobs that match your skills and preferences</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn btn-primary">Get Started</Link>
            <Link to="/login" className="btn btn-secondary">Login</Link>
          </div>
        </div>

        <div className="hero-image">
          <img 
            src={logo} 
            alt="Opportunet Logo" 
            className="hero-logo"
          />
        </div>
      </section>

      {/* FEATURES SECTION (Alternating Rows) */}
      <section className="alt-features-section">
        <h2>Why Choose Opportunet?</h2>

        <div className="feature-row">
          <div className="feature-text">
            <h3>Curated Tech Jobs</h3>
            <p>Only CS/IT positions from top companies, filtered for quality and relevance</p>
          </div>

          <div className="feature-image">
              <span className="big-icon">💼</span>
          </div>
        </div>

        <div className="feature-row reverse">
          <div className="feature-text">
            <h3>One-Click Apply</h3>
            <p>Accept or reject job and scholarship postings easily with our streamlined interface</p>
          </div>
          <div className="feature-image">
            <span className="big-icon">✅</span>
          </div>
        </div>

        <div className="feature-row">
          <div className="feature-text">
            <h3>Funding Your Future</h3>
            <p>Discover scholarships that support your academic and career journey</p>
          </div>
          <div className="feature-image">
            <span className="big-icon">🎓</span>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="stats-section">
        <h2>Soaring Higher with Opportunet</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>2,000+</h3>
            <p>CS/IT Jobs Posted</p>
          </div>
          <div className="stat-card">
            <h3>500+</h3>
            <p>Companies</p>
          </div>
          <div className="stat-card">
            <h3>1,000+</h3>
            <p>Scholarships</p>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section className="about-section">
        <div className="about-content">
          <h2>Grow Your Career with Opportunet</h2>
          <p>
            Whether you’re a student, a new grad, or an experienced developer, 
            Opportunet connects you with curated opportunities that match your skills, 
            values, and career goals. We make the job hunt easier, faster, and smarter
          </p>
          <Link to="/resumebuilder" className="btn btn-secondary">Try Resume Analyzer</Link>
        </div>
      </section>

      {/* CALL TO ACTION */}
      <section className="cta-banner">
        <h2>Get Ready to Be Unstoppable</h2>
        <p>Take your career further than you ever imagined possible with Opportunet</p>
        <div className="cta-buttons">
          <Link to="/signup" className="btn btn-secondary">Join Now</Link>
          <Link to="/dashboard" className="btn btn-primary">Browse Jobs</Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
