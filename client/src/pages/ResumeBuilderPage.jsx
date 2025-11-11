import React, { useState, useEffect } from "react";
import "../styles/resumeBuilderStyles.css";
import { getToken } from '../storage/token';
const sampleJobs = {
  "Android Developer": `We are searching for a brilliant, flexible Android Developer to create novel apps that meet the needs of our target audience. To this end, the Android Developer's Responsibilities include writing and proofreading code, liaising with coworkers within and outside of their department, and monitoring customers' feedback. Over time, you will also be required to create app updates.

Android Developer Responsibilities:
- Conceptualizing and formulating apps suitable for all Android devices.
- Implementing measures to safeguard users' data.
- Collaborating with UI/UX Designers and Testers to ensure app quality.
- Monitoring app reviews to detect improvement areas.
- Creating app updates, bug fixes, and new features.

Android Developer Requirements:
- Degree in Computer Science or similar.
- Proficiency in Java, Kotlin, or C++.
- Experience using Android Studio & SDK.
- Excellent coding and teamwork skills.`,

  "Developer": `We are looking for a talented Developer to join our experienced development team. You will design, code, test, and maintain applications.

Developer Responsibilities:
- Discuss software scope with managers.
- Write clean, scalable code.
- Troubleshoot and debug issues.
- Deploy and maintain software systems.
- Analyze user feedback and make improvements.

Developer Requirements:
- Bachelor's degree in Computer Science or IT.
- Strong in JavaScript, HTML, Java, and C++.
- Familiarity with Git/GitHub and Agile methods.`,

  "Financial Analyst": `We are hiring a Financial Analyst to analyze data and prepare reports to improve company performance.

Financial Analyst Responsibilities:
- Analyze financial data and trends.
- Prepare forecasts and reports.
- Recommend cost-saving improvements.
- Work with other team members on budgeting.

Requirements:
- Bachelor's degree in Finance or Accounting.
- Strong Excel and reporting skills.
- Excellent communication and attention to detail.`,

  "Big Data Engineer": `We are hiring a Big Data Engineer to build and manage our company’s data systems.

Responsibilities:
- Develop Hadoop/Spark-based systems.
- Build data pipelines and integrate multiple sources.
- Manage cloud data platforms.
- Collaborate with developers and analysts.

Requirements:
- Bachelor's in Computer Science or Engineering.
- Knowledge of Python, Java, SQL, Spark, and AWS.
- Strong problem-solving and project management skills.`,
};

