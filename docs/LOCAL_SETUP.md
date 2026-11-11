# Workflow AI — Local Developer Setup Guide

This guide describes how to configure and run the Workflow AI monorepo on your local development workstation.

---

## 1. Prerequisites

- **Node.js**: `v22.x` (LTS) or later
- **npm**: `v10.x` or later
- **PostgreSQL**: `v18.x` running on `localhost:5432`

---

## 2. Environment Configuration

### 2.1 Backend API (`apps/api`)
Copy the template and verify your database connection URL:
```bash
cp apps/api/.env.example apps/api/.env
```
Default local configuration:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/workflow_ai_dev"
ALLOWED_ORIGINS="http://localhost:3000"
BETTER_AUTH_SECRET="dev_better_auth_secret_minimum_32_characters_long"
```

### 2.2 Frontend Web (`apps/web`)
```bash
cp apps/web/.env.example apps/web/.env
```
Default configuration:
```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## 3. Installation & Database Provisioning

### 3.1 Install Monorepo Dependencies
From the repository root:
```bash
npm install
```

### 3.2 Initialize the Database & Run Migrations
Run Prisma migrations to create the multi-tenant relational schema:
```bash
npm run db:migrate
```

### 3.3 Seed the Database
Populate the database with initial organizations, workspaces, projects, and workflow lanes:
```bash
npm run db:seed
```

---

## 4. Running the Development Servers

### 4.1 Run All Applications Simultaneously
```bash
npm run dev
```

### 4.2 Or Run Individual Services
- **Backend API (NestJS):**
  ```bash
  npm run dev:api
  ```
  Accessible at: `http://localhost:4000/api/v1`
  Swagger Documentation: `http://localhost:4000/api/docs`
  Health Check: `http://localhost:4000/api/v1/health/ready`

- **Frontend Client (Next.js):**
  ```bash
  npm run dev:web
  ```
  Accessible at: `http://localhost:3000`

---

## 5. Verification & Health Probes

Verify the backend and database connection:
```bash
curl http://localhost:4000/api/v1/health/ready
```
Expected response:
```json
{
  "status": "ok",
  "service": "@workflow-ai/api",
  "version": "0.1.0",
  "uptimeSeconds": 12,
  "timestamp": "2026-11-11T22:30:00.000Z",
  "checks": {
    "database": "up"
  }
}
```
