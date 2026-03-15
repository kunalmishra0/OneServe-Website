-- v6_security_and_sync_rpcs.sql
-- Contains latest functions for 100% backend synchronization and bypassing RLS limitations on complex operations

-- 1. Secure Assignment Update (Admin)
CREATE OR REPLACE FUNCTION public.admin_update_complaint_status(
    p_complaint_id UUID,
    p_new_status TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_admin_id UUID;
    v_role TEXT;
BEGIN
    v_admin_id := auth.uid();
    
    -- Verify caller is admin
    SELECT role INTO v_role FROM public.profiles WHERE id = v_admin_id;
    IF v_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can perform this action';
    END IF;

    -- Get original user_id
    SELECT user_id INTO v_user_id FROM public.raw_complaints WHERE id = p_complaint_id;

    -- Update Layer 1 (Raw Complaints): ONLY accepts 'pending_analysis' or 'processed' 
    UPDATE public.raw_complaints 
    SET status = 'processed' 
    WHERE id = p_complaint_id;

    -- Update or Insert Layer 2 (Processed Complaints)
    IF EXISTS (SELECT 1 FROM public.processed_complaints WHERE id = p_complaint_id) THEN
        UPDATE public.processed_complaints 
        SET complaint_status = p_new_status 
        WHERE id = p_complaint_id;
    ELSE
        INSERT INTO public.processed_complaints (id, user_id, complaint_status, priority_score, admin_visible)
        VALUES (p_complaint_id, v_user_id, p_new_status, 5, true);
    END IF;

END;
$$;


-- 2. Secure Complaint Deletion (Citizen)
CREATE OR REPLACE FUNCTION public.citizen_delete_complaint(
    p_complaint_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_complaint_owner UUID;
BEGIN
    v_user_id := auth.uid();
    
    SELECT user_id INTO v_complaint_owner FROM public.raw_complaints WHERE id = p_complaint_id;

    IF v_complaint_owner != v_user_id THEN
        RAISE EXCEPTION 'Unauthorized: You can only delete your own complaints';
    END IF;

    -- Safely detach Staff 
    UPDATE public.staff 
    SET current_assignment_id = NULL, status = 'available'
    WHERE current_assignment_id = p_complaint_id;

    DELETE FROM public.processed_complaints WHERE id = p_complaint_id;
    DELETE FROM public.raw_complaints WHERE id = p_complaint_id;

END;
$$;


-- 3. Secure Account Deletion (Self)
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
DECLARE
    user_id UUID;
BEGIN
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Nullify Staff Assignments
    UPDATE public.staff 
    SET current_assignment_id = NULL, status = 'available'
    WHERE current_assignment_id IN (
        SELECT id FROM public.raw_complaints WHERE user_id = user_id
    );

    -- Delete data
    DELETE FROM public.processed_complaints WHERE user_id = user_id;
    DELETE FROM public.raw_complaints WHERE user_id = user_id;
    DELETE FROM public.citizens WHERE id = user_id;
    DELETE FROM public.profiles WHERE id = user_id;
    
    DELETE FROM auth.users WHERE id = user_id;

END;
$$;
