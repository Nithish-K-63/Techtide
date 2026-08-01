"""
CareerPath — Skill-Based Job Matching Portal
=============================================
FastAPI backend with MongoDB Cloud Atlas integration (Motor ODM / Pydantic Schemas).

Serves:
  • MongoDB Cloud API endpoints (/api/auth, /api/jobs, /api/skills, /api/profile, /api/applications)
  • React frontend static files (client/dist/)

Run:  python app.py
"""

import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel, Field

# Patch bcrypt compatibility for passlib
try:
    import bcrypt
    if not hasattr(bcrypt, "__about__"):
        bcrypt.__about__ = type("About", (), {"__version__": getattr(bcrypt, "__version__", "4.0.0")})
except Exception:
    pass

# Patch FastAPI jsonable_encoder for BSON ObjectId
try:
    from bson import ObjectId
    from fastapi.encoders import ENCODERS_BY_TYPE
    ENCODERS_BY_TYPE[ObjectId] = str
except Exception:
    pass

# ═══════════════════════════════════════════════════════════════
#  LOAD ENVIRONMENT VARIABLES (.env)
# ═══════════════════════════════════════════════════════════════
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

MONGO_URI = os.getenv("MONGO_URI") or os.getenv("MONGODB_URI") or ""
PORT = int(os.getenv("PORT", 5000))
JWT_SECRET = os.getenv("JWT_SECRET", "career_portal_jwt_secret_2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 7

UPLOADS_DIR = BASE_DIR / "server" / "uploads"
DIST_DIR = BASE_DIR / "client" / "dist"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ═══════════════════════════════════════════════════════════════
#  MONGODB CONNECTION SETUP
# ═══════════════════════════════════════════════════════════════
mongo_client: Optional[AsyncIOMotorClient] = None
db = None

def get_db():
    global mongo_client, db
    if db is not None:
        return db
    if MONGO_URI:
        try:
            mongo_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            db = mongo_client.get_database("career_portal")
            print(f"Connected to MongoDB Cloud Atlas successfully! Database: career_portal")
            return db
        except Exception as e:
            print(f"Warning: Failed to connect to MongoDB Atlas: {e}")
    return None

# ═══════════════════════════════════════════════════════════════
#  PASSWORD HASHING
# ═══════════════════════════════════════════════════════════════
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ═══════════════════════════════════════════════════════════════
#  INITIAL SEED DATA (Used if database is empty)
# ═══════════════════════════════════════════════════════════════
INITIAL_SKILLS_DATA = {
  "categories": [
    {
      "id": "programming", "name": "Programming Languages & Core", "icon": "💻", "color": "#6366f1",
      "skills": [
        { "id": "python", "name": "Python" }, { "id": "javascript", "name": "JavaScript" },
        { "id": "typescript", "name": "TypeScript" }, { "id": "java", "name": "Java" },
        { "id": "csharp", "name": "C#" }, { "id": "cpp", "name": "C++" },
        { "id": "go", "name": "Go" }, { "id": "rust", "name": "Rust" },
        { "id": "kotlin", "name": "Kotlin" }, { "id": "swift", "name": "Swift" },
        { "id": "php", "name": "PHP" }, { "id": "ruby", "name": "Ruby" },
        { "id": "oop", "name": "Object-Oriented Programming (OOP)" }
      ]
    },
    {
      "id": "frontend", "name": "Frontend & Mobile", "icon": "🎨", "color": "#ec4899",
      "skills": [
        { "id": "react", "name": "React.js" }, { "id": "vue", "name": "Vue.js" },
        { "id": "angular", "name": "Angular" }, { "id": "nextjs", "name": "Next.js" },
        { "id": "html_css", "name": "HTML/CSS" }, { "id": "tailwind", "name": "Tailwind CSS" },
        { "id": "bootstrap", "name": "Bootstrap" }, { "id": "flutter", "name": "Flutter" },
        { "id": "redux", "name": "Redux" }, { "id": "graphql_client", "name": "GraphQL (Client)" }
      ]
    },
    {
      "id": "backend", "name": "Backend Development", "icon": "⚙️", "color": "#10b981",
      "skills": [
        { "id": "nodejs", "name": "Node.js" }, { "id": "express", "name": "Express.js" },
        { "id": "django", "name": "Django" }, { "id": "fastapi", "name": "FastAPI" },
        { "id": "spring", "name": "Spring Boot" }, { "id": "dotnet", "name": ".NET Core" },
        { "id": "graphql_server", "name": "GraphQL (Server)" }, { "id": "rest_api", "name": "REST API Design" }
      ]
    },
    {
      "id": "database", "name": "Databases & Admin", "icon": "🗄️", "color": "#f59e0b",
      "skills": [
        { "id": "mysql", "name": "MySQL" }, { "id": "postgresql", "name": "PostgreSQL" },
        { "id": "mongodb", "name": "MongoDB" }, { "id": "redis", "name": "Redis" },
        { "id": "firebase", "name": "Firebase" }, { "id": "elasticsearch", "name": "Elasticsearch" },
        { "id": "sqlite", "name": "SQLite" }, { "id": "oracle", "name": "Oracle DB" },
        { "id": "sql_server", "name": "SQL Server" }, { "id": "db_optimization", "name": "Database Optimization" }
      ]
    },
    {
      "id": "cloud_devops", "name": "Cloud, DevOps & Security", "icon": "☁️", "color": "#3b82f6",
      "skills": [
        { "id": "aws", "name": "AWS" }, { "id": "azure", "name": "Azure" },
        { "id": "gcp", "name": "Google Cloud" }, { "id": "docker", "name": "Docker" },
        { "id": "kubernetes", "name": "Kubernetes" }, { "id": "ci_cd", "name": "CI/CD & Jenkins" },
        { "id": "terraform", "name": "Terraform" }, { "id": "linux", "name": "Linux" },
        { "id": "networking", "name": "Network Security" }, { "id": "ethical_hacking", "name": "Ethical Hacking" },
        { "id": "siem", "name": "SIEM & Firewalls" }
      ]
    },
    {
      "id": "data_ai", "name": "Data Science, AI & Analytics", "icon": "🤖", "color": "#8b5cf6",
      "skills": [
        { "id": "machine_learning", "name": "Machine Learning" }, { "id": "deep_learning", "name": "Deep Learning" },
        { "id": "data_analysis", "name": "Data Analysis" }, { "id": "pandas", "name": "Pandas/NumPy" },
        { "id": "tensorflow", "name": "TensorFlow" }, { "id": "pytorch", "name": "PyTorch" },
        { "id": "sql_analytics", "name": "SQL Analytics" }, { "id": "tableau", "name": "Tableau/Power BI" },
        { "id": "nlp", "name": "NLP" }, { "id": "computer_vision", "name": "Computer Vision" },
        { "id": "excel", "name": "Microsoft Excel" }, { "id": "statistics", "name": "Statistics" }
      ]
    },
    {
      "id": "testing_design", "name": "QA Testing & UI/UX Design", "icon": "🧪", "color": "#ec4899",
      "skills": [
        { "id": "selenium", "name": "Selenium" }, { "id": "junit", "name": "JUnit" },
        { "id": "manual_testing", "name": "Manual Testing" }, { "id": "testng", "name": "TestNG" },
        { "id": "figma", "name": "Figma" }, { "id": "adobe_xd", "name": "Adobe XD" },
        { "id": "wireframing", "name": "Wireframing" }, { "id": "prototyping", "name": "Prototyping" },
        { "id": "user_research", "name": "User Research" }
      ]
    },
    {
      "id": "business_soft", "name": "Business & Soft Skills", "icon": "🌟", "color": "#f97316",
      "skills": [
        { "id": "communication", "name": "Communication" }, { "id": "teamwork", "name": "Teamwork" },
        { "id": "problem_solving", "name": "Problem Solving" }, { "id": "leadership", "name": "Leadership" },
        { "id": "time_management", "name": "Time Management" }, { "id": "critical_thinking", "name": "Critical Thinking" },
        { "id": "adaptability", "name": "Adaptability" }, { "id": "req_gathering", "name": "Requirements Gathering" },
        { "id": "git", "name": "Git/GitHub" }, { "id": "jira", "name": "Jira/Agile" },
        { "id": "postman", "name": "Postman / API Testing" }
      ]
    }
  ]
}

INITIAL_JOBS_DATA = [
  {
    "id": "job_001", "title": "Software Developer", "company": "CoreTech Systems",
    "location": "Bangalore, India", "type": "Full-time", "salary": "₹10 - 16 LPA",
    "industry": "Software Engineering", "experience": "2-4 years", "postedDaysAgo": 2, "logo": "CS", "logoColor": "#6366f1",
    "description": "Develop and maintain robust software solutions using Java, Python, C++, and OOP principles with Git version control and SQL databases.",
    "requiredSkills": [
      { "id": "java", "weight": 20 }, { "id": "python", "weight": 20 },
      { "id": "cpp", "weight": 20 }, { "id": "oop", "weight": 15 },
      { "id": "git", "weight": 15 }, { "id": "sql_analytics", "weight": 10 }
    ],
    "tags": ["Java", "Python", "C++", "OOP", "Git", "SQL"]
  },
  {
    "id": "job_002", "title": "Full Stack Developer", "company": "TechNova Solutions",
    "location": "Bangalore, India", "type": "Full-time", "salary": "₹12 - 20 LPA",
    "industry": "Web Development", "experience": "2-5 years", "postedDaysAgo": 1, "logo": "TN", "logoColor": "#3b82f6",
    "description": "Build end-to-end web applications using HTML, CSS, JavaScript, React on the frontend and Node.js with MongoDB on the backend.",
    "requiredSkills": [
      { "id": "html_css", "weight": 15 }, { "id": "javascript", "weight": 20 },
      { "id": "react", "weight": 25 }, { "id": "nodejs", "weight": 25 },
      { "id": "mongodb", "weight": 15 }
    ],
    "tags": ["HTML", "CSS", "JavaScript", "React", "Node.js", "MongoDB"]
  },
  {
    "id": "job_003", "title": "Frontend Developer", "company": "PixelCraft Studios",
    "location": "Pune, India", "type": "Full-time", "salary": "₹8 - 14 LPA",
    "industry": "Frontend Engineering", "experience": "1-3 years", "postedDaysAgo": 3, "logo": "PC", "logoColor": "#ec4899",
    "description": "Craft responsive and interactive user interfaces using modern HTML, CSS, JavaScript, React.js, and Bootstrap framework.",
    "requiredSkills": [
      { "id": "html_css", "weight": 20 }, { "id": "javascript", "weight": 25 },
      { "id": "react", "weight": 35 }, { "id": "bootstrap", "weight": 20 }
    ],
    "tags": ["HTML", "CSS", "JavaScript", "React", "Bootstrap"]
  },
  {
    "id": "job_004", "title": "Backend Developer", "company": "Zephyr Technologies",
    "location": "Mumbai, India", "type": "Full-time", "salary": "₹14 - 22 LPA",
    "industry": "Backend Engineering", "experience": "2-5 years", "postedDaysAgo": 1, "logo": "ZT", "logoColor": "#10b981",
    "description": "Engineer high-performance server architectures and REST APIs using Java, Spring Boot, Node.js, Django, and SQL relational databases.",
    "requiredSkills": [
      { "id": "java", "weight": 20 }, { "id": "spring", "weight": 20 },
      { "id": "nodejs", "weight": 20 }, { "id": "django", "weight": 15 },
      { "id": "rest_api", "weight": 15 }, { "id": "sql_analytics", "weight": 10 }
    ],
    "tags": ["Java", "Spring Boot", "Node.js", "Django", "REST APIs", "SQL"]
  },
  {
    "id": "job_005", "title": "Data Analyst", "company": "AnalytiQ Corp",
    "location": "Hyderabad, India", "type": "Full-time", "salary": "₹8 - 14 LPA",
    "industry": "Data & Analytics", "experience": "1-3 years", "postedDaysAgo": 2, "logo": "AQ", "logoColor": "#8b5cf6",
    "description": "Analyze datasets, build automated dashboards in Power BI and Tableau, run SQL queries, and apply statistical models with Excel & Python.",
    "requiredSkills": [
      { "id": "excel", "weight": 20 }, { "id": "sql_analytics", "weight": 25 },
      { "id": "python", "weight": 15 }, { "id": "tableau", "weight": 25 },
      { "id": "statistics", "weight": 15 }
    ],
    "tags": ["Excel", "SQL", "Python", "Power BI", "Tableau", "Statistics"]
  },
  {
    "id": "job_006", "title": "Data Scientist", "company": "DataMind AI",
    "location": "Hyderabad, India", "type": "Full-time", "salary": "₹16 - 28 LPA",
    "industry": "Data Science", "experience": "3-5 years", "postedDaysAgo": 4, "logo": "DM", "logoColor": "#a855f7",
    "description": "Build predictive machine learning models, manipulate data with Pandas and NumPy, perform SQL queries, and train models using TensorFlow.",
    "requiredSkills": [
      { "id": "python", "weight": 25 }, { "id": "machine_learning", "weight": 25 },
      { "id": "pandas", "weight": 20 }, { "id": "tensorflow", "weight": 15 },
      { "id": "sql_analytics", "weight": 15 }
    ],
    "tags": ["Python", "Machine Learning", "Pandas", "NumPy", "TensorFlow", "SQL"]
  },
  {
    "id": "job_007", "title": "AI/ML Engineer", "company": "Cognitive AI Labs",
    "location": "Gurgaon, India", "type": "Full-time", "salary": "₹20 - 35 LPA",
    "industry": "Artificial Intelligence", "experience": "3-6 years", "postedDaysAgo": 1, "logo": "CA", "logoColor": "#6366f1",
    "description": "Design and deploy advanced AI models including deep learning architectures, Natural Language Processing (NLP), Computer Vision, TensorFlow, and PyTorch.",
    "requiredSkills": [
      { "id": "python", "weight": 15 }, { "id": "deep_learning", "weight": 25 },
      { "id": "tensorflow", "weight": 20 }, { "id": "pytorch", "weight": 20 },
      { "id": "nlp", "weight": 10 }, { "id": "computer_vision", "weight": 10 }
    ],
    "tags": ["Python", "Deep Learning", "TensorFlow", "PyTorch", "NLP", "Computer Vision"]
  },
  {
    "id": "job_008", "title": "Cybersecurity Analyst", "company": "SecureNet Global",
    "location": "Delhi, India", "type": "Full-time", "salary": "₹14 - 24 LPA",
    "industry": "Cybersecurity", "experience": "2-5 years", "postedDaysAgo": 3, "logo": "SG", "logoColor": "#ef4444",
    "description": "Protect network infrastructure, perform ethical hacking and penetration tests with Kali Linux, manage SIEM systems and firewalls.",
    "requiredSkills": [
      { "id": "networking", "weight": 25 }, { "id": "ethical_hacking", "weight": 25 },
      { "id": "linux", "weight": 20 }, { "id": "siem", "weight": 30 }
    ],
    "tags": ["Network Security", "Ethical Hacking", "Kali Linux", "SIEM", "Firewalls"]
  },
  {
    "id": "job_009", "title": "Cloud Engineer", "company": "CloudScale Systems",
    "location": "Chennai, India", "type": "Full-time", "salary": "₹16 - 26 LPA",
    "industry": "Cloud Computing", "experience": "3-5 years", "postedDaysAgo": 5, "logo": "CS", "logoColor": "#0284c7",
    "description": "Architect and manage public cloud infrastructure across AWS, Azure, and GCP using Docker containers, Kubernetes orchestration, and Linux environments.",
    "requiredSkills": [
      { "id": "aws", "weight": 20 }, { "id": "azure", "weight": 15 },
      { "id": "gcp", "weight": 15 }, { "id": "docker", "weight": 20 },
      { "id": "kubernetes", "weight": 15 }, { "id": "linux", "weight": 15 }
    ],
    "tags": ["AWS", "Azure", "GCP", "Docker", "Kubernetes", "Linux"]
  },
  {
    "id": "job_010", "title": "DevOps Engineer", "company": "InfraPipeline Corp",
    "location": "Bangalore, India", "type": "Full-time", "salary": "₹18 - 28 LPA",
    "industry": "DevOps & Infrastructure", "experience": "3-6 years", "postedDaysAgo": 2, "logo": "IP", "logoColor": "#f59e0b",
    "description": "Automate deployment pipelines using Docker, Kubernetes, Jenkins, Git version control, and CI/CD tools on Linux production servers.",
    "requiredSkills": [
      { "id": "docker", "weight": 20 }, { "id": "kubernetes", "weight": 20 },
      { "id": "ci_cd", "weight": 25 }, { "id": "git", "weight": 15 },
      { "id": "linux", "weight": 20 }
    ],
    "tags": ["Docker", "Kubernetes", "Jenkins", "Git", "CI/CD", "Linux"]
  },
  {
    "id": "job_011", "title": "Mobile App Developer", "company": "Appify Mobility",
    "location": "Bangalore, India", "type": "Full-time", "salary": "₹10 - 18 LPA",
    "industry": "Mobile Development", "experience": "2-4 years", "postedDaysAgo": 3, "logo": "AM", "logoColor": "#10b981",
    "description": "Build high-performance mobile applications using Flutter, Kotlin, Java, and Swift with backend integration via Firebase.",
    "requiredSkills": [
      { "id": "flutter", "weight": 25 }, { "id": "kotlin", "weight": 20 },
      { "id": "java", "weight": 15 }, { "id": "swift", "weight": 20 },
      { "id": "firebase", "weight": 20 }
    ],
    "tags": ["Flutter", "Kotlin", "Java", "Swift", "Firebase"]
  },
  {
    "id": "job_012", "title": "UI/UX Designer", "company": "CreativeStudio Design",
    "location": "Pune, India", "type": "Full-time", "salary": "₹9 - 16 LPA",
    "industry": "UI/UX Design", "experience": "2-4 years", "postedDaysAgo": 4, "logo": "CD", "logoColor": "#f43f5e",
    "description": "Design user-centered interfaces using Figma and Adobe XD. Conduct user research, wireframing, and interactive prototyping.",
    "requiredSkills": [
      { "id": "figma", "weight": 30 }, { "id": "adobe_xd", "weight": 20 },
      { "id": "wireframing", "weight": 20 }, { "id": "prototyping", "weight": 15 },
      { "id": "user_research", "weight": 15 }
    ],
    "tags": ["Figma", "Adobe XD", "Wireframing", "Prototyping", "User Research"]
  },
  {
    "id": "job_013", "title": "Database Administrator (DBA)", "company": "DataFortress Enterprise",
    "location": "Mumbai, India", "type": "Full-time", "salary": "₹15 - 25 LPA",
    "industry": "Database Administration", "experience": "4-7 years", "postedDaysAgo": 5, "logo": "DE", "logoColor": "#06b6d4",
    "description": "Manage, secure, and optimize enterprise relational databases including MySQL, PostgreSQL, Oracle, and SQL Server.",
    "requiredSkills": [
      { "id": "mysql", "weight": 20 }, { "id": "postgresql", "weight": 20 },
      { "id": "oracle", "weight": 20 }, { "id": "sql_server", "weight": 20 },
      { "id": "db_optimization", "weight": 20 }
    ],
    "tags": ["MySQL", "PostgreSQL", "Oracle", "SQL Server", "Database Optimization"]
  },
  {
    "id": "job_014", "title": "QA / Test Engineer", "company": "QualityFirst Labs",
    "location": "Chennai, India", "type": "Full-time", "salary": "₹8 - 14 LPA",
    "industry": "Software Quality Assurance", "experience": "1-4 years", "postedDaysAgo": 2, "logo": "QL", "logoColor": "#84cc16",
    "description": "Perform automated and manual testing using Selenium, JUnit, TestNG frameworks, and execute comprehensive API testing.",
    "requiredSkills": [
      { "id": "selenium", "weight": 25 }, { "id": "junit", "weight": 20 },
      { "id": "manual_testing", "weight": 20 }, { "id": "postman", "weight": 20 },
      { "id": "testng", "weight": 15 }
    ],
    "tags": ["Selenium", "JUnit", "Manual Testing", "API Testing", "TestNG"]
  },
  {
    "id": "job_015", "title": "Business Analyst", "company": "Enterprise Insight Solutions",
    "location": "Gurgaon, India", "type": "Full-time", "salary": "₹12 - 20 LPA",
    "industry": "Business Analysis & Consulting", "experience": "2-5 years", "postedDaysAgo": 1, "logo": "EI", "logoColor": "#eab308",
    "description": "Gather business requirements, facilitate Agile development, perform SQL & Excel analysis, build Power BI reports, and communicate with stakeholders.",
    "requiredSkills": [
      { "id": "sql_analytics", "weight": 20 }, { "id": "excel", "weight": 20 },
      { "id": "tableau", "weight": 15 }, { "id": "req_gathering", "weight": 20 },
      { "id": "jira", "weight": 15 }, { "id": "communication", "weight": 10 }
    ],
    "tags": ["SQL", "Excel", "Power BI", "Requirements Gathering", "Agile", "Communication"]
  }
]

# In-memory fallback stores (used if database is empty)
MEM_USERS = []
MEM_JOBS = list(INITIAL_JOBS_DATA)
MEM_SKILLS = dict(INITIAL_SKILLS_DATA)
MEM_APPS = []
MEM_NOTIFICATIONS = []


# ═══════════════════════════════════════════════════════════════
#  JWT HELPERS
# ═══════════════════════════════════════════════════════════════
def create_token(user_id: str, username: str, role: str = "user") -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"id": user_id, "username": username, "role": role, "exp": expire}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    token = auth_header.split(" ", 1)[1]
    return decode_token(token)

