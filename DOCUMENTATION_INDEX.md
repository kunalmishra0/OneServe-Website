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

#### D. Dashboard

- **File**: `src/app/components/Dashboard.tsx`
- **Features**:
  - Aggregated stats (Active Complaints, Bills, Points).
  - Quick access to core services.

## Deployment & Setup

### Prerequisites

- Node.js 18+
- Supabase Project (URL + Anon Key)

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` file:

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_KEY=your_anon_key
```

### Running Locally

```bash
npm run dev
```

## Maintenance Notes

- **Supabase Policies**: All tables (`profiles`, `citizens`, `raw_complaints`, `storage.objects`) have RLS enabled. Refer to `supabase_3layer_migration.sql` for the latest policy definitions.
- **Image Storage**: Ensure 'complaints' bucket is public and allows authenticated uploads.

## Known Limitations / Future Work

- **Geolocation**: Currently simulated; requires integration with Google Maps API or OpenStreetMap.
- **Payment Gateway**: Bill payment is UI-only demo; backend integration needed.
- **Admin Panel**: Only Citizen view is fully implemented; Admin dashboard is next phase key deliverable.
