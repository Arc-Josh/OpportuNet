# File: server/services/resume_services.py

import re
import requests
from io import BytesIO

# For improved text extraction from DOCX files:
try:
    import docx  # python-docx
except ImportError:
    docx = None

# Dictionary of common misspellings to check (for spelling/grammar suggestions)
COMMON_MISSPELLINGS = {
    "recieve": "receive",
    "adress": "address",
    "enviroment": "environment",
    # add more as needed...
}

from io import BytesIO
try:
    from PyPDF2 import PdfReader
except Exception:
    PdfReader = None
import logging

logger = logging.getLogger("uvicorn.error")

def extract_text_stub(file_name: str, file_data: bytes) -> str:
    """
    Extracts text from a resume file.
    Supports DOCX and PDF.
    Returns a fallback message if unsupported or failed.
    """
    try:
        if file_name.lower().endswith(".docx") and docx:
            # DOCX extraction
            logger.info(f"Extracting DOCX resume: {file_name}")
            document = docx.Document(BytesIO(file_data))
            full_text = "\n".join([para.text for para in document.paragraphs])
            return full_text if full_text.strip() else "No text extracted from DOCX."

        elif file_name.lower().endswith(".pdf"):
            # PDF extraction
            logger.info(f"Extracting PDF resume: {file_name}")
            if PdfReader is None:
                logger.error("PyPDF2 not installed - cannot extract PDF text. Install PyPDF2 to enable PDF parsing.")
                return "PDF parsing library not installed on server."
            reader = PdfReader(BytesIO(file_data))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
            return text.strip() if text.strip() else "No text extracted from PDF."

        else:
            logger.warning(f"Unsupported file type for resume: {file_name}")
            return f"Unsupported file format: {file_name}"

    except Exception as e:
        logger.error(f"Error extracting text from {file_name}: {e}")
        return f"Error extracting text from {file_name}: {e}"


def auto_identify_keywords(text: str, top_n: int = 10) -> list:
    """
    Automatically extracts the top `top_n` keywords from the given text.
    
    Steps:
      1. Converts text to lowercase.
      2. Tokenizes the text (using a simple regex).
      3. Removes a minimal set of stopwords.
      4. Returns the most frequently occurring tokens as keywords.
    """
    text = text.lower()
    # Basic list of stopwords; you may expand this list as needed.
    stopwords = {
        "the", "and", "to", "of", "a", "in", "for", "on", "at", "by",
        "be", "this", "as", "is", "an", "are", "it", "or", "that", "with",
        "our", "if", "you", "your", "i", "from", "but", "have", "we", 
        "not", "like", "so", "just", "also", "will", "do", "does", "did"
    }
    tokens = re.findall(r'\w+', text)
    freq = {}
    for token in tokens:
        if token not in stopwords and len(token) > 2:
            freq[token] = freq.get(token, 0) + 1
    # Sort the tokens by their frequency (highest first)
    sorted_tokens = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    # Return only the top_n tokens as keywords
    keywords = [token for token, count in sorted_tokens[:top_n]]
    return keywords

def basic_resume_analysis(resume_text: str, job_text: str) -> dict:
    """
    Performs analysis comparing the resume text to the job description.
    
    Features include:
      - Keyword Gap Analysis: Automatically extracts the top keywords from the job 
        description and compares their counts in the job description vs. the resume.
      - Spelling/Grammar Check: Reports suggestions for common misspellings.
      - Match Score: Computes the percentage of unique words from the job description 
        that appear in the resume.
      - Content Suggestions: Checks if key action verbs (e.g., "led", "developed", etc.)
        are present in the resume.
      - Sections Found/Missing: Checks for the presence of required sections in the resume.
      - Redundancy/Clarity Feedback: Identifies words that are repeated excessively.
    """
    analysis = {}
    
    # Convert texts to lower-case for case-insensitive matching.
    job_text_lower = job_text.lower()
    resume_text_lower = resume_text.lower()
    
    # --- Keyword Gap Analysis ---
    # Dynamically identify the top keywords from the job description
    keywords_to_compare = auto_identify_keywords(job_text_lower, top_n=10)
    keyword_table = []
    for kw in keywords_to_compare:
        job_count = job_text_lower.split().count(kw)
        resume_count = resume_text_lower.split().count(kw)
        keyword_table.append({
            "keyword": kw,
            "job_count": job_count,
            "resume_count": resume_count
        })
    analysis["keyword_gap_table"] = keyword_table

    # --- Spelling/Grammar Check ---
    typos_found = []
    for wrong, correct in COMMON_MISSPELLINGS.items():
        if wrong in resume_text_lower:
            typos_found.append(f"Found '{wrong}', consider '{correct}'.")
    analysis["spelling_grammar"] = typos_found if typos_found else ["No spelling mistakes found."]

    # --- Match Score ---
    job_words = set(job_text_lower.split())
    resume_words = set(resume_text_lower.split())
    common = job_words.intersection(resume_words)
    if job_words:
        score = (len(common) / len(job_words)) * 100
        analysis["match_score"] = f"{round(score)}%"
    else:
        analysis["match_score"] = "0%"

    # --- Content Suggestions (Action Verbs) ---
    action_verbs = ["led", "developed", "created", "managed", "implemented"]
    resume_tokens = resume_text_lower.split()
    missing_actions = [verb for verb in action_verbs if verb not in resume_tokens]
    if missing_actions:
        analysis["content_suggestions"] = [f"Consider adding action verbs such as: {', '.join(missing_actions)}"]
    else:
        analysis["content_suggestions"] = ["Resume contains good action verbs."]

    # --- Sections Found and Missing ---
    required_sections = ["education", "skills", "experience", "contact"]
    found_sections = []
    # For "contact", check if an email is present (i.e., "@" in the text)
    if "@" in resume_text_lower:
        found_sections.append("contact")
    for sec in required_sections:
        if sec != "contact" and sec in resume_text_lower:
            found_sections.append(sec)
    analysis["sections_found"] = found_sections
    analysis["sections_missing"] = list(set(required_sections) - set(found_sections))

    # --- Redundancy/Clarity Feedback ---
    word_counts = {}
    for word in resume_tokens:
        word_counts[word] = word_counts.get(word, 0) + 1
    repeated_words = [word for word, count in word_counts.items() if count > 3]
    if repeated_words:
        analysis["redundancy_clarity"] = [f"Repeated words: {', '.join(repeated_words[:5])}"]
    else:
        analysis["redundancy_clarity"] = ["No major repeated words detected."]
    
    return analysis

def tailor_resume(resume_text: str, job_text: str) -> (str, str):
    """
    Constructs a prompt and calls an AI endpoint to tailor the resume.
    Returns a tuple (prompt, tailored_resume).
    
    (Note: This functionality is provided for completeness. In your current UI, you may hide this.)
    """
    prompt = (
        "Rewrite the following resume to emphasize the skills and experiences that match the job description.\n\n"
        f"Resume:\n{resume_text}\n\n"
        f"Job Description:\n{job_text}\n\n"
        "Tailored Resume:"
    )
    API_TOKEN = "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"
    FREE_MODEL_ENDPOINT = "https://api-inference.huggingface.co/models/gpt2"
    
    headers = {"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {}
    payload = {"inputs": prompt, "options": {"wait_for_model": True}}
    try:
        response = requests.post(FREE_MODEL_ENDPOINT, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list) and isinstance(data[0], dict):
            return prompt, data[0].get("generated_text", "No generated text.")
        return prompt, "AI response format unexpected."
    except Exception as e:
        print("Error calling AI endpoint:", e)
        return prompt, "Error tailoring resume. Please try again later."
