# SmartHire Dual-Portal Architecture & Dataflow Diagrams

This document contains detailed architectural and sequence diagrams illustrating the dataflow, authentication, candidate profile creation, ML job recommendation engine, and application tracking pipeline.

---

## 1. Authentication & Role-Based Access Control (RBAC) Flow

This diagram illustrates how users sign up, log in, receive a role-encoded JWT, and are securely routed to either the **Recruiter Workspace** or the **Candidate Talent Hub**.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Candidate / Recruiter)
    participant UI as Frontend App (React)
    participant RG as RoleProtectedRoute
    participant AuthAPI as Auth Router (/api/auth)
    participant DB as MongoDB Atlas

    Note over User, UI: Login / Registration Phase
    User->>UI: Selects Role Tab ("Candidate" or "Employer") & Enters Credentials
    UI->>AuthAPI: POST /api/auth/login { email, password, role }
    AuthAPI->>DB: Query User Collection by Email & Role
    DB-->>AuthAPI: User Document with password_hash & role
    AuthAPI->>AuthAPI: Verify bcrypt password hash
    AuthAPI->>AuthAPI: Generate JWT with Claims { sub: user_id, role: "candidate" | "recruiter" }
    AuthAPI-->>UI: Return { access_token, user: { id, name, email, role } }
    UI->>UI: Store Token & Role in localStorage / AuthContext

    Note over UI, RG: Route Redirection & Access Guarding
    alt Role is "candidate"
        UI->>RG: Navigate to /candidate/dashboard
        RG->>RG: Check (token exists && role === "candidate")
        RG-->>UI: Allow Access -> Render Candidate Talent Hub
    else Role is "recruiter"
        UI->>RG: Navigate to /dashboard
        RG->>RG: Check (token exists && role === "recruiter")
        RG-->>UI: Allow Access -> Render Recruiter Workspace
    else Unauthorized Role Access (e.g. Candidate tries to access /jobs)
        RG-->>UI: Block & Redirect to unauthorized fallback (/candidate/dashboard)
    end
```

---

## 2. Candidate Profile Creation & Resume Ingestion Flow

Shows how candidate profile data and uploaded resumes are processed, stored, and scored for profile completion.

```mermaid
flowchart TD
    Start([Candidate Visits Profile Page]) --> InputChoice[Candidate Actions]

    subgraph Profile Inputs
        InputChoice --> FormFields["Fill Basic Info (Name, Email, Phone, Location)"]
        InputChoice --> SkillsInput["Add Skills (Interactive Tags with Auto-complete)"]
        InputChoice --> EduExp["Add Education & Work Experience History"]
        InputChoice --> SocialLinks["Add Links (GitHub, LinkedIn, Portfolio)"]
        InputChoice --> ResumeUpload["Upload Resume (PDF / DOCX)"]
    end

    ResumeUpload --> UploadAPI["POST /api/candidate/profile/resume"]
    FormFields & SkillsInput & EduExp & SocialLinks --> ProfileAPI["PUT /api/candidate/profile"]

    subgraph Backend Processing
        UploadAPI --> StorageService["Save File to Local / S3 Storage"]
        StorageService --> PDFParser["AI PDF Text & Metadata Extractor"]
        PDFParser --> ExtractedSkills["Auto-extract Skills, Education, & Summary"]
        ExtractedSkills -.->|Suggested Autofill| ProfileAPI
        ProfileAPI --> ComputeMeter["Compute Profile Completion %"]
        ComputeMeter --> DB[(MongoDB: candidates)]
    end

    DB --> Response["Profile Updated (e.g. 95% Complete)"]
    Response --> UIState["Dashboard Reflects Ready for 1-Click Apply & ML Matching"]
```

---

## 3. ML Job Recommendation Engine Architecture

Detailed dataflow of how candidate vectors and job requirement vectors are matched using a hybrid scoring algorithm.

```mermaid
flowchart LR
    subgraph Candidate Data
        CP[Candidate Profile] --> CS[Candidate Skills]
        CP --> CE[Experience Years & Title]
        CP --> CD[Education Level]
        CP --> CH[Headline & Bio Summary]
    end

    subgraph Active Job Corpus
        AJ[(Active Jobs Collection)] --> JS[Job Required Skills]
        AJ --> JE[Job Min Experience]
        AJ --> JD[Job Education Requirement]
        AJ --> JT[Job Title & Description]
    end

    subgraph Hybrid Recommendation Model
        CS & JS --> SkillMetric["1. Direct Skill Overlap (Weight: 45%)\nJaccard / Set Intersection"]
        CH & JT --> TFIDF["2. Semantic TF-IDF Cosine Similarity (Weight: 30%)\nVector Space Model"]
        CE & JE --> ExpMetric["3. Experience Proximity (Weight: 15%)\nMeets / Exceeds Requirement Penalty/Bonus"]
        CD & JD --> EduMetric["4. Education Tier Match (Weight: 10%)\nDegree Level Fit"]

        SkillMetric & TFIDF & ExpMetric & EduMetric --> CompositeCalc["Composite Score Formula:\nScore = 0.45*Skills + 0.30*TFIDF + 0.15*Exp + 0.10*Edu"]
    end

    CompositeCalc --> Ranker["Sort Jobs by Match Score Descending"]
    Ranker --> Badges["Generate Explainable AI Badges\n- Match Tier (e.g., '92% Strong Match')\n- Matching Skills vs Missing Skills"]
    Badges --> OutputFeed["Candidate 'Recommended For You' Job Feed"]
