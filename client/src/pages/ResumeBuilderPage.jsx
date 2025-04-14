// File: client/src/pages/ResumeBuilderPage.jsx
import React, { useState } from "react";
import "../styles/resumeBuilderStyles.css";

const ResumeBuilderPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobText, setJobText] = useState("");
  const [analysis, setAnalysis] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && !file.name.toLowerCase().match(/\.(docx?|pdf)$/)) {
      alert("Invalid file type. Only .doc, .docx, and .pdf allowed.");
      e.target.value = null;
      return;
    }
    setSelectedFile(file);
  };

  const handleJobChange = (e) => setJobText(e.target.value);

  const handleAnalyze = async () => {
    if (!selectedFile) {
      alert("Please select a resume file.");
      return;
    }
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("job_text", jobText);

    try {
      const response = await fetch("http://127.0.0.1:8000/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setAnalysis(data.analysis || {});
    } catch (error) {
      console.error("Error processing resume analysis:", error);
      setAnalysis({ error: "Error processing your request." });
    }
  };

  const renderKeywordTable = (tableData) => {
    if (!tableData || tableData.length === 0)
      return <p>No keyword data available.</p>;
    return (
      <table>
        <thead>
          <tr>
            <th>Keyword</th>
            <th>Job Description Count</th>
            <th>Resume Count</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, index) => (
            <tr key={index}>
              <td>{row.keyword}</td>
              <td>{row.job_count}</td>
              <td>{row.resume_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="resume-builder-container">
      <h1>Resume Analyzer</h1>
      <div className="input-section">
        <label>Upload Resume (.doc/.docx/.pdf)</label>
        <input type="file" accept=".doc,.docx,.pdf" onChange={handleFileChange} />
      </div>
      <div className="input-section">
        <label>Job Description</label>
        <textarea
          placeholder="Paste the job description here..."
          value={jobText}
          onChange={handleJobChange}
        />
      </div>
      <button onClick={handleAnalyze}>Analyze Resume</button>
      {analysis && (
        <div className="analysis-section">
          <h2>Resume Analysis</h2>
          <div>
            <strong>Keyword Gap:</strong>
            {renderKeywordTable(analysis.keyword_gap_table)}
          </div>
          <div>
            <strong>Spelling/Grammar:</strong>{" "}
            {analysis.spelling_grammar ? analysis.spelling_grammar.join(" | ") : "N/A"}
          </div>
          <div>
            <strong>Match Score:</strong> {analysis.match_score || "N/A"}
          </div>
          <div>
            <strong>Content Suggestions:</strong>{" "}
            {analysis.content_suggestions ? analysis.content_suggestions.join(" | ") : "N/A"}
          </div>
          <div>
            <strong>Sections Found:</strong>{" "}
            {analysis.sections_found ? analysis.sections_found.join(", ") : "None"}
          </div>
          <div>
            <strong>Sections Missing:</strong>{" "}
            {analysis.sections_missing ? analysis.sections_missing.join(", ") : "None"}
          </div>
          <div>
            <strong>Redundancy/Clarity:</strong>{" "}
            {analysis.redundancy_clarity ? analysis.redundancy_clarity.join(" | ") : "N/A"}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilderPage;
