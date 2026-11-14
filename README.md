# DropBox Lite – File Storage & Sharing Platform

A simplified, modern cloud storage system where users can securely upload, manage, and share files with fine-grained access control, expiring download links, quota management, and download tracking.

Built with **Node.js**, **Express**, **MongoDB (Mongoose)**, **Multer**, and **Server-Side Rendered (SSR) HTML & CSS using EJS**.

---

## 🚀 Features

1. **File Upload using Multer**
   - Direct multipart file uploads using Multer disk storage.
   - Configurable per-file upload size limits (default: 25 MB).
   - Safe, collision-free filename generation using standard crypto hashes.

2. **File Metadata in MongoDB**
   - Preserves original file name, MIME type, file size, owner reference, upload timestamp, and tracking metadata.
   - Automatic cleanup of storage metadata and disk files upon deletion.

3. **Private & Public File Sharing**
   - **Private (Default):** Accessible only by the owner or explicitly invited users.
   - **Public:** Toggle public visibility with a single click to generate an instant permanent public download URL.

4. **Expiring Download Links**
   - Generate secure, temporary download tokens with custom expiration presets (15 minutes, 1 hour, 6 hours, 24 hours, 7 days).
   - Expired links are automatically rejected and visually badged.
   - Owners can revoke temporary links anytime.

5. **File Access Permissions**
   - **Owner:** Full administrative rights (download, rename/details, toggle public, generate temporary links, invite users, delete).
   - **Shared Users:** Invite registered users by email to grant them view & download access directly in their personal "Shared With Me" tab.
   - **Public/Anonymous:** Permitted to download only when a file is explicitly marked public or accessed via an active expiring token.

6. **Storage Quotas & File Size Limits**
   - Dynamic per-user storage quota enforcement (e.g. 50 MB free tier).
   - Real-time progress bar displaying current usage, available storage, and percentage.
   - Automatic rejection and cleanup of uploads that exceed available quota or file size limits.
   - Automatic quota recovery when files are deleted.

7. **Download Tracking**
   - Global download counters for every file.
   - Timestamp tracking for the most recent download.
   - Per-link download counters for each expiring share token.

8. **Docker-Based Deployment**
   - One-command containerized deployment with `docker-compose.yml`.
   - Multi-container architecture with Node.js LTS (Alpine) and MongoDB with persistent data and file upload volumes.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (v20+)
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Upload Engine:** Multer
- **Template Engine:** EJS (Server-Side Rendering)
- **Styling:** Modern, clean, responsive Vanilla CSS
- **Session & Auth:** `express-session`, `connect-mongo`, `bcryptjs`
- **Containerization:** Docker & Docker Compose

---

## 🐳 Quick Start with Docker

The easiest way to run DropBox Lite is using Docker Compose:

```bash
# Clone or navigate to the project directory
cd backend

# Build and start MongoDB and DropBox Lite
docker compose up --build -d
```

Once started, open your browser and navigate to:
```
http://localhost:3000
```

To stop the containers:
```bash
docker compose down
```

---

## 💻 Local Development Setup (Without Docker)

### Prerequisites
- Node.js (v18+)
- Local MongoDB running on `mongodb://127.0.0.1:27017`

### Steps
1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables (or use defaults in `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. Start the application:
   ```bash
   npm start
   # or development mode with live watch:
   npm run dev
   ```

4. Visit `http://localhost:3000`.

---

## 📁 Project Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB connection handler
├── middleware/
│   ├── auth.js               # Session verification & authorization
│   └── upload.js             # Multer configuration & size limits
├── models/
│   ├── File.js               # File metadata, share tokens & permission schema
│   └── User.js               # User credentials, storage quotas & usage
├── routes/
│   ├── auth.js               # Sign up, sign in, and logout routes
│   ├── files.js              # Upload, dashboard, delete, quotas, sharing routes
│   └── share.js              # Public download & expiring link landing pages
├── utils/
│   └── formatters.js         # Bytes, dates, and file icon formatting helpers
├── views/
│   ├── auth/                 # Login & Registration views
│   ├── partials/             # Header, footer, alerts
│   ├── dashboard.ejs         # User files, quota bar, upload form
│   ├── file-details.ejs      # Share controls, expiring links, permissions
│   ├── public-download.ejs   # Public/temporary download landing page
│   └── error.ejs             # 404, 403, 410, and 500 error display
├── public/
│   └── css/
│       └── style.css         # Modern, clean CSS styling
├── uploads/                  # Uploaded files directory (persisted)
├── Dockerfile                # Production Docker container definition
├── docker-compose.yml        # Docker Compose service orchestration
└── server.js                 # Server entry point
```

---

## 🔒 Security & Best Practices

- **Password Hashing:** Passwords are encrypted with `bcrypt` (10 salt rounds).
- **Session Management:** Stored securely in MongoDB with HTTP-only cookies.
- **Upload Path Safety:** Stored with randomly generated hex names, preventing directory traversal and filename collisions.
- **Quota Validation:** File size is validated before committing to disk/DB; temp files are cleaned up if quotas are exceeded.
- **Non-Root Docker Execution:** The container runs as the unprivileged `node` user for security.
