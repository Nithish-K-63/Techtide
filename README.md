# SYSTEM WORKFLOW

## Skill-Based Job Matching & Career Guidance Portal

### 1. Overview

The Skill-Based Job Matching & Career Guidance Portal is a full-stack web application designed to connect job seekers with suitable employment opportunities based on their technical skills, professional skills, qualifications, and career interests.

Unlike conventional job portals that primarily depend on keyword-based searching, the proposed system focuses on comparing the skills available in a user's profile with the skills required by available job opportunities. The system calculates a skill-match percentage and displays jobs in descending order of relevance.

The application is developed using React.js for the frontend, FastAPI with Python for the backend, MongoDB Atlas for database management, and JWT with bcrypt for authentication and security.

---

## 2. Overall System Workflow

The overall workflow of the system is:

```text
                    USER
                      │
                      ▼
              Open Career Portal
                      │
                      ▼
             Registration / Login
                      │
                      ▼
                 Dashboard
                      │
                      ▼
              Manage User Profile
                      │
              ┌───────┴────────┐
              ▼                ▼
        Personal Data       User Skills
              │                │
              └───────┬────────┘
                      ▼
                FastAPI Backend
                      │
                      ▼
                 MongoDB Atlas
                      │
                      ▼
             Recommended Jobs
                      │
                      ▼
             Retrieve Job Skills
                      │
                      ▼
            Skill Matching Engine
                      │
                      ▼
             Calculate Match %
                      │
                      ▼
          Rank Jobs by Match Score
                      │
                      ▼
             Display Job Results
                      │
                      ▼
                View Details
                      │
                      ▼
                  Apply Job
                      │
                      ▼
             Store Application
                      │
                      ▼
             Application History
                      │
                      ▼
             Track Application
```

---

## 3. User Registration Workflow

The first step is user registration.

### Process

1. The user opens the CareerPath portal.
2. The user selects the registration option.
3. The user enters required information such as name, email, and password.
4. The backend receives the registration request through the REST API.
5. The password is encrypted using bcrypt.
6. The user information is stored in MongoDB Atlas.
7. After successful registration, the user can log in to the system.

### Workflow

```text
User
 ↓
Registration Form
 ↓
React Frontend
 ↓
FastAPI Backend
 ↓
Password Encryption using bcrypt
 ↓
MongoDB Atlas
 ↓
Account Created
```

The repository specifies bcrypt-based password encryption and MongoDB Atlas storage for user data.

---

## 4. User Login Workflow

After registration, the user can log into the portal.

### Process

1. User enters email and password.
2. React frontend sends the credentials to the FastAPI backend.
3. Backend validates the credentials.
4. The password is verified securely.
5. If the credentials are correct, a JWT token is generated.
6. The authenticated user is redirected to the dashboard.
7. Protected API endpoints can then be accessed.

### Workflow

```text
Login Page
    ↓
Enter Email + Password
    ↓
React Frontend
    ↓
FastAPI Backend
    ↓
Validate Credentials
    ↓
Generate JWT Token
    ↓
Authenticated Session
    ↓
Dashboard
```

The project uses JWT-based authentication and protected API endpoints.

---

## 5. Profile Management Workflow

After successful login, the user can create and update their profile.

The profile contains information such as:

* Personal details
* Technical skills
* Soft skills
* Education
* Professional information
* Career-related information

Skills can be categorized into areas such as:

* Programming Languages
* Frontend Development
* Backend Development
* Database Technologies
* Cloud and DevOps
* Data Science and AI
* Mobile Development
* Soft Skills

### Workflow

```text
User Dashboard
      ↓
Manage Profile
      ↓
Enter Personal Information
      ↓
Select / Update Skills
      ↓
React Frontend
      ↓
FastAPI API
      ↓
MongoDB Atlas
      ↓
Updated User Profile
```

The repository specifically describes categorized skill selection and real-time profile synchronization.

---

# 6. Skill-Based Job Matching Workflow

This is the core functionality of the project.

When the user opens the **Recommended Jobs** page, the system retrieves the user's skills and compares them with the skills required by available jobs.

### Step 1 – Retrieve User Skills

The backend retrieves the skills associated with the logged-in user from the database.

Example:

```text
User Skills:
Python
React
MongoDB
Git
```

### Step 2 – Retrieve Job Data

The system retrieves available job information.

Example:

```text
Job: Full Stack Developer

Required Skills:
Python
React
MongoDB
Git
REST API
```

### Step 3 – Compare Skills

The matching engine compares the user's skills against the job's required skills.

```text
Python       ✓
React        ✓
MongoDB      ✓
Git          ✓
REST API     ✗
```

