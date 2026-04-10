<<<<<<< HEAD
# Hostel-Grievance-Management-System
A web-based Hostel Grievance System that digitizes complaint management by enabling students to submit and track issues while providing administrators with an efficient dashboard for monitoring and resolution.
=======
# HostelFlow

HostelFlow is a role-based hostel grievance and management website built with Node.js, Express, MongoDB, and a static frontend served from the same application.

## Roles

- `student` can sign up, file complaints, request leave, and update profile details.
- `staff` can view only assigned complaints and update their status.
- `guard` can review leave requests and approve or reject them.
- `warden` can monitor all complaints, assign staff, and track leave activity.
- `chief` can view overdue complaints, override complaint state, and create admin-side users.

## Tech stack

- Backend: Express + Mongoose
- Frontend: HTML, CSS, vanilla JavaScript
- Database: MongoDB
- Password hashing: `bcryptjs`
- Deployment options: Node host, Docker, Render

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` to your MongoDB connection string.
3. Install dependencies:

```bash
npm install
```

4. Create the first chief user:

```bash
SEED_CHIEF_EMAIL=chief@example.com SEED_CHIEF_PASSWORD=ChangeMe123 npm run seed:chief
```

On Windows PowerShell:

```powershell
$env:SEED_CHIEF_EMAIL="chief@example.com"
$env:SEED_CHIEF_PASSWORD="ChangeMe123"
npm run seed:chief
```

5. Start the app:

```bash
npm start
```

## Deployment

### Render

- Use the included [render.yaml](./render.yaml)
- Set `MONGODB_URI` in the Render dashboard
- Optionally run the chief seed script once from a Render shell

### Docker

```bash
docker build -t hostelflow .
docker run -p 3000:3000 -e MONGODB_URI="your-uri" hostelflow
```

## Environment variables

- `PORT` optional app port
- `MONGODB_URI` Mongo connection string
- `NODE_ENV` set to `production` in deployed environments
- `SEED_CHIEF_NAME` optional initial chief name
- `SEED_CHIEF_EMAIL` required for chief seed script
- `SEED_CHIEF_PASSWORD` required for chief seed script

## Important MVP note

Authentication remains intentionally lightweight for this version. The frontend stores `userId` and `role` in `localStorage` and sends `x-user-id` on requests. This is suitable for MVP/demo use, but it is not secure enough for a production-grade public system without real sessions or token-based auth.
>>>>>>> a47c11c (Initial commit)
