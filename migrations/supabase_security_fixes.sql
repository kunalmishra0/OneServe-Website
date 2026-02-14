-- ----------------------------------------------------
-- 1. CLEAN UP PROCESSED_COMPLAINTS (Remove Redundancy)
-- ----------------------------------------------------
-- We are removing columns that are already present in raw_complaints.
-- This prevents data inconsistency (e.g., if address changes in raw, it should reflect everywhere).

ALTER TABLE processed_complaints
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS category,
DROP COLUMN IF EXISTS address_line_1,
DROP COLUMN IF EXISTS address_line_2,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS pincode,
DROP COLUMN IF EXISTS images;

-- ----------------------------------------------------
-- 2. SECURE THE STAFF TABLE
-- ----------------------------------------------------

-- Drop insecure "allow all" policy if it exists
DROP POLICY IF EXISTS "Enable read access for all users" ON staff;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON staff;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON staff;

-- Policy: Admins can do everything on Staff table
CREATE POLICY "Admins can manage staff" ON staff
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policy: Staff members can view themselves
CREATE POLICY "Staff can view own record" ON staff
  FOR SELECT
  USING (
    -- Assuming we link staff to auth users eventually, but for now, 
    -- if staff are just records managed by admins, they might not need direct login yet.
    -- If staff DO log in, we'd need a user_id column in the staff table.
    -- For now, we will leave it as Admin-only management as per your schema.
    false 
  );

-- ----------------------------------------------------
-- 3. SECURE COMPLAINT UPDATES (Restricted Admin Access)
-- ----------------------------------------------------

-- Ensure Admins can ONLY update status/assignments, not raw data

-- A. Raw Complaints: READ ONLY for Admins (already set in previous migration, but reinforcing)
DROP POLICY IF EXISTS "Admins can update raw complaints" ON raw_complaints;
-- (No update policy created = No update allowed)

-- B. Processed Complaints: Admins can update specific metadata fields
-- Note: 'FOR UPDATE' policy checks constraints, but column-level security is harder in RLS.
-- We rely on the backend/logic or triggers to ensure data integrity, 
-- but RLS allows the row update if they are admin.

DROP POLICY IF EXISTS "Admins can all processed complaints" ON processed_complaints;

CREATE POLICY "Admins can view processed complaints" ON processed_complaints
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update processed complaints" ON processed_complaints
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
