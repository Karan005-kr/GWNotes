GWNOTES COMPLETE FRONTEND

This is a full replacement frontend folder, not a CSS patch.

Replace your existing frontend folder contents with these files:
- index.html
- css/style.css
- js/api.js
- js/config.js
- js/app.js
- js/admin.js
- assets/gwnotes-logo.png

Changes:
- Full GWNotes branding
- Black / grey / white theme
- Supplied GWNotes logo in header + favicon
- Contact Us section included
- Gmail button goes to karanje8765@gmail.com
- Existing Browse/Search/Admin IDs kept for JavaScript compatibility
- Dashboard admin.js includes the active-data auto-refresh fix

Run:
1. Backend: npm run dev
2. Open this index.html with Live Server
3. Ctrl + Shift + R

Note:
config.js still points to the local backend http://localhost:5000/api.
Change it only when your backend is deployed online.