def clean_mongo_doc(doc):
    if isinstance(doc, dict):
        res = {}
        for k, v in doc.items():
            if k == "_id":
                continue
            res[k] = clean_mongo_doc(v)
        return res
    elif isinstance(doc, list):
        return [clean_mongo_doc(item) for item in doc]
    return doc

def user_without_password(user: dict) -> dict:
    if not isinstance(user, dict):
        return {}
    clean = clean_mongo_doc(user)
    return {k: v for k, v in clean.items() if k != "password"}

# ═══════════════════════════════════════════════════════════════
#  MATCH SCORE ALGORITHM
# ═══════════════════════════════════════════════════════════════
def calculate_match_score(user_skills: list, required_skills: list) -> int:
    if not user_skills:
        return 0
    user_skill_map = {s["id"]: s.get("level", 1) for s in user_skills}
    total_weight = 0
    earned_score = 0.0
    for req in required_skills:
        total_weight += req["weight"]
        if req["id"] in user_skill_map:
            level_factor = user_skill_map[req["id"]] / 5.0
            earned_score += req["weight"] * min(level_factor + 0.4, 1.0)
    return round((earned_score / total_weight) * 100) if total_weight > 0 else 0

# ═══════════════════════════════════════════════════════════════
#  PYDANTIC SCHEMA MODELS (Mongoose ODM Equivalent)
# ═══════════════════════════════════════════════════════════════
class UserSkill(BaseModel):
    id: str
    level: int = 3

