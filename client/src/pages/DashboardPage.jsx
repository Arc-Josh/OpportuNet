import React from 'react';
import Dashboard from '../components/Dashboard';
import '../styles/dashboardStyles.css';
import { NavLink, UNSAFE_decodeViaTurboStream, useNavigate } from 'react-router-dom';
import { getToken } from '../storage/token';
import { useEffect,useState } from 'react';
const DashboardPage = () => {
  const [email, setEmail] = useState(null);

  const navigate = useNavigate()
  useEffect(() => {
    const token = getToken();  // Get the stored token

    if (token) {
      fetch('http://localhost:8000/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      .then(response => response.json())
      .then(data => {
        setEmail(data.email); 
      })
      .catch(error => console.error('Error fetching dashboard data:', error));
    } else {
      console.log('No token found');
      navigate('/login')
    }
  }, [navigate]);

  return(
    <div className="dashboard-page">
      <Dashboard />
    </div>
  );
};

export default DashboardPage;