-- ==============================================================================
-- PHASE 5: DUAL-FACTOR AUTONOMOUS PRIORITY ESCALATION ENGINE
-- Combines: (1) Elapsed Time / SLA Breaches + (2) Reporter Civic/Official VIP Tier
-- ==============================================================================

-- 1. Add Profession & Official Verification columns to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profession_tier text DEFAULT 'standard'
CHECK (profession_tier IN ('standard', 'civic_official', 'emergency_responder', 'executive_authority'));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS official_designation text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_official_verified boolean DEFAULT false;

-- 2. Ensure priority tracking columns exist on processed_complaints
ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS priority_level text DEFAULT 'low' 
CHECK (priority_level IN ('low', 'medium', 'high', 'critical'));

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS last_escalated_at timestamptz;

-- 3. Autonomous Escalation Stored Procedure (Dual-Factor Engine)
CREATE OR REPLACE FUNCTION auto_escalate_priorities_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count integer := 0;
    r RECORD;
    v_age_hours numeric;
    v_tier text;
    v_is_verified boolean;
    v_new_level text;
    v_base_score numeric;
BEGIN
    FOR r IN 
        SELECT 
            pc.id,
            pc.priority_level,
            pc.priority_score,
            rc.created_at,
            rc.user_id,
            COALESCE(p.profession_tier, 'standard') as profession_tier,
            COALESCE(p.is_official_verified, false) as is_official_verified,
            p.official_designation,
            p.department
        FROM processed_complaints pc
        JOIN raw_complaints rc ON rc.id = pc.id
        LEFT JOIN profiles p ON p.id = rc.user_id
        WHERE pc.complaint_status NOT IN ('resolved', 'rejected')
    LOOP
        v_age_hours := EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600;
        v_tier := r.profession_tier;
        v_new_level := r.priority_level;

        -- DUAL FACTOR EVALUATION:
        -- Rule 1: Executive Authority (Commissioner, Magistrate, Mayor, Councillor)
        IF v_tier = 'executive_authority' AND r.is_official_verified THEN
            IF v_age_hours >= 12 THEN
                v_new_level := 'critical';
            ELSE
                v_new_level := 'high';
            END IF;
            
        -- Rule 2: Emergency Responders (Police, Fire Brigade, Doctor/Hospital Head)
        ELSIF v_tier = 'emergency_responder' AND r.is_official_verified THEN
            IF v_age_hours >= 36 THEN
                v_new_level := 'critical';
            ELSIF v_age_hours >= 18 THEN
                v_new_level := 'high';
            ELSE
                v_new_level := CASE WHEN r.priority_level = 'low' THEN 'medium' ELSE r.priority_level END;
            END IF;

        -- Rule 3: Civic Officials (Municipal Inspector, Water/Roads Officer)
        ELSIF v_tier = 'civic_official' AND r.is_official_verified THEN
            IF v_age_hours >= 48 THEN
                v_new_level := 'critical';
            ELSIF v_age_hours >= 24 THEN
                v_new_level := 'high';
            ELSE
                v_new_level := CASE WHEN r.priority_level = 'low' THEN 'medium' ELSE r.priority_level END;
            END IF;

        -- Rule 4: Standard Citizens (Normal time-based escalation)
        ELSE
            IF v_age_hours >= 72 THEN
                v_new_level := 'critical';
            ELSIF v_age_hours >= 48 AND r.priority_level IN ('low', 'medium') THEN
                v_new_level := 'high';
            ELSIF v_age_hours >= 24 AND r.priority_level = 'low' THEN
                v_new_level := 'medium';
            END IF;
        END IF;

        -- If priority elevated, update DB and recalculate priority_score
        IF v_new_level != r.priority_level THEN
            v_base_score := CASE v_new_level
                WHEN 'critical' THEN 9.0
                WHEN 'high' THEN 7.5
                WHEN 'medium' THEN 5.0
                ELSE 3.0
            END;

            UPDATE processed_complaints
            SET 
                priority_level = v_new_level,
                priority_score = v_base_score,
                last_escalated_at = NOW()
            WHERE id = r.id;

            v_updated_count := v_updated_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'escalated_count', v_updated_count
    );
END;
$$;
