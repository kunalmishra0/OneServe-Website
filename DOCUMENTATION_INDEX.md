# OneServe: Documentation Index

## Overview

OneServe is a modern civic services platform designed to bridge the gap between citizens and municipal authorities. It provides a seamless interface for complaining registration, tracking, bill payments, and gamified engagement.

## Key Documentation

### 1. Database Schema

- **File**: `DATABASE_SCHEMA.md`
- **Description**: Detailed overview of the 3-layer database architecture (Profiles, Citizens, Raw Complaints, Processed Complaints).

### 2. Frontend Architecture

- **Tech Stack**: React 18, Vite, TailwindCSS, Lucide Icons.
- **State Management**: Context API (`AuthContext.tsx`) for user sessions.
- **Routing**: React Router Dom v6 protected routes structure.

### 3. Core Modules & Features

#### A. Authentication

- **Files**: `src/app/pages/auth/LoginPage.tsx`, `SignupPage.tsx`, `AuthContext.tsx`
- **Features**:
  - Role-based login (Citizen vs Admin).
  - Secure profile creation with RLS policies.
  - Automatic session cleanup for deleted users.

#### B. Complaint Management

- **Files**:
  - `src/app/components/modules/ComplaintRegistration.tsx` (Layer 1 Input)
  - `src/app/components/modules/ComplaintTracking.tsx` (Layer 2 Output)
- **Features**:
  - Image upload to public storage.
  - Geolocation simulation (ready for API integration).
  - Real-time status updates via Supabase subscriptions.
  - Searchable dropdowns for Location/Category.

#### C. User Settings

- **File**: `src/app/pages/SettingsPage.tsx`
- **Features**:
  - Profile management (Full Name, Address, Contact).
  - Validated Indian phone number input.
  - Linked directly to `citizens` table.

#### D. Dashboards

- **Files**: `src/app/components/Dashboard.tsx` (Citizen), `src/app/components/modules/AdminDashboard.tsx` (Admin)
- **Features**:
  - Citizen: Aggregated stats (Active Complaints, Bills, Points), quick access to core services.
  - Admin: Full oversight of submitted complaints, analytics widgets, Manpower assignment module.

#### E. Email System (Backend)

- **Files**: `api/send-email.js`, `server.js`, `src/lib/otp.ts`, `src/lib/notifications.ts`
- **Features**:
  - Uses `nodemailer` to dispatch responsive HTML emails for OTP verification, staff assignments, and complaint receipts.
  - Vercel Serverless Function `/api` route automatically used in Production. Local Express server handles `npm run dev` environments.

## Deployment & Setup

### Prerequisites

- Node.js 18+
- Supabase Project (URL + Anon Key)
- Gmail account (with App Password configured for Nodemailer)

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` file for local development or Vercel production:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_KEY=your_anon_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
VITE_API_URL=http://localhost:5000  # For local development only
```

### Running Locally

```bash
# This starts both Vite and the Express Email server concurrently
npm run dev 
```

## Maintenance Notes

- **Supabase Policies**: Tables (`profiles`, `citizens`, `raw_complaints`, `storage.objects`) rely heavily on RLS. We leverage `SECURITY DEFINER` RPCs (e.g. `admin_update_complaint_status`, `citizen_delete_complaint`) to safely handle multi-table operations and bypass RLS correctly.
- **Image Storage**: Ensure 'complaints' bucket is public and allows authenticated uploads.

## Known Limitations / Future Work

- **Geolocation**: Currently simulated; requires integration with Google Maps API or OpenStreetMap.
- **Payment Gateway**: Bill payment is UI-only demo; backend integration needed.
