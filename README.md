# CareerPath (Teamtide) - Skill-Based Job Matching & Career Guidance Portal

CareerPath is an AI-powered, full-stack web application designed to connect job seekers with suitable employment opportunities based on their technical skills, soft skills, and professional interests. 

Unlike traditional job boards that rely solely on keyword searches, CareerPath analyzes the user's skill profile, extracts skills from uploaded resumes, calculates match percentages against real-world job requirements, and provides actionable career guidance to bridge skill gaps.

---

## 🌟 Key Features

1. **Smart Skill-Based Job Matching**
   - Ranks job opportunities dynamically based on a weighted skill-match algorithm.
   - Calculates a percentage-based match score for every job against the user's profile.

2. **Automated Resume Parsing (JSON)**
   - Upload a JSON resume to automatically extract skills using robust keyword and alias matching (e.g., matching "js" to "JavaScript", "reactjs" to "React").
   - Extracted skills are merged directly into the user's profile.

3. **Career Guidance & Skill Gap Analysis**
   - Select a target role to view required skills vs. your current skills.
   - Identifies exactly which skills you need to learn or improve to reach the 60% matching threshold required to apply for a role.
   - You can only apply to a job if your match score is ≥ 60%.

4. **Application Tracking**
   - Apply to jobs with a single click (after meeting the threshold).
   - Monitor application statuses (Pending, Under Review, Shortlisted, Selected, Rejected).

---

## 🛠️ Technology Stack

- **Frontend**: React.js, Vite, Vanilla CSS
- **Backend**: Python, FastAPI
- **Database**: MongoDB Cloud Atlas (Motor Asyncio ODM)
- **Authentication**: JWT (JSON Web Tokens), bcrypt password hashing

---

## 💼 Curated Job Roles & Skill Requirements

The system includes a highly curated database of 15 exact industry roles and their required skill sets to provide accurate matching and career guidance:

| ID | Job Role | Required Skills |
|:---|:---|:---|
| 1 | **Software Developer** | Java, Python, C++, OOP, Git, SQL |
| 2 | **Full Stack Developer** | HTML, CSS, JavaScript, React, Node.js, MongoDB |
| 3 | **Frontend Developer** | HTML, CSS, JavaScript, React, Bootstrap |
| 4 | **Backend Developer** | Java, Spring Boot, Node.js, Django, REST APIs, SQL |
| 5 | **Data Analyst** | Excel, SQL, Python, Power BI, Tableau, Statistics |
| 6 | **Data Scientist** | Python, Machine Learning, Pandas, NumPy, TensorFlow, SQL |
| 7 | **AI/ML Engineer** | Python, Deep Learning, TensorFlow, PyTorch, NLP, Computer Vision |
| 8 | **Cybersecurity Analyst** | Network Security, Ethical Hacking, Kali Linux, SIEM, Firewalls |
| 9 | **Cloud Engineer** | AWS, Azure, GCP, Docker, Kubernetes, Linux |
| 10 | **DevOps Engineer** | Docker, Kubernetes, Jenkins, Git, CI/CD, Linux |
| 11 | **Mobile App Developer** | Flutter, Kotlin, Java, Swift, Firebase |
| 12 | **UI/UX Designer** | Figma, Adobe XD, Wireframing, Prototyping, User Research |
| 13 | **Database Administrator (DBA)** | MySQL, PostgreSQL, Oracle, SQL Server, Database Optimization |
| 14 | **QA/Test Engineer** | Selenium, JUnit, Manual Testing, API Testing, TestNG |
| 15 | **Business Analyst** | SQL, Excel, Power BI, Requirements Gathering, Agile, Communication |

---

## 🚀 Setup & Installation Instructions

### 1. Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB Atlas Account (or local MongoDB)

### 2. Backend Setup
1. Open a terminal and navigate to the project root.
2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install Python dependencies:
   ```bash
   pip install fastapi uvicorn motor pydantic passlib bcrypt python-jose python-dotenv python-multipart
   ```
4. Create a `.env` file in the root directory:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secret_key
   PORT=5000
   ```
5. Run the FastAPI server:
   ```bash
   python app.py
   ```
   *The API will be available at `http://localhost:5000`*

### 3. Frontend Setup
1. Open a new terminal and navigate to the `client` folder:
   ```bash
   cd client
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The web application will open at `http://localhost:5173`*

---

## 📈 System Architecture & Workflow

### 1. Profile Creation & Skill Assessment
Users sign up and either manually assess their skills across 15+ categories or upload a JSON resume to auto-populate their profile.

### 2. Intelligent Matching Engine
When the user visits the Dashboard, the backend retrieves all 15 jobs and calculates a match percentage for each:
- `Match % = (Earned Skill Weight / Total Required Skill Weight) * 100`
- Jobs are ranked dynamically from highest to lowest match score.

### 3. Gap Analysis
If a user selects "Career Guidance", they can pick a target role (e.g., Data Scientist). The system compares their current skills to the role's required skills and highlights the exact missing technologies they need to learn to cross the 60% eligibility mark.

---

## 🔮 Future Enhancements
- Support for parsing PDF/DOCX resumes using Natural Language Processing.
- Interactive learning roadmaps mapping to specific skill gaps.
- Employer dashboard for posting new roles and tracking applicants.