```

---

## 4. 1-Click Application & Real-Time Tracking Pipeline

Illustrates how the candidate applies with one click and monitors their progression through each evaluation stage in their dedicated dashboard.

```mermaid
sequenceDiagram
    autonumber
    actor C as Candidate
    participant Feed as Candidate Job Explorer
    participant AppAPI as Application Router
    participant Screener as AI Resume Screener (Gemini)
    participant Tracker as "My Applications" Dashboard
    participant Interview as Voice / DSA / HR Arena

    C->>Feed: Browses Jobs & Clicks "1-Click Apply"
    Feed->>AppAPI: POST /api/candidate/apply/{job_id} (uses stored profile & resume)
    AppAPI->>AppAPI: Validate eligibility & check deadline
    AppAPI->>AppAPI: Insert Application Document (status: "applied")
    AppAPI-->>Feed: 201 Created ("Application Submitted!")
    
    Note over AppAPI, Screener: Background Processing
    AppAPI-)Screener: Trigger Background Resume Screening against Job JD
    Screener->>Screener: Calculate Resume Score (0-100) vs Cutoff (e.g., 65%)
    
    alt Resume Score >= Cutoff
        Screener->>AppAPI: Update Status: "voice_round_invited"
    else Resume Score < Cutoff
        Screener->>AppAPI: Update Status: "resume_rejected"
    end

    Note over C, Tracker: Live Tracking in Candidate Dashboard
    C->>Tracker: Navigates to /candidate/applications
    Tracker->>AppAPI: GET /api/candidate/applications
    AppAPI-->>Tracker: Returns Application List with Live Status & Scores

    alt If Status is "voice_round_invited"
        Tracker-->>C: Show Active Action Button: "Start AI Voice Interview"
        C->>Interview: Launches Round 1 directly from Dashboard
    else If Status is "dsa_round_invited"
        Tracker-->>C: Show Active Action Button: "Enter Coding Arena (DSA)"
        C->>Interview: Launches Round 2 directly from Dashboard
    else If Status is "hr_round_invited"
        Tracker-->>C: Show Active Action Button: "Join HR Meeting (Meet / Teams)"
        C->>Interview: Launches Video Meeting directly from Dashboard
    end
```

---

## 5. Entity Relationship (ER) & System Data Model

```mermaid
erDiagram
    COMPANIES ||--o{ JOBS : creates
    JOBS ||--o{ APPLICATIONS : receives
    CANDIDATES ||--o{ APPLICATIONS : submits
    APPLICATIONS ||--o| VOICE_SESSIONS : conducts
    APPLICATIONS ||--o| DSA_SESSIONS : conducts

    COMPANIES {
        string _id PK
        string name
        string email
        string password_hash
        string industry
        string role "recruiter"
    }

    CANDIDATES {
        string _id PK
        string name
        string email
        string password_hash
        string role "candidate"
        string phone
        string resume_url
        list skills
        float experience_years
        list education
        list experience_history
        int profile_completed_percentage
    }

    JOBS {
        string _id PK
        string company_id FK
        string title
        string description
        list required_skills
        float min_experience_years
        string education_requirement
        object cutoffs
        int dsa_problem_count
        boolean is_active
    }

    APPLICATIONS {
        string _id PK
        string job_id FK
        string candidate_id FK
        string status
        float resume_score
        float voice_score
        float dsa_score
        float hr_score
        float final_score
        datetime applied_at
    }

    VOICE_SESSIONS {
        string _id PK
        string application_id FK
        list questions
        float final_score
        boolean passed_cutoff
    }

    DSA_SESSIONS {
        string _id PK
        string application_id FK
        list problems
        object submissions
        float total_score
        boolean passed_cutoff
        string meeting_link
    }
```
