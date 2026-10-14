-- ==============================================================================
-- PHASE 4: Priority System & Automated Time-Based Escalation
-- ==============================================================================

-- 1. Add priority_level and escalation tracking to processed_complaints
ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'low' 
CHECK (priority_level IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS last_escalated_at timestamptz;

-- 2. Automated Escalation Function (SECURITY DEFINER)
-- Scans all open / in-progress complaints and bumps priority level based on elapsed time:
--   Low    -> Medium   after 24 hours
--   Medium -> High     after 48 hours
--   High   -> Critical after 72 hours
CREATE OR REPLACE FUNCTION check_and_escalate_priorities()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer := 0;
    r RECORD;
    v_age_hours numeric;
    v_new_level text;
BEGIN
    FOR r IN 
        SELECT pc.id, pc.priority_level, rc.created_at
        FROM processed_complaints pc
        JOIN raw_complaints rc ON rc.id = pc.id
        WHERE pc.complaint_status NOT IN ('resolved', 'rejected')
    LOOP
        v_age_hours := EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600;
        v_new_level := r.priority_level;

        IF v_age_hours >= 72 AND r.priority_level != 'critical' THEN
            v_new_level := 'critical';
        ELSIF v_age_hours >= 48 AND r.priority_level IN ('low', 'medium') THEN
            v_new_level := 'high';
        ELSIF v_age_hours >= 24 AND r.priority_level = 'low' THEN
            v_new_level := 'medium';
        END IF;

        IF v_new_level != r.priority_level THEN
            UPDATE processed_complaints
            SET priority_level = v_new_level,
                last_escalated_at = NOW()
            WHERE id = r.id;

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;
