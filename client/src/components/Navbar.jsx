import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Opportunet</Link>
      <div className="navbar-links">
        <Link to="/dashboard" className="nav-link">Browse Jobs</Link>
        <Link to ="/chatbot" className="nav-link">Chatbot</Link>
        <Link to="/login" className="nav-link">Login</Link>
        <Link to="/signup" className="nav-link">Sign Up</Link>
      </div>
    </nav>
  );
};

export default Navbar;