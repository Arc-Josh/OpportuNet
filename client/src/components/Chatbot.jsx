import React, { useState } from 'react';
import axios from 'axios';
import '../styles/chatbotStyles.css';

const Chatbot = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://127.0.0.1:8000/chatbot', { question });
      setAnswer(response.data.answer);
    } catch (error) {
      console.error(error);
      setAnswer("Sorry, something went wrong. Please try again.");
    }
  };

  return (
    <div className="chatbot-container">
      <h2>Chat with our Bot</h2>
      <form onSubmit={handleSubmit} className="chatbot-form">
        <input
          type="text"
          className="chatbot-input"
          placeholder="Ask me a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
        />
        <button type="submit" className="chatbot-button">Send</button>
      </form>
      {answer && (
        <div className="chatbot-answer">
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
