# Data Flow Diagram (DFD) Documentation
## OpportuNet - Tech Job Finder Platform

**Project:** OpportuNet  
**Team:** TechFive  
**Date:** 2024  
**Version:** 1.0

---

## Table of Contents
1. [Context Diagram (Level 0 DFD)](#context-diagram-level-0-dfd)
2. [Level 1 DFD](#level-1-dfd)
3. [Data Dictionary](#data-dictionary)
4. [Process Descriptions](#process-descriptions)
5. [Entity Descriptions](#entity-descriptions)
6. [Data Store Descriptions](#data-store-descriptions)

---

## Context Diagram (Level 0 DFD)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                         OPPORTUNET SYSTEM                       │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  1.0 User    │                                              │
│  │  Management  │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  2.0 Job     │                                              │
│  │  Scraping    │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  3.0 Job     │                                              │
│  │  Management  │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  4.0 Resume  │                                              │
│  │  Analysis    │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  5.0 Profile │                                              │
│  │  Management  │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  6.0 Chatbot │                                              │
│  │  Service     │                                              │
│  └──────────────┘                                              │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  7.0 Scholar │                                              │
│  │  Management  │                                              │
│  └──────────────┘                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │  User   │          │   Job   │          │ Scholar │
    │         │          │ Boards  │          │  Sites  │
    └─────────┘          └─────────┘          └─────────┘
         │                    │                    │
         │                    │                    │
    ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
    │   AWS   │          │ Gemini  │          │ Email   │
    │   S3    │          │   AI    │          │ Service │
    └─────────┘          └─────────┘          └─────────┘
```

### External Entities:
- **User**: End users accessing the platform
- **Job Boards**: External job listing sites (Indeed, LinkedIn, Glassdoor)
- **Scholar Sites**: Scholarship websites (Scholarships.com)
- **AWS S3**: Cloud storage for files
- **Gemini AI**: Google's AI service for chatbot and resume analysis
- **Email Service**: Mailtrap for email notifications

---

## Level 1 DFD

### Process 1.0: User Management

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ D1: Registration Data
       │ D2: Login Credentials
       │
┌──────▼──────────────────────────────────────────────┐
│           1.0 User Management                        │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ 1.1 Signup   │      │ 1.2 Login    │            │
│  │   Process    │      │   Process    │            │
│  └──────────────┘      └──────────────┘            │
│         │                    │                      │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 1.3 Password    │                        │
│         │    Hashing      │                        │
│         └────────┬────────┘                        │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 1.4 Token       │                        │
│         │    Generation   │                        │
│         └─────────────────┘                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ D3: User Data
                   │ D4: Auth Token
                   │
         ┌─────────▼─────────┐
         │   D1: Users       │
         │   (PostgreSQL)    │
         └──────────────────┘
```

**Data Flows:**
- D1: Registration Data (name, email, password, enabled)
- D2: Login Credentials (email, password)
- D3: User Data (user record)
- D4: Auth Token (JWT token)

---

### Process 2.0: Job Scraping

```
┌─────────────┐
│  Job Boards │
└──────┬──────┘
       │
       │ D5: Job Listings (HTML)
       │
┌──────▼──────────────────────────────────────────────┐
│           2.0 Job Scraping                         │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ 2.1 Web      │      │ 2.2 Job      │            │
│  │    Crawling  │─────▶│    Parsing   │            │
│  └──────────────┘      └──────────────┘            │
│         │                    │                      │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 2.3 Data       │                        │
│         │    Validation  │                        │
│         └────────┬───────┘                        │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 2.4 Backend     │                        │
│         │    Integration  │                        │
│         └─────────────────┘                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ D6: Structured Job Data
                   │
         ┌─────────▼─────────┐
         │   D2: Jobs       │
         │   (PostgreSQL)   │
         └──────────────────┘
```

**Data Flows:**
- D5: Job Listings (HTML content from job boards)
- D6: Structured Job Data (job_name, company, location, salary, etc.)

---

### Process 3.0: Job Management

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ D7: Job Query/Filter
       │ D8: Save Job Request
       │ D9: Remove Saved Job
       │
┌──────▼──────────────────────────────────────────────┐
│           3.0 Job Management                        │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ 3.1 Job      │      │ 3.2 Job     │            │
│  │    Search    │      │    Filtering│            │
│  └──────────────┘      └──────────────┘            │
│         │                    │                      │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 3.3 Saved Jobs │                        │
│         │    Management  │                        │
│         └─────────────────┘                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ D10: Job Results
                   │ D11: Saved Jobs List
                   │
         ┌─────────▼─────────┐      ┌─────────▼─────────┐
         │   D2: Jobs       │      │  D3: Saved Jobs  │
         │   (PostgreSQL)   │      │  (PostgreSQL)    │
         └──────────────────┘      └──────────────────┘
```

**Data Flows:**
- D7: Job Query/Filter (search terms, filters, pagination)
- D8: Save Job Request (user_email, job_id)
- D9: Remove Saved Job (user_email, job_id)
- D10: Job Results (filtered job listings)
- D11: Saved Jobs List (user's saved jobs)

---

### Process 4.0: Resume Analysis

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ D12: Resume File
       │ D13: Job Description
       │
┌──────▼──────────────────────────────────────────────┐
│           4.0 Resume Analysis                        │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ 4.1 File     │      │ 4.2 Text     │            │
│  │    Upload    │─────▶│    Extraction│            │
│  └──────────────┘      └──────────────┘            │
│         │                    │                      │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 4.3 AI Skill   │                        │
│         │    Extraction   │                        │
│         └────────┬───────┘                        │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 4.4 Resume     │                        │
│         │    Matching    │                        │
│         └────────┬───────┘                        │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 4.5 Analysis   │                        │
│         │    Report Gen  │                        │
│         └─────────────────┘                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ D14: Analysis Results
                   │
         ┌─────────▼─────────┐      ┌─────────▼─────────┐
         │  D4: Resumes      │      │   Gemini AI       │
         │  (PostgreSQL)     │      │   (External)      │
         └───────────────────┘      └───────────────────┘
```

**Data Flows:**
- D12: Resume File (PDF/DOCX file)
- D13: Job Description (text)
- D14: Analysis Results (match_score, skills, recommendations, tips)

---

### Process 5.0: Profile Management

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ D15: Profile Data
       │ D16: Profile Picture
       │ D17: Resume File
       │
┌──────▼──────────────────────────────────────────────┐
│           5.0 Profile Management                    │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ 5.1 Profile  │      │ 5.2 File     │            │
│  │    Update    │      │    Upload    │            │
│  └──────────────┘      └──────────────┘            │
│         │                    │                      │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 5.3 S3 Storage │                        │
│         │    Management  │                        │
│         └────────┬───────┘                        │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 5.4 Database    │                        │
│         │    Update       │                        │
│         └─────────────────┘                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ D18: Updated Profile
                   │
         ┌─────────▼─────────┐      ┌─────────▼─────────┐
         │   D1: Users       │      │   AWS S3          │
         │   (PostgreSQL)    │      │   (External)      │
         └───────────────────┘      └───────────────────┘
```

**Data Flows:**
- D15: Profile Data (fullName, email, bio)
- D16: Profile Picture (image file)
- D17: Resume File (PDF/DOCX)
- D18: Updated Profile (profile with S3 URLs)

---

### Process 6.0: Chatbot Service

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ D19: User Question
       │
┌──────▼──────────────────────────────────────────────┐
│           6.0 Chatbot Service                       │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ 6.1 Question │      │ 6.2 Context  │            │
│  │    Processing│      │    Retrieval │            │
│  └──────────────┘      └──────────────┘            │
│         │                    │                      │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 6.3 FAQ        │                        │
│         │    Matching    │                        │
│         └────────┬───────┘                        │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 6.4 AI Response │                        │
│         │    Generation   │                        │
│         └─────────────────┘                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ D20: Chatbot Response
                   │
         ┌─────────▼─────────┐      ┌─────────▼─────────┐
         │   D5: FAQs       │      │   Gemini AI       │
         │   (JSON File)    │      │   (External)      │
         └───────────────────┘      └───────────────────┘
                   │
         ┌─────────▼─────────┐
         │   D1: Users       │
         │   D4: Resumes     │
         │   (PostgreSQL)    │
         └───────────────────┘
```

**Data Flows:**
- D19: User Question (text query)
- D20: Chatbot Response (AI-generated answer)

---

### Process 7.0: Scholarship Management

```
┌─────────────┐
│ Scholar     │
│   Sites     │
└──────┬──────┘
       │
       │ D21: Scholarship Listings
       │
┌──────▼──────────────────────────────────────────────┐
│           7.0 Scholarship Management                │
│                                                      │
│  ┌──────────────┐      ┌──────────────┐            │
│  │ 7.1 Scholar  │      │ 7.2 Scholar  │            │
│  │    Scraping  │─────▶│    Parsing   │            │
│  └──────────────┘      └──────────────┘            │
│         │                    │                      │
│         │                    │                      │
│         └────────┬───────────┘                      │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 7.3 Scholar     │                        │
│         │    Storage      │                        │
│         └────────┬───────┘                        │
│                  │                                  │
│         ┌────────▼────────┐                        │
│         │ 7.4 Saved      │                        │
│         │    Scholar Mgmt│                        │
│         └─────────────────┘                        │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ D22: Scholarship Results
                   │ D23: Saved Scholarships
                   │
         ┌─────────▼─────────┐      ┌─────────▼─────────┐
         │  D6: Scholarships│      │ D7: Saved Scholars│
         │  (PostgreSQL)    │      │  (PostgreSQL)     │
         └───────────────────┘      └───────────────────┘
```

**Data Flows:**
- D21: Scholarship Listings (HTML from scholarship sites)
- D22: Scholarship Results (filtered scholarship data)
- D23: Saved Scholarships (user's saved scholarships)

---

## Data Dictionary

### D1: Users (PostgreSQL Table)
- **user_id**: INTEGER (Primary Key)
- **full_name**: TEXT
- **email**: TEXT (Unique)
- **password_hash**: TEXT
- **enabled_notifications**: BOOLEAN
- **profile_pic_url**: TEXT
- **resume_url**: TEXT
- **created_at**: TIMESTAMP

### D2: Jobs (PostgreSQL Table)
- **job_id**: INTEGER (Primary Key)
- **job_name**: TEXT
- **company_name**: TEXT
- **location**: TEXT
- **salary**: TEXT
- **description**: TEXT
- **application_link**: TEXT
- **hr_contact_number**: TEXT
- **qualifications**: TEXT
- **preferences**: TEXT
- **benefits**: TEXT
- **mission_statement**: TEXT
- **created_at**: TIMESTAMP

### D3: Saved Jobs (PostgreSQL Table)
- **saved_id**: INTEGER (Primary Key)
- **user_email**: TEXT (Foreign Key → Users.email)
- **job_id**: INTEGER (Foreign Key → Jobs.job_id)
- **created_at**: TIMESTAMP

### D4: Resumes (PostgreSQL Table)
- **id**: INTEGER (Primary Key)
- **user_email**: TEXT
- **file_name**: TEXT
- **file_data**: BYTEA
- **created_at**: TIMESTAMP

### D5: FAQs (JSON File)
- **keywords**: ARRAY[STRING]
- **answer**: STRING

### D6: Scholarships (PostgreSQL Table)
- **scholarship_id**: INTEGER (Primary Key)
- **scholarship_title**: TEXT
- **amount**: TEXT
- **deadline**: TEXT
- **description**: TEXT
- **details**: TEXT
- **eligibility**: TEXT
- **url**: TEXT
- **created_at**: TIMESTAMP

### D7: Saved Scholarships (PostgreSQL Table)
- **saved_id**: INTEGER (Primary Key)
- **user_email**: TEXT (Foreign Key → Users.email)
- **scholarship_id**: INTEGER (Foreign Key → Scholarships.scholarship_id)
- **created_at**: TIMESTAMP

### Data Flow Elements

#### D1: Registration Data
- **name**: STRING
- **email**: STRING
- **password**: STRING
- **enabled**: BOOLEAN

#### D2: Login Credentials
- **email**: STRING
- **password**: STRING

#### D3: User Data
- **email**: STRING
- **full_name**: STRING
- **profile_pic_url**: STRING (optional)
- **resume_url**: STRING (optional)

#### D4: Auth Token
- **token**: STRING (JWT)
- **token_type**: STRING ("bearer")
- **expires_in**: INTEGER (minutes)

#### D5: Job Listings (HTML)
- **html_content**: STRING
- **source_url**: STRING

#### D6: Structured Job Data
- **job_name**: STRING
- **company_name**: STRING
- **location**: STRING
- **salary**: STRING
- **description**: STRING
- **application_link**: STRING
- **qualifications**: STRING
- **preferences**: STRING
- **benefits**: STRING

#### D7: Job Query/Filter
- **search**: STRING (optional)
- **company**: STRING (optional)
- **position**: STRING (optional)
- **location**: STRING (optional)
- **location_type**: STRING (optional)
- **min_salary**: INTEGER (optional)
- **max_salary**: INTEGER (optional)
- **sort**: STRING (optional)
- **page**: INTEGER
- **page_size**: INTEGER

#### D8: Save Job Request
- **user_email**: STRING
- **job_id**: INTEGER

#### D9: Remove Saved Job
- **user_email**: STRING
- **job_id**: INTEGER

#### D10: Job Results
- **jobs**: ARRAY[JobResponse]
- **total_count**: INTEGER
- **page**: INTEGER
- **page_size**: INTEGER

#### D11: Saved Jobs List
- **jobs**: ARRAY[JobResponse]

#### D12: Resume File
- **file**: BINARY (PDF/DOCX)
- **filename**: STRING
- **content_type**: STRING

#### D13: Job Description
- **job_description**: STRING

#### D14: Analysis Results
- **resume_id**: INTEGER
- **file_name**: STRING
- **analysis**: OBJECT
  - **match_score**: INTEGER
  - **searchability_breakdown**: ARRAY[OBJECT]
  - **hard_skills**: ARRAY[OBJECT]
  - **soft_skills**: ARRAY[OBJECT]
  - **recommendations**: ARRAY[STRING]
  - **recruiter_tips**: ARRAY[OBJECT]
  - **word_count**: INTEGER
  - **measurable_results_count**: INTEGER

#### D15: Profile Data
- **fullName**: STRING
- **email**: STRING
- **bio**: STRING (optional)

#### D16: Profile Picture
- **file**: BINARY (Image)
- **filename**: STRING
- **content_type**: STRING

#### D17: Resume File (Profile)
- **file**: BINARY (PDF/DOCX)
- **filename**: STRING
- **content_type**: STRING

#### D18: Updated Profile
- **full_name**: STRING
- **email**: STRING
- **profile_pic_url**: STRING
- **resume_url**: STRING
- **enabled_notifications**: BOOLEAN

#### D19: User Question
- **question**: STRING
- **email**: STRING (from token)

#### D20: Chatbot Response
- **email**: STRING
- **answer**: STRING

#### D21: Scholarship Listings
- **html_content**: STRING
- **source_url**: STRING

#### D22: Scholarship Results
- **scholarships**: ARRAY[ScholarshipResponse]
- **filters_applied**: OBJECT

#### D23: Saved Scholarships
- **scholarships**: ARRAY[ScholarshipResponse]

---

## Process Descriptions

### 1.0 User Management
**Purpose:** Handles user registration, authentication, and account management.

**Sub-processes:**
- **1.1 Signup Process**: Validates user input, hashes password, creates user account, sends welcome email
- **1.2 Login Process**: Validates credentials, generates JWT token
- **1.3 Password Hashing**: Uses bcrypt to hash passwords securely
- **1.4 Token Generation**: Creates JWT tokens with user email and expiration

**Inputs:** Registration data, login credentials
**Outputs:** User records, authentication tokens
**Data Stores:** D1 (Users)

---

### 2.0 Job Scraping
**Purpose:** Automatically scrapes job listings from external job boards.

**Sub-processes:**
- **2.1 Web Crawling**: Uses Puppeteer to navigate job board websites
- **2.2 Job Parsing**: Extracts job details from HTML (title, company, location, salary, description)
- **2.3 Data Validation**: Validates and cleans scraped data
- **2.4 Backend Integration**: Posts validated job data to backend API

**Inputs:** Job board HTML content
**Outputs:** Structured job data
**Data Stores:** D2 (Jobs)
**External:** Job Boards (Indeed, LinkedIn, Glassdoor)

---

### 3.0 Job Management
**Purpose:** Manages job listings, search, filtering, and saved jobs functionality.

**Sub-processes:**
- **3.1 Job Search**: Performs keyword search across job titles, companies, descriptions
- **3.2 Job Filtering**: Applies filters (location, salary, company, position type, location type)
- **3.3 Saved Jobs Management**: Handles saving/removing jobs from user's saved list

**Inputs:** Job queries, filter parameters, save/remove requests
**Outputs:** Filtered job results, saved jobs lists
**Data Stores:** D2 (Jobs), D3 (Saved Jobs)

---

### 4.0 Resume Analysis
**Purpose:** Analyzes user resumes against job descriptions using AI.

**Sub-processes:**
- **4.1 File Upload**: Receives and validates resume file (PDF/DOCX)
- **4.2 Text Extraction**: Extracts text from PDF/DOCX files
- **4.3 AI Skill Extraction**: Uses Gemini AI to extract required skills from job description
- **4.4 Resume Matching**: Compares resume content with job requirements
- **4.5 Analysis Report Generation**: Creates comprehensive analysis report with scores, recommendations, tips

**Inputs:** Resume file, job description
**Outputs:** Analysis report (match score, skills analysis, recommendations)
**Data Stores:** D4 (Resumes)
**External:** Gemini AI

---

### 5.0 Profile Management
**Purpose:** Manages user profile information and file uploads.

**Sub-processes:**
- **5.1 Profile Update**: Updates user profile information (name, bio)
- **5.2 File Upload**: Handles profile picture and resume file uploads
- **5.3 S3 Storage Management**: Uploads files to AWS S3 and retrieves URLs
- **5.4 Database Update**: Updates user record with profile data and file URLs

**Inputs:** Profile data, profile picture, resume file
**Outputs:** Updated profile with S3 URLs
**Data Stores:** D1 (Users)
**External:** AWS S3

---

### 6.0 Chatbot Service
**Purpose:** Provides AI-powered chatbot assistance for job search questions.

**Sub-processes:**
- **6.1 Question Processing**: Processes user questions and extracts intent
- **6.2 Context Retrieval**: Retrieves user information (name, resume) for personalization
- **6.3 FAQ Matching**: Matches questions against FAQ database
- **6.4 AI Response Generation**: Uses Gemini AI to generate contextual responses

**Inputs:** User questions, user email (from token)
**Outputs:** AI-generated responses
**Data Stores:** D5 (FAQs), D1 (Users), D4 (Resumes)
**External:** Gemini AI

---

### 7.0 Scholarship Management
**Purpose:** Manages scholarship listings, scraping, and saved scholarships.

**Sub-processes:**
- **7.1 Scholarship Scraping**: Uses Puppeteer to scrape scholarship websites
- **7.2 Scholarship Parsing**: Extracts scholarship details (title, amount, deadline, eligibility)
- **7.3 Scholarship Storage**: Stores scraped scholarships in database
- **7.4 Saved Scholarship Management**: Handles saving/removing scholarships from user's saved list

**Inputs:** Scholarship website HTML, filter parameters, save/remove requests
**Outputs:** Scholarship results, saved scholarships lists
**Data Stores:** D6 (Scholarships), D7 (Saved Scholarships)
**External:** Scholarship Sites (Scholarships.com)

---

## Entity Descriptions

### User
**Type:** External Entity  
**Description:** End users of the OpportuNet platform  
**Interactions:**
- Registers and logs in
- Searches and filters jobs
- Uploads and analyzes resumes
- Saves jobs and scholarships
- Updates profile
- Interacts with chatbot

### Job Boards
**Type:** External Entity  
**Description:** External job listing websites (Indeed, LinkedIn, Glassdoor)  
**Interactions:**
- Provides job listing HTML content
- Receives web scraping requests

### Scholar Sites
**Type:** External Entity  
**Description:** Scholarship listing websites (Scholarships.com)  
**Interactions:**
- Provides scholarship listing HTML content
- Receives web scraping requests

### AWS S3
**Type:** External Entity  
**Description:** Amazon Web Services S3 cloud storage  
**Interactions:**
- Stores profile pictures
- Stores resume files
- Provides file URLs for retrieval

### Gemini AI
**Type:** External Entity  
**Description:** Google's Gemini AI service  
**Interactions:**
- Processes resume analysis requests
- Generates chatbot responses
- Extracts skills from job descriptions

### Email Service
**Type:** External Entity  
**Description:** Mailtrap email service for notifications  
**Interactions:**
- Sends welcome emails to new users
- Sends notification emails

---

## Data Store Descriptions

### D1: Users (PostgreSQL)
**Type:** Data Store  
**Description:** Stores user account information  
**Contents:**
- User credentials (email, hashed password)
- Profile information (name, bio, profile picture URL, resume URL)
- Account settings (notifications enabled)
- Timestamps (created_at)

**Access:**
- Read: User login, profile retrieval
- Write: User registration, profile updates

---

### D2: Jobs (PostgreSQL)
**Type:** Data Store  
**Description:** Stores job listings scraped from job boards  
**Contents:**
- Job details (title, company, location, salary)
- Job description and requirements
- Application information (link, HR contact)
- Benefits and qualifications
- Timestamps (created_at)

**Access:**
- Read: Job search, filtering, listing
- Write: Job creation from scrapers

---

### D3: Saved Jobs (PostgreSQL)
**Type:** Data Store  
**Description:** Stores user's saved job listings  
**Contents:**
- User email (foreign key)
- Job ID (foreign key)
- Timestamp (created_at)

**Access:**
- Read: Retrieve user's saved jobs
- Write: Save/remove jobs for users

---

### D4: Resumes (PostgreSQL)
**Type:** Data Store  
**Description:** Stores uploaded resume files (legacy, now uses S3)  
**Contents:**
- User email
- File name
- File data (BYTEA)
- Timestamp (created_at)

**Access:**
- Read: Resume retrieval for analysis
- Write: Resume upload (legacy)

---

### D5: FAQs (JSON File)
**Type:** Data Store  
**Description:** Stores frequently asked questions and answers for chatbot  
**Contents:**
- Keywords array
- Answer text

**Access:**
- Read: FAQ matching in chatbot

---

### D6: Scholarships (PostgreSQL)
**Type:** Data Store  
**Description:** Stores scholarship listings scraped from scholarship sites  
**Contents:**
- Scholarship details (title, amount, deadline)
- Description and eligibility criteria
- Application URL
- Timestamps (created_at)

**Access:**
- Read: Scholarship search, filtering
- Write: Scholarship creation from scrapers

---

### D7: Saved Scholarships (PostgreSQL)
**Type:** Data Store  
**Description:** Stores user's saved scholarship listings  
**Contents:**
- User email (foreign key)
- Scholarship ID (foreign key)
- Timestamp (created_at)

**Access:**
- Read: Retrieve user's saved scholarships
- Write: Save/remove scholarships for users

---

## System Architecture Summary

### Technology Stack:
- **Frontend:** React.js, React Router, Axios
- **Backend:** FastAPI (Python), PostgreSQL
- **Scraping:** Node.js, Puppeteer
- **Storage:** AWS S3
- **AI:** Google Gemini AI
- **Authentication:** JWT (JSON Web Tokens)
- **Email:** Mailtrap

### Key Data Flows:
1. **User Registration/Login:** User → User Management → Database → Auth Token → User
2. **Job Scraping:** Job Boards → Job Scraping → Database → Job Management → User
3. **Resume Analysis:** User → Resume Analysis → AI Service → Analysis Report → User
4. **Profile Management:** User → Profile Management → S3 Storage → Database → User
5. **Chatbot Interaction:** User → Chatbot Service → AI Service → Response → User
6. **Scholarship Management:** Scholar Sites → Scholarship Scraping → Database → User

---

## Notes

- All external API calls (Gemini AI, AWS S3, Email Service) are asynchronous
- Job and scholarship scrapers run on scheduled intervals
- Resume files are stored in AWS S3, with URLs stored in the database
- Authentication uses JWT tokens with 15-minute expiration
- All database operations use async/await patterns
- File uploads support PDF and DOCX formats for resumes
- Profile pictures support standard image formats

---

**Document Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** TechFive Team

