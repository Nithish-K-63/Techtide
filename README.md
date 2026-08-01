# CareerPath — Skill-Based Job Matching Portal

## Project Overview

**CareerPath** is an intelligent, skill-based career guidance and job matching platform designed to connect job seekers with relevant employment opportunities based on their competencies rather than traditional keyword-based searches. By leveraging a skill-centric recommendation system, the platform identifies the most suitable job openings that align with a user's technical expertise and professional capabilities, enabling more accurate and meaningful career opportunities.

The application follows a modern full-stack architecture, featuring a **React.js** frontend for an interactive user experience, a **FastAPI** backend for high-performance API services, and **MongoDB Atlas** as the cloud-based NoSQL database for scalable and flexible data management.

---

# System Workflow

The CareerPath platform follows a structured workflow consisting of four major stages that ensure a seamless user experience from registration to job application tracking.

## 1. User Authentication and Account Management

The platform provides a secure authentication mechanism to protect user data and maintain personalized sessions.

### User Registration

* New users create an account by providing their basic information, including name, email address, and password.
* Passwords are securely encrypted using the **bcrypt hashing algorithm** before being stored in the database.
* User credentials are maintained in MongoDB Atlas for secure and scalable storage.

### User Login

* Existing users authenticate using their registered email and password.
* The backend validates the encrypted password and generates a **JSON Web Token (JWT)** upon successful authentication.
* The JWT is securely stored on the client side and is used to authorize subsequent API requests, ensuring secure session management.

---

## 2. User Profile and Skill Management

After successful authentication, users are directed to their personalized dashboard, where they can build and maintain their professional profile.

### Skill Selection

Users can select skills from multiple predefined categories, including:

* Programming Languages
* Frontend Development
* Backend Development
* Database Technologies
* Cloud Computing & DevOps
* Data Science & Artificial Intelligence
* Mobile Development
* Soft Skills

### Profile Management

* Selected skills are stored as part of the user's profile.
* Profile information is synchronized with the backend through RESTful APIs.
* Users can update their skills at any time, ensuring that recommendations remain accurate and relevant.

---

## 3. Intelligent Skill-Based Job Matching Engine

The recommendation engine serves as the core component of the platform by matching user skills with employer requirements.

### Job Repository

* Every job posting stored in the database contains detailed information, including:

  * Job Title
  * Company Name
  * Job Description
  * Required Skills
  * Experience Level
  * Salary Range
  * Employment Type
  * Location

### Skill Matching Algorithm

When users access the **Recommended Jobs** section:

1. The backend retrieves the user's skill profile.
2. It compares the user's skills against the required skills of every active job posting.
3. A matching score is calculated based on the percentage of required skills possessed by the user.

For example:

* Required Skills: **Python, React, MongoDB, Git, REST API**
* User Skills: **Python, React, MongoDB, Git**

**Matching Score = (4 ÷ 5) × 100 = 80%**

### Recommendation Generation

* Jobs are ranked according to their matching percentage.
* The highest-ranked opportunities are displayed first.
* This approach minimizes irrelevant job suggestions and provides users with highly personalized career recommendations.

---

## 4. Job Application and Progress Tracking

The platform enables users to apply for suitable positions and monitor their application progress.

### Job Details

Before applying, users can view comprehensive information such as:

* Company Profile
* Job Description
* Required Skills
* Salary Range
* Work Location
* Employment Type
* Experience Requirements

### Job Application

* Users can apply directly through the platform by selecting the **Apply** option.
* The system records the application by linking the user's profile with the corresponding job posting in the database.

### Application Tracking

The dashboard includes a dedicated **Applications** section where users can monitor the status of every submitted application.

Possible application statuses include:

* Pending
* Under Review
* Shortlisted
* Interview Scheduled
* Selected
* Rejected

This centralized tracking system enables users to stay informed about their recruitment progress throughout the hiring process.

---

# Key Features

* Secure user authentication using **JWT** and **bcrypt**
* Comprehensive user profile and skill management
* Intelligent skill-based job recommendation engine
* Percentage-based job matching algorithm
* Personalized job recommendations
* Detailed job listings with company information
* One-click job application functionality
* Real-time application status tracking
* Responsive and user-friendly interface
* Cloud-based data storage using **MongoDB Atlas**
* High-performance backend developed with **FastAPI**
* Modern frontend built using **React.js**

---

# Technology Stack

| Layer             | Technologies Used                 |
| ----------------- | --------------------------------- |
| Frontend          | React.js, HTML5, CSS3, JavaScript |
| Backend           | FastAPI, Python                   |
| Database          | MongoDB Atlas                     |
| Authentication    | JWT, bcrypt                       |
| API Communication | REST APIs                         |
| Version Control   | Git & GitHub                      |


## 🔄 System Flowchart

The following flowchart illustrates the complete user journey and data flow:

```mermaid
flowchart TD
    %% User Entry Points
    A([User Visits Portal]) --> B{Already Registered?}
    B -- No --> C[Sign Up / Register]
    B -- Yes --> D[Login]
    C --> D
    
    %% Dashboard & Profile
    D --> E[User Dashboard]
    E --> F[Profile Management]
    
    %% Skill Selection Phase
    F --> G[Select/Update Technical & Soft Skills]
    G -. Save Skills .-> API1(FastAPI: /api/profile)
    API1 -. Update .-> DB[(MongoDB Atlas)]
    
    %% Matching Phase
    E --> H[View Job Recommendations]
    H -. Request Matches .-> API2(FastAPI: /api/jobs)
    API2 -. Fetch User Skills & Jobs .-> DB
    DB -. Return Data .-> API2
    API2 -. Calculate Match % .-> H
    
    %% Application Phase
    H --> J[User Reviews Job Details]
    J --> K{Match High Enough?}
    K -- Yes --> L[User Applies for Job]
    K -- No --> H
    
    L -. Submit App .-> API3(FastAPI: /api/applications)
    API3 -. Insert Record .-> DB
    
    %% Tracking
    L --> M[Application Status Tracked in Dashboard]
---
---

## 📡 Core API Structure

The backend exposes several RESTful endpoints (documented automatically via Swagger at `http://localhost:5000/docs` when running):

* `POST /api/auth/register` - Creates a new user account.
* `POST /api/auth/login` - Authenticates user and returns a JWT.
* `GET /api/profile` - Fetches the authenticated user's profile and selected skills.
* `PUT /api/profile/skills` - Updates the user's skill array.
* `GET /api/jobs` - Retrieves job listings (optionally filtered and sorted by match percentage).
* `POST /api/applications` - Submits a job application for the authenticated user.
* `GET /api/applications` - Retrieves a user's application history.

---

## 🚀 Setup & Local Development

To run this project locally on your machine:

1. **Clone the repository** to your local machine.
2. **Environment Variables**: Create a `.env` file in the root directory. You will need to define:
   ```env
   MONGO_URI=your_mongodb_cloud_connection_string
   JWT_SECRET=a_secure_random_secret_string
   PORT=5000
   ```
3. **Install Dependencies**: The project uses a unified package script. Run the following command in the root directory to install both frontend (Node/React) and backend (Python) dependencies:
   ```bash
   npm run install:all
   ```
4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *Note: This command concurrently starts the FastAPI backend (usually on port 5000) and the React frontend (usually on port 5173).*
