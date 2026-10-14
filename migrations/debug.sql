CREATE OR REPLACE FUNCTION dump_debug_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staff json;
    v_proc json;
BEGIN
    SELECT json_agg(json_build_object('id', id, 'name', full_name, 'auth', auth_user_id, 'curr_assign', current_assignment_id)) INTO v_staff FROM staff;
    SELECT json_agg(json_build_object('id', id, 'staff_id', staff_id, 'status', complaint_status)) INTO v_proc FROM processed_complaints;
    
    RETURN json_build_object('staff', v_staff, 'processed', v_proc);
END;
$$;