### Step 4 – Calculate Match Percentage

The system calculates the percentage of required skills that match the user's skills.

```text
Matched Skills = 4
Required Skills = 5

Match Percentage = (4 / 5) × 100

Match Percentage = 80%
```

### Step 5 – Rank Jobs

The system repeats the process for available jobs and ranks the jobs from the highest match percentage to the lowest.

```text
Job A → 95%
Job B → 85%
Job C → 80%
Job D → 65%
```

The user therefore sees the most relevant job opportunities first.

The repository documents this exact workflow: retrieve user skills → retrieve jobs → compare required skills → calculate matching percentage → sort by highest match.

---

# 7. Job Recommendation Workflow

After calculating the matching score, the system generates personalized job recommendations.

### Workflow

```text
User Skills
     ↓
Retrieve Available Jobs
     ↓
Extract Required Skills
     ↓
Compare User Skills
     ↓
Calculate Match Percentage
     ↓
Rank Jobs
     ↓
Recommended Jobs
```

Each recommendation can display:

* Job title
* Company
* Location
* Salary range
* Required skills
* Employment type
* Match percentage
* Job description

The job-management functionality documented in the repository includes job descriptions, company information, salary range, required skills, employment type, and location.

---

# 8. Job Details Workflow

When the user selects a recommended job, the system displays complete job information.

### Job Details Include

```text
Job Title
Company Name
Location
Salary Range
Employment Type
Job Description
Required Skills
Skill Match Percentage
Apply Button
```

The user can evaluate the opportunity before submitting an application.

---

# 9. Job Application Workflow

Once the user finds a suitable job, they can apply through the portal.

### Process

1. User selects a job.
2. User opens the job details.
3. User reviews requirements and skill match.
4. User clicks the **Apply** button.
5. Application information is sent to the backend.
6. FastAPI processes the request.
7. Application information is stored in MongoDB Atlas.
8. The application becomes available in the user's application history.

### Workflow

```text
Recommended Job
       ↓
View Job Details
       ↓
Check Skill Match
       ↓
Click Apply
       ↓
FastAPI Backend
       ↓
MongoDB Atlas
       ↓
Application Saved
       ↓
Application History
```

The repository specifies one-click application and application-history tracking.

---

# 10. Application Tracking Workflow

The user can monitor the status of submitted applications from the dashboard.

The system supports application states such as:

```text
Pending
   ↓
Under Review
   ↓
Shortlisted
   ↓
Interview Scheduled
   ↓
Selected
```

If the application is unsuccessful, it can move to:

```text
Rejected
```

### Workflow

```text
User Dashboard
      ↓
Application History
      ↓
Select Application
      ↓
View Current Status
      ↓
Track Recruitment Progress
```

The repository documents statuses including Pending, Reviewed/Under Review, Shortlisted, Interview Scheduled, Selected, and Rejected.

---

# 11. Backend Workflow

The backend acts as the central processing layer between the frontend and database.

```text
React Frontend
      ↓
REST API Request
      ↓
FastAPI Backend
      ↓
Authentication / Validation
      ↓
Business Logic
      ↓
MongoDB Atlas
      ↓
Process Result
      ↓
JSON Response
      ↓
React Frontend
```

The project uses **FastAPI and Python** as its backend technologies and exposes REST API endpoints for authentication, profile management, job recommendations, and applications.

---

# 12. Database Workflow

MongoDB Atlas stores the application's important information.

The database can contain information related to:

```text
Users
   ↓
Profiles
   ↓
Skills
   ↓
Jobs
   ↓
Job Requirements
   ↓
Applications
   ↓
Application Status
```

The backend communicates with MongoDB Atlas to store and retrieve data.

### Example

```text
User Profile
{
  "name": "Student",
  "skills": [
    "Python",
    "React",
    "MongoDB",
    "Git"
  ]
}
```

Job data:

```text
{
  "jobTitle": "Full Stack Developer",
  "requiredSkills": [
    "Python",
    "React",
    "MongoDB",
    "Git",
    "REST API"
  ]
}
```

The backend retrieves both datasets and performs the matching operation.

---

# 13. Complete End-to-End Workflow

The complete workflow of the system can be summarized as follows:

