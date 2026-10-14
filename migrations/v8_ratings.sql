-- Phase 2: Citizen Ratings

-- 1. Add feedback column to completed_complaints (if not already there)
-- The v7 schema had rating and rating_feedback, but we will make sure.
ALTER TABLE completed_complaints ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE completed_complaints ADD COLUMN IF NOT EXISTS rating_feedback text;
ALTER TABLE completed_complaints ADD COLUMN IF NOT EXISTS rated_at timestamptz;

-- 2. RPC to submit a rating
CREATE OR REPLACE FUNCTION submit_rating(p_complaint_id uuid, p_rating integer, p_feedback text DEFAULT null)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_citizen_id uuid;
    v_worker_id uuid;
    v_current_rating integer;
    v_new_avg float;
BEGIN
    -- Verify the caller is the citizen who created the complaint
    SELECT user_id INTO v_citizen_id FROM raw_complaints WHERE id = p_complaint_id;
    
    if v_citizen_id != auth.uid() then
        return json_build_object('success', false, 'message', 'Unauthorized: You did not create this complaint');
    end if;

    -- Verify the complaint has been completed
    SELECT worker_id, rating INTO v_worker_id, v_current_rating 
    FROM completed_complaints 
    WHERE complaint_id = p_complaint_id;

    if v_worker_id is null then
        return json_build_object('success', false, 'message', 'Complaint has not been completed yet');
    end if;

    if v_current_rating is not null then
        return json_build_object('success', false, 'message', 'You have already rated this complaint');
    end if;

    -- Update the rating
    UPDATE completed_complaints
    SET rating = p_rating,
        rating_feedback = p_feedback,
        rated_at = now()
    WHERE complaint_id = p_complaint_id;

    -- Recalculate the worker's average performance rating
    SELECT COALESCE(AVG(rating), 0) INTO v_new_avg 
    FROM completed_complaints 
    WHERE worker_id = v_worker_id AND rating IS NOT NULL;

    UPDATE staff
    SET performance_rating = ROUND(v_new_avg::numeric, 1)
    WHERE id = v_worker_id;

    return json_build_object('success', true, 'new_average', ROUND(v_new_avg::numeric, 1));
END;
$$;
