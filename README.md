# CareerPath (Teamtide) - Skill-Based Job Matching & Career Guidance Portal

CareerPath is an AI-powered, full-stack career platform designed to match job seekers with employment opportunities based on their technical skills, soft skills, and professional experience. 

Unlike traditional keyword-based job boards, CareerPath parses resumes, calculates a percentage-based match score for every job against the user's profile, highlights specific skill gaps, and blocks applications if the match score is below a **60% threshold** to encourage upskilling.

---

## 📊 System Architecture & Data Flow

This diagram illustrates how the Vercel-hosted frontend, the Render-hosted Python backend, and the MongoDB Atlas cloud database communicate, alongside the core user workflows:

```mermaid
graph TD
    %% Component Architecture
    subgraph Component Architecture
        ClientApp["React Frontend (Vite) <br> Hosted on Vercel"]
        VercelProxy{"Vercel Routing Proxy <br> (client/vercel.json)"}
        RenderServer["FastAPI Backend <br> Hosted on Render Web Service"]
        MongoDB[("MongoDB Atlas <br> Cloud Database")]

        ClientApp -->|Page Navigation & Assets| ClientApp
        ClientApp -->|API Request (/api/*)| VercelProxy
        VercelProxy -->|Forward API Traffic| RenderServer
        RenderServer -->|Read/Write Queries| MongoDB
    end

    %% User Workflow Logical Flow
    subgraph Logical User Flow
        UserInit[User Login / Registration] --> Onboard[Profile Onboarding]
        Onboard --> SkillAssess[Rate Skills / Parse Resume]
        SkillAssess --> CalcMatch[Intelligent Matching Engine]
        
        CalcMatch --> MatchScoreDecision{Match Score >= 60%?}
        MatchScoreDecision -->|Yes| ApplyAllowed[Apply with Cover Letter & Resume]
        MatchScoreDecision -->|No| ApplyBlocked[Apply Blocked]
        
        ApplyBlocked --> GapAnalysis[View Career Guidance & Gaps]
        GapAnalysis --> Roadmap[Upskill with Target Learning Roadmap]
        Roadmap --> SkillAssess
    end

    %% Styling
    style ClientApp fill:#f4f5f7,stroke:#3b82f6,stroke-width:2px;
    style RenderServer fill:#f4f5f7,stroke:#10b981,stroke-width:2px;
    style MongoDB fill:#f4f5f7,stroke:#059669,stroke-width:2px;
    style VercelProxy fill:#fffbeb,stroke:#d97706,stroke-width:2px;
    style MatchScoreDecision fill:#fff1f2,stroke:#e11d48,stroke-width:2px;
```

---

## 📁 Repository Directory & File Structure

Here is a full breakdown of the files and directories in this repository:

*   **`app.py`**: The core Python backend written in **FastAPI**. It handles MongoDB connections, database seeding, password hashing, JWT creation, route definitions, and the core matching/resume parsing algorithms.
*   **`vercel.json`** (Root): Handles routing and rewrites if you deploy both frontend and backend to Vercel.
*   **`build.sh`**: Custom bash build script executed by Render to install Python dependencies (`requirements.txt`) and build the frontend React application.
*   **`/api`**: Contains the Vercel serverless function entry points:
    *   **`api/index.py`**: Imports the FastAPI app from the root `app.py` and serves it on Vercel.
    *   **`api/requirements.txt`**: Specifies the dependencies required by Vercel to run the Python serverless environment.
*   **`/client`**: The React.js frontend workspace (built with **Vite**):
    *   **`client/src/pages/LoginPage.jsx`**: Manages sign-up, login, role selection (Job Seeker vs. Recruiter), and auth credentials.
    *   **`client/src/pages/DashboardPage.jsx`**: Displays matching job listings, matching scores, search, and applications for job seekers.
    *   **`client/src/pages/RecruiterDashboard.jsx`**: Provides recruiters with tools to create jobs, view applicants, review resumes, and update application statuses.
    *   **`client/src/pages/OnboardingPage.jsx`**: Guide users through initial skill ratings and target role selection.
    *   **`client/src/context/AuthContext.jsx`**: Provides global user authentication state (login, register, logout, session persistence) using Axios.
    *   **`client/vercel.json`**: Configures Vercel to serve the React SPA and **proxy all `/api/*` and `/uploads/*` requests to the Render backend**.
*   **`/server`**: An alternative Node.js Express backend implementation containing models, routes, and JSON schemas for reference.
*   **`requirements.txt`** (Root): Python dependencies list for local development and Render deployments.
*   **`test_resume_parser.py`**: Test script for validating the backend resume parser.

---

## ⚙️ Core System Algorithms

### 1. Intelligent Job Matching Engine
Each job has a list of required skills, and each skill is assigned an importance `weight` (1 to 5). When a user requests their dashboard, the backend dynamically calculates a personalized match score for every job:

$$\text{Match Score} = \text{round}\left( \frac{\sum (\text{User Skill Level Factor} \times \text{Skill Weight})}{\sum \text{Total Required Skill Weights}} \times 100 \right)$$

*   **Skill Level Factor**: Determined by the user's rated level (1–5) relative to the requirement:
    *   `Level Factor = User Skill Level / 5.0`
    *   A buffer of `+0.4` is added (up to a maximum of `1.0`) to reward even partial competencies.
*   **Job Filtering**: Jobs are sorted in descending order of their match score. If a score is below **60%**, the frontend disables the "Apply Now" button and displays a "Match score too low" warning.

### 2. Automated Resume Parsing
Users can upload their resumes in PDF or JSON format:
*   The parser scans the text using regex search patterns against a dictionary of predefined technologies.
*   It supports **alias matching** (e.g. mapping "js", "reactjs", "react.js" to "React" and "JavaScript").
*   Extracted skills are merged directly into the user's profile with a default rating of 3 (Intermediate), which users can later adjust.

### 3. Career Guidance & Skill Gap Analysis
When a user selects a target role, the backend:
1. Compares the required skills for that role with the user's current skills.
2. Identifies **missing skills** (skills required but not present in the user's profile).
3. Identifies **weak skills** (skills where the user's rating is lower than the job requirements).
4. Curates a target upskilling checklist, linking users to specific learning roadmap guidelines to bridge the gap.

---

## 🚀 Deployment Workflows

This project is optimized for a hybrid deployment, combining the best features of Vercel and Render.

### Frontend: Vercel (Hobby Tier)
Vercel is used to compile and serve the static React frontend SPA on its global CDN edge network:
1. **Root Directory**: Set to `client` during project import.
2. **Framework Preset**: **Vite**.
3. **Build Command**: `vite build`.
4. **Output Directory**: `dist`.
5. **Proxy Configuration**: `client/vercel.json` rewrites all `/api/*` traffic directly to the Render URL (`https://techtide-4q8b.onrender.com`).

### Backend: Render (Free Web Service)
Render hosts the persistent Python backend server, running the FastAPI app with MongoDB connectivity:
1. **Build Command**: `bash build.sh` (installs dependencies using `requirements.txt`).
2. **Start Command**: `uvicorn app:app --host 0.0.0.0 --port 10000` (starts the ASGI server).
3. **Environment Variables**:
   *   `MONGODB_URI`: Connection string to your MongoDB Atlas cluster.
   *   `JWT_SECRET`: Secret key used for signing security tokens.
