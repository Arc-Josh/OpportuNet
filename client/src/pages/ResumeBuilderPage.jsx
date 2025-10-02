import React, { useState } from "react";
import "../styles/resumeBuilderStyles.css";

const ResumeBuilderPage = () => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      setError("⚠️ Please upload a resume file.");
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDescription || "");

    try {
      const response = await fetch("http://127.0.0.1:8000/analyze-resume", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze resume");
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score <= 25) return "red";
    if (score <= 50) return "orange";
    if (score <= 75) return "lightgreen";
    return "green";
  };

  return (
    <div className="resume-analyzer-container">
      <div className="resume-card">
        <h2 className="title">Resume Analyzer</h2>
        <p>Upload your resume and paste a job description:</p>

        <form onSubmit={handleSubmit}>
          {/* Upload button */}
          <label className="upload-btn">
            ⬆ Upload Resume
            <input type="file" hidden onChange={handleFileChange} />
          </label>

          {file && <p className="filename">📄 {file.name}</p>}

          {/* Job description textarea */}
          <textarea
            className="job-textarea"
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          ></textarea>

          {/* Analyze button */}
          <button type="submit" className="analyze-btn" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </form>

        {/* Error message */}
        {error && <p className="error">❌ {error}</p>}

        {/* Analysis result */}
        {analysis && analysis.analysis && (
          <div className="results-box">
            <div className="match-circle-container">
              <svg className="match-circle" viewBox="0 0 36 36">
                <path
                  className="circle-bg"
                  d="M18 2.0845
                     a 15.9155 15.9155 0 0 1 0 31.831
                     a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle-progress"
                  stroke={getScoreColor(analysis.analysis.match_score)}
                  strokeDasharray={`${analysis.analysis.match_score}, 100`}
                  d="M18 2.0845
                     a 15.9155 15.9155 0 0 1 0 31.831
                     a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="circle-text">
                  {analysis.analysis.match_score}%
                </text>
              </svg>
              <p className="match-title">Match Score</p>
            </div>

            {/* Top Matching Skills */}
            <div className="analysis-section">
              <h4>✅ Top Matching Skills</h4>
              {analysis.analysis.top_matching_skills?.length > 0 ? (
                <ul>
                  {analysis.analysis.top_matching_skills.map((skill, i) => (
                    <li key={i}>{skill}</li>
                  ))}
                </ul>
              ) : (
                <p>No strong matches found.</p>
              )}
            </div>

            {/* Missing Skills */}
            <div className="analysis-section">
              <h4>❌ Missing Skills</h4>
              <ul>
                {analysis.analysis.missing_skills?.map((skill, i) => (
                  <li key={i}>{skill}</li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="analysis-section">
              <h4>📌 Recommendations</h4>
              <ul>
                {analysis.analysis.recommendations?.map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeBuilderPage;
