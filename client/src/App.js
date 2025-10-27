import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import ChatbotPage from './pages/ChatbotPage';  
import Navbar from './components/Navbar';
import './styles/globalStyles.css';
import ResumeBuilderPage from "./pages/ResumeBuilderPage.jsx";
import SavedJobsPage from "./pages/SavedJobsPage";
import ScholarshipPage from "./pages/ScholarshipPage.jsx";
import SavedScholarshipsPage from "./pages/SavedScholarshipsPage.jsx";
import ProfilePage from "./pages/ProfilePage";

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/chatbot" element={<ChatbotPage />} />  
        <Route path="/resumebuilder" element={<ResumeBuilderPage />} />
        <Route path="/saved-jobs" element={<SavedJobsPage />} />
        <Route path="/scholarships" element={<ScholarshipPage />} />
        <Route path="/saved-scholarships" element={<SavedScholarshipsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
      </Routes>
    </Router>
  );
}

export default App;
