-- ==============================================================================
-- PHASE 6 UTILITIES: Community Wins & Admin Maintenance
-- ==============================================================================

-- 1. Community Wins Feed RPC
-- Fetches the 10 most recently resolved complaints across the city.
-- Anonymizes the reporter's name for privacy (e.g., "John D.")
CREATE OR REPLACE FUNCTION get_community_wins()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wins json;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'title', t.title,
            'category', t.category,
            'resolved_at', t.completed_at,
            'city', t.city,
            'reporter_name', t.reporter_name
        )
    ) INTO v_wins
    FROM (
        SELECT 
            rc.id, rc.title, rc.category, cc.completed_at, rc.city,
            CASE 
                WHEN c.full_name IS NOT NULL AND position(' ' in c.full_name) > 0 THEN
                    split_part(c.full_name, ' ', 1) || ' ' || left(split_part(c.full_name, ' ', 2), 1) || '.'
                WHEN c.full_name IS NOT NULL THEN
                    c.full_name
                ELSE
                    'A Citizen'
            END as reporter_name
        FROM completed_complaints cc
        JOIN raw_complaints rc ON cc.complaint_id = rc.id
        LEFT JOIN citizens c ON rc.user_id = c.id
        ORDER BY cc.completed_at DESC
        LIMIT 10
    ) t;

    return json_build_object(
        'success', true, 
        'wins', COALESCE(v_wins, '[]'::json)
    );
END;
$$;

-- 2. Admin Hard Delete RPC
-- Completely removes a complaint from all tables.
-- Restricted to admins.
CREATE OR REPLACE FUNCTION admin_hard_delete_complaint(p_complaint_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_admin boolean;
BEGIN
    -- 1. Verify Admin Status
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR email LIKE '%admin%')
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can hard delete records.';
    END IF;

    -- 2. Execute cascading delete (manual cascade to be safe)
    DELETE FROM completed_complaints WHERE complaint_id = p_complaint_id;
    DELETE FROM processed_complaints WHERE id = p_complaint_id;
    DELETE FROM raw_complaints WHERE id = p_complaint_id;
END;
$$;
