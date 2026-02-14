# OneServe - Functional Documentation

This document provides a detailed overview of the functionality provided by the OneServe platform, broken down by user roles and modules.

## 👥 User Roles

The platform currently supports two distinct user roles:

1.  **Citizen**: The primary user who reports issues, pays bills, and engages with the community.
2.  **Admin (Official)**: Government or municipal officials who manage complaints, assign staff, and oversee operations.

---

## 🚀 Key Modules & Features

### 1. 📝 Complaint Registration (Citizen)

- **Objective**: Allow citizens to report civic issues (potholes, garbage, broken lights) quickly and accurately.
- **Workflow**:
  1.  User clicks "Register Complaint".
  2.  **Input Method**: User selects between "Text Description" or "Photo Evidence" (or both).
  3.  **Category Selection**: User chooses a category (Sanitation, Roads, Electricity, etc.) from a comprehensive list.
  4.  **Location**:
      - **Auto-Detect**: Uses browser GPS API to fetch current latitude/longitude (simulated in demo).
      - **Manual Entry**: User fills in Address Line 1, City, State, and Pincode.
  5.  **Evidence**: User uploads up to 4 images. These are securely stored in the cloud.
  6.  **Submission**:
      - The system acknowledges receipt.
      - **"AI" Analysis**: A background process (simulated) scans the complaint to assign a **Priority Score** (1-10) and checks for duplicates.
- **Key Tech**: Supabase Storage for images, Geolocation API.

### 2. 📊 Complaint Tracking (Citizen)

- **Objective**: Transparency for the user regarding their reported issues.
- **Workflow**:
  - Users see a list of their submitted complaints.
  - **Status Indicators**: submitted -> verifying -> in_progress -> resolved -> rejected.
  - **Details**: Users can click to see the assigned staff, current status, and admin notes.
  - **Filtering**: Filter by Status (Open, Closed) or Category.

### 3. 🛡️ Admin Dashboard (Official)

- **Objective**: Central command center for managing city operations.
- **Features**:
  - **Stats Overview**: Real-time counters for "Total Pending", "Resolved Today", and "Critical Areas".
  - **Complaint List**: A table view of all citizen complaints with sorting and filtering (by Priority, Status, City).
  - **Priority Highlighting**: High-priority issues (Score > 8) are visually highlighted in red.
  - **Status Management**: Admins can change status from "Submitted" to "Verified", "Resolved", etc.
  - **Evidence Review**: Admins can view the photos uploaded by citizens.

### 4. 👷 Staff & Resource Management (Admin)

- **Objective**: Assign real-world workforce to specific complaints.
- **Feature: Smart Assignment Modal**:
  - When an Admin clicks "Assign Work", a modal opens.
  - **Smart Filtering**: The system _automatically_ filters the staff list to show only workers matching the complaint's category (e.g., if the complaint is "Electricity", only "Electricians" are shown).
  - **Availability Check**: Workers are marked as "Available" or "Busy".
  - **Assignment**: Clicking a worker assigns them to the complaint and updates their status to "Busy" in the database.
  - **Performance Sorting**: Workers are sorted by their performance rating (Star Rating) to encourage efficiency.

### 5. 💳 Bill Payments (Citizen - Simulation)

- **Objective**: One-stop shop for utility payments.
- **Features**:
  - Aggregates Electricity, Water, and Gas bills.
  - Shows "Due Date" and "Amount".
  - **Payment Flow**: Simulated payment gateway (Razorpay/Stripe placeholder) that succeeds or fails for testing purposes.

### 6. 🏆 Gamification (Citizen)

- **Objective**: Encourage positive civic behavior.
- **Features**:
  - **Points System**: Users earn points for reporting valid issues or paying bills on time.
  - **Badges**: Awards like "Civic Hero", "Green Guardian".
  - **Leaderboard**: A community ranking to foster friendly competition.

---

## 🔒 Security & Privacy Features

- **Role-Based Access Control (RLS)**:
  - Citizens can ONLY view/edit their own data.
  - Admins can view all data but have restricted update permissions (cannot alter original citizen evidence).
  - Staff data is protected and only visible to Admins.
- **Data Minimization**:
  - Staff locations are not public.
  - Personal citizen data (phone/email in detailed profile) is protected.
