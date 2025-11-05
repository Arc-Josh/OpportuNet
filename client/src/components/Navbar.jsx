import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../styles/navbarStyles.css";
import logo from "../assets/logo.png";

const Navbar = () => {
  const { loggedIn, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <Link to="/" className="logo">
          <img src={logo} alt="Opportunet Logo" className="nav-logo" />
          <span className="logo-text">Opportunet</span>
        </Link>

        {/* Navigation Links */}
        <div className="nav-links">
          <Link to="/dashboard" className="nav-link">Browse Jobs</Link>
          <Link to="/saved-jobs" className="nav-link">Saved Jobs</Link>
          <Link to="/scholarships" className="nav-link">Browse Scholarships</Link>
          <Link to="/saved-scholarships" className="nav-link">Saved Scholarships</Link>

          <div className="dropdown">
            <button className="dropdown-btn">Other Services</button>
            <div className="dropdown-menu">
              <Link to="/resumebuilder" className="nav-link">Resume Analyzer</Link>
              <Link to="/chatbot" className="nav-link">Opie</Link>
            </div>
          </div>

          {!loggedIn ? (
            <>
              <Link to="/login" className="nav-link login-link">Login</Link>
              <Link to="/signup" className="nav-link signup-link">Sign Up</Link>
            </>
          ) : (
            <>
              <Link to="/profile" className="nav-link login-link">Profile</Link>
              <button onClick={handleLogout} className="nav-link signup-link logout-btn">
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