```text
                 START
                   ↓
             Open Website
                   ↓
          Register / Login
                   ↓
              Dashboard
                   ↓
          Manage User Profile
                   ↓
          Add Technical Skills
                   ↓
          Add Soft Skills
                   ↓
          Store Profile Data
                   ↓
            MongoDB Atlas
                   ↓
          Open Recommended Jobs
                   ↓
       Retrieve User Skill Set
                   ↓
        Retrieve Available Jobs
                   ↓
       Retrieve Required Skills
                   ↓
        Compare User vs Job Skills
                   ↓
        Calculate Match Percentage
                   ↓
        Rank Jobs by Match Score
                   ↓
       Display Recommended Jobs
                   ↓
          User Views Job Details
                   ↓
                 Apply?
                /      \
              No        Yes
              ↓          ↓
        Continue Search  Submit Application
                           ↓
                      Store Application
                           ↓
                    Application History
                           ↓
                    Track Application
                           ↓
                          END
```

---

# 14. REST API Workflow

The major REST API operations in the project are:

| Method | Endpoint              | Purpose                      |
| ------ | --------------------- | ---------------------------- |
| POST   | `/api/auth/register`  | Register a new user          |
| POST   | `/api/auth/login`     | Authenticate user            |
| GET    | `/api/profile`        | Retrieve user profile        |
| PUT    | `/api/profile/skills` | Update user skills           |
| GET    | `/api/jobs`           | Retrieve job recommendations |
| POST   | `/api/applications`   | Submit job application       |
| GET    | `/api/applications`   | Retrieve application history |

These endpoints are documented in the project's repository.

---

# 15. Frontend–Backend–Database Communication

The system follows a three-layer architecture:

### Presentation Layer

**React.js**

Responsible for:

* User interface
* Forms
* Dashboard
* Job cards
* Skill selection
* Application interface

### Application Layer

**FastAPI + Python**

Responsible for:

* Authentication
* API processing
* Skill matching
* Match percentage calculation
* Job recommendations
* Application processing

### Data Layer

**MongoDB Atlas**

Responsible for:

* User data
* Profile information
* Skills
* Job information
* Applications
* Application status

### Architecture

```text
┌─────────────────────────────┐
│       React.js Frontend     │
│  Login | Profile | Jobs     │
│  Recommendations | Apply    │
└──────────────┬──────────────┘
               │ REST API
               ▼
┌─────────────────────────────┐
│      FastAPI Backend        │
│ Authentication              │
│ Profile Management          │
│ Skill Matching              │
│ Job Recommendation          │
│ Application Management      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       MongoDB Atlas         │
│ Users | Skills | Jobs       │
│ Applications | Status      │
└─────────────────────────────┘
```

---

# 16. Example of the Complete Matching Process

Assume a user has:

```text
Python
React
MongoDB
Git
```

A job requires:

```text
Python
React
MongoDB
Git
REST API
```

The matching engine performs:

```text
User Skill       Job Requirement
---------------------------------
Python       →   Python       ✓
React        →   React        ✓
MongoDB      →   MongoDB      ✓
Git          →   Git          ✓
                 REST API     ✗
```

Therefore:

```text
Matched Skills = 4
Total Required Skills = 5

Match = 80%
```

The system can display:

```text
┌──────────────────────────────────┐
│ Full Stack Developer             │
│ ABC Technologies                │
│                                  │
│ Skill Match: 80%                 │
│                                  │
│ ✓ Python                         │
│ ✓ React                          │
│ ✓ MongoDB                        │
│ ✓ Git                            │
│                                  │
│ Missing Skill: REST API          │
│                                  │
│ [View Details] [Apply Now]       │
└──────────────────────────────────┘
```

This demonstrates how the portal provides a more personalized experience than simple keyword-based job searching.

---

# 17. Future Workflow Enhancement – Resume-Based Matching

A future enhancement of the system can allow users to upload their resumes.

```text
Resume Upload
      ↓
PDF/DOCX Text Extraction
      ↓
Extract Skills
      ↓
Create User Skill Profile
      ↓
Compare With Job Requirements
      ↓
Calculate Match Percentage
      ↓
Identify Missing Skills
      ↓
Recommend Jobs
      ↓
Recommend Skills / Learning Areas
```

This is particularly useful because the current repository lists **resume upload and parsing, resume-to-job matching, AI-powered career guidance, learning recommendations, and skill-gap analysis** as future enhancements.

---

# 18. Conclusion

The Skill-Based Job Matching & Career Guidance Portal follows a complete workflow starting from user registration and authentication, followed by profile creation and skill selection. The user's skills are stored in MongoDB Atlas and retrieved by the FastAPI backend when the user requests recommended jobs.

The system compares the user's skills with job requirements, calculates a matching percentage, ranks the available jobs, and presents the most relevant opportunities to the user. After selecting a suitable job, the user can submit an application and track its progress through the application history.

Therefore, the complete workflow integrates **React.js, FastAPI, Python, MongoDB Atlas, JWT authentication, REST APIs, and skill-based matching** to provide a personalized job-search and career guidance experience.
