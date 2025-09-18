import React, { useState } from 'react';
import '../styles/authStyles.css';

const LoginForm = ({ onLogin, toggleForm }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const success = await onLogin(formData);
    if (!success) setErrors({ form: 'Invalid email or password' });
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Login</h2>
      <form className="auth-form" onSubmit={handleSubmit}>
        {errors.form && <p className="auth-error">{errors.form}</p>}

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
          {errors.email && <p className="auth-error">{errors.email}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="show-password-btn"
              onClick={() => setShowPassword(prev => !prev)}
            >
              {showPassword ? '🙅🏽‍♂️' : '👀'}
            </button>
          </div>
          {errors.password && <p className="auth-error">{errors.password}</p>}
        </div>

        <button type="submit" className="auth-button">Login</button>
      </form>

      <p className="auth-toggle">
        Don't have an account?{' '}
        <button type="button" className="link-button" onClick={toggleForm}>
          Sign up
        </button>
      </p>
    </div>
  );
};

export default LoginForm;
