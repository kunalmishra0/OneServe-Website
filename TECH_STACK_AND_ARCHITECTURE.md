# OneServe - Technical Architecture & Stack

## 🏗️ Technology Stack

This application is built with a modern, performant stack designed for scalability and maintainability.

### **Frontend**

- **Core**: [React 18](https://react.dev/) (Library), [Vite](https://vitejs.dev/) (Build Tool).
- **Language**: [TypeScript](https://www.typescriptlang.org/) for strict type safety and developer productivity.
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) for rapid UI development and consistent design tokens.
- **Icons**: [Lucide React](https://lucide.dev/) for beautiful, customizable SVGs.
- **State Management**: React `useState`/`useEffect` hooks (Simplicity first) + Context API for Auth.
- **Routing**: View-based routing (Component switching) for a seamless SPA experience without full page reloads.

### **Backend & Database**

- **BaaS**: [Supabase](https://supabase.com/).
  - **PostgreSQL**: The core relational database.
  - **PostGIS**: Geospatial extension for location queries (nearest worker, radius search).
  - **Storage**: S3-compatible object storage for complaint images.
  - **Auth**: Handling secure user signup/login (Email/Password).

---

## 🏛️ 3-Layer Database Architecture

We implement a **Three-Layer Database Schema** to separate concerns, ensure data integrity, and provide granular security.

### 1. **Layer 1: Raw Submission (`raw_complaints`)**

- **Purpose**: To capture user data EXACTLY as it is submitted, without modification. This is the "Inbox".
- **Access**:
  - **Citizen**: INSERT only (Write-Once).
  - **Admin**: READ only.
  - **Staff**: None.
- **Key Fields**: `user_id`, `description`, `images` (Supabase URLs), `created_at`.
- **Location**: Precise User Location (`address_line_1`, `city`, `pincode`).

### 2. **Layer 2: Processed Metadata (`processed_complaints`)**

- **Purpose**: To store the _state_ and _analysis_ of the complaint. This is the "Admin's Notepad".
- **Relationship**: 1-to-1 with `raw_complaints` (Shared Primary Key `id`).
- **Access**:
  - **Citizen**: READ only (Status updates).
  - **Admin**: READ + UPDATE (Status changes, Priority assignment).
- **Key Fields**:
  - `status`: 'submitted', 'verified', 'resolved', 'rejected'.
  - `priority_score`: 0-10 (Float).
  - `admin_visible`: Boolean flag for critical alerts.
  - `ai_output`: JSON blob for AI analysis results.
- **Why Split?**
  1.  **Security**: Admins cannot accidentally edit the citizen's original report logic.
  2.  **Performance**: Fetching `processed_complaints` is lighter (no big text blobs/images).
  3.  **Auditability**: Comparing Layer 1 vs Layer 2 shows exactly what changed during processing.

### 3. **Layer 3: Workforce (`staff`)**

- **Purpose**: Managing the human resources required to solve the problem.
- **Relationship**: Can be assigned to 1 active complaint (FK `current_assignment_id`).
- **Access**:
  - **Admin**: FULL Control (See location, assign tasks).
  - **Public/Citizen**: NONE (Privacy protection).
- **Key Fields**:
  - `role`: 'Electrician', 'Sanitation Worker', etc.
  - `status`: 'available', 'busy', 'off_duty'.
  - `performance_rating`: 0-5 stars.
  - `location`: PostGIS `geography(POINT)` for real-time tracking (simulated).

---

## 🔐 Security Configuration (RLS)

We use Row Level Security (RLS) to enforce data privacy at the database engine level. Even if the frontend is compromised, the data remains safe.

### **Core Policies**

1.  **`profiles`**:
    - Users can only read/edit their own profile (`auth.uid() = id`).
2.  **`raw_complaints`**:
    - **Citizen**: Can `INSERT` their own rows. Can `SELECT` their own rows.
    - **Admin**: Can `SELECT` ALL rows. NO `UPDATE/DELETE`.
3.  **`processed_complaints`**:
    - **Citizen**: Can `SELECT` their own status (`user_id = auth.uid()`).
    - **Admin**: Can `SELECT` and `UPDATE` specific fields (Status, Priority).
4.  **`staff`**:
    - **Public**: NO ACCESS.
    - **Admin**: `SELECT`, `UPDATE` (Assign task), `INSERT` (New hire).
    - **Staff**: Can view their own record (Future scope).

---

## ⚡ Performance Optimizations

1.  **Database-Side Filtering**:
    - We do not fetch entire tables to the client. Staff lists and Complaints are filtered (`.eq()`, `.order()`) directly on the Supabase server to minimize payload size.
2.  **Lazy Loading**:
    - Images are loaded only when requested.
    - Dashboards fetch stats separately from heavy list data.
3.  **Indexing**:
    - `location` columns are indexed with GIST for fast spatial queries.
    - `user_id` columns are indexed for fast "My Complaints" lookups.
