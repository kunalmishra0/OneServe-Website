# OneServe - Civic Services Platform

**OneServe** is a modern, comprehensive civic engagement platform designed for Indian cities. It connects citizens with their local government, streamlining everything from pothole reporting to utility bill payments.

## 📚 Documentation Index

For detailed information about specific aspects of the project, please refer to the following documents:

- **[Functionality Guide](FUNCTIONALITY.md)**: A complete walkthrough of the user flows for Citizens and Admins (Complaint Registration, Tracking, Staff Assignment).
- **[Technical Architecture](TECH_STACK_AND_ARCHITECTURE.md)**: Deep dive into the Tech Stack (React, Vite, Supabase), 3-Layer Database Design, and Security Policies.
- **[Database Schema](DATABASE_SCHEMA.md)**: The exact SQL structure of the tables, including the `raw_complaints`, `processed_complaints` layer, and the `staff` table.

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- Supabase Account (Free Tier)

### Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/your-username/oneserve.git
    cd oneserve
    ```

2.  **Install dependencies**:

    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory and add your Supabase credentials:

    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_KEY=your_supabase_anon_key
    ```

    _(Note: The app will fail to start if these are missing, for security reasons.)_

4.  **Run the Development Server**:

    ```bash
    npm run dev
    ```

5.  **Set up the Database**:
    - Run the migration scripts located in the `migrations/` folder in your Supabase SQL Editor.
    - Start with `supabase_3layer_migration.sql`, then `supabase_migration_v4_location_split.sql`.
    - Finally, run `supabase_security_fixes.sql` to secure the platform.

---

## ✨ Key Features At A Glance

- **For Citizens**:
  - 📝 **Smart Complaints**: Report issues with photos and auto-detected location.
  - 📊 **Live Tracking**: See exactly when your complaint moves from "Verifying" to "Resolved".
  - 🏆 **Gamification**: Earn points and badges ("Civic Hero") for being an active citizen.
  - 💳 **Bill Payments**: Pay electricity, water, and gas bills in one place.

- **For Admins**:
  - Dashboard with **Real-Time Stats**.
  - **"AI" Analysis** (Simulated) for priority scoring.
  - **Staff Management**: Assign specific workers (Electricians, Sanitation) to complaints with a single click.
  - **Geospatial Tracking**: View where staff are deployed (Simulated).

## 🛡️ Security

This project uses **Row Level Security (RLS)** to ensure data privacy. Citizens cannot see each other's private data, and staff locations are protected from public view.

---

Built with ❤️ for a better urban future.
