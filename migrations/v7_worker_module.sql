-- 1. Update Profiles Table to support 'worker' role dynamically
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'profiles'::regclass 
        AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE profiles DROP CONSTRAINT ' || r.conname;
    END LOOP;
END $$;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('citizen', 'admin', 'worker'));

-- 2. Add fields to staff table
ALTER TABLE staff ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Add missing location column to processed_complaints
ALTER TABLE processed_complaints ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);


-- 3. RLS policies for Worker access
-- Allow workers to view their own staff record
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workers can view own staff record" ON staff;
CREATE POLICY "Workers can view own staff record" ON staff
  FOR SELECT USING (auth_user_id = auth.uid());

-- Allow admins full access to manage staff
DROP POLICY IF EXISTS "Admins have full access to staff" ON staff;
CREATE POLICY "Admins have full access to staff" ON staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- Allow workers to view all processed complaints (needed for dashboard)
DROP POLICY IF EXISTS "Workers can view all processed complaints" ON processed_complaints;
CREATE POLICY "Workers can view all processed complaints" ON processed_complaints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'worker')
  );

-- Allow workers to view raw complaint details
DROP POLICY IF EXISTS "Workers can view all raw complaints" ON raw_complaints;
CREATE POLICY "Workers can view all raw complaints" ON raw_complaints
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'worker')
  );

-- Allow workers to view citizen contact info (needed to call reporter)
DROP POLICY IF EXISTS "Workers can view all citizens" ON citizens;
CREATE POLICY "Workers can view all citizens" ON citizens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'worker')
  );

-- Enable real-time for staff table updates
ALTER TABLE staff REPLICA IDENTITY FULL;
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE staff;
COMMIT;


-- 2. Create Completed Complaints table
CREATE TABLE IF NOT EXISTS completed_complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    worker_id UUID REFERENCES staff(id) NOT NULL,
    complaint_id UUID REFERENCES raw_complaints(id) NOT NULL,
    image_url TEXT,
    notes TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and setup policies for completed_complaints
ALTER TABLE completed_complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all" ON completed_complaints;
CREATE POLICY "Enable read access for all" ON completed_complaints FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated workers" ON completed_complaints;
CREATE POLICY "Enable insert for authenticated workers" ON completed_complaints FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 3. RPC for worker_signup_with_code
CREATE OR REPLACE FUNCTION worker_signup_with_code(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_id uuid;
    v_auth_uid uuid := auth.uid();
BEGIN
    if v_auth_uid is null then
        return json_build_object('success', false, 'message', 'Not authenticated');
    end if;

    SELECT id INTO v_staff_id FROM staff WHERE invite_code = p_invite_code AND auth_user_id IS NULL;
    
    if v_staff_id is null then
        return json_build_object('success', false, 'message', 'Invalid or already used invite code');
    end if;

    UPDATE staff SET auth_user_id = v_auth_uid WHERE id = v_staff_id;
    
    -- Ensure profile role is worker
    INSERT INTO profiles (id, role) VALUES (v_auth_uid, 'worker')
    ON CONFLICT (id) DO UPDATE SET role = 'worker';

    return json_build_object('success', true, 'staff_id', v_staff_id);
END;
$$;

-- 4. Update processed_complaints to support pending_review status
ALTER TABLE processed_complaints DROP CONSTRAINT IF EXISTS processed_complaints_complaint_status_check;
ALTER TABLE processed_complaints ADD CONSTRAINT processed_complaints_complaint_status_check 
    CHECK (complaint_status IN ('submitted', 'verified', 'in_progress', 'pending_review', 'resolved', 'rejected'));

-- 5. RPC for worker_complete_task
CREATE OR REPLACE FUNCTION worker_complete_task(p_complaint_id uuid, p_image_url text, p_notes text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_id uuid;
BEGIN
    SELECT id INTO v_staff_id FROM staff WHERE auth_user_id = auth.uid() AND current_assignment_id = p_complaint_id;
    
    if v_staff_id is null then
        return false;
    end if;

    -- Insert into completed_complaints
    INSERT INTO completed_complaints (worker_id, complaint_id, image_url, notes)
    VALUES (v_staff_id, p_complaint_id, p_image_url, p_notes);

    -- Update staff to available
    UPDATE staff SET 
        current_assignment_id = null,
        status = 'available',
        complaints_handled = complaints_handled + 1
    WHERE id = v_staff_id;

    -- Update complaint status to pending_review
    UPDATE processed_complaints 
    SET complaint_status = 'pending_review'
    WHERE id = p_complaint_id;

    return true;
END;
$$;

-- 6. RPC for admin_verify_task (Approve/Reject work)
CREATE OR REPLACE FUNCTION admin_verify_task(p_complaint_id uuid, p_approved boolean, p_feedback text DEFAULT null)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role text;
BEGIN
    -- Check if caller is admin
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    if v_role != 'admin' then
        RAISE EXCEPTION 'Unauthorized: Only admins can verify tasks';
    end if;

    if p_approved then
        -- Finalize as resolved
        UPDATE processed_complaints 
        SET complaint_status = 'resolved'
        WHERE id = p_complaint_id;
    else
        -- Send back to verified for re-assignment
        UPDATE processed_complaints 
        SET complaint_status = 'verified'
        WHERE id = p_complaint_id;
    end if;

    -- Update feedback in completed_complaints
    UPDATE completed_complaints 
    SET feedback = p_feedback
    WHERE complaint_id = p_complaint_id
    AND completed_at = (SELECT MAX(completed_at) FROM completed_complaints WHERE complaint_id = p_complaint_id);

    return true;
END;
$$;

-- 5. RPC for auto_assign_nearest_task
CREATE OR REPLACE FUNCTION auto_assign_nearest_task(p_worker_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_worker_loc geography;
    v_nearest_complaint uuid;
    v_status text;
    v_shift_start time;
    v_shift_end time;
    v_radius integer;
    v_current_time time := CURRENT_TIME;
BEGIN
    -- Check if worker is available
    SELECT location, status, shift_start, shift_end, assignment_radius_km 
    INTO v_worker_loc, v_status, v_shift_start, v_shift_end, v_radius
    FROM staff WHERE id = p_worker_id;
    
    if v_status != 'available' then
         return json_build_object('success', false, 'message', 'Worker not available');
    end if;

    -- Check shift hours
    if v_current_time < v_shift_start OR v_current_time > v_shift_end then
        return json_build_object('success', false, 'message', 'Worker is currently outside of their defined shift hours');
    end if;
    
    -- Find nearest unassigned processed complaint
    SELECT pg.id INTO v_nearest_complaint
    FROM processed_complaints pg
    JOIN raw_complaints rc ON pg.id = rc.id
    WHERE pg.staff_id IS NULL
      AND pg.complaint_status = 'verified'
      AND ST_DWithin(rc.location, v_worker_loc, v_radius * 1000) -- km to meters
    ORDER BY rc.location <-> v_worker_loc ASC
    LIMIT 1;
    
    if v_nearest_complaint is null then
        return json_build_object('success', false, 'message', 'No tasks nearby');
    end if;
    
    -- Assign it
    UPDATE staff SET current_assignment_id = v_nearest_complaint, status = 'busy' WHERE id = p_worker_id;
    UPDATE processed_complaints SET staff_id = p_worker_id, complaint_status = 'in_progress' WHERE id = v_nearest_complaint;
    
    return json_build_object('success', true, 'complaint_id', v_nearest_complaint);
END;
$$;
