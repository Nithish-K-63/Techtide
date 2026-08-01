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
      "id": "programming", "name": "Programming Languages", "icon": "💻", "color": "#6366f1",
      "skills": [
        { "id": "python", "name": "Python" }, { "id": "javascript", "name": "JavaScript" },
        { "id": "typescript", "name": "TypeScript" }, { "id": "java", "name": "Java" },
        { "id": "csharp", "name": "C#" }, { "id": "cpp", "name": "C++" },
        { "id": "go", "name": "Go" }, { "id": "rust", "name": "Rust" },
        { "id": "kotlin", "name": "Kotlin" }, { "id": "swift", "name": "Swift" },
        { "id": "php", "name": "PHP" }, { "id": "ruby", "name": "Ruby" }
      ]
    },
    {
      "id": "frontend", "name": "Frontend Development", "icon": "🎨", "color": "#ec4899",
      "skills": [
        { "id": "react", "name": "React.js" }, { "id": "vue", "name": "Vue.js" },
        { "id": "angular", "name": "Angular" }, { "id": "nextjs", "name": "Next.js" },
        { "id": "html_css", "name": "HTML/CSS" }, { "id": "tailwind", "name": "Tailwind CSS" },
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
      "id": "database", "name": "Databases", "icon": "🗄️", "color": "#f59e0b",
      "skills": [
        { "id": "mysql", "name": "MySQL" }, { "id": "postgresql", "name": "PostgreSQL" },
        { "id": "mongodb", "name": "MongoDB" }, { "id": "redis", "name": "Redis" },
        { "id": "firebase", "name": "Firebase" }, { "id": "elasticsearch", "name": "Elasticsearch" },
        { "id": "sqlite", "name": "SQLite" }
      ]
    },
    {
      "id": "cloud_devops", "name": "Cloud & DevOps", "icon": "☁️", "color": "#3b82f6",
      "skills": [
        { "id": "aws", "name": "AWS" }, { "id": "azure", "name": "Azure" },
        { "id": "gcp", "name": "Google Cloud" }, { "id": "docker", "name": "Docker" },
        { "id": "kubernetes", "name": "Kubernetes" }, { "id": "ci_cd", "name": "CI/CD" },
        { "id": "terraform", "name": "Terraform" }, { "id": "linux", "name": "Linux" }
      ]
    },
    {
      "id": "data_ai", "name": "Data Science & AI", "icon": "🤖", "color": "#8b5cf6",
      "skills": [
        { "id": "machine_learning", "name": "Machine Learning" }, { "id": "deep_learning", "name": "Deep Learning" },
        { "id": "data_analysis", "name": "Data Analysis" }, { "id": "pandas", "name": "Pandas/NumPy" },
        { "id": "tensorflow", "name": "TensorFlow" }, { "id": "pytorch", "name": "PyTorch" },
        { "id": "sql_analytics", "name": "SQL Analytics" }, { "id": "tableau", "name": "Tableau/Power BI" },
        { "id": "nlp", "name": "NLP" }
      ]
    },
    {
      "id": "soft_skills", "name": "Soft Skills", "icon": "🌟", "color": "#f97316",
      "skills": [
        { "id": "communication", "name": "Communication" }, { "id": "teamwork", "name": "Teamwork" },
        { "id": "problem_solving", "name": "Problem Solving" }, { "id": "leadership", "name": "Leadership" },
        { "id": "time_management", "name": "Time Management" }, { "id": "critical_thinking", "name": "Critical Thinking" },
        { "id": "adaptability", "name": "Adaptability" }
      ]
    },
    {
      "id": "tools", "name": "Tools & Platforms", "icon": "🔧", "color": "#14b8a6",
      "skills": [
        { "id": "git", "name": "Git/GitHub" }, { "id": "jira", "name": "Jira/Agile" },
        { "id": "figma", "name": "Figma" }, { "id": "postman", "name": "Postman" },
        { "id": "vscode", "name": "VS Code" }, { "id": "jupyter", "name": "Jupyter Notebook" }
      ]
    }
  ]
}