class UserProfile(BaseModel):
    skills: List[UserSkill] = []
    resumeFileName: Optional[str] = None
    resumeOriginalName: Optional[str] = None
    resumeUploadedAt: Optional[str] = None
    profileComplete: bool = False
    targetRole: str = ""
    experience: str = ""
    education: str = ""
    bio: Optional[str] = ""
    lastUpdated: Optional[str] = None

class RegisterBody(BaseModel):
    username: str
    email: str
    password: str
    fullName: Optional[str] = ""
    role: Optional[str] = "user"  # "user" or "recruiter"

class LoginBody(BaseModel):
    username: str
    password: str

class SkillsUpdateBody(BaseModel):
    skills: List[dict] = []
    targetRole: Optional[str] = ""
    experience: Optional[str] = ""
    education: Optional[str] = ""

class ProfileInfoBody(BaseModel):
    fullName: Optional[str] = None
    email: Optional[str] = None
    targetRole: Optional[str] = None
    experience: Optional[str] = None
    education: Optional[str] = None
    bio: Optional[str] = None

class ApplicationBody(BaseModel):
    jobId: str
    coverLetter: Optional[str] = ""
    phone: Optional[str] = ""
    linkedIn: Optional[str] = ""
    portfolio: Optional[str] = ""

class ApplicationStatusBody(BaseModel):
    status: str
    counselingNote: Optional[str] = ""

class NotificationMarkBody(BaseModel):
    ids: List[str] = []

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    d = get_db()
    if d is not None:
        try:
            if await d.jobs.count_documents({}) == 0:
                await d.jobs.insert_many([dict(j) for j in INITIAL_JOBS_DATA])
                print("Seeded initial job roles to MongoDB Cloud.")
            if await d.skills.count_documents({}) == 0:
                await d.skills.insert_one(dict(INITIAL_SKILLS_DATA))
                print("Seeded initial skill categories to MongoDB Cloud.")
        except Exception as e:
            print(f"MongoDB Startup Seeding Note: {e}")
    yield

