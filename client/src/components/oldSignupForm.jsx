import React, { useState } from 'react';
import '../styles/authStyles.css';

const SignupForm = ({ onSignup, toggleForm }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    enabled: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    onSignup(formData);
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Create an Account</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <p>
          <input type="checkbox" id="enabled" name='enabled' onChange={handleChange}/>
          <label htmlFor="enabled">   Enable Notifications?</label>
        </p>
        <button type="submit" className="auth-button">Sign Up</button>
      </form>
      <p className="auth-toggle">
        Already have an account? <a href="#" onClick={toggleForm}>Login</a>
      </p>
    </div>
  );
};

export default SignupForm;