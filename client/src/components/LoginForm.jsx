import React, { useState } from 'react';
import '../styles/authStyles.css';

const LoginForm = ({ onLogin, toggleForm }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(formData);
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Login to Opportunet</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
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
        <button type="submit" className="auth-button">Login</button>
      </form>
      <p className="auth-toggle">
        Don't have an account? <a href="#" onClick={toggleForm}>Sign up</a>
      </p>
    </div>
  );
};

export default LoginForm;