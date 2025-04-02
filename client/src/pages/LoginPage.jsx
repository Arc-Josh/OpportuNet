import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';

const LoginPage = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(true);

  const handleLogin = (loginData) => {
    console.log('Login data:', loginData);
    // TODO: Connect to backend
    navigate('/dashboard'); // Will change this later
  };

  const toggleForm = () => {
    navigate('/signup');
  };

  return (
    <div>
      <LoginForm onLogin={handleLogin} toggleForm={toggleForm} />
    </div>
  );
};

export default LoginPage;