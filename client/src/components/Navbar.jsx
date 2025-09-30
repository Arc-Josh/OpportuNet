import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/navbarStyles.css'; 

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="logo">
          <span className="logo-text">Opportunet</span>
          <span className="logo-dot">.</span>
        </Link>
        
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">Browse Jobs</Link>
          <Link to="/saved-jobs" className="nav-link">Saved Jobs</Link>
          <Link to="/resumebuilder" className="nav-link">Resume Analyzer</Link>
          <Link to="/chatbot" className="nav-link">Chatbot</Link>
          <Link to="/login" className="nav-link login-link">Login</Link>
          <Link to="/signup" className="nav-link signup-link">Sign Up</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
