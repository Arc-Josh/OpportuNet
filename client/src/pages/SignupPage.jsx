import React from 'react';
import { useNavigate } from 'react-router-dom';
import SignupForm from '../components/SignupForm';
import '../styles/authStyles.css';
import logo from '../assets/logo.png';

const SignupPage = () => {
  const navigate = useNavigate();

  const handleSignup = async(signupData) => {
    const response = await fetch('http://localhost:8000/signup', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        name: signupData.name,
        email: signupData.email,
        password: signupData.password,
        enabled: signupData.enabled
      }),
    });

    const data = await response.json();
    if(response.ok){
      alert('Account created!');
      navigate('/login');
    } else {
      alert(data.message || 'Failed to create account');
    }
  };

  return (
    <div className="login-page">

      <div className="signup-hero">
        <div className="overlay">
          <h1>Create Your Account 🎉</h1>
          <p>Join Opportunet and start matching with IT & CS opportunities today.</p>
        </div>
      </div>

      <div className="login-panel">
        <div className="auth-container">
          <div className="login-brand">
            <img src={logo} alt="Opportunet Logo" className="brand-logo" />
            <h2 className="brand-heading">Opportunet</h2>
          </div>

          <SignupForm
            onSignup={handleSignup}
            toggleForm={() => navigate('/login')}
          />
        </div>
      </div>
      
    </div>
  );
};

export default SignupPage;
