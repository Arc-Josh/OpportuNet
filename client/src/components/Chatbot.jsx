import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../styles/chatbotStyles.css";
import { useNavigate } from "react-router-dom";
import { getToken } from "../storage/token";
import opie from "../assets/Opie.png"

const Chatbot = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  // Fetch user profile picture
  useEffect(() => {
    const fetchProfilePic = async () => {
      const token = getToken();
      if (!token) return;

      try {
        const res = await axios.get("http://127.0.0.1:8000/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfilePic(res.data.profile_pic_url || null);
      } catch (err) {
        console.error("Error fetching profile pic:", err);
      }
    };

    fetchProfilePic();
  }, []);

  // Handle sending message
  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      console.log("no token found");
      navigate("/login");
      return;
    }

    const userMsg = { sender: "user", text: question };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    setLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/chatbot",
        { question },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const botMsg = { sender: "bot", text: response.data.answer };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="chatbot-container">
      <header className="chatbot-header">Opie</header>

      <div className="chat-window">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`message ${msg.sender === "user" ? "user-msg" : "bot-msg"}`}
          >
            {msg.sender === "bot" ? (
              <img
                src={opie}
                alt="Opie"
                className="avatar bot-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://via.placeholder.com/40?text=O";
                }}
              />
            ) : (
              <img
                src={profilePic || "https://via.placeholder.com/40?text=U"}
                alt="User"
                className="avatar user-avatar"
              />
            )}
            <div className="msg-text">{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="message bot-msg">
            <img
              src="/assets/Opie.png"
              alt="Opie"
              className="avatar bot-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://via.placeholder.com/40?text=O";
              }}
            />
            <div className="typing-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef}></div>
      </div>

      <form onSubmit={handleSubmit} className="chatbot-form">
        <input
          type="text"
          className="chatbot-input"
          placeholder="Ask me a question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          required
          disabled={loading}
        />
        <button type="submit" className="chatbot-button">Send</button>
      </form>
    </div>
  );
};

export default Chatbot;
