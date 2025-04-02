import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupForm from '../components/SignupForm';

const SignupPage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  const handleSignup = (signupData) => {
    console.log('Signup data:', signupData);
    // TODO: Connect to backend
    navigate('/dashboard'); // Will change this later
  };

  const toggleForm = () => {
    navigate('/login');
  };

  return (
    <div>
      <SignupForm onSignup={handleSignup} toggleForm={toggleForm} />
    </div>
  );
};

export default SignupPage;