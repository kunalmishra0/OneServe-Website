-- Phase 5: Realistic ETA System
-- 1. Add estimated_resolution to processed_complaints
ALTER TABLE processed_complaints ADD COLUMN IF NOT EXISTS estimated_resolution TIMESTAMPTZ;

-- 2. Add time_to_resolve_minutes to completed_complaints
ALTER TABLE completed_complaints ADD COLUMN IF NOT EXISTS time_to_resolve_minutes INTEGER;

-- 3. Update worker_complete_task to calculate time_to_resolve_minutes
CREATE OR REPLACE FUNCTION worker_complete_task(p_complaint_id uuid, p_image_url text, p_notes text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff_id uuid;
    v_assigned_at timestamptz;
    v_resolve_time_mins integer;
BEGIN
    -- Get staff and assignment time
    SELECT pc.staff_id, pc.updated_at INTO v_staff_id, v_assigned_at 
    FROM processed_complaints pc
    JOIN staff s ON s.id = pc.staff_id
    WHERE s.auth_user_id = auth.uid() 
      AND s.current_assignment_id = p_complaint_id
      AND pc.id = p_complaint_id;
    
    if v_staff_id is null then
        return false;
    end if;

    -- Calculate resolution time
    v_resolve_time_mins := EXTRACT(EPOCH FROM (NOW() - v_assigned_at)) / 60;

    -- Insert into completed_complaints
    INSERT INTO completed_complaints (worker_id, complaint_id, image_url, notes, time_to_resolve_minutes)
    VALUES (v_staff_id, p_complaint_id, p_image_url, p_notes, v_resolve_time_mins);

    -- Update staff to available
    UPDATE staff SET 
        current_assignment_id = null,
        status = 'available',
        complaints_handled = complaints_handled + 1
    WHERE id = v_staff_id;

    -- Update complaint status to pending_review
    UPDATE processed_complaints 
    SET complaint_status = 'pending_review',
        updated_at = NOW()
    WHERE id = p_complaint_id;

    return true;
END;
$$;

-- 4. Update assign_task_bundle to accept estimated_resolution
CREATE OR REPLACE FUNCTION assign_task_bundle(p_worker_id uuid, p_complaint_ids uuid[], p_scheduled_date date, p_estimated_resolution timestamptz DEFAULT null)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the complaints
    UPDATE processed_complaints 
    SET staff_id = p_worker_id, 
        complaint_status = 'in_progress',
        scheduled_date = p_scheduled_date,
        estimated_resolution = p_estimated_resolution
    WHERE id = ANY(p_complaint_ids);

    -- If the worker is currently available, set them to busy and set one task as current assignment (the first one)
    -- This handles making sure the worker's status is correct if they were idle.
    UPDATE staff 
    SET status = 'busy',
        current_assignment_id = COALESCE(current_assignment_id, p_complaint_ids[1])
    WHERE id = p_worker_id AND status = 'available';

    return true;
END;
$$;