const ResumeBuilderPage = () => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [selectedJob, setSelectedJob] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("Analyzing your resume...");
  const [error, setError] = useState("");

  useEffect(() => {
    let timer;
    if (loading) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return prev;
          const next = prev + Math.random() * 4;
          return next > 95 ? 95 : next;
        });
      }, 200);
    } else if (!loading && progress > 0) {
      setProgress(100);
    }
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    if (progress < 30) setProgressText("Analyzing your resume...");
    else if (progress < 70)
      setProgressText("Comparing skills with job requirements...");
    else if (progress < 99)
      setProgressText("Generating recruiter insights...");
    else setProgressText("Done!");
  }, [progress]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type !== "application/pdf") {
      setError("⚠️ Only PDF files are allowed.");
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setError("");
  };

  const handleResumeUpload = (e) => {
    e.preventDefault();
    if (!file) {
      setError("⚠️ Please upload a resume first.");
      return;
    }
    setStep(2);
  };

  const handleSampleClick = (title) => {
    setSelectedJob(title);
    setJobDescription(sampleJobs[title]);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!jobDescription.trim()) {
      setError("⚠️ Please paste or select a job description first.");
      return;
    }

    setStep(3);
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("job_description", jobDescription);

    try {
      const token = getToken();
      const response = await fetch("http://127.0.0.1:8000/analyze-resume", {
        method: "POST",
        headers: {"Authorization": `Bearer ${token}`,},
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to analyze resume");

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="resume-page">
      <div className="resume-container">
        <h1 className="resume-page-title">Resume Analyzer</h1>
        <p className="resume-page-subtitle">
        Optimize your resume for the job you want — instantly.
        </p>
        {/* Stepper */}
        <div className="stepper">
          <div className={`step ${step === 1 ? "active" : step > 1 ? "done" : ""}`}>
            <div className="circle">1</div>
            <p>Upload Resume</p>
          </div>
          <div className="line"></div>
          <div className={`step ${step === 2 ? "active" : step > 2 ? "done" : ""}`}>
            <div className="circle">2</div>
            <p>Add Job</p>
          </div>
          <div className="line"></div>
          <div className={`step ${step === 3 ? "active" : ""}`}>
            <div className="circle">3</div>
            <p>View Results</p>
          </div>
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="upload-section">
            <h2>UPLOAD YOUR RESUME</h2>
            <p className="subtitle">Upload your resume to get started</p>
            <form onSubmit={handleResumeUpload} className="upload-btn-row">
              <label className="upload-btn">
                Upload PDF
                <input type="file" accept=".pdf" hidden onChange={handleFileChange} />
              </label>

              <button type="submit" className="upload-btn">
                Next
              </button>
            </form>
            {file && <p className="file-name">📄 {file.name}</p>}
            {error && <p className="error">{error}</p>}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="upload-section">
            <h2>ADD JOB DESCRIPTION</h2>
            <p className="subtitle">Paste a job description or select one below</p>
            <div className="job-section">
              <div className="job-left">
                <textarea
                  placeholder="Paste job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <div className="divider"><span>OR</span></div>
              <div className="job-right">
                <ul>
                  {Object.keys(sampleJobs).map((job) => (
                    <li
                      key={job}
                      className={selectedJob === job ? "selected" : ""}
                      onClick={() => handleSampleClick(job)}
                    >
                      {job}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button className="analyze-btn" onClick={handleJobSubmit}>
              Analyze
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="upload-section">
            {loading ? (
              <div className="analyzing-box">
                <h2>ANALYZING...</h2>
                <p className="fetching-text fade-text">{progressText}</p>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ) : analysis ? (
              <div className="results-container">
                {/* Match Rate */}
                <div className="summary-card">
                  <h3>📊 Match Rate</h3>
                  <div className="score-circle">
                    {analysis.analysis.match_score}%
                  </div>
                  <p className="score-label">Overall Match</p>
                </div>

                {/* Insights card */}
                <div className="insights-card">
                  {/* Searchability Section */}
                  <div className="ats-info-inline">
                    <h2>
                      Searchability <span className="ats-badge">IMPORTANT</span>
                    </h2>
                    <p>
                      Your resume’s searchability reflects how effectively an
                      Applicant Tracking System (ATS) and recruiters can
                      discover your profile based on relevant keywords.
                    </p>
                    <p className="tip-inline">
                      <b>Tip:</b> Ensure all job-specific tools, technologies,
                      and titles from the job description appear naturally
                      throughout your resume.
                    </p>
                  </div>

                  {/* Table */}
                  <div className="ats-table">
                    <h4>Searchability Breakdown</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Status</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.analysis.searchability_breakdown?.map(
                          (item, i) => (
                            <tr key={i}>
                              <td>{item.category}</td>
                              <td
                                className={
                                  item.status.includes("✅")
                                    ? "positive"
                                    : item.status.includes("❌")
                                    ? "negative"
                                    : "neutral"
                                }
                              >
                                {item.status}
                              </td>
                              <td>{item.details}</td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Hard Skills */}
                  <div className="hard-skills">
                    <h2>
                      Hard Skills{" "}
                      <span className="ats-badge gray">HIGH SCORE IMPACT</span>
                    </h2>
                    <p>
                      Hard skills enable you to perform job-specific duties and
                      measurable tasks. These include tools, languages, or
                      technologies relevant to your field.
                    </p>
                    <div className="skills-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Skill</th>
                            <th>Resume</th>
                            <th>Job Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.analysis.hard_skills?.map((skill, i) => (
                            <tr key={i}>
                              <td>{skill.name}</td>
                              <td>{skill.resume_count || "❌"}</td>
                              <td>{skill.job_count || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Soft Skills */}
                  <div className="soft-skills">
                    <h2>
                      Soft Skills{" "}
                      <span className="ats-badge gray">MEDIUM SCORE IMPACT</span>
                    </h2>
                    <p>
                      Soft skills describe how you interact, communicate, and
                      adapt within teams — crucial for any professional setting.
                    </p>
                    <div className="skills-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Skill</th>
                            <th>Resume</th>
                            <th>Job Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.analysis.soft_skills?.map((skill, i) => (
                            <tr key={i}>
                              <td>{skill.name}</td>
                              <td>{skill.resume_count || "❌"}</td>
                              <td>{skill.job_count || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recruiter Tips */}
                  <div className="recruiter-tips">
                    <h2>
                      Recruiter Tips <span className="ats-badge">IMPORTANT</span>
                    </h2>
                    <p>
                      Recruiter Tips analyze how hiring managers interpret your
                      resume beyond skills — they assess tone, professionalism,
                      and completeness.
                    </p>
                    <p className="tip-inline">
                      <b>Tip:</b> These recommendations come directly from ATS
                      and recruiter behavior data to help polish your resume.
                    </p>

                    <div className="recruiter-tips-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.analysis.recruiter_tips?.map((tip, i) => (
                            <tr key={i}>
                              <td>{tip.title}</td>
                              <td
                                className={
                                  tip.status.includes("✅")
                                    ? "positive"
                                    : tip.status.includes("⚠️")
                                    ? "neutral"
                                    : "negative"
                                }
                              >
                                {tip.status}
                              </td>
                              <td>{tip.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p>Something went wrong.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeBuilderPage;
