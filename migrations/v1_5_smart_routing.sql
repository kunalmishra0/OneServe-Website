-- 1. Add scheduled_date to processed_complaints
ALTER TABLE processed_complaints ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- 2. Helper function to map complaint category to staff role
CREATE OR REPLACE FUNCTION get_role_for_category(p_category text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE p_category
        WHEN 'Electricity' THEN 'Electrician'
        WHEN 'Sanitation' THEN 'Sanitation Worker'
        WHEN 'Road Maintenance' THEN 'Road Technician'
        WHEN 'Water Supply' THEN 'Water Technician'
        WHEN 'Drainage' THEN 'Drainage Worker'
        WHEN 'Street Lights' THEN 'Street Light Technician'
        WHEN 'Parks & Gardens' THEN 'Gardener'
        WHEN 'Traffic' THEN 'Traffic Warden'
        ELSE 'General Worker'
    END;
END;
$$;

-- 3. Update auto_assign_nearest_task to filter by matching category (role)
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
    v_role text;
    v_current_time time := CURRENT_TIME;
BEGIN
    -- Check if worker is available
    SELECT location, status, shift_start, shift_end, assignment_radius_km, role 
    INTO v_worker_loc, v_status, v_shift_start, v_shift_end, v_radius, v_role
    FROM staff WHERE id = p_worker_id;
    
    if v_status != 'available' then
         return json_build_object('success', false, 'message', 'Worker not available');
    end if;

    -- Check shift hours
    if v_current_time < v_shift_start OR v_current_time > v_shift_end then
        return json_build_object('success', false, 'message', 'Worker is currently outside of their defined shift hours');
    end if;
    
    -- Find nearest unassigned processed complaint matching the worker's role
    SELECT pg.id INTO v_nearest_complaint
    FROM processed_complaints pg
    JOIN raw_complaints rc ON pg.id = rc.id
    WHERE pg.staff_id IS NULL
      AND pg.complaint_status = 'verified'
      AND get_role_for_category(rc.category) = v_role
      AND ST_DWithin(rc.location, v_worker_loc, v_radius * 1000) -- km to meters
    ORDER BY rc.location <-> v_worker_loc ASC
    LIMIT 1;
    
    if v_nearest_complaint is null then
        return json_build_object('success', false, 'message', 'No tasks nearby for your assigned department/role');
    end if;
    
    -- Assign it
    UPDATE staff SET current_assignment_id = v_nearest_complaint, status = 'busy' WHERE id = p_worker_id;
    UPDATE processed_complaints SET staff_id = p_worker_id, complaint_status = 'in_progress' WHERE id = v_nearest_complaint;
    
    return json_build_object('success', true, 'complaint_id', v_nearest_complaint);
END;
$$;

-- 4. RPC to get bundle suggestions
CREATE OR REPLACE FUNCTION get_bundle_suggestions(p_complaint_id uuid, p_scheduled_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_target_loc geography;
    v_target_category text;
    v_suggestions json;
BEGIN
    -- Get the location and category of the target complaint
    SELECT rc.location, rc.category INTO v_target_loc, v_target_category
    FROM raw_complaints rc
    WHERE rc.id = p_complaint_id;

    if v_target_loc is null then
        return json_build_object('success', false, 'message', 'Complaint not found');
    end if;

    -- Find unassigned, verified complaints of the same category within 3km
    SELECT json_agg(
        json_build_object(
            'id', pg.id,
            'title', rc.title,
            'distance_meters', ST_Distance(rc.location, v_target_loc)
        )
    ) INTO v_suggestions
    FROM processed_complaints pg
    JOIN raw_complaints rc ON pg.id = rc.id
    WHERE pg.id != p_complaint_id
      AND pg.staff_id IS NULL
      AND pg.complaint_status = 'verified'
      AND rc.category = v_target_category
      AND ST_DWithin(rc.location, v_target_loc, 3000) -- 3km hardcoded clustering radius
      -- if it is already scheduled for another day, maybe don't suggest it? Actually if it's unassigned, it might not have a scheduled date, but we can bundle it.
      AND (pg.scheduled_date IS NULL OR pg.scheduled_date = p_scheduled_date);

    return json_build_object(
        'success', true, 
        'count', COALESCE(json_array_length(v_suggestions), 0),
        'suggestions', COALESCE(v_suggestions, '[]'::json)
    );
END;
$$;

-- 5. RPC to assign a bundle of tasks to a worker
CREATE OR REPLACE FUNCTION assign_task_bundle(p_worker_id uuid, p_complaint_ids uuid[], p_scheduled_date date)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the complaints
    UPDATE processed_complaints 
    SET staff_id = p_worker_id, 
        complaint_status = 'in_progress',
        scheduled_date = p_scheduled_date
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