INITIAL_JOBS_DATA = [
  {
    "id": "job_001", "title": "Full Stack Developer", "company": "TechNova Solutions",
    "location": "Bangalore, India", "type": "Full-time", "salary": "₹12 - 18 LPA",
    "industry": "Software Development", "experience": "2-4 years", "postedDaysAgo": 2, "logo": "TN", "logoColor": "#6366f1",
    "description": "Build scalable full-stack web applications with React, Node.js and MongoDB. Collaborate with cross-functional teams on new product features.",
    "requiredSkills": [
      { "id": "react", "weight": 25 }, { "id": "nodejs", "weight": 25 },
      { "id": "javascript", "weight": 20 }, { "id": "mongodb", "weight": 15 },
      { "id": "git", "weight": 10 }, { "id": "rest_api", "weight": 5 }
    ],
    "tags": ["React", "Node.js", "MongoDB", "REST API"]
  },
  {
    "id": "job_002", "title": "Data Scientist", "company": "AnalytiQ Corp",
    "location": "Hyderabad, India", "type": "Full-time", "salary": "₹15 - 25 LPA",
    "industry": "Data Science & Analytics", "experience": "3-5 years", "postedDaysAgo": 1, "logo": "AQ", "logoColor": "#8b5cf6",
    "description": "Develop and deploy machine learning models, build data pipelines, and derive business insights from large datasets.",
    "requiredSkills": [
      { "id": "machine_learning", "weight": 30 }, { "id": "python", "weight": 25 },
      { "id": "data_analysis", "weight": 20 }, { "id": "pandas", "weight": 15 },
      { "id": "sql_analytics", "weight": 10 }
    ],
    "tags": ["Python", "ML", "Data Analysis", "Pandas"]
  },
  {
    "id": "job_003", "title": "UI/UX Frontend Developer", "company": "PixelCraft Studios",
    "location": "Pune, India", "type": "Full-time", "salary": "₹8 - 15 LPA",
    "industry": "Digital Design & Frontend", "experience": "1-3 years", "postedDaysAgo": 3, "logo": "PC", "logoColor": "#ec4899",
    "description": "Design and build pixel-perfect, accessible, and highly responsive user interfaces. Bridge the gap between design and development.",
    "requiredSkills": [
      { "id": "react", "weight": 30 }, { "id": "javascript", "weight": 25 },
      { "id": "html_css", "weight": 20 }, { "id": "figma", "weight": 15 }, { "id": "tailwind", "weight": 10 }
    ],
    "tags": ["React", "JavaScript", "Figma", "CSS"]
  },
  {
    "id": "job_004", "title": "DevOps / Platform Engineer", "company": "CloudScale Inc",
    "location": "Chennai, India", "type": "Full-time", "salary": "₹18 - 28 LPA",
    "industry": "Cloud & Infrastructure", "experience": "4-6 years", "postedDaysAgo": 5, "logo": "CS", "logoColor": "#3b82f6",
    "description": "Own the cloud infrastructure, manage CI/CD pipelines, and ensure 99.9% uptime of services running on AWS/GCP.",
    "requiredSkills": [
      { "id": "aws", "weight": 30 }, { "id": "docker", "weight": 25 },
      { "id": "kubernetes", "weight": 20 }, { "id": "ci_cd", "weight": 15 }, { "id": "linux", "weight": 10 }
    ],
    "tags": ["AWS", "Docker", "Kubernetes", "CI/CD"]
  },
  {
    "id": "job_005", "title": "Backend API Engineer (Python)", "company": "Zephyr Technologies",
    "location": "Mumbai, India", "type": "Full-time", "salary": "₹14 - 22 LPA",
    "industry": "API & Microservices", "experience": "2-5 years", "postedDaysAgo": 1, "logo": "ZT", "logoColor": "#10b981",
    "description": "Build high-throughput APIs and microservices using Python (FastAPI/Django). Design scalable database schemas.",
    "requiredSkills": [
      { "id": "python", "weight": 35 }, { "id": "fastapi", "weight": 25 },
      { "id": "postgresql", "weight": 20 }, { "id": "redis", "weight": 10 }, { "id": "docker", "weight": 10 }
    ],
    "tags": ["Python", "FastAPI", "PostgreSQL", "Redis"]
  },
  {
    "id": "job_006", "title": "Mobile App Developer (React Native)", "company": "Appify Labs",
    "location": "Bangalore, India", "type": "Full-time", "salary": "₹10 - 18 LPA",
    "industry": "Mobile Technology", "experience": "2-4 years", "postedDaysAgo": 2, "logo": "AL", "logoColor": "#f59e0b",
    "description": "Build cross-platform iOS and Android applications using React Native and Kotlin. Integrate backend APIs and push notifications.",
    "requiredSkills": [
      { "id": "kotlin", "weight": 30 }, { "id": "javascript", "weight": 25 },
      { "id": "react", "weight": 20 }, { "id": "rest_api", "weight": 15 }, { "id": "git", "weight": 10 }
    ],
    "tags": ["Kotlin", "React Native", "JavaScript", "Mobile"]
  },
  {
    "id": "job_007", "title": "Data Engineer", "company": "BigData Matrix",
    "location": "Hyderabad, India", "type": "Full-time", "salary": "₹16 - 26 LPA",
    "industry": "Big Data & ETL", "experience": "3-6 years", "postedDaysAgo": 4, "logo": "BM", "logoColor": "#06b6d4",
    "description": "Design and maintain large-scale ETL pipelines, data warehouses, and streaming architectures for analytics teams.",
    "requiredSkills": [
      { "id": "python", "weight": 30 }, { "id": "postgresql", "weight": 25 },
      { "id": "mysql", "weight": 15 }, { "id": "aws", "weight": 15 }, { "id": "sql_analytics", "weight": 15 }
    ],
    "tags": ["Python", "PostgreSQL", "ETL", "SQL Analytics"]
  },
  {
    "id": "job_008", "title": "AI / Machine Learning Engineer", "company": "Cognitive AI Systems",
    "location": "Gurgaon, India", "type": "Full-time", "salary": "₹20 - 35 LPA",
    "industry": "Artificial Intelligence", "experience": "3-5 years", "postedDaysAgo": 1, "logo": "CA", "logoColor": "#a855f7",
    "description": "Research, build, and productionize deep learning models including LLMs, computer vision and NLP pipelines.",
    "requiredSkills": [
      { "id": "deep_learning", "weight": 30 }, { "id": "tensorflow", "weight": 25 },
      { "id": "pytorch", "weight": 20 }, { "id": "nlp", "weight": 15 }, { "id": "python", "weight": 10 }
    ],
    "tags": ["Deep Learning", "TensorFlow", "PyTorch", "NLP"]
  },
  {
    "id": "job_009", "title": "Cloud Solutions Architect", "company": "Apex Infra Networks",
    "location": "Noida, India", "type": "Full-time", "salary": "₹22 - 38 LPA",
    "industry": "Enterprise Cloud Architecture", "experience": "5-8 years", "postedDaysAgo": 6, "logo": "AN", "logoColor": "#2563eb",
    "description": "Design secure, cost-optimized, multi-cloud enterprise ecosystems using IaC (Terraform), AWS and Azure. Lead migrations and architectural reviews.",
    "requiredSkills": [
      { "id": "aws", "weight": 30 }, { "id": "azure", "weight": 25 },
      { "id": "terraform", "weight": 20 }, { "id": "kubernetes", "weight": 15 }, { "id": "linux", "weight": 10 }
    ],
    "tags": ["AWS", "Azure", "Terraform", "Kubernetes"]
  },
  {
    "id": "job_010", "title": "Cybersecurity Analyst", "company": "SecureNet Global",
    "location": "Delhi, India", "type": "Full-time", "salary": "₹15 - 28 LPA",
    "industry": "Information Security", "experience": "3-6 years", "postedDaysAgo": 3, "logo": "SG", "logoColor": "#ef4444",
    "description": "Conduct vulnerability assessments, penetration testing, SOC monitoring, and incident response for enterprise clients.",
    "requiredSkills": [
      { "id": "linux", "weight": 30 }, { "id": "python", "weight": 25 },
      { "id": "problem_solving", "weight": 20 }, { "id": "critical_thinking", "weight": 15 }, { "id": "ci_cd", "weight": 10 }
    ],
    "tags": ["Linux", "Security", "Python", "Networking"]
  }
]

