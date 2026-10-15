# GWNotes

GWNotes is a university study-material portal designed to help students quickly access academic resources in one place.

The platform allows students to browse study material through a simple academic structure:

**University → Course → Specialization/Branch → Semester → Subject → Study Material**

Currently, GWNotes is focused on **DCRUST B.Tech students**.

---

## Features

- Browse universities and courses
- Semester-wise subject listing
- Subject-wise study material
- Syllabus access
- Unit-wise Notes
- Previous Year Question Papers (PYQs)
- Search functionality
- Admin login system
- Role-based admin access
- SUPER_ADMIN and UPLOADER roles
- Material upload and management
- Activity and login tracking
- Responsive student dashboard
- Cloud database support using TiDB Cloud

---

## Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### Backend
- Node.js
- Express.js
- REST API

### Database
- MySQL-compatible database
- TiDB Cloud

### Authentication & Security
- JWT Authentication
- bcryptjs
- Role-based access control
- Helmet
- CORS
- Express Rate Limit
- Zod Validation

---

## Project Structure

```text
GWNotes/
├── backend/
│   ├── src/
│   ├── certificate/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── index.html
│
├── .gitignore
└── README.md
```

---

## Main Study Material Categories

GWNotes currently focuses on:

1. **Syllabus**
2. **Notes**
3. **Previous Year Question Papers (PYQs)**

---

## Admin Roles

### SUPER_ADMIN
The Super Admin can manage the complete portal, including academic data, uploaded materials, users, and activity records.

### UPLOADER
Uploaders can add and manage permitted study material according to their assigned access.

---

## Team

| Role | Name |
|---|---|
| Team Leader | **Karan Kumar** |
| Team Member | **Aryan** |
| Team Member | **Bhoomi** |
| Team Member | **Anushka** |

---

## Project Goal

The goal of GWNotes is to create a simple, organized, and reliable platform where students can find university study resources without depending on scattered links, multiple groups, or individual teachers.

---

## Current Focus

- University: **DCRUST**
- Course: **B.Tech**
- Academic resources: **Syllabus, Notes, and PYQs**

More universities, courses, subjects, and resources can be added later through the admin system.

---

## Local Development

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs locally on:

```text
http://localhost:5000
```

Health endpoint:

```text
http://localhost:5000/api/health
```

### Frontend

Open the frontend using a local development server such as VS Code Live Server.

Example:

```text
http://127.0.0.1:5500
```

---

## Environment Variables

Create a `.env` file inside the backend folder.

Important environment variables include:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=studyvault

DB_SSL=true
DB_SSL_CA_PATH=certificate/isrgrootx1.pem

PORT=5000
JWT_SECRET=
JWT_EXPIRES_IN=1d

FRONTEND_ORIGIN=
MAX_FILE_SIZE_MB=20
UPLOAD_DIR=uploads/materials
```

> Never upload your `.env` file or database password to GitHub.

---

## Deployment Plan

- **Frontend:** Vercel
- **Backend:** Render
- **Database:** TiDB Cloud
- **File Storage:** Cloud storage
- **Search Visibility:** Google Search Console

---

## License

This project is currently created for academic and educational purposes.

---

## GWNotes

**Gateway to organized study material.**
