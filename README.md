# NoteNest — Fixed Full Project

This folder contains the repaired frontend + backend.

## Folders

- `notenest-frontend-style4/` — HTML/CSS/Vanilla JS frontend
- `backend/` — Node.js + Express + MySQL backend

## Local setup (Windows + XAMPP)

1. Start **MySQL** in XAMPP. This project is configured for port **3307** in `backend/.env`.
2. Open a terminal in `backend` and run once after replacing the project:

```powershell
npm install
npm run db:setup
```

`db:setup` is non-destructive for normal project data. It creates missing tables/columns, migrates the old `ADMIN` role to `UPLOADER`, preserves academic data, and ensures the development `SUPER_ADMIN` exists.

3. Start backend:

```powershell
npm run dev
```

Expected:

- API: `http://localhost:5000`
- Health: `http://localhost:5000/api/health`
- Swagger: `http://localhost:5000/api/docs`

4. Open `notenest-frontend-style4/index.html` with **Live Server**.

Typical frontend URL:

`http://127.0.0.1:5500/notenest-frontend-style4/index.html`

## Development SUPER_ADMIN

- Email: `admin@studyvault.local`
- Password: `Admin@123`

Change this password before deployment.

## Roles

### SUPER_ADMIN
- Full dashboard
- Upload/publish/delete materials
- Manage subjects and academic setup
- Create/enable/disable uploader accounts
- View activity logs and login history

### UPLOADER
- Login
- Upload files or external material links
- View own uploads
- Uploaded material is kept unpublished until SUPER_ADMIN reviews/publishes it

## Uploads

Upload endpoint:

`POST /api/admin/materials/upload`

Allowed files: PDF, DOC, DOCX, PPT, PPTX. Default max size: 20 MB.

Files are stored in:

`backend/uploads/materials/`

Only their metadata/path is stored in MySQL.