# In-memory fallback stores (used if MongoDB Cloud is unavailable)
MEM_USERS = []
MEM_JOBS = list(INITIAL_JOBS_DATA)
MEM_SKILLS = dict(INITIAL_SKILLS_DATA)
MEM_APPS = []

# ═══════════════════════════════════════════════════════════════
#  JWT HELPERS
# ═══════════════════════════════════════════════════════════════
def create_token(user_id: str, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS)
    payload = {"id": user_id, "username": username, "exp": expire}
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

class RegisterBody(BaseModel):
    username: str
    email: str
    password: str
    fullName: Optional[str] = ""

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
    hashed_password = pwd_context.hash(body.password)
    new_user = {
        "id": str(uuid.uuid4()),
        "username": body.username,
        "email": body.email,
        "fullName": body.fullName or body.username,
        "password": hashed_password,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "profile": {
            "skills": [],
            "resumeFileName": None,
            "profileComplete": False,
            "targetRole": "",
            "experience": "",
            "education": "",
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

    token = create_token(new_user["id"], new_user["username"])
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
    
    token = create_token(user["id"], user["username"])
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
    update_data = {
        "profile.skills": body.skills or [],
        "profile.profileComplete": len(body.skills or []) > 0,
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
            user = MEM_USERS[idx]

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": user_without_password(user), "message": "Skills updated successfully"}

def extract_skills_from_json(json_bytes: bytes) -> List[dict]:
    import json
    try:
        data = json.loads(json_bytes.decode("utf-8", errors="ignore"))
    except Exception:
        return []

    text_content = []
    def extract_strings(obj):
        if isinstance(obj, str):
            text_content.append(obj.lower())
        elif isinstance(obj, dict):
            for v in obj.values():
                extract_strings(v)
        elif isinstance(obj, list):
            for item in obj:
                extract_strings(item)

    extract_strings(data)
    full_text = " ".join(text_content)

    all_catalog_skills = []
    for cat in INITIAL_SKILLS_DATA.get("categories", []):
        for sk in cat.get("skills", []):
            all_catalog_skills.append((sk["id"], sk["name"].lower()))

    extracted_user_skills = []
    extracted_ids = set()
    for sk_id, sk_name in all_catalog_skills:
        if sk_id in full_text or sk_name in full_text:
            if sk_id not in extracted_ids:
                extracted_ids.add(sk_id)
                extracted_user_skills.append({"id": sk_id, "level": 4})

    return extracted_user_skills

@app.post("/api/profile/resume")
async def upload_resume(resume: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    ext = Path(resume.filename).suffix.lower()
    if ext not in (".pdf", ".doc", ".docx", ".json"):
        raise HTTPException(status_code=400, detail="Only PDF, Word, and JSON documents are allowed")
    
    filename = f"resume_{int(datetime.now(timezone.utc).timestamp() * 1000)}{ext}"
    filepath = UPLOADS_DIR / filename
    content = await resume.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    with open(filepath, "wb") as f:
        f.write(content)

    extracted_skills = []
    if ext == ".json":
        extracted_skills = extract_skills_from_json(content)

    d = get_db()
    resume_data = {
        "profile.resumeFileName": filename,
        "profile.resumeOriginalName": resume.filename,
        "profile.resumeUploadedAt": datetime.now(timezone.utc).isoformat(),
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
        
        # update memory fallback store
        idx = next((i for i, u in enumerate(MEM_USERS) if u["id"] == current_user["id"]), None)
        if idx is not None:
            MEM_USERS[idx].setdefault("profile", {})["skills"] = merged_skills

    if d is not None:
        try:
            await d.users.update_one({"id": current_user["id"]}, {"$set": resume_data})
        except Exception:
            pass
    
    return {
        "message": "Resume uploaded successfully",
        "filename": filename,
        "originalName": resume.filename,
        "extractedSkills": extracted_skills
    }

@app.put("/api/profile/info")
async def update_profile_info(body: ProfileInfoBody, current_user: dict = Depends(get_current_user)):
    d = get_db()
    update_fields = {}
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
            user = MEM_USERS[idx]

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"user": user_without_password(user), "message": "Profile updated"}

# ═══════════════════════════════════════════════════════════════
#  APPLICATION ROUTES
# ═══════════════════════════════════════════════════════════════
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

    new_app = {
        "id": str(uuid.uuid4()),
        "userId": current_user["id"],
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
        except HTTPException:
            raise
        except Exception:
            pass
    else:
        if any(a["userId"] == current_user["id"] and a["jobId"] == body.jobId for a in MEM_APPS):
            raise HTTPException(status_code=409, detail="Already applied to this job")
        MEM_APPS.append(new_app)

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
    return {"applications": apps, "total": len(apps)}

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
    return {"applied": app_found is not None, "application": app_found}

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
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="info")