# ═══════════════════════════════════════════════════════════════
#  FASTAPI APP
# ═══════════════════════════════════════════════════════════════
app = FastAPI(title="CareerPath API — MongoDB Cloud", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══════════════════════════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════════════════════════
@app.get("/api/health")
async def health_check():
    d = get_db()
    db_status = "connected" if d is not None else "in-memory (fallback)"
    return {
        "status": "OK",
        "database": db_status,
        "message": "Career Portal API running with MongoDB Cloud integration",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

# ═══════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ═══════════════════════════════════════════════════════════════
@app.post("/api/auth/register", status_code=201)
async def register(body: RegisterBody):
    if not body.username or not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Username, email, and password are required")
    
    d = get_db()
    role = body.role if body.role in ("user", "recruiter") else "user"
    hashed_password = pwd_context.hash(body.password)
    new_user = {
        "id": str(uuid.uuid4()),
        "username": body.username,
        "email": body.email,
        "fullName": body.fullName or body.username,
        "password": hashed_password,
        "role": role,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "profile": {
            "skills": [],
            "resumeFileName": None,
            "profileComplete": False,
            "targetRole": "",
            "experience": "",
            "education": "",
            "lastUpdated": None,
        },
    }

    if d is not None:
        try:
            existing = await d.users.find_one({"$or": [{"username": body.username}, {"email": body.email}]}, {"_id": 0})
            if existing:
                raise HTTPException(status_code=409, detail="Username or email already exists")
            await d.users.insert_one(new_user)
            new_user.pop("_id", None)
        except HTTPException:
            raise
        except Exception:
            pass
    else:
        if any(u["username"] == body.username or u["email"] == body.email for u in MEM_USERS):
            raise HTTPException(status_code=409, detail="Username or email already exists")
        MEM_USERS.append(new_user)

    token = create_token(new_user["id"], new_user["username"], new_user.get("role", "user"))
    return {
        "token": token,
        "user": user_without_password(new_user),
        "message": "Account created successfully",
    }

@app.post("/api/auth/login")
async def login(body: LoginBody):
    if not body.username or not body.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    
    d = get_db()
    user = None
    if d is not None:
        try:
            user = await d.users.find_one({"$or": [{"username": body.username}, {"email": body.username}]})
        except Exception:
            pass
    
    if user is None:
        user = next((u for u in MEM_USERS if u["username"] == body.username or u["email"] == body.username), None)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if not pwd_context.verify(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_token(user["id"], user["username"], user.get("role", "user"))
    return {
        "token": token,
        "user": user_without_password(user),
        "message": "Login successful",
    }

@app.get("/api/auth/me")
async def verify_me(current_user: dict = Depends(get_current_user)):
    d = get_db()
    user = None
    if d is not None:
        try:
            user = await d.users.find_one({"id": current_user["id"]})
        except Exception:
            pass
    if user is None:
        user = next((u for u in MEM_USERS if u["id"] == current_user["id"]), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": user_without_password(user)}

# ═══════════════════════════════════════════════════════════════
#  SKILLS ROUTES
# ═══════════════════════════════════════════════════════════════
@app.get("/api/skills")
async def get_skills():
    d = get_db()
    if d is not None:
        try:
            skills_doc = await d.skills.find_one({})
            if skills_doc:
                return {"categories": skills_doc.get("categories", [])}
        except Exception:
            pass
    return MEM_SKILLS

# ═══════════════════════════════════════════════════════════════
#  JOBS ROUTES
# ═══════════════════════════════════════════════════════════════
@app.get("/api/jobs")
async def get_jobs(
    industry: Optional[str] = None,
    type: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    d = get_db()
    user = None
    jobs = []
    
    if d is not None:
        try:
            user = await d.users.find_one({"id": current_user["id"]})
            cursor = d.jobs.find({}, {"_id": 0})
            jobs = await cursor.to_list(length=100)
        except Exception:
            pass
    
    if not jobs:
        user = next((u for u in MEM_USERS if u["id"] == current_user["id"]), None) if not user else user
        jobs = list(MEM_JOBS)
    
    user_skills = user.get("profile", {}).get("skills", []) if user else []

    filtered = []
    for job in jobs:
        j = {**job, "matchScore": calculate_match_score(user_skills, job.get("requiredSkills", []))}
        filtered.append(j)

    if industry and industry != "all":
        filtered = [j for j in filtered if industry.lower() in j.get("industry", "").lower()]
    if type and type != "all":
        filtered = [j for j in filtered if j.get("type", "").lower() == type.lower()]
    if search:
        q = search.lower()
        filtered = [
            j for j in filtered
            if q in j["title"].lower()
            or q in j["company"].lower()
            or any(q in t.lower() for t in j.get("tags", []))
        ]

    if sort == "recent":
        filtered.sort(key=lambda j: j.get("postedDaysAgo", 999))
    else:
        filtered.sort(key=lambda j: j.get("matchScore", 0), reverse=True)

    return {"jobs": filtered, "total": len(filtered)}

@app.get("/api/jobs/{job_id}")
async def get_job(job_id: str, current_user: dict = Depends(get_current_user)):
    d = get_db()
    job = None
    user = None
    if d is not None:
        try:
            job = await d.jobs.find_one({"id": job_id}, {"_id": 0})
            user = await d.users.find_one({"id": current_user["id"]})
        except Exception:
            pass
    if not job:
        job = next((j for j in MEM_JOBS if j["id"] == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not user:
        user = next((u for u in MEM_USERS if u["id"] == current_user["id"]), None)
    user_skills = user.get("profile", {}).get("skills", []) if user else []
    return {"job": {**job, "matchScore": calculate_match_score(user_skills, job.get("requiredSkills", []))}}

# ═══════════════════════════════════════════════════════════════
#  PROFILE ROUTES
# ═══════════════════════════════════════════════════════════════
@app.get("/api/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    return await verify_me(current_user)

@app.put("/api/profile/skills")
async def update_skills(body: SkillsUpdateBody, current_user: dict = Depends(get_current_user)):
    d = get_db()
    now_str = datetime.now(timezone.utc).isoformat()
    update_data = {
        "profile.skills": body.skills or [],
        "profile.profileComplete": len(body.skills or []) > 0,
        "profile.lastUpdated": now_str,
    }
    if body.targetRole:
        update_data["profile.targetRole"] = body.targetRole
    if body.experience:
        update_data["profile.experience"] = body.experience
    if body.education:
        update_data["profile.education"] = body.education

    user = None
    if d is not None:
        try:
            await d.users.update_one({"id": current_user["id"]}, {"$set": update_data})
            user = await d.users.find_one({"id": current_user["id"]})
        except Exception:
            pass

    if user is None:
        idx = next((i for i, u in enumerate(MEM_USERS) if u["id"] == current_user["id"]), None)
        if idx is not None:
            MEM_USERS[idx]["profile"]["skills"] = body.skills or []
            if body.targetRole: MEM_USERS[idx]["profile"]["targetRole"] = body.targetRole
            if body.experience: MEM_USERS[idx]["profile"]["experience"] = body.experience
            if body.education: MEM_USERS[idx]["profile"]["education"] = body.education
            MEM_USERS[idx]["profile"]["profileComplete"] = len(MEM_USERS[idx]["profile"]["skills"]) > 0
            MEM_USERS[idx]["profile"]["lastUpdated"] = now_str
            user = MEM_USERS[idx]

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": user_without_password(user), "message": "Skills updated successfully"}

SKILL_ALIASES = {
    "python": ["python", "python3", "py", "django", "flask", "fastapi"],
    "javascript": ["javascript", "js", "ecmascript", "es6", "es2015", "node"],
    "typescript": ["typescript", "ts"],
    "java": ["java", "spring boot", "springboot", "j2ee"],
    "csharp": ["c#", "csharp", ".net", "dotnet", "asp.net"],
    "cpp": ["c++", "cpp", "c/c++"],
    "go": ["golang", "go lang"],
    "rust": ["rust", "rustlang"],
    "kotlin": ["kotlin", "kotlin/jvm"],
    "swift": ["swift", "swiftui"],
    "php": ["php", "laravel", "symfony"],
    "ruby": ["ruby", "rails", "ruby on rails"],
    "oop": ["oop", "object oriented", "object-oriented", "object oriented programming"],
    "react": ["react", "react.js", "reactjs", "react native", "react-native", "jsx", "next.js", "nextjs"],
    "vue": ["vue", "vue.js", "vuejs", "nuxt"],
    "angular": ["angular", "angularjs", "angular.js"],
    "nextjs": ["next.js", "nextjs", "next js"],
    "html_css": ["html", "css", "html5", "css3", "html/css", "web design"],
    "tailwind": ["tailwind", "tailwindcss", "tailwind css"],
    "bootstrap": ["bootstrap", "bootstrap5", "bootstrap4"],
    "flutter": ["flutter", "dart", "flutter dev"],
    "redux": ["redux", "redux toolkit", "vuex", "mobx"],
    "graphql_client": ["graphql", "apollo", "relay"],
    "nodejs": ["node", "node.js", "nodejs", "express.js", "express", "npm"],
    "express": ["express", "express.js"],
    "django": ["django", "drf", "django rest framework"],
    "fastapi": ["fastapi", "fast api"],
    "spring": ["spring", "spring boot", "springboot", "spring mvc"],
    "dotnet": [".net", "dotnet", "asp.net", "c# web", ".net core"],
    "graphql_server": ["graphql", "hasura"],
    "rest_api": ["rest", "restful", "rest api", "api design", "openapi", "swagger", "api testing"],
    "mysql": ["mysql", "sql", "mariadb"],
    "postgresql": ["postgres", "postgresql", "psql"],
    "mongodb": ["mongodb", "mongo", "nosql", "mongoose"],
    "redis": ["redis", "memcached", "caching"],
    "firebase": ["firebase", "firestore", "realtime database"],
    "elasticsearch": ["elasticsearch", "elk", "kibana", "logstash"],
    "sqlite": ["sqlite", "sqlite3"],
    "oracle": ["oracle", "oracle db", "pl/sql", "plsql"],
    "sql_server": ["sql server", "mssql", "microsoft sql server", "t-sql", "tsql"],
    "db_optimization": ["database optimization", "query optimization", "db optimization", "indexing", "database tuning"],
    "aws": ["aws", "amazon web services", "s3", "ec2", "lambda", "rds", "cloudfront"],
    "azure": ["azure", "microsoft azure", "azure devops"],
    "gcp": ["gcp", "google cloud", "google cloud platform", "bigquery"],
    "docker": ["docker", "containerization", "container", "dockerfile"],
    "kubernetes": ["kubernetes", "k8s", "helm", "kubectl"],
    "ci_cd": ["ci/cd", "cicd", "ci cd", "jenkins", "github actions", "gitlab ci", "devops pipeline"],
    "terraform": ["terraform", "infrastructure as code", "iac", "pulumi"],
    "linux": ["linux", "unix", "bash", "shell", "shell scripting", "ubuntu", "centos", "kali linux"],
    "networking": ["network security", "networking", "firewall", "firewalls", "tcp/ip", "vpn"],
    "ethical_hacking": ["ethical hacking", "pen testing", "penetration testing", "kali linux", "metasploit"],
    "siem": ["siem", "firewall", "firewalls", "soc", "incident response", "security monitoring"],
    "machine_learning": ["machine learning", "ml", "scikit-learn", "sklearn", "supervised learning", "classification", "regression"],
    "deep_learning": ["deep learning", "dl", "neural network", "cnn", "rnn", "lstm", "transformer"],
    "data_analysis": ["data analysis", "data analytics", "eda", "exploratory data", "statistical analysis"],
    "pandas": ["pandas", "numpy", "scipy", "data manipulation"],
    "tensorflow": ["tensorflow", "tf", "keras"],
    "pytorch": ["pytorch", "torch"],
    "sql_analytics": ["sql", "analytics sql", "data querying", "bigquery", "redshift", "snowflake", "sql query"],
    "tableau": ["tableau", "power bi", "powerbi", "data visualization", "looker"],
    "nlp": ["nlp", "natural language processing", "text mining", "bert", "gpt", "llm", "spacy"],
    "computer_vision": ["computer vision", "opencv", "image processing", "yolo"],
    "excel": ["excel", "microsoft excel", "vlookup", "pivot table", "spreadsheet"],
    "statistics": ["statistics", "statistical analysis", "hypothesis testing", "probability"],
    "selenium": ["selenium", "selenium webdriver", "automation testing"],
    "junit": ["junit", "junit5", "unit testing"],
    "manual_testing": ["manual testing", "test cases", "bug reporting", "qa testing"],
    "testng": ["testng", "test framework"],
    "figma": ["figma", "sketch", "adobe xd", "invision", "prototyping"],
    "adobe_xd": ["adobe xd", "xd", "figma"],
    "wireframing": ["wireframing", "wireframe", "wireframes", "balsamiq"],
    "prototyping": ["prototyping", "prototype", "prototypes", "interactive prototype"],
    "user_research": ["user research", "ux research", "usability testing", "user interview"],
    "communication": ["communication", "communication skills", "presentation", "verbal"],
    "teamwork": ["teamwork", "collaboration", "team player", "cross-functional"],
    "problem_solving": ["problem solving", "problem-solving", "analytical", "debugging"],
    "leadership": ["leadership", "team lead", "mentoring", "managing"],
    "time_management": ["time management", "deadline", "prioritization"],
    "critical_thinking": ["critical thinking", "decision making", "strategy"],
    "adaptability": ["adaptability", "flexible", "fast learner", "agile"],
    "req_gathering": ["requirements gathering", "business analysis", "brd", "user stories", "functional specs"],
    "git": ["git", "github", "gitlab", "bitbucket", "version control"],
    "jira": ["jira", "agile", "scrum", "kanban", "confluence"],
    "postman": ["postman", "insomnia", "api testing"]
}

# ═══════════════════════════════════════════════════════════════════════════════
#  RESUME PARSER  —  Layout-aware · Field-aware · Column-detecting · Topic-wise
# ═══════════════════════════════════════════════════════════════════════════════
import io, re, dataclasses
from dataclasses import dataclass, field as dc_field
from typing import Tuple


# ─── Data Models ──────────────────────────────────────────────────────────────
@dataclass
class TextBlock:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    fontsize: float
    fontname: str
    page: int

@dataclass
class ResumeData:
    columns_detected: int = 1
    name: str = ""
    email: str = ""
    phone: str = ""
    linkedin: str = ""
    github: str = ""
    summary: str = ""
    skills: list = dc_field(default_factory=list)
    experience: list = dc_field(default_factory=list)
    education: list = dc_field(default_factory=list)
    projects: list = dc_field(default_factory=list)
    certifications: list = dc_field(default_factory=list)
    raw_text: str = ""


# ─── Regex Patterns ───────────────────────────────────────────────────────────
_EMAIL_RE    = re.compile(r'[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}')
_PHONE_RE    = re.compile(r'(?<!\d)(\+?[\d][\d\s\-().]{7,14}\d)(?!\d)')
_LINKEDIN_RE = re.compile(r'(?:linkedin\.com/in/|linkedin:\s*)([\w\-]+)', re.I)
_GITHUB_RE   = re.compile(r'(?:github\.com/|github:\s*)([\w\-]+)', re.I)
_DATE_RE     = re.compile(
    r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,.]*\d{4}'
    r'|(\d{4})\s*[-–—]\s*(\d{4}|present|current|now)',
    re.I
)

_SECTION_KEYWORDS = {
    "summary":        ["summary", "profile", "objective", "about me", "career objective",
                       "professional summary", "overview"],
    "skills":         ["skills", "technical skills", "core competencies", "technologies",
                       "tools", "frameworks", "programming skills", "key skills",
                       "technology stack"],
    "experience":     ["experience", "work experience", "employment", "professional experience",
                       "career history", "work history", "internship", "internships"],
    "education":      ["education", "academic background", "qualifications", "academics",
                       "educational qualification"],
    "projects":       ["projects", "personal projects", "key projects", "academic projects",
                       "notable projects"],
    "certifications": ["certifications", "certificates", "achievements", "awards",
                       "accomplishments", "licenses"],
}


class ResumeParser:
    """
    Stage 1 → Extract LTTextBox objects with bounding boxes from pdfminer
    Stage 2 → Detect number of columns via X-coordinate gap analysis
    Stage 3 → Sort blocks in correct reading order (column → top-to-bottom)
    Stage 4 → Identify section headers via font size + keyword + ALL_CAPS
    Stage 5 → Field-aware parsers per section
    Stage 6 → Return structured ResumeData
    """

    # ── Stage 1: Low-level text block extraction ───────────────────────────────
    def _extract_blocks(self, pdf_bytes: bytes) -> Tuple[list, float, float]:
        """Returns (blocks, page_width, avg_fontsize).

        Handles two PDF structures:
        - Standard:  text lives in LTTextBox elements directly on the page
        - Embedded:  text lives in LTFigure > LTChar elements (no LTTextBox at page level)
        Falls back to pdfminer high_level extract_text when neither path yields blocks,
        synthesising one TextBlock per line so the section segmentation can still run.
        """
        from pdfminer.pdfpage import PDFPage
        from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
        from pdfminer.converter import PDFPageAggregator
        from pdfminer.layout import LAParams, LTTextBox, LTTextLine, LTChar, LTFigure
        from pdfminer.high_level import extract_text as hl_extract_text

        rsrcmgr = PDFResourceManager()
        laparams = LAParams(line_margin=0.3, char_margin=2.0, boxes_flow=None)
        device   = PDFPageAggregator(rsrcmgr, laparams=laparams)
        interp   = PDFPageInterpreter(rsrcmgr, device)

        blocks: list[TextBlock] = []
        page_width = 612.0
        fontsizes  = []

        def _process_container(container, page_num: int):
            """Recursively extract LTTextBox blocks from a layout container."""
            for element in container:
                if isinstance(element, LTTextBox):
                    text = element.get_text().strip()
                    if not text:
                        continue
                    sizes, bold, fname = [], False, ""
                    for line in element:
                        if not isinstance(line, LTTextLine):
                            continue
                        for char in line:
                            if isinstance(char, LTChar):
                                sizes.append(char.size)
                                fn = char.fontname.lower()
                                if any(w in fn for w in ["bold", "heavy", "black", "demi"]):
                                    bold = True
                                if not fname:
                                    fname = char.fontname
                    fontsize = sum(sizes) / len(sizes) if sizes else 10.0
                    fontsizes.append(fontsize)
                    blocks.append(TextBlock(
                        text=text,
                        x0=element.x0, y0=element.y0,
                        x1=element.x1, y1=element.y1,
                        fontsize=round(fontsize, 2),
                        fontname=("Bold:" + fname) if bold else fname,
                        page=page_num,
                    ))
                elif isinstance(element, LTFigure):
                    # Recurse into embedded figure containers
                    _process_container(element, page_num)

        for page_num, page in enumerate(PDFPage.get_pages(io.BytesIO(pdf_bytes), check_extractable=True)):
            interp.process_page(page)
            layout = device.get_result()
            if hasattr(layout, 'width'):
                page_width = layout.width
            _process_container(layout, page_num)

        # ── Fallback: if low-level path found nothing, use high_level ──────────
        if not blocks:
            print("[Parser] No LTTextBox blocks found — falling back to high_level extract_text")
            raw = hl_extract_text(io.BytesIO(pdf_bytes))
            if raw.strip():
                # Synthesise one TextBlock per non-empty line at incrementing y positions
                lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
                y = float(len(lines) * 14)  # simulate top-to-bottom y positions
                for ln in lines:
                    fontsizes.append(10.0)
                    blocks.append(TextBlock(
                        text=ln, x0=50.0, y0=y - 12, x1=550.0, y1=y,
                        fontsize=10.0, fontname="", page=0,
                    ))
                    y -= 14.0

        avg_fs = sum(fontsizes) / len(fontsizes) if fontsizes else 10.0
        return blocks, page_width, avg_fs

    # ── Stage 2: Column detection via X-coordinate gap analysis ───────────────
    def _detect_columns(self, blocks: list, page_width: float) -> Tuple[int, float]:
        """
        Returns (num_columns, divider_x).
        Finds the largest horizontal gap between clusters of text block x0 values.
        If gap > 25% of page width → two-column layout.
        """
        if not blocks:
            return 1, page_width / 2

        x0_vals = sorted(set(round(b.x0 / 5) * 5 for b in blocks))  # bucket to 5pt
        if len(x0_vals) < 2:
            return 1, page_width / 2

        max_gap   = 0.0
        divider_x = page_width / 2

        for i in range(len(x0_vals) - 1):
            gap = x0_vals[i + 1] - x0_vals[i]
            if gap > max_gap:
                max_gap   = gap
                divider_x = (x0_vals[i] + x0_vals[i + 1]) / 2

        if max_gap > page_width * 0.25:
            print(f"[Parser] 2-column layout detected (gap={max_gap:.1f}pt at x={divider_x:.1f})")
            return 2, divider_x
        return 1, page_width / 2

    # ── Stage 3: Reading-order sort ────────────────────────────────────────────
    def _sort_reading_order(self, blocks: list, num_cols: int, divider_x: float) -> list:
        """
        1-col: sort by page↑ → y1↓ (top to bottom)
        2-col: sort by page↑ → column (left=0, right=1) → y1↓
        """
        def key(b: TextBlock):
            col = 0 if b.x0 < divider_x else 1
            return (b.page, col if num_cols == 2 else 0, -b.y1)
        return sorted(blocks, key=key)

    # ── Stage 4: Section header detection ─────────────────────────────────────
    def _is_header(self, block: TextBlock, avg_fs: float) -> str | None:
        """
        Returns section key if block is a section header, else None.
        Header criteria: larger font OR bold font OR ALL_CAPS + keyword match.
        """
        txt   = block.text.strip().lower().rstrip(":").strip()
        txt_u = block.text.strip().upper()
        is_large = block.fontsize >= avg_fs + 1.5
        is_bold  = "Bold:" in block.fontname
        is_caps  = block.text.strip() == txt_u and len(block.text.strip()) < 50

        for section, keywords in _SECTION_KEYWORDS.items():
            for kw in keywords:
                if txt == kw or txt.startswith(kw):
                    return section

        # Looser check for visual headers (large/bold + first word matches)
        if is_large or is_bold or is_caps:
            first_word = txt.split()[0] if txt.split() else ""
            for section, keywords in _SECTION_KEYWORDS.items():
                for kw in keywords:
                    if first_word == kw.split()[0]:
                        return section
        return None

    # ── Stage 5a: Contact info extraction ─────────────────────────────────────
    def _parse_contact(self, lines: list[str]) -> dict:
        info = {"name": "", "email": "", "phone": "", "linkedin": "", "github": ""}
        full = "\n".join(lines)

        m = _EMAIL_RE.search(full)
        if m: info["email"] = m.group()

        m = _PHONE_RE.search(full)
        if m: info["phone"] = m.group(1).strip()

        m = _LINKEDIN_RE.search(full)
        if m: info["linkedin"] = "linkedin.com/in/" + m.group(1)

        m = _GITHUB_RE.search(full)
        if m: info["github"] = "github.com/" + m.group(1)

        # First non-contact line with no special chars → likely the name
        for line in lines:
            ln = line.strip()
            if not ln: continue
            if _EMAIL_RE.search(ln) or _PHONE_RE.search(ln): continue
            if any(kw in ln.lower() for kw in ["linkedin", "github", "http", "www", "@"]): continue
            if len(ln.split()) >= 2 and len(ln) < 60:
                info["name"] = ln
                break
        return info

    # ── Stage 5b: Skills extraction ───────────────────────────────────────────
    def _parse_skills(self, lines: list[str]) -> list:
        skills = []
        for line in lines:
            # Split by bullets, commas, pipes, semicolons
            parts = re.split(r'[•·▪\-,|;/]+', line)
            for p in parts:
                s = p.strip()
                if s and len(s) > 1 and len(s) < 60:
                    skills.append(s)
        return [s for s in skills if s]

    # ── Stage 5c: Experience extraction ───────────────────────────────────────
    def _parse_experience(self, lines: list[str]) -> list:
        jobs, current = [], {}
        for line in lines:
            ln = line.strip()
            if not ln: continue
            date_match = _DATE_RE.search(ln)
            if date_match:
                if current and "title" in current:
                    jobs.append(current)
                current = {"title": "", "company": "", "duration": ln, "points": []}
            elif current and re.match(r'^[•·▪\-*]', ln):
                current.setdefault("points", []).append(ln.lstrip("•·▪-* ").strip())
            elif current and not current.get("title"):
                current["title"] = ln
            elif current and not current.get("company"):
                current["company"] = ln
            elif not current:
                current = {"title": ln, "company": "", "duration": "", "points": []}
        if current and ("title" in current or "company" in current):
            jobs.append(current)
        return jobs

    # ── Stage 5d: Education extraction ────────────────────────────────────────
    def _parse_education(self, lines: list[str]) -> list:
        entries, current = [], {}
        degree_kw = ["bachelor", "master", "b.tech", "m.tech", "be", "me", "bsc", "msc",
                     "phd", "diploma", "b.e", "m.e", "mba", "bca", "mca", "b.com"]
        for line in lines:
            ln = line.strip()
            if not ln: continue
            lower = ln.lower()
            if any(kw in lower for kw in degree_kw):
                if current: entries.append(current)
                current = {"degree": ln, "institution": "", "year": "", "gpa": ""}
            elif re.search(r'\b(20\d{2}|19\d{2})\b', ln):
                yr = re.search(r'\b(20\d{2}|19\d{2})\b', ln)
                if current: current["year"] = yr.group()
                gpa = re.search(r'(?:gpa|cgpa|percentage)[:\s]*([\d.]+)', ln, re.I)
                if gpa and current: current["gpa"] = gpa.group(1)
            elif current and not current["institution"]:
                current["institution"] = ln
        if current and current.get("degree"):
            entries.append(current)
        return entries

    # ── Stage 5e: Projects extraction ─────────────────────────────────────────
    def _parse_projects(self, lines: list[str]) -> list:
        projects, current = [], {}
        for line in lines:
            ln = line.strip()
            if not ln: continue
            if re.match(r'^[•·▪\-*]', ln):
                if current and "name" in current:
                    current.setdefault("description", "")
                    current["description"] += " " + ln.lstrip("•·▪-* ").strip()
                else:
                    if current: projects.append(current)
                    current = {"name": ln.lstrip("•·▪-* ").strip(), "description": ""}
            elif not current.get("name"):
                if current: projects.append(current)
                current = {"name": ln, "description": ""}
            else:
                current["description"] = (current.get("description", "") + " " + ln).strip()
        if current and current.get("name"):
            projects.append(current)
        return projects

    # ── Stage 5f: Certifications extraction ───────────────────────────────────
    def _parse_certifications(self, lines: list[str]) -> list:
        certs = []
        for line in lines:
            parts = re.split(r'[•·▪\n]+', line)
            for p in parts:
                s = p.strip().lstrip("-* ")
                if s and len(s) > 3:
                    certs.append(s)
        return certs

    # ── Main parse entry point ─────────────────────────────────────────────────
    def parse(self, pdf_bytes: bytes) -> dict:
        """Parse a PDF and return a structured resume dict."""
        try:
            blocks, page_width, avg_fs = self._extract_blocks(pdf_bytes)
        except Exception as e:
            print(f"[Parser] Block extraction failed: {e}")
            return dataclasses.asdict(ResumeData())

        if not blocks:
            return dataclasses.asdict(ResumeData())

        num_cols, divider_x = self._detect_columns(blocks, page_width)
        ordered_blocks       = self._sort_reading_order(blocks, num_cols, divider_x)

        raw_text = "\n".join(b.text for b in ordered_blocks)

        # ── Section segmentation ──────────────────────────────────────────────
        sections: dict[str, list[str]] = {"contact": []}
        current_section = "contact"

        for block in ordered_blocks:
            header = self._is_header(block, avg_fs)
            if header:
                current_section = header
                sections.setdefault(current_section, [])
            else:
                sections.setdefault(current_section, []).append(block.text)

        print(f"[Parser] Detected sections: {list(sections.keys())}")

        # ── Field-aware parsing ───────────────────────────────────────────────
        rd = ResumeData(columns_detected=num_cols, raw_text=raw_text)

        contact = self._parse_contact(sections.get("contact", []))
        rd.name     = contact["name"]
        rd.email    = contact["email"]
        rd.phone    = contact["phone"]
        rd.linkedin = contact["linkedin"]
        rd.github   = contact["github"]

        rd.summary        = " ".join(sections.get("summary", [])).strip()
        rd.skills         = self._parse_skills(sections.get("skills", []))
        rd.experience     = self._parse_experience(sections.get("experience", []))
        rd.education      = self._parse_education(sections.get("education", []))
        rd.projects       = self._parse_projects(sections.get("projects", []))
        rd.certifications = self._parse_certifications(sections.get("certifications", []))

        return dataclasses.asdict(rd)


# ─── Global parser instance (reused across requests) ─────────────────────────
_resume_parser = ResumeParser()


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extract raw text from PDF for the skill alias matcher (backwards compat)."""
    rd = _resume_parser.parse(pdf_bytes)
    # Combine skills list + full raw text for broadest alias matching
    skills_text = " ".join(rd.get("skills", []))
    return skills_text + "\n" + rd.get("raw_text", "")


def parse_resume_to_json(pdf_bytes: bytes) -> dict:
    """Full structured parse — returns the complete ResumeData dict."""
    return _resume_parser.parse(pdf_bytes)


# ─── Image OCR via pytesseract (optional, degrades gracefully) ────────────────
def extract_text_from_image_bytes(image_bytes: bytes) -> str:
    """OCR an image using pytesseract if available, else return empty string."""
    import io
    try:
        import pytesseract
        from PIL import Image
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return pytesseract.image_to_string(image)
    except ImportError:
        print("[OCR] pytesseract not installed — image OCR skipped.")
        return ""
    except Exception as e:
        print(f"[OCR] Image extraction error: {e}")
        return ""


def extract_skills_from_text(raw_text: str) -> List[dict]:
    """Match raw OCR / text against SKILL_ALIASES and return skill objects."""
    import re
    full_text = raw_text.lower()
    full_text = re.sub(r'[,;|•\-_/\\]+', ' ', full_text)
    full_text = re.sub(r'\s+', ' ', full_text).strip()

    extracted_user_skills = []
    extracted_ids = set()

    for skill_id, aliases in SKILL_ALIASES.items():
        for alias in aliases:
            pattern = r'(?<![a-z0-9])' + re.escape(alias) + r'(?![a-z0-9])'
            if re.search(pattern, full_text):
                if skill_id not in extracted_ids:
                    extracted_ids.add(skill_id)
                    extracted_user_skills.append({"id": skill_id, "level": 4})
                break

    return extracted_user_skills


def extract_skills_from_json(json_bytes: bytes) -> List[dict]:
    import json, re

    try:
        data = json.loads(json_bytes.decode("utf-8", errors="ignore"))
    except Exception:
        return []

    text_content = []
    def extract_strings(obj):
        if isinstance(obj, str):
            text_content.append(obj)
        elif isinstance(obj, dict):
            for v in obj.values():
                extract_strings(v)
        elif isinstance(obj, list):
            for item in obj:
                extract_strings(item)

    extract_strings(data)
    raw_text = " ".join(text_content)
    return extract_skills_from_text(raw_text)

# Supported file extensions for the resume upload endpoint
_OCR_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}
_ALLOWED_EXTS   = {".pdf", ".json"} | _OCR_IMAGE_EXTS


@app.post("/api/profile/resume")
async def upload_resume(resume: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = Path(resume.filename).suffix.lower()
    if ext not in _ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail="Supported formats: PDF, PNG, JPG, JPEG, WEBP, BMP, TIFF, JSON"
        )

    filename = f"resume_{int(datetime.now(timezone.utc).timestamp() * 1000)}{ext}"
    filepath = UPLOADS_DIR / filename
    content = await resume.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB limit for image resumes
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    with open(filepath, "wb") as f:
        f.write(content)

    # ── Skill extraction based on file type ──────────────────────────────────
    extracted_skills = []
    extraction_method = "none"

    if ext == ".json":
        extracted_skills = extract_skills_from_json(content)
        extraction_method = "json-parse"
    elif ext == ".pdf":
        raw_text = extract_text_from_pdf_bytes(content)
        if raw_text.strip():
            extracted_skills = extract_skills_from_text(raw_text)
            extraction_method = "pdf-ocr"
    elif ext in _OCR_IMAGE_EXTS:
        raw_text = extract_text_from_image_bytes(content)
        if raw_text.strip():
            extracted_skills = extract_skills_from_text(raw_text)
            extraction_method = "image-ocr"

    # ── Merge extracted skills into user profile ──────────────────────────────
    d = get_db()
    now_str = datetime.now(timezone.utc).isoformat()
    resume_data = {
        "profile.resumeFileName": filename,
        "profile.resumeOriginalName": resume.filename,
        "profile.resumeUploadedAt": now_str,
        "profile.lastUpdated": now_str,
    }

    if extracted_skills:
        existing_skills = current_user.get("profile", {}).get("skills", [])
        existing_ids = {s["id"] for s in existing_skills}
        merged_skills = list(existing_skills)
        for es in extracted_skills:
            if es["id"] not in existing_ids:
                merged_skills.append(es)
        resume_data["profile.skills"] = merged_skills
        current_user.setdefault("profile", {})["skills"] = merged_skills

        # Sync into the in-memory fallback store as well
        idx = next((i for i, u in enumerate(MEM_USERS) if u["id"] == current_user["id"]), None)
        if idx is not None:
            MEM_USERS[idx].setdefault("profile", {})["skills"] = merged_skills
            MEM_USERS[idx]["profile"]["lastUpdated"] = now_str

    if d is not None:
        try:
            await d.users.update_one({"id": current_user["id"]}, {"$set": resume_data})
        except Exception:
            pass
    else:
        # Sync into in-memory fallback store for the resume filename details
        idx = next((i for i, u in enumerate(MEM_USERS) if u["id"] == current_user["id"]), None)
        if idx is not None:
            MEM_USERS[idx].setdefault("profile", {})["resumeFileName"] = filename
            MEM_USERS[idx]["profile"]["resumeOriginalName"] = resume.filename
            MEM_USERS[idx]["profile"]["resumeUploadedAt"] = now_str
            MEM_USERS[idx]["profile"]["lastUpdated"] = now_str

    return {
        "message": "Resume uploaded and skills extracted successfully" if extracted_skills else "Resume uploaded successfully",
        "filename": filename,
        "originalName": resume.filename,
        "extractedSkills": extracted_skills,
        "extractionMethod": extraction_method,
        "skillsFound": len(extracted_skills)
    }

@app.put("/api/profile/info")
async def update_profile_info(body: ProfileInfoBody, current_user: dict = Depends(get_current_user)):
    d = get_db()
    now_str = datetime.now(timezone.utc).isoformat()
    update_fields = {
        "profile.lastUpdated": now_str
    }
    if body.fullName: update_fields["fullName"] = body.fullName
    if body.email: update_fields["email"] = body.email
    if body.targetRole: update_fields["profile.targetRole"] = body.targetRole
    if body.experience: update_fields["profile.experience"] = body.experience
    if body.education: update_fields["profile.education"] = body.education
    if body.bio is not None: update_fields["profile.bio"] = body.bio

    user = None
    if d is not None and update_fields:
        try:
            await d.users.update_one({"id": current_user["id"]}, {"$set": update_fields})
            user = await d.users.find_one({"id": current_user["id"]})
        except Exception:
            pass
    
    if not user:
        idx = next((i for i, u in enumerate(MEM_USERS) if u["id"] == current_user["id"]), None)
        if idx is not None:
            if body.fullName: MEM_USERS[idx]["fullName"] = body.fullName
            if body.email: MEM_USERS[idx]["email"] = body.email
            if body.targetRole: MEM_USERS[idx]["profile"]["targetRole"] = body.targetRole
            if body.experience: MEM_USERS[idx]["profile"]["experience"] = body.experience
            if body.education: MEM_USERS[idx]["profile"]["education"] = body.education
            if body.bio is not None: MEM_USERS[idx]["profile"]["bio"] = body.bio
            MEM_USERS[idx]["profile"]["lastUpdated"] = now_str
            user = MEM_USERS[idx]

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": user_without_password(user), "message": "Profile updated"}

# ═══════════════════════════════════════════════════════════════
#  APPLICATION ROUTES
# ═══════════════════════════════════════════════════════════════
async def _create_notification(d, recipient_ids: list, message: str, notif_type: str, ref_id: str = ""):
    """Create notifications for a list of recipient user IDs."""
    now = datetime.now(timezone.utc).isoformat()
    notifs = [
        {
            "id": str(uuid.uuid4()),
            "recipientId": rid,
            "message": message,
            "type": notif_type,
            "refId": ref_id,
            "read": False,
            "createdAt": now,
        }
        for rid in recipient_ids
    ]
    if not notifs:
        return
    if d is not None:
        try:
            await d.notifications.insert_many(notifs)
        except Exception:
            pass
    else:
        MEM_NOTIFICATIONS.extend(notifs)


@app.post("/api/applications", status_code=201)
async def create_application(body: ApplicationBody, current_user: dict = Depends(get_current_user)):
    if not body.jobId:
        raise HTTPException(status_code=400, detail="Job ID required")
    
    d = get_db()
    job = None
    if d is not None:
        try:
            job = await d.jobs.find_one({"id": body.jobId})
        except Exception:
            pass
    if not job:
        job = next((j for j in MEM_JOBS if j["id"] == body.jobId), None)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Resolve the applicant's full name
    applicant_name = current_user.get("username", "A candidate")
    if d is not None:
        try:
            u = await d.users.find_one({"id": current_user["id"]})
            if u:
                applicant_name = u.get("fullName") or u.get("username", applicant_name)
        except Exception:
            pass
    else:
        u = next((u for u in MEM_USERS if u["id"] == current_user["id"]), None)
        if u:
            applicant_name = u.get("fullName") or u.get("username", applicant_name)

    new_app = {
        "id": str(uuid.uuid4()),
        "userId": current_user["id"],
        "applicantName": applicant_name,
        "jobId": body.jobId,
        "jobTitle": job["title"],
        "company": job["company"],
        "location": job["location"],
        "salary": job["salary"],
        "logoColor": job.get("logoColor", "#6366f1"),
        "logo": job.get("logo", ""),
        "coverLetter": body.coverLetter or "",
        "phone": body.phone or "",
        "linkedIn": body.linkedIn or "",
        "portfolio": body.portfolio or "",
        "status": "applied",
        "counselingNote": "",
        "appliedAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }

    if d is not None:
        try:
            existing = await d.applications.find_one({"userId": current_user["id"], "jobId": body.jobId}, {"_id": 0})
            if existing:
                raise HTTPException(status_code=409, detail="Already applied to this job")
            await d.applications.insert_one(new_app)
            new_app.pop("_id", None)
            # Notify all recruiters
            recruiter_cursor = d.users.find({"role": "recruiter"}, {"_id": 0, "id": 1})
            recruiters = await recruiter_cursor.to_list(length=200)
            recruiter_ids = [r["id"] for r in recruiters]
        except HTTPException:
            raise
        except Exception:
            recruiter_ids = []
    else:
        if any(a["userId"] == current_user["id"] and a["jobId"] == body.jobId for a in MEM_APPS):
            raise HTTPException(status_code=409, detail="Already applied to this job")
        MEM_APPS.append(new_app)
        recruiter_ids = [u["id"] for u in MEM_USERS if u.get("role") == "recruiter"]

    # Fire-and-forget: notify recruiters
    notif_msg = f"{applicant_name} applied for {job['title']} at {job['company']}"
    await _create_notification(d, recruiter_ids, notif_msg, "new_application", new_app["id"])

    clean_app = clean_mongo_doc(new_app)
    return {"application": clean_app, "message": "Application submitted successfully!"}

@app.get("/api/applications")
async def get_applications(current_user: dict = Depends(get_current_user)):
    d = get_db()
    apps = []
    if d is not None:
        try:
            cursor = d.applications.find({"userId": current_user["id"]}, {"_id": 0})
            apps = await cursor.to_list(length=100)
        except Exception:
            pass
    if not apps:
        apps = [a for a in MEM_APPS if a["userId"] == current_user["id"]]
    return {"applications": [clean_mongo_doc(a) for a in apps], "total": len(apps)}

@app.get("/api/applications/check/{job_id}")
async def check_application(job_id: str, current_user: dict = Depends(get_current_user)):
    d = get_db()
    app_found = None
    if d is not None:
        try:
            app_found = await d.applications.find_one({"userId": current_user["id"], "jobId": job_id}, {"_id": 0})
        except Exception:
            pass
    if not app_found:
        app_found = next((a for a in MEM_APPS if a["userId"] == current_user["id"] and a["jobId"] == job_id), None)
    return {"applied": app_found is not None, "application": clean_mongo_doc(app_found) if app_found else None}

@app.delete("/api/applications/{app_id}")
async def delete_application(app_id: str, current_user: dict = Depends(get_current_user)):
    d = get_db()
    if d is not None:
        try:
            res = await d.applications.delete_one({"id": app_id, "userId": current_user["id"]})
            if res.deleted_count > 0:
                return {"message": "Application withdrawn"}
        except Exception:
            pass
    
    idx = next((i for i, a in enumerate(MEM_APPS) if a["id"] == app_id and a["userId"] == current_user["id"]), None)
    if idx is not None:
        MEM_APPS.pop(idx)
        return {"message": "Application withdrawn"}
        
    raise HTTPException(status_code=404, detail="Application not found")

# ═══════════════════════════════════════════════════════════════
#  RECRUITER ROUTES
# ═══════════════════════════════════════════════════════════════
def _require_recruiter(current_user: dict):
    if current_user.get("role") != "recruiter":
        raise HTTPException(status_code=403, detail="Recruiter access only")

@app.get("/api/recruiter/applications")
async def recruiter_get_all_applications(current_user: dict = Depends(get_current_user)):
    _require_recruiter(current_user)
    d = get_db()
    apps = []
    if d is not None:
        try:
            cursor = d.applications.find({}, {"_id": 0})
            apps = await cursor.to_list(length=500)
        except Exception:
            pass
    if not apps:
        apps = list(MEM_APPS)
    return {"applications": [clean_mongo_doc(a) for a in apps], "total": len(apps)}

@app.get("/api/recruiter/applicant/{user_id}")
async def recruiter_get_applicant(user_id: str, current_user: dict = Depends(get_current_user)):
    _require_recruiter(current_user)
    d = get_db()
    user = None
    if d is not None:
        try:
            user = await d.users.find_one({"id": user_id})
        except Exception:
            pass
    if user is None:
        user = next((u for u in MEM_USERS if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return {"applicant": user_without_password(user)}

@app.put("/api/recruiter/applications/{app_id}/status")
async def recruiter_update_status(app_id: str, body: ApplicationStatusBody, current_user: dict = Depends(get_current_user)):
    _require_recruiter(current_user)
    valid_statuses = {"applied", "reviewing", "interview", "hired", "rejected"}
    if body.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    d = get_db()
    update_data = {
        "status": body.status,
        "counselingNote": body.counselingNote or "",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    updated_app = None
    if d is not None:
        try:
            await d.applications.update_one({"id": app_id}, {"$set": update_data})
            updated_app = await d.applications.find_one({"id": app_id}, {"_id": 0})
        except Exception:
            pass
    
    if updated_app is None:
        idx = next((i for i, a in enumerate(MEM_APPS) if a["id"] == app_id), None)
        if idx is not None:
            MEM_APPS[idx].update(update_data)
            updated_app = MEM_APPS[idx]
    
    if not updated_app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Notify the applicant about their status change
    recruiter_name = current_user.get("username", "Recruiter")
    if d is not None:
        try:
            rec_doc = await d.users.find_one({"id": current_user["id"]})
            if rec_doc:
                recruiter_name = rec_doc.get("fullName") or rec_doc.get("username", recruiter_name)
        except Exception:
            pass
    notif_msg = f"Your application for {updated_app.get('jobTitle','the role')} at {updated_app.get('company','')} was updated to '{body.status}' by a recruiter."
    if body.counselingNote:
        notif_msg += " A counseling note has been added."
    await _create_notification(d, [updated_app["userId"]], notif_msg, "status_update", app_id)

    return {"application": clean_mongo_doc(updated_app), "message": "Status updated"}

# ═══════════════════════════════════════════════════════════════
#  NOTIFICATION ROUTES
# ═══════════════════════════════════════════════════════════════
@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    d = get_db()
    notifs = []
    if d is not None:
        try:
            cursor = d.notifications.find({"recipientId": current_user["id"]}, {"_id": 0})
            notifs = await cursor.to_list(length=100)
            # Sort newest first
            notifs.sort(key=lambda n: n.get("createdAt", ""), reverse=True)
        except Exception:
            pass
    if not notifs:
        notifs = sorted(
            [n for n in MEM_NOTIFICATIONS if n["recipientId"] == current_user["id"]],
            key=lambda n: n.get("createdAt", ""),
            reverse=True,
        )
    unread_count = sum(1 for n in notifs if not n.get("read"))
    return {"notifications": [clean_mongo_doc(n) for n in notifs], "unreadCount": unread_count}

@app.post("/api/notifications/mark-read")
async def mark_notifications_read(body: NotificationMarkBody, current_user: dict = Depends(get_current_user)):
    d = get_db()
    if d is not None:
        try:
            if body.ids:
                await d.notifications.update_many(
                    {"id": {"$in": body.ids}, "recipientId": current_user["id"]},
                    {"$set": {"read": True}}
                )
            else:
                await d.notifications.update_many(
                    {"recipientId": current_user["id"]},
                    {"$set": {"read": True}}
                )
        except Exception:
            pass
    else:
        for n in MEM_NOTIFICATIONS:
            if n["recipientId"] == current_user["id"]:
                if not body.ids or n["id"] in body.ids:
                    n["read"] = True
    return {"message": "Marked as read"}

# ═══════════════════════════════════════════════════════════════
#  SERVE UPLOADS & REACT FRONTEND
# ═══════════════════════════════════════════════════════════════
if UPLOADS_DIR.exists():
    app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="static_assets")
    
    @app.get("/favicon.svg")
    async def favicon():
        fav = DIST_DIR / "favicon.svg"
        if fav.exists():
            return FileResponse(str(fav))
        raise HTTPException(status_code=404)
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_path = DIST_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        index = DIST_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index))
        raise HTTPException(status_code=404, detail="Frontend not built. Run: cd client && npm run build")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

def free_port(port: int):
    """Kill any process currently occupying the given port (Windows-compatible)."""
    try:
        import psutil
        for conn in psutil.net_connections(kind="inet"):
            if conn.laddr.port == port and conn.status == "LISTEN":
                try:
                    proc = psutil.Process(conn.pid)
                    print(f"  [Auto-cleanup] Killing process {conn.pid} ({proc.name()}) on port {port}...")
                    proc.kill()
                    proc.wait(timeout=3)
                    print(f"  [Auto-cleanup] Port {port} is now free.")
                except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                    print(f"  [Auto-cleanup] Could not kill PID {conn.pid}: {e}")
    except ImportError:
        # psutil not installed — fallback to netstat on Windows
        import subprocess, re
        try:
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True, text=True
            )
            for line in result.stdout.splitlines():
                if f":{port} " in line and "LISTENING" in line:
                    pid = line.strip().split()[-1]
                    if pid.isdigit():
                        print(f"  [Auto-cleanup] Killing PID {pid} on port {port}...")
                        subprocess.run(["taskkill", "/PID", pid, "/F"], capture_output=True)
                        print(f"  [Auto-cleanup] Port {port} is now free.")
        except Exception as e:
            print(f"  [Auto-cleanup] Warning: Could not free port {port}: {e}")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 55)
    print("  CareerPath - Skill-Based Job Matching Portal (MongoDB)")
    print("=" * 55)
    print(f"  Server:    http://localhost:{PORT}")
    print(f"  API docs:  http://localhost:{PORT}/docs")
    print(f"  Health:    http://localhost:{PORT}/api/health")
    print(f"  Frontend:  http://localhost:{PORT}")
    print("=" * 55 + "\n")
    free_port(PORT)
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
