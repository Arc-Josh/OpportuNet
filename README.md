# Project Name: Oppurtunet
# Team Name: TechFive
# Members: Jaidyn Green, Joshua Dixon, Will Giessner, Rishabh Shukla, Sinan Cakir, Shashwat Adhikary
# Instructor: Diana Rabah
# TA: Jordan Black

# Tech Job Finder

A comprehensive job search platform that helps incoming tech professionals find and apply for jobs, with features for resume analysis and job matching, as well as a simple, intuitive Tinder-like interface. 

## Project Overview

Opportunet is a full-stack application that combines job scraping, resume analysis, and job matching capabilities to help tech professionals find their next career opportunity. The platform includes:

- Job scraping from popular job boards (currently indeed only) 
- Resume analysis and optimization
- Job matching based on skills and experience
- User authentication and profile management
- Interactive chatbot for job search assistance

## Tech Stack

### Frontend
- React.js
- React Router
- Axios for API calls
- JWT for authentication

### Backend
- FastAPI (Python)
- PostgreSQL database
- AWS S3 for file storage
- JWT authentication

### Job Scraper
- Node.js
- Puppeteer
- Cheerio
- JSON2CSV

## Project Structure

```
Tech-Job-finder/
├── client/                 # React frontend
│   ├── public/            # Static files and assets
│   │   ├── assets/       # Images, fonts, and other static resources
│   │   ├── components/   # Reusable UI components (Navbar, JobCard, etc.)
│   │   ├── pages/        # Page components (Home, Dashboard, Login, etc.)
│   │   ├── styles/       # CSS and styling files
│   │   ├── storage/      # Local storage utilities
│   │   ├── App.js        # Main application component
│   │   └── index.js      # Application entry point
│   ├── package.json      # Node.js dependencies
│   └── package-lock.json # Locked dependency versions
├── server/                 # FastAPI backend
│   ├── models/            # Database models
│   ├── services/          # Business logic
│   ├── security/          # Authentication
│   ├── database/          # Database operations
│   └── utilities/         # Helper functions
└── Firstscraper/          # Job scraping module
    ├── scraperapi2.js     # Main scraping logic
    ├── scraperapi.js      # API integration
    ├── config.json        # Configuration settings
    └── Jobs/              # Scraped job data
```

## Features

- **Job Search**: Scrape and aggregate job listings from multiple sources
- **Resume Analysis**: Upload and analyze resumes for job matching
- **User Authentication**: Secure signup and login functionality
- **Job Matching**: AI-powered matching between resumes and job listings
- **Interactive Chatbot**: FAQ and job search assistance
- **Dashboard**: Personalized job recommendations and application tracking

## Installation

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- PostgreSQL
- AWS S3 account (for resume storage)

### Frontend Setup
```bash
cd client
npm install
npm start
```

### Backend Setup
```bash
cd server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Job Scraper Setup
```bash
cd Firstscraper
npm install
```

## Environment Variables

Create a `.env` file in the server directory with the following variables:
```
SECRET_KEY_AWS=your_aws_secret_key
ACCESS_KEY_AWS=your_aws_access_key
BUCKET_AWS=your_s3_bucket_name
REGION_AWS=your_aws_region
DATABASE_URL=your_postgresql_connection_string
```

## API Endpoints

### Authentication
- POST `/signup` - Create new user account
- POST `/login` - User login
- PUT `/change-password` - Update password
- PUT `/change-email` - Update email

### Resume Management
- POST `/upload-resume` - Upload and analyze resume
- PUT `/edit-resume` - Update resume

### Job Management
- POST `/jobs-create` - Create new job listing
- GET `/jobs` - Get all job listings

### Chatbot
- POST `/chatbot` - Get answers to job search questions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Acknowledgments

- FastAPI for the excellent Python web framework
- React for the frontend framework
- Puppeteer for web scraping capabilities
- AWS for cloud storage services
