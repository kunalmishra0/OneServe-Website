# Database Schema Documentation (v3 - Optimized 3-Layer System)

This document reflects the current, optimized schema of the OneServe platform.

## 1. User Architecture (Table-per-Role)

We use a split architecture to separate authentication info from role-specific data.

### **A. `profiles` (Base Table)**

Stores the fundamental identity and role of the user. Linked 1:1 with `auth.users`.

| Column       | Type        | Description                    |
| :----------- | :---------- | :----------------------------- |
| `id`         | uuid        | PK, references `auth.users`.   |
| `email`      | text        | User email (synced from auth). |
| `role`       | text        | 'citizen' or 'admin'.          |
| `created_at` | timestamptz | Account creation time.         |

### **B. `citizens` (Extension Table)**

Stores additional information specific to citizens. Linked 1:1 with `profiles`.

| Column      | Type | Description                   |
| :---------- | :--- | :---------------------------- |
| `id`        | uuid | PK, references `profiles.id`. |
| `full_name` | text | Citizen's full name.          |
| `email`     | text | Citizen's email address.      |
| `phoneno`   | text | Contact number.               |
| `address`   | text | Street address (Manual).      |
| `city`      | text | City.                         |
| `state`     | text | State.                        |
| `pincode`   | text | Postal Code.                  |

---

## 2. Core Complaint Logic (The 3 Layers)

### **Layer 1: `raw_complaints` (Citizen Input)**

Stores the initial raw submission from the citizen. **Write-Once, Read-Many**.

| Column           | Type        | Description                         |
| :--------------- | :---------- | :---------------------------------- |
| `id`             | uuid        | PK, auto-generated.                 |
| `user_id`        | uuid        | FK to `citizens.id`.                |
| `title`          | text        | Short title.                        |
| `description`    | text        | Full issue details.                 |
| `category`       | text        | 'Sanitation', 'Roads', etc.         |
| `address_line_1` | text        | Specific Street Address.            |
| `address_line_2` | text        | Landmark / Area.                    |
| `city`           | text        | City.                               |
| `state`          | text        | State.                              |
| `pincode`        | text        | Pincode.                            |
| `images`         | text[]      | Array of **Supabase Storage URLs**. |
| `status`         | text        | 'pending_analysis' or 'processed'.  |
| `created_at`     | timestamptz | Submission Time.                    |

### **Layer 2: `processed_complaints` (Admin Metadata)**

Stores the _state_ and _analysis_ of the complaint. **Read/Write for Admins**.
Linked 1:1 with `raw_complaints`.

| Column             | Type    | Description                                      |
| :----------------- | :------ | :----------------------------------------------- |
| `id`               | uuid    | PK, FK references `raw_complaints.id`.           |
| `user_id`          | uuid    | FK to `citizens.id`.                             |
| `priority_score`   | float   | 0-10 (AI or Manual Assignment).                  |
| `admin_visible`    | boolean | True for critical issues.                        |
| `complaint_status` | text    | 'submitted', 'verified', 'resolved', 'rejected'. |
| `ai_analysis_json` | jsonb   | Full analysis report.                            |
| `updated_at`       | now()   | Last Status Change.                              |

### **Layer 3: `staff` (Workforce Management)**

Stores the active workforce. Managed strictly by Admins.

| Column                  | Type             | Description                              |
| :---------------------- | :--------------- | :--------------------------------------- |
| `id`                    | uuid             | PK.                                      |
| `full_name`             | text             | Staff Name.                              |
| `role`                  | text             | 'Electrician', 'Sanitation Worker', etc. |
| `assigned_zone`         | text             | Operational Area (e.g., 'Sector 15').    |
| `status`                | text             | 'available', 'busy', 'off_duty'.         |
| `current_assignment_id` | uuid             | FK to `raw_complaints.id` (Active Job).  |
| `contact_number`        | text             | Phone.                                   |
| `performance_rating`    | numeric(3, 1)    | 0.0 - 5.0 Stars.                         |
| `complaints_handled`    | integer          | Total resolved jobs.                     |
| `avatar_url`            | text             | Profile Picture.                         |
| `location`              | geography(POINT) | **Real-Time Coordinates** (via PostGIS). |

---

## 3. Storage Buckets

- **`complaints`**:
  - **Access**: Public Read (for dashboard), Authenticated Insert (for user).
  - **Path format**: `{user_id}/{complaint_id}/{filename}`
