-- Migration V5: Advanced Features
-- 1. Unique Complaint IDs (Ref IDs)
-- 2. Persistent Priority Escalation
-- 3. Geo-spatial Helpers

-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------
-- 1. UNIQUE COMPLAINT IDS (e.g. GAR-1234567)
-- ----------------------------------------------------

-- Add ref_id column to raw_complaints
ALTER TABLE raw_complaints ADD COLUMN IF NOT EXISTS ref_id TEXT UNIQUE;

-- Function to generate the Prefix based on Category
CREATE OR REPLACE FUNCTION get_complaint_prefix(cat TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN cat ILIKE 'Sanitation%' THEN 'SNT'
    WHEN cat ILIKE 'Road%' THEN 'ROD'
    WHEN cat ILIKE 'Water%' THEN 'WTR'
    WHEN cat ILIKE 'Electricity%' THEN 'ELE'
    WHEN cat ILIKE 'Drainage%' THEN 'DRN'
    WHEN cat ILIKE 'Street Lights%' THEN 'LGT'
    WHEN cat ILIKE 'Parks%' THEN 'PRK'
    WHEN cat ILIKE 'Traffic%' THEN 'TRF'
    ELSE 'GRB'
  END;
END;
$$ LANGUAGE plpgsql;

-- Trigger Function to auto-generate Ref ID
CREATE OR REPLACE FUNCTION generate_complaint_ref_id()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  rand_num TEXT;
  final_id TEXT;
  exists_id BOOLEAN;
BEGIN
  -- Only generate if ref_id is null
  IF NEW.ref_id IS NULL THEN
    prefix := get_complaint_prefix(NEW.category);
    
    LOOP
      -- Generate a 7 digit random number
      rand_num := LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0');
      final_id := prefix || '-' || rand_num;
      
      -- Check if it exists (highly unlikely but good practice)
      SELECT EXISTS(SELECT 1 FROM raw_complaints WHERE ref_id = final_id) INTO exists_id;
      EXIT WHEN NOT exists_id;
    END LOOP;
    
    NEW.ref_id := final_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create Trigger
DROP TRIGGER IF EXISTS trg_generate_ref_id ON raw_complaints;
CREATE TRIGGER trg_generate_ref_id
BEFORE INSERT ON raw_complaints
FOR EACH ROW EXECUTE FUNCTION generate_complaint_ref_id();

-- Backfill existing complaints (if any)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM raw_complaints WHERE ref_id IS NULL LOOP
        UPDATE raw_complaints SET ref_id = NULL WHERE id = r.id; -- Trigger will fire on update if we modify it, but we need to ensure trigger handles UPDATE or just run the logic manually.
        -- Actually, manual backfill:
        UPDATE raw_complaints 
        SET ref_id = get_complaint_prefix(category) || '-' || LPAD(FLOOR(RANDOM() * 10000000)::TEXT, 7, '0')
        WHERE id = r.id;
    END LOOP;
END $$;


-- ----------------------------------------------------
-- 2. PRIORITY ESCALATION SYSTEM
-- ----------------------------------------------------

-- Add base_priority_score and last_escalated_at to processed_complaints
ALTER TABLE processed_complaints ADD COLUMN IF NOT EXISTS base_priority_score FLOAT;
ALTER TABLE processed_complaints ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ DEFAULT NOW();

-- Function to escalate priority for all pending/verified/in_progress complaints
-- Formula: New Priority = MIN(10, Base_Score + (Hours_Elapsed * 0.1))
CREATE OR REPLACE FUNCTION escalate_complaint_priorities()
RETURNS VOID AS $$
BEGIN
  UPDATE processed_complaints
  SET priority_score = LEAST(10.0, base_priority_score + (EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 * 0.1)),
      last_escalated_at = NOW()
  WHERE complaint_status IN ('submitted', 'verified', 'in_progress');
END;
$$ LANGUAGE plpgsql;

-- Note: In a real Supabase environment, you would use pg_cron or an Edge Function to call this every hour.
-- For local dev/demo, we can also add a trigger that updates it whenever the row is VIEWED or UPDATED.


-- ----------------------------------------------------
-- 3. STAFF & ETA HELPERS
-- ----------------------------------------------------

-- Function to get distance between two points in meters
CREATE OR REPLACE FUNCTION get_distance(lat1 FLOAT, lon1 FLOAT, lat2 FLOAT, lon2 FLOAT)
RETURNS FLOAT AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql;
