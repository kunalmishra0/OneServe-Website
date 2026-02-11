# Database Schema Documentation (v2 - 3-Layer System)

=======

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
| `address`   | text | Street address.               |
| `city`      | text | City.                         |
| `state`     | text | State.                        |
| `pincode`   | text | Postal Code.                  |

### **C. `admins` (Extension Table)**

Stores additional information specific to administrators. Linked 1:1 with `profiles`.

| Column         | Type | Description                       |
| :------------- | :--- | :-------------------------------- |
| `id`           | uuid | PK, references `profiles.id`.     |
| `department`   | text | Admin department (e.g., 'Water'). |
| `badge_number` | text | Official ID.                      |

## 2. `raw_complaints` (Layer 1)

Stores the initial raw submission from the citizen.

| Column           | Type   | Description                         |
| :--------------- | :----- | :---------------------------------- |
| `id`             | uuid   | PK, auto-generated.                 |
| `user_id`        | uuid   | FK to `citizens.id`.                |
| `title`          | text   | Short title.                        |
| `description`    | text   | Full issue details.                 |
| `address_line_1` | text   | Street address Line 1.              |
| `address_line_2` | text   | Street address Line 2.              |
| `city`           | text   | City.                               |
| `state`          | text   | State.                              |
| `pincode`        | text   | Pincode.                            |
| `images`         | text[] | Array of **Supabase Storage URLs**. |
| `status`         | text   | 'pending_analysis' or 'processed'.  |

## 3. `processed_complaints` (Layer 2)

Stores AI-enriched data and Admin status. Linked 1:1 with `raw_complaints`.

| Column             | Type    | Description                                      |
| :----------------- | :------ | :----------------------------------------------- |
| `id`               | uuid    | PK, FK references `raw_complaints.id`.           |
| `user_id`          | uuid    | FK to `citizens.id`.                             |
| `address_line_1`   | text    | Copied from raw.                                 |
| `address_line_2`   | text    | Copied from raw.                                 |
| `city`             | text    | Copied from raw.                                 |
| `state`            | text    | Copied from raw.                                 |
| `pincode`          | text    | Copied from raw.                                 |
| `priority_score`   | float   | AI assigned score (0-10).                        |
| `admin_visible`    | boolean | True if AI approves visibility.                  |
| `complaint_status` | text    | 'submitted', 'verified', 'resolved', 'rejected'. |
| `ai_analysis_json` | jsonb   | Full AI output.                                  |

## Storage Buckets

- **`complaints`**: Public bucket for storing complaint images.
  - Path format: `{user_id}/{complaint_id}/{filename}`
