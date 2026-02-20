# 🩸 BloodLink — Blood Donation & Request Management Platform

A production-ready, full-stack blood donation management platform with real-time capabilities, role-based access control, and geolocation-based donor matching.

---

## 🏗️ Tech Stack

| Layer      | Technology                         |
|------------|-----------------------------------|
| Frontend   | React 18, Redux Toolkit, TailwindCSS, Socket.io-client |
| Backend    | Node.js, Express.js, Socket.io    |
| Database   | MongoDB Atlas (with 2dsphere index) |
| File Store | Cloudinary                        |
| Container  | Docker + Docker Compose           |
| Reverse Proxy | Nginx                          |

---

## 📁 Project Structure

```
bloodlink/
├── backend/
│   ├── src/
│   │   ├── config/        # DB, Cloudinary config
│   │   ├── controllers/   # Auth, Admin, Donation, Request
│   │   ├── middleware/    # Auth, Error, Upload
│   │   ├── models/        # User, BloodDonation, BloodRequest, AuditLog
│   │   ├── routes/        # Route definitions
│   │   ├── services/      # Blood compatibility, Donor matching, Audit log
│   │   ├── sockets/       # Socket.io with JWT auth
│   │   ├── utils/         # JWT utils, Logger, Seed script
│   │   ├── jobs/          # Cron jobs (expiry tracking)
│   │   └── app.js         # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Navbar, ProtectedRoute
│   │   ├── pages/         # Login, Register, Dashboard, Admin, Hospital, Forms
│   │   ├── store/         # Redux store + slices
│   │   └── utils/         # API client (axios), Socket client
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker-compose.yml
```

---

## 🔐 Role Hierarchy

```
SUPER_ADMIN         ← Manual seed only. Cannot be created via API.
  └── HOSPITAL_ADMIN ← Requires SUPER_ADMIN approval
        └── MANAGER  ← Requires HOSPITAL_ADMIN approval
              └── USER (Donor / Requester)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas URI
- Cloudinary account

### 1. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in .env values
npm install
npm run seed       # Creates SUPER_ADMIN in DB
npm run dev        # Starts dev server on port 5000
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm start          # Starts dev server on port 3000
```

### 3. Docker (Production)

```bash
# Fill in backend/.env first
docker-compose up --build -d
```

---

## 🔑 Default SUPER_ADMIN Credentials (after seed)

```
Email:    superadmin@bloodlink.com
Password: SuperAdmin@123!
```

> ⚠️ **Change immediately in production!**

---

## 🌐 API Endpoints

### Auth
| Method | Route | Access |
|--------|-------|--------|
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| POST | /api/auth/refresh | Public |
| POST | /api/auth/logout | Authenticated |
| GET  | /api/auth/me | Authenticated |

### Admin
| Method | Route | Access |
|--------|-------|--------|
| GET    | /api/admin/pending-hospitals | SUPER_ADMIN |
| PATCH  | /api/admin/hospitals/:id/approval | SUPER_ADMIN |
| GET    | /api/admin/analytics | SUPER_ADMIN |
| GET    | /api/admin/audit-logs | SUPER_ADMIN |
| GET    | /api/admin/users | SUPER_ADMIN |
| PATCH  | /api/admin/users/:id/toggle-status | SUPER_ADMIN |
| GET    | /api/admin/pending-managers | SUPER_ADMIN, HOSPITAL_ADMIN |
| PATCH  | /api/admin/managers/:id/approval | SUPER_ADMIN, HOSPITAL_ADMIN |

### Donations
| Method | Route | Access |
|--------|-------|--------|
| POST   | /api/donations | Authenticated |
| GET    | /api/donations | HOSPITAL_ADMIN, MANAGER, SUPER_ADMIN |
| GET    | /api/donations/my | Authenticated |
| GET    | /api/donations/expiring | HOSPITAL_ADMIN, MANAGER, SUPER_ADMIN |
| GET    | /api/donations/:id | Authenticated |
| PATCH  | /api/donations/:id/approval | HOSPITAL_ADMIN, MANAGER, SUPER_ADMIN |

### Blood Requests
| Method | Route | Access |
|--------|-------|--------|
| POST   | /api/requests | Authenticated |
| GET    | /api/requests | Authenticated |
| GET    | /api/requests/my | Authenticated |
| GET    | /api/requests/:id | Authenticated |
| GET    | /api/requests/:id/donors | HOSPITAL_ADMIN, MANAGER, SUPER_ADMIN |
| PATCH  | /api/requests/:id/status | HOSPITAL_ADMIN, MANAGER, SUPER_ADMIN |

---

## 🔄 Real-Time Events (Socket.io)

| Event | Emitted When |
|-------|-------------|
| `new_blood_request` | New request created |
| `donation_approved` | Donation approved/rejected |
| `request_approved` | Request status updated |
| `shortage_alert` | Critical urgency request |
| `nearby_donor_alert` | Matched donor notified |
| `expiry_warning` | Donations expiring in 3 days |

All sockets require JWT authentication via `socket.handshake.auth.token`.

---

## 🩸 Blood Compatibility (Server-side Only)

| Blood Group | Can Receive From |
|-------------|-----------------|
| O- | O- |
| O+ | O+, O- |
| A- | A-, O- |
| A+ | A+, A-, O+, O- |
| B- | B-, O- |
| B+ | B+, B-, O+, O- |
| AB- | A-, B-, AB-, O- |
| AB+ | All (Universal Receiver) |
| O- | All (Universal Donor) |

---

## ⏰ Cron Jobs

| Job | Schedule | Action |
|-----|----------|--------|
| Expiry check | Daily midnight | Marks expired donations as EXPIRED |
| Expiry alert | Every 6 hours | Sends Socket alert for items expiring in 3 days |

---

## 🛡️ Security Features

- JWT Access + Refresh token pair
- Role validated from DB on every request (not from JWT payload alone)
- bcrypt password hashing (salt rounds: 12)
- Helmet.js secure headers
- Rate limiting (global + auth routes)
- express-mongo-sanitize (NoSQL injection prevention)
- Mass assignment protection (Joi validation, stripUnknown)
- File type + size validation (Multer)
- Audit logging for all sensitive actions (with IP + timestamp)
- Anti-privilege escalation middleware
- SUPER_ADMIN can only be seeded via script, never via API

---

## 📊 MongoDB Indexes

- `User`: email (unique), role, bloodGroup, location (2dsphere)
- `BloodDonation`: bloodGroup + status, location (2dsphere), donor, expiryDate
- `BloodRequest`: bloodGroup + status, location (2dsphere), urgency, requester
- `AuditLog`: performedBy, action, createdAt

---

## 🔧 Environment Variables

See `backend/.env.example` for full list. Key vars:

```env
MONGODB_URI=          # MongoDB Atlas connection string
JWT_ACCESS_SECRET=    # Min 64 chars
JWT_REFRESH_SECRET=   # Min 64 chars
CLOUDINARY_*=         # Cloudinary credentials
FRONTEND_URL=         # CORS origin
```
