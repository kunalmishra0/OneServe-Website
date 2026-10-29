-- ==============================================================================
-- ONESERVE V2: MASTER 105-COMPLAINT & 26-WORKFORCE DEMO SEED SCRIPT
-- ==============================================================================
-- Run this in Supabase SQL Editor.
-- This script:
--   1. Adds dual-factor hierarchy columns to profiles
--   2. Ensures storage bucket & public policies for complaints
--   3. Deploys auto_escalate_priorities_v2() procedure
--   4. Seeds official authority profiles, citizen profiles, and 26 staff workers
--   5. Seeds exactly 105 realistic Faridabad complaints with 97 unique category images
--      (Rahul Sharma owns exactly 3 complaints: fresh, in-progress, resolved)
--   6. Deploys refresh_demo_complaints_timestamps() procedure
-- ==============================================================================

-- 1. EXTEND PROFILES & PROCESSED TABLES
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS profession_tier TEXT DEFAULT 'standard' 
CHECK (profession_tier IN ('standard', 'civic_official', 'emergency_responder', 'executive_authority'));

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS official_designation TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS department TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_official_verified BOOLEAN DEFAULT false;

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS sla_hours_remaining NUMERIC(5,1);

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS auto_escalation_reason TEXT;

ALTER TABLE processed_complaints 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. STORAGE BUCKET CONFIGURATION
INSERT INTO storage.buckets (id, name, public) 
VALUES ('complaints', 'complaints', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'complaints');
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'complaints');
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'complaints');

-- 3. AUTO-ESCALATE STORED PROCEDURE
CREATE OR REPLACE FUNCTION auto_escalate_priorities_v2()
RETURNS jsonb AS $$
DECLARE
    r RECORD;
    v_age_hours NUMERIC;
    v_new_level TEXT;
    v_new_score NUMERIC;
    v_reason TEXT;
    v_sla_rem NUMERIC;
    v_updated_count INT := 0;
BEGIN
    FOR r IN
        SELECT 
            pc.id,
            pc.priority_score,
            pc.priority_level,
            pc.complaint_status,
            rc.created_at,
            COALESCE(p.profession_tier, 'standard') as profession_tier,
            p.official_designation,
            p.department
        FROM processed_complaints pc
        JOIN raw_complaints rc ON pc.id = rc.id
        LEFT JOIN profiles p ON rc.user_id = p.id
        WHERE pc.complaint_status IN ('submitted', 'verified', 'in_progress', 'pending_review')
    LOOP
        v_age_hours := EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600;
        v_reason := NULL;
        v_sla_rem := NULL;

        -- Tier 1: Executive Authority
        IF r.profession_tier = 'executive_authority' THEN
            IF v_age_hours >= 12 THEN
                v_new_level := 'critical';
                v_new_score := 9.5;
                v_reason := 'Executive Authority grievance pending > 12h (Critical SLA breach)';
                v_sla_rem := 0.0;
            ELSE
                v_new_level := 'high';
                v_new_score := 8.0;
                v_reason := 'Official Grievance: ' || COALESCE(r.official_designation, 'Executive Authority');
                v_sla_rem := 12.0 - v_age_hours;
            END IF;

        -- Tier 2: Emergency Responder
        ELSIF r.profession_tier = 'emergency_responder' THEN
            IF v_age_hours >= 36 THEN
                v_new_level := 'critical';
                v_new_score := 9.0;
                v_reason := 'Emergency Responder issue unattended > 36h';
                v_sla_rem := 0.0;
            ELSIF v_age_hours >= 18 THEN
                v_new_level := 'high';
                v_new_score := 7.5;
                v_reason := 'Official Report: ' || COALESCE(r.official_designation, 'Emergency Responder');
                v_sla_rem := 36.0 - v_age_hours;
            ELSE
                v_new_level := 'medium';
                v_new_score := 5.5;
                v_reason := 'Fresh submission from Emergency Services';
                v_sla_rem := 18.0 - v_age_hours;
            END IF;

        -- Tier 3: Civic Official
        ELSIF r.profession_tier = 'civic_official' THEN
            IF v_age_hours >= 48 THEN
                v_new_level := 'critical';
                v_new_score := 8.5;
                v_reason := 'Civic inspection notice unattended > 48h';
                v_sla_rem := 0.0;
            ELSIF v_age_hours >= 24 THEN
                v_new_level := 'high';
                v_new_score := 7.0;
                v_reason := 'Notice from ' || COALESCE(r.department, 'Civic Official');
                v_sla_rem := 48.0 - v_age_hours;
            ELSE
                v_new_level := 'medium';
                v_new_score := 5.0;
                v_reason := 'Departmental notice under review';
                v_sla_rem := 24.0 - v_age_hours;
            END IF;

        -- Tier 4: Standard Citizen
        ELSE
            IF v_age_hours >= 72 THEN
                v_new_level := 'critical';
                v_new_score := 8.5;
                v_reason := 'Citizen complaint unattended > 72h (72h SLA breach)';
                v_sla_rem := 0.0;
            ELSIF v_age_hours >= 48 THEN
                v_new_level := 'high';
                v_new_score := 7.0;
                v_reason := 'Citizen complaint pending > 48h (Auto-escalated)';
                v_sla_rem := 72.0 - v_age_hours;
            ELSIF v_age_hours >= 24 THEN
                v_new_level := 'medium';
                v_new_score := 5.0;
                v_reason := 'Citizen complaint pending > 24h';
                v_sla_rem := 48.0 - v_age_hours;
            ELSE
                v_new_level := 'low';
                v_new_score := 3.0;
                v_reason := 'Fresh citizen submission (Standard queue)';
                v_sla_rem := 24.0 - v_age_hours;
            END IF;
        END IF;

        UPDATE processed_complaints
        SET 
            priority_level = v_new_level,
            priority_score = v_new_score,
            auto_escalation_reason = v_reason,
            sla_hours_remaining = GREATEST(0.0, ROUND(v_sla_rem, 1)),
            last_escalated_at = NOW(),
            updated_at = NOW()
        WHERE id = r.id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'records_evaluated', v_updated_count,
        'timestamp', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. INSERT / UPSERT PROFILES & OFFICIALS
DO $$
BEGIN

    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'commissioner@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Rajesh Khurana"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('e0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'joint.comm@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Smt. Meenakshi Lekhi"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('eb000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sho.sector16@hrypolice.gov.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Insp. Vikram Singh"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('eb000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'acp.traffic@hrypolice.gov.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"ACP Devender Kumar"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('eb000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'cmo.hospital@hryhealth.gov.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Dr. Anita Sengupta"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('ec000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'je.malik@pwdharyana.gov.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Er. Sandeep Malik"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('ec000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sdo.electric@dhbvn.gov.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Er. Kavita Sharma"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'citizen@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Rahul Sharma"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sunita.devi@gmail.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Sunita Devi"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'amit.saxena@outlook.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Amit Saxena"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'pooja.verma@yahoo.co.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Pooja Verma"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rajesh.gupta@gmail.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Rajesh Gupta"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'meena.k@gmail.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Meena Kumari"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'harish.c@gmail.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Harish Chandra"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'geeta.rani@gmail.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Geeta Rani"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'v.batra@gmail.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Vikram Batra"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('c0000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'deepak.joshi@gmail.com', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Deepak Joshi"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES 
      ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"MCF Admin"}', NOW(), NOW()),
      ('ba000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker.roads@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Amit Verma"}', NOW(), NOW()),
      ('ba000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker.sanitation@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Rajesh Kumar"}', NOW(), NOW()),
      ('ba000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'worker.electric@oneserve.in', crypt('demo1234', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Suresh Chand"}', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('e0000000-0000-0000-0000-000000000001', 'commissioner@oneserve.in', 'citizen', 'executive_authority', 'Municipal Commissioner', 'Municipal Corporation Faridabad', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('e0000000-0000-0000-0000-000000000001', 'Dr. Rajesh Khurana', 'commissioner@oneserve.in', '+91 98000 00000', 'Municipal Corporation Faridabad, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('e0000000-0000-0000-0000-000000000002', 'joint.comm@oneserve.in', 'citizen', 'executive_authority', 'Joint Municipal Commissioner', 'Municipal Corporation Faridabad', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('e0000000-0000-0000-0000-000000000002', 'Smt. Meenakshi Lekhi', 'joint.comm@oneserve.in', '+91 98000 00000', 'Municipal Corporation Faridabad, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('eb000000-0000-0000-0000-000000000001', 'sho.sector16@hrypolice.gov.in', 'citizen', 'emergency_responder', 'Station House Officer (SHO)', 'Haryana Police, Faridabad', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('eb000000-0000-0000-0000-000000000001', 'Insp. Vikram Singh', 'sho.sector16@hrypolice.gov.in', '+91 98000 00000', 'Haryana Police, Faridabad, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('eb000000-0000-0000-0000-000000000002', 'acp.traffic@hrypolice.gov.in', 'citizen', 'emergency_responder', 'Assistant Commissioner of Police (Traffic)', 'Faridabad Traffic Police', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('eb000000-0000-0000-0000-000000000002', 'ACP Devender Kumar', 'acp.traffic@hrypolice.gov.in', '+91 98000 00000', 'Faridabad Traffic Police, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('eb000000-0000-0000-0000-000000000003', 'cmo.hospital@hryhealth.gov.in', 'citizen', 'emergency_responder', 'Chief Medical Officer', 'District Civil Hospital, BK Chowk', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('eb000000-0000-0000-0000-000000000003', 'Dr. Anita Sengupta', 'cmo.hospital@hryhealth.gov.in', '+91 98000 00000', 'District Civil Hospital, BK Chowk, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('ec000000-0000-0000-0000-000000000001', 'je.malik@pwdharyana.gov.in', 'citizen', 'civic_official', 'Junior Engineer (Civil)', 'PWD Public Works Department', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('ec000000-0000-0000-0000-000000000001', 'Er. Sandeep Malik', 'je.malik@pwdharyana.gov.in', '+91 98000 00000', 'PWD Public Works Department, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, official_designation, department, is_official_verified)
    VALUES ('ec000000-0000-0000-0000-000000000002', 'sdo.electric@dhbvn.gov.in', 'citizen', 'civic_official', 'Sub-Divisional Officer', 'DHBVN Electricity Distribution', true)
    ON CONFLICT (id) DO UPDATE SET 
        profession_tier = EXCLUDED.profession_tier,
        official_designation = EXCLUDED.official_designation,
        department = EXCLUDED.department,
        is_official_verified = true;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('ec000000-0000-0000-0000-000000000002', 'Er. Kavita Sharma', 'sdo.electric@dhbvn.gov.in', '+91 98000 00000', 'DHBVN Electricity Distribution, Sector 12', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000001', 'citizen@oneserve.in', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000001', 'Rahul Sharma', 'citizen@oneserve.in', '+91 98110 24892', 'House #412, Main Road, Sector 15', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000002', 'sunita.devi@gmail.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000002', 'Sunita Devi', 'sunita.devi@gmail.com', '+91 98711 02938', 'Plot 45, Kheri Road, Old Faridabad', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000003', 'amit.saxena@outlook.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000003', 'Amit Saxena', 'amit.saxena@outlook.com', '+91 99102 38491', 'House 88, Sector 21C', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000004', 'pooja.verma@yahoo.co.in', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000004', 'Pooja Verma', 'pooja.verma@yahoo.co.in', '+91 98188 47291', 'Flat 12B, Grandeura, Sector 82', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000005', 'rajesh.gupta@gmail.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000005', 'Rajesh Gupta', 'rajesh.gupta@gmail.com', '+91 98103 91029', 'Shop 14, 1-2 Chowk, NIT 1', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000006', 'meena.k@gmail.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000006', 'Meena Kumari', 'meena.k@gmail.com', '+91 98119 28374', 'House 512, Chawla Colony, Ballabgarh', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000007', 'harish.c@gmail.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000007', 'Harish Chandra', 'harish.c@gmail.com', '+91 99110 92837', 'House 204, Sector 16', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000008', 'geeta.rani@gmail.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000008', 'Geeta Rani', 'geeta.rani@gmail.com', '+91 98101 82736', 'Pocket 3, Sector 15A', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000009', 'v.batra@gmail.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000009', 'Vikram Batra', 'v.batra@gmail.com', '+91 98182 73645', 'House 71, Sector 14', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role, profession_tier, is_official_verified)
    VALUES ('c0000000-0000-0000-0000-000000000010', 'deepak.joshi@gmail.com', 'citizen', 'standard', false)
    ON CONFLICT (id) DO UPDATE SET profession_tier = EXCLUDED.profession_tier;

    INSERT INTO citizens (id, full_name, email, phoneno, address, city, state, pincode)
    VALUES ('c0000000-0000-0000-0000-000000000010', 'Deepak Joshi', 'deepak.joshi@gmail.com', '+91 99104 82716', 'Lane 2, Badkhal Enclave', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  
    INSERT INTO profiles (id, email, role)
    VALUES 
        ('a0000000-0000-0000-0000-000000000001', 'admin@oneserve.in', 'admin'),
        ('ba000000-0000-0000-0000-000000000001', 'worker.roads@oneserve.in', 'worker'),
        ('ba000000-0000-0000-0000-000000000002', 'worker.sanitation@oneserve.in', 'worker'),
        ('ba000000-0000-0000-0000-000000000003', 'worker.electric@oneserve.in', 'worker')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000001', 'ba000000-0000-0000-0000-000000000001', '+91 98710 44321', 'Amit Verma', 'Road Technician', 'Sector 15 Hub', 'busy', 4.8, 42, 'ROAD15', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000002', NULL, '+91 98112 34567', 'Satish Bhardwaj', 'Street Light Technician', 'Sector 15 Hub', 'available', 4.9, 95, 'LGT15', ST_SetSRID(ST_MakePoint(77.3185, 28.404), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000003', NULL, '+91 98101 23456', 'Manoj Yadav', 'Water Supply Worker', 'Sector 16 Hub', 'available', 4.8, 54, 'WTR16', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000004', NULL, '+91 99105 67890', 'Vikas Nagar', 'Drainage Worker', 'Sector 14 Hub', 'busy', 4.7, 63, 'DRN14', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000005', NULL, '+91 98719 87654', 'Dharmender Singh', 'Gardener', 'Town Park Hub', 'available', 4.6, 29, 'PRK12', ST_SetSRID(ST_MakePoint(77.318, 28.3885), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000006', NULL, '+91 98111 22334', 'Brijesh Mishra', 'Electrician', 'MCF Headquarters', 'busy', 4.9, 112, 'EMG12', ST_SetSRID(ST_MakePoint(77.316, 28.3895), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000007', 'ba000000-0000-0000-0000-000000000002', '+91 98188 55920', 'Rajesh Kumar', 'Sanitation Worker', 'NIT Faridabad Hub', 'available', 4.9, 87, 'SANI01', ST_SetSRID(ST_MakePoint(77.2952, 28.3962), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000008', NULL, '+91 98102 33445', 'Sunil Khatri', 'Road Technician', 'NIT 1 Market Depot', 'available', 4.5, 38, 'ROAD01', ST_SetSRID(ST_MakePoint(77.2975, 28.398), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000009', NULL, '+91 99103 44556', 'Mohan Lal', 'Sanitation Worker', 'NIT 5 Hardware Chowk', 'busy', 4.8, 72, 'SANI05', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000010', NULL, '+91 98714 55667', 'Deepak Rawat', 'Drainage Worker', 'NIT 2 Industrial', 'available', 4.6, 41, 'DRN02', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000011', NULL, '+91 98115 66778', 'Ashok Gehlot', 'Street Light Technician', 'Neelam Flyover Post', 'available', 4.8, 41, 'TRF01', ST_SetSRID(ST_MakePoint(77.309, 28.4015), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000012', NULL, '+91 98116 77889', 'Mahesh Tyagi', 'Sanitation Worker', 'Badkhal Enclave Hub', 'available', 4.8, 63, 'SANI09', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000013', 'ba000000-0000-0000-0000-000000000003', '+91 99102 77123', 'Suresh Chand', 'Electrician', 'Old Faridabad Zone', 'busy', 4.7, 31, 'ELEC16', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000014', NULL, '+91 98717 88990', 'Kuldeep Singh', 'Electrician', 'Old Faridabad Kheri Gate', 'available', 4.7, 59, 'ELEC02', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000015', NULL, '+91 98118 99001', 'Naresh Sharma', 'Water Supply Worker', 'Old Faridabad Railway Rd', 'busy', 4.8, 68, 'WTR02', ST_SetSRID(ST_MakePoint(77.3125, 28.419), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000016', NULL, '+91 99109 00112', 'Praveen Tanwar', 'Sanitation Worker', 'Old Faridabad Grain Mkt', 'available', 4.9, 84, 'SANI02', ST_SetSRID(ST_MakePoint(77.3155, 28.426), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000017', NULL, '+91 98110 11223', 'Gopal Krishan', 'Street Light Technician', 'Sector 21C Central Hub', 'available', 4.9, 76, 'LGT21', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000018', NULL, '+91 98711 22334', 'Joginder Singh', 'Road Technician', 'Ballabgarh Bus Stand', 'available', 4.6, 35, 'ROAD04', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000019', NULL, '+91 98112 33445', 'Rameshwar Dayal', 'Sanitation Worker', 'Ballabgarh Chawla Colony', 'busy', 4.7, 49, 'SANI04', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000020', NULL, '+91 99113 44556', 'Anil Chauhan', 'Street Light Technician', 'Ballabgarh Main Chowk', 'available', 4.8, 52, 'LGT04', ST_SetSRID(ST_MakePoint(77.328, 28.335), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000021', NULL, '+91 98114 55667', 'Mukesh Kumar', 'Drainage Worker', 'Ballabgarh Mathura Road', 'available', 4.5, 28, 'DRN04', ST_SetSRID(ST_MakePoint(77.3265, 28.339), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000022', NULL, '+91 98715 66778', 'Devinder Pal', 'Road Technician', 'Sector 11 Mathura Road', 'available', 4.6, 34, 'ROAD11', ST_SetSRID(ST_MakePoint(77.322, 28.375), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000023', NULL, '+91 98116 77889', 'Ajay Tewatia', 'Water Supply Worker', 'Sector 82 Greater FBD', 'available', 4.7, 33, 'WTR82', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000024', NULL, '+91 99117 88990', 'Hemant Gurjar', 'Road Technician', 'Sector 86 BPTP Corridor', 'busy', 4.6, 27, 'ROAD86', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000025', NULL, '+91 98118 99001', 'Ravi Saini', 'Gardener', 'Sector 84 Green Belt', 'available', 4.8, 45, 'PRK84', ST_SetSRID(ST_MakePoint(77.358, 28.398), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
    INSERT INTO staff (id, auth_user_id, contact_number, full_name, role, assigned_zone, status, performance_rating, complaints_handled, invite_code, location)
    VALUES ('da000000-0000-0000-0000-000000000026', NULL, '+91 98719 00112', 'Suraj Bhan', 'Drainage Worker', 'Sector 28 Metro Station', 'busy', 4.7, 58, 'DRN28', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326))
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        assigned_zone = EXCLUDED.assigned_zone,
        status = EXCLUDED.status,
        performance_rating = EXCLUDED.performance_rating,
        complaints_handled = EXCLUDED.complaints_handled,
        location = EXCLUDED.location;
  
END $$;

-- 5. SEED 105 REALISTIC COMPLAINTS
-- Clean out old demo raw_complaints and child records to ensure pure state
UPDATE staff SET current_assignment_id = NULL;
DELETE FROM completed_complaints;
DELETE FROM processed_complaints;
DELETE FROM raw_complaints;

DO $$
DECLARE
    v_c_id UUID;
    v_u_id UUID;
    v_ref TEXT;
BEGIN

    -- Rahul Sharma Demo Complaint 1: Fresh submission in Sec 15
    v_c_id := 'c1000000-0000-0000-0000-000000000001';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-3819201', 'c0000000-0000-0000-0000-000000000001', 'Hazardous asphalt crater on Sector 15 Market Main Road', 'Deep road crater developing near commercial entrance causing tyre damage.', 'Road Maintenance', 'Sector 15 Market Main Road', 'Near Community Centre', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.3190, 28.4024), 4326), ARRAY[]::text[], 'pending_analysis', NOW() - interval '2 hours');
    
    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000001', NULL, 3.0, 'low', 'submitted', ST_SetSRID(ST_MakePoint(77.3190, 28.4024), 4326));

    -- Rahul Sharma Demo Complaint 2: In-Progress assigned to Amit Verma (Worker 1)
    v_c_id := 'c1000000-0000-0000-0000-000000000002';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-5019283', 'c0000000-0000-0000-0000-000000000001', 'Street light pole short circuit outside Lane 4', 'Pole sparking during evening hours, fixture not lighting street.', 'Street Lights', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.3180, 28.4045), 4326), ARRAY[]::text[], 'processed', NOW() - interval '18 hours');
    
    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000001', 5.0, 'medium', 'in_progress', ST_SetSRID(ST_MakePoint(77.3180, 28.4045), 4326));

    -- Rahul Sharma Demo Complaint 3: Resolved with proof and ready for rating
    v_c_id := 'c1000000-0000-0000-0000-000000000003';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-6192048', 'c0000000-0000-0000-0000-000000000001', 'Uncollected garbage heap cleared outside Pocket B Park', 'Bulk waste accumulation cleared by municipal tractor crew.', 'Sanitation', 'Pocket B Residential Park', 'Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.3175, 28.4030), 4326), ARRAY[]::text[], 'processed', NOW() - interval '24 hours');
    
    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000007', 4.0, 'low', 'resolved', ST_SetSRID(ST_MakePoint(77.3175, 28.4030), 4326));

    INSERT INTO completed_complaints (id, complaint_id, worker_id, image_url, notes, time_to_resolve_minutes, rating, rating_feedback, rated_at, completed_at)
    VALUES (gen_random_uuid(), v_c_id, 'da000000-0000-0000-0000-000000000007', NULL, 'Cleared using hydraulic compactor truck. Bleaching powder sprayed.', 85, 5, 'Quick response, park entrance is clean now!', NOW() - interval '2 hours', NOW() - interval '2 hours');

    v_c_id := 'c1000000-0000-0000-0000-000000000004';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1000548', 'e0000000-0000-0000-0000-000000000001', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 15', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Main Market Road', 'Near Community Centre, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'e0000000-0000-0000-0000-000000000001', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000005';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1000685', 'e0000000-0000-0000-0000-000000000002', 'Illegal construction demolition waste dumped on roadside in Sector 15', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326), ARRAY[]::text[], 'processed', NOW() - interval '6 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'e0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000006';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1000822', 'eb000000-0000-0000-0000-000000000001', 'Burnt residential distribution meter box emitting smoke in Sector 15A', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Club Road', 'Opposite Gymkhana Club, Sector 15A', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326), ARRAY[]::text[], 'processed', NOW() - interval '22 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'eb000000-0000-0000-0000-000000000001', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000007';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1000959', 'eb000000-0000-0000-0000-000000000002', 'Flickering high-mast lamp pole at commercial junction in Sector 16', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Sector 16 Main Market', 'Opposite Metro Pillar 582, Sector 16', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326), ARRAY[]::text[], 'processed', NOW() - interval '10 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'eb000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000008';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1001096', 'eb000000-0000-0000-0000-000000000003', 'Stagnant stormwater breeding mosquitoes outside primary school in Sector 16A', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Nehru Ground Road', 'Near Magpie Tourist Complex, Sector 16A', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '22 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'eb000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000009';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1001233', 'ec000000-0000-0000-0000-000000000001', 'Broken municipal pipeline valve leaking thousands of liters in NIT 1', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Block B, 1-2 Chowk', 'Near Central Market, NIT 1', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326), ARRAY[]::text[], 'processed', NOW() - interval '8 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'ec000000-0000-0000-0000-000000000001', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000010';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1001370', 'ec000000-0000-0000-0000-000000000002', 'Wild weeds and thorny brush covering children play area in NIT 2', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Industrial Area Pocket 4', 'Near ESI Hospital Road, NIT 2', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'ec000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000011';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1001507', 'e0000000-0000-0000-0000-000000000001', 'Missing directional signage at flyover divergence point in NIT 3', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'DAV College Road', 'Near Gate No. 2, NIT 3', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326), ARRAY[]::text[], 'processed', NOW() - interval '6 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'e0000000-0000-0000-0000-000000000001', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000012';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1001644', 'e0000000-0000-0000-0000-000000000002', 'Hazardous asphalt crater causing vehicle bottoming out in NIT 5', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Hardware Chowk', 'Near Bus Stand Post, NIT 5', 'Faridabad', 'Haryana', '121005', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'e0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000013';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1001781', 'eb000000-0000-0000-0000-000000000001', 'Illegal construction demolition waste dumped on roadside in Badkhal', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Badkhal Lake Road', 'Near Tourist Resort Gate, Badkhal', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326), ARRAY[]::text[], 'processed', NOW() - interval '10 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'eb000000-0000-0000-0000-000000000001', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000014';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1001918', 'eb000000-0000-0000-0000-000000000002', 'Exposed live joint box at pedestrian foot level in Old Faridabad', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Railway Road', 'Near Railway Station Platform 1, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326), ARRAY[]::text[], 'processed', NOW() - interval '22 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'eb000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000015';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1002055', 'eb000000-0000-0000-0000-000000000003', 'Damaged lamp housing after heavy wind storm in Old Faridabad', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Kheri Gate Chowk', 'Main Grain Market, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326), ARRAY[]::text[], 'processed', NOW() - interval '10 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'eb000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000016';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1002192', 'ec000000-0000-0000-0000-000000000001', 'Stormwater drain completely choked with silt and plastic in Old Faridabad', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Barahi Talao Road', 'Near Old Tehsil Office, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'ec000000-0000-0000-0000-000000000001', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000017';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1002329', 'ec000000-0000-0000-0000-000000000002', 'Severely contaminated murky brown tap water with foul odor in Sector 14', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Main HUDA Market', 'Near DPS Sector 14, Sector 14', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '8 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'ec000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000018';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1002466', 'c0000000-0000-0000-0000-000000000002', 'Dry fallen tree branch hanging over morning walking track in Sector 21C', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Block E Central Road', 'Near SRS Cinema, Sector 21C', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000019';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1002603', 'c0000000-0000-0000-0000-000000000003', 'Missing directional signage at flyover divergence point in Sector 28', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Mathura Road Service Lane', 'Near Sector 28 Metro Station, Sector 28', 'Faridabad', 'Haryana', '121008', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000020';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1002740', 'c0000000-0000-0000-0000-000000000004', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 82', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'BPTP Park Grandeura Outer', 'Near Master Road, Sector 82', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000021';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1002877', 'c0000000-0000-0000-0000-000000000005', 'Illegal construction demolition waste dumped on roadside in Sector 86', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Omaxe Heights Connector', 'Near Nahar Singh Palace Road, Sector 86', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000022';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1003014', 'c0000000-0000-0000-0000-000000000006', 'Bent utility pole leaning dangerously over roadway in Ballabgarh', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Main Mathura Highway', 'Near Ballabgarh Bus Terminal, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000023';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1003151', 'c0000000-0000-0000-0000-000000000007', 'Broken sodium vapor fixture hanging precariously from pole in Ballabgarh', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Chawla Colony Main Market', 'Near Arya Samaj Mandir, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000024';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1003288', 'c0000000-0000-0000-0000-000000000008', 'Damaged culvert grating allowing debris to block outflow in Sector 15', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Main Market Road', 'Near Community Centre, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000025';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1003425', 'c0000000-0000-0000-0000-000000000009', 'Sub-surface supply line leak weakening building foundation in Sector 15', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000026';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1003562', 'c0000000-0000-0000-0000-000000000010', 'Damaged chain-link fencing allowing stray cattle into park in Sector 15A', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Club Road', 'Opposite Gymkhana Club, Sector 15A', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000027';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1003699', 'c0000000-0000-0000-0000-000000000002', 'Missing directional signage at flyover divergence point in Sector 16', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Sector 16 Main Market', 'Opposite Metro Pillar 582, Sector 16', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000028';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1003836', 'c0000000-0000-0000-0000-000000000003', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 16A', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Nehru Ground Road', 'Near Magpie Tourist Complex, Sector 16A', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000029';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1003973', 'c0000000-0000-0000-0000-000000000004', 'Illegal construction demolition waste dumped on roadside in NIT 1', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Block B, 1-2 Chowk', 'Near Central Market, NIT 1', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000030';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1004110', 'c0000000-0000-0000-0000-000000000005', 'Frequent voltage surges tripping residential feeder lines in NIT 2', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Industrial Area Pocket 4', 'Near ESI Hospital Road, NIT 2', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000031';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1004247', 'c0000000-0000-0000-0000-000000000006', 'Flickering high-mast lamp pole at commercial junction in NIT 3', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'DAV College Road', 'Near Gate No. 2, NIT 3', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000032';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1004384', 'c0000000-0000-0000-0000-000000000007', 'Stagnant stormwater breeding mosquitoes outside primary school in NIT 5', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Hardware Chowk', 'Near Bus Stand Post, NIT 5', 'Faridabad', 'Haryana', '121005', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000033';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1004521', 'c0000000-0000-0000-0000-000000000008', 'Broken municipal pipeline valve leaking thousands of liters in Badkhal', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Badkhal Lake Road', 'Near Tourist Resort Gate, Badkhal', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000034';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1004658', 'c0000000-0000-0000-0000-000000000009', 'Broken concrete park benches with exposed sharp rebar in Old Faridabad', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Railway Road', 'Near Railway Station Platform 1, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000035';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1004795', 'c0000000-0000-0000-0000-000000000010', 'Missing directional signage at flyover divergence point in Old Faridabad', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Kheri Gate Chowk', 'Main Grain Market, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000036';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1004932', 'c0000000-0000-0000-0000-000000000002', 'Hazardous asphalt crater causing vehicle bottoming out in Old Faridabad', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Barahi Talao Road', 'Near Old Tehsil Office, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000037';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1005069', 'c0000000-0000-0000-0000-000000000003', 'Illegal construction demolition waste dumped on roadside in Sector 14', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Main HUDA Market', 'Near DPS Sector 14, Sector 14', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000038';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1005206', 'c0000000-0000-0000-0000-000000000004', 'Uncovered distribution feeder pillar in children play area in Sector 21C', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Block E Central Road', 'Near SRS Cinema, Sector 21C', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000039';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1005343', 'c0000000-0000-0000-0000-000000000005', 'Damaged lamp housing after heavy wind storm in Sector 28', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Mathura Road Service Lane', 'Near Sector 28 Metro Station, Sector 28', 'Faridabad', 'Haryana', '121008', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000040';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1005480', 'c0000000-0000-0000-0000-000000000006', 'Stormwater drain completely choked with silt and plastic in Sector 82', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'BPTP Park Grandeura Outer', 'Near Master Road, Sector 82', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000041';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1005617', 'c0000000-0000-0000-0000-000000000007', 'Severely contaminated murky brown tap water with foul odor in Sector 86', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Omaxe Heights Connector', 'Near Nahar Singh Palace Road, Sector 86', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000042';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1005754', 'c0000000-0000-0000-0000-000000000008', 'Broken children swing set posing injury hazard in Ballabgarh', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Main Mathura Highway', 'Near Ballabgarh Bus Terminal, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000043';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1005891', 'c0000000-0000-0000-0000-000000000009', 'Missing directional signage at flyover divergence point in Ballabgarh', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Chawla Colony Main Market', 'Near Arya Samaj Mandir, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000044';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1006028', 'c0000000-0000-0000-0000-000000000010', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 15', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Main Market Road', 'Near Community Centre, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000045';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1006165', 'c0000000-0000-0000-0000-000000000002', 'Illegal construction demolition waste dumped on roadside in Sector 15', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000046';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1006302', 'c0000000-0000-0000-0000-000000000003', 'High-tension overhead cable sagging below safety clearance in Sector 15A', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Club Road', 'Opposite Gymkhana Club, Sector 15A', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000047';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1006439', 'c0000000-0000-0000-0000-000000000004', 'Broken sodium vapor fixture hanging precariously from pole in Sector 16', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Sector 16 Main Market', 'Opposite Metro Pillar 582, Sector 16', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000048';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1006576', 'c0000000-0000-0000-0000-000000000005', 'Damaged culvert grating allowing debris to block outflow in Sector 16A', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Nehru Ground Road', 'Near Magpie Tourist Complex, Sector 16A', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000049';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1006713', 'c0000000-0000-0000-0000-000000000006', 'Sub-surface supply line leak weakening building foundation in NIT 1', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Block B, 1-2 Chowk', 'Near Central Market, NIT 1', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000050';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1006850', 'c0000000-0000-0000-0000-000000000007', 'Wild weeds and thorny brush covering children play area in NIT 2', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Industrial Area Pocket 4', 'Near ESI Hospital Road, NIT 2', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000051';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1006987', 'c0000000-0000-0000-0000-000000000008', 'Missing directional signage at flyover divergence point in NIT 3', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'DAV College Road', 'Near Gate No. 2, NIT 3', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000052';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1007124', 'c0000000-0000-0000-0000-000000000009', 'Hazardous asphalt crater causing vehicle bottoming out in NIT 5', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Hardware Chowk', 'Near Bus Stand Post, NIT 5', 'Faridabad', 'Haryana', '121005', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000053';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1007261', 'c0000000-0000-0000-0000-000000000010', 'Illegal construction demolition waste dumped on roadside in Badkhal', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Badkhal Lake Road', 'Near Tourist Resort Gate, Badkhal', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000054';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1007398', 'c0000000-0000-0000-0000-000000000002', 'Sparking transformer casing with loud electrical buzzing in Old Faridabad', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Railway Road', 'Near Railway Station Platform 1, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000055';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1007535', 'c0000000-0000-0000-0000-000000000003', 'Flickering high-mast lamp pole at commercial junction in Old Faridabad', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Kheri Gate Chowk', 'Main Grain Market, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000056';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1007672', 'c0000000-0000-0000-0000-000000000004', 'Stagnant stormwater breeding mosquitoes outside primary school in Old Faridabad', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Barahi Talao Road', 'Near Old Tehsil Office, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000057';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1007809', 'c0000000-0000-0000-0000-000000000005', 'Broken municipal pipeline valve leaking thousands of liters in Sector 14', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Main HUDA Market', 'Near DPS Sector 14, Sector 14', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000058';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1007946', 'c0000000-0000-0000-0000-000000000006', 'Dry fallen tree branch hanging over morning walking track in Sector 21C', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Block E Central Road', 'Near SRS Cinema, Sector 21C', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000059';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1008083', 'c0000000-0000-0000-0000-000000000007', 'Missing directional signage at flyover divergence point in Sector 28', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Mathura Road Service Lane', 'Near Sector 28 Metro Station, Sector 28', 'Faridabad', 'Haryana', '121008', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000060';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1008220', 'c0000000-0000-0000-0000-000000000008', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 82', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'BPTP Park Grandeura Outer', 'Near Master Road, Sector 82', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000061';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1008357', 'c0000000-0000-0000-0000-000000000009', 'Illegal construction demolition waste dumped on roadside in Sector 86', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Omaxe Heights Connector', 'Near Nahar Singh Palace Road, Sector 86', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000062';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1008494', 'c0000000-0000-0000-0000-000000000010', 'Burnt residential distribution meter box emitting smoke in Ballabgarh', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Main Mathura Highway', 'Near Ballabgarh Bus Terminal, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000063';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1008631', 'c0000000-0000-0000-0000-000000000002', 'Damaged lamp housing after heavy wind storm in Ballabgarh', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Chawla Colony Main Market', 'Near Arya Samaj Mandir, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000064';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1008768', 'c0000000-0000-0000-0000-000000000003', 'Stormwater drain completely choked with silt and plastic in Sector 15', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Main Market Road', 'Near Community Centre, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000065';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1008905', 'c0000000-0000-0000-0000-000000000004', 'Severely contaminated murky brown tap water with foul odor in Sector 15', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000066';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1009042', 'c0000000-0000-0000-0000-000000000005', 'Damaged chain-link fencing allowing stray cattle into park in Sector 15A', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Club Road', 'Opposite Gymkhana Club, Sector 15A', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000067';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1009179', 'c0000000-0000-0000-0000-000000000006', 'Missing directional signage at flyover divergence point in Sector 16', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Sector 16 Main Market', 'Opposite Metro Pillar 582, Sector 16', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000068';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1009316', 'c0000000-0000-0000-0000-000000000007', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 16A', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Nehru Ground Road', 'Near Magpie Tourist Complex, Sector 16A', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000069';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1009453', 'c0000000-0000-0000-0000-000000000008', 'Illegal construction demolition waste dumped on roadside in NIT 1', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Block B, 1-2 Chowk', 'Near Central Market, NIT 1', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000070';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1009590', 'c0000000-0000-0000-0000-000000000009', 'Exposed live joint box at pedestrian foot level in NIT 2', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Industrial Area Pocket 4', 'Near ESI Hospital Road, NIT 2', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000071';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1009727', 'c0000000-0000-0000-0000-000000000010', 'Broken sodium vapor fixture hanging precariously from pole in NIT 3', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'DAV College Road', 'Near Gate No. 2, NIT 3', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000072';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1009864', 'c0000000-0000-0000-0000-000000000002', 'Damaged culvert grating allowing debris to block outflow in NIT 5', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Hardware Chowk', 'Near Bus Stand Post, NIT 5', 'Faridabad', 'Haryana', '121005', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000073';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1010001', 'c0000000-0000-0000-0000-000000000003', 'Sub-surface supply line leak weakening building foundation in Badkhal', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Badkhal Lake Road', 'Near Tourist Resort Gate, Badkhal', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000074';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1010138', 'c0000000-0000-0000-0000-000000000004', 'Broken concrete park benches with exposed sharp rebar in Old Faridabad', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Railway Road', 'Near Railway Station Platform 1, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000075';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1010275', 'c0000000-0000-0000-0000-000000000005', 'Missing directional signage at flyover divergence point in Old Faridabad', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Kheri Gate Chowk', 'Main Grain Market, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000076';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1010412', 'c0000000-0000-0000-0000-000000000006', 'Hazardous asphalt crater causing vehicle bottoming out in Old Faridabad', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Barahi Talao Road', 'Near Old Tehsil Office, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000077';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1010549', 'c0000000-0000-0000-0000-000000000007', 'Illegal construction demolition waste dumped on roadside in Sector 14', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Main HUDA Market', 'Near DPS Sector 14, Sector 14', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000078';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1010686', 'c0000000-0000-0000-0000-000000000008', 'Bent utility pole leaning dangerously over roadway in Sector 21C', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Block E Central Road', 'Near SRS Cinema, Sector 21C', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000079';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1010823', 'c0000000-0000-0000-0000-000000000009', 'Flickering high-mast lamp pole at commercial junction in Sector 28', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Mathura Road Service Lane', 'Near Sector 28 Metro Station, Sector 28', 'Faridabad', 'Haryana', '121008', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000080';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1010960', 'c0000000-0000-0000-0000-000000000010', 'Stagnant stormwater breeding mosquitoes outside primary school in Sector 82', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'BPTP Park Grandeura Outer', 'Near Master Road, Sector 82', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000081';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1011097', 'c0000000-0000-0000-0000-000000000002', 'Broken municipal pipeline valve leaking thousands of liters in Sector 86', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Omaxe Heights Connector', 'Near Nahar Singh Palace Road, Sector 86', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000082';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1011234', 'c0000000-0000-0000-0000-000000000003', 'Broken children swing set posing injury hazard in Ballabgarh', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Main Mathura Highway', 'Near Ballabgarh Bus Terminal, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000083';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1011371', 'c0000000-0000-0000-0000-000000000004', 'Missing directional signage at flyover divergence point in Ballabgarh', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Chawla Colony Main Market', 'Near Arya Samaj Mandir, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000084';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1011508', 'c0000000-0000-0000-0000-000000000005', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 15', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Main Market Road', 'Near Community Centre, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000085';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1011645', 'c0000000-0000-0000-0000-000000000006', 'Illegal construction demolition waste dumped on roadside in Sector 15', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000086';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1011782', 'c0000000-0000-0000-0000-000000000007', 'Frequent voltage surges tripping residential feeder lines in Sector 15A', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Club Road', 'Opposite Gymkhana Club, Sector 15A', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.316, 28.406), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000087';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1011919', 'c0000000-0000-0000-0000-000000000008', 'Damaged lamp housing after heavy wind storm in Sector 16', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Sector 16 Main Market', 'Opposite Metro Pillar 582, Sector 16', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000088';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1012056', 'c0000000-0000-0000-0000-000000000009', 'Stormwater drain completely choked with silt and plastic in Sector 16A', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Nehru Ground Road', 'Near Magpie Tourist Complex, Sector 16A', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.327, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000089';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1012193', 'c0000000-0000-0000-0000-000000000010', 'Severely contaminated murky brown tap water with foul odor in NIT 1', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Block B, 1-2 Chowk', 'Near Central Market, NIT 1', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.3975), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000090';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1012330', 'c0000000-0000-0000-0000-000000000002', 'Wild weeds and thorny brush covering children play area in NIT 2', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Industrial Area Pocket 4', 'Near ESI Hospital Road, NIT 2', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3015, 28.401), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000091';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1012467', 'c0000000-0000-0000-0000-000000000003', 'Missing directional signage at flyover divergence point in NIT 3', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'DAV College Road', 'Near Gate No. 2, NIT 3', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.294, 28.393), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000092';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1012604', 'c0000000-0000-0000-0000-000000000004', 'Hazardous asphalt crater causing vehicle bottoming out in NIT 5', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'Hardware Chowk', 'Near Bus Stand Post, NIT 5', 'Faridabad', 'Haryana', '121005', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.291, 28.389), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000093';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1012741', 'c0000000-0000-0000-0000-000000000005', 'Illegal construction demolition waste dumped on roadside in Badkhal', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Badkhal Lake Road', 'Near Tourist Resort Gate, Badkhal', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.285, 28.42), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000094';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1012878', 'c0000000-0000-0000-0000-000000000006', 'Uncovered distribution feeder pillar in children play area in Old Faridabad', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Railway Road', 'Near Railway Station Platform 1, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000095';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1013015', 'c0000000-0000-0000-0000-000000000007', 'Broken sodium vapor fixture hanging precariously from pole in Old Faridabad', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Kheri Gate Chowk', 'Main Grain Market, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4245), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000096';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1013152', 'c0000000-0000-0000-0000-000000000008', 'Damaged culvert grating allowing debris to block outflow in Old Faridabad', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Barahi Talao Road', 'Near Old Tehsil Office, Old Faridabad', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.311, 28.418), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000097';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1013289', 'c0000000-0000-0000-0000-000000000009', 'Sub-surface supply line leak weakening building foundation in Sector 14', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Main HUDA Market', 'Near DPS Sector 14, Sector 14', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000009', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.324, 28.411), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000098';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'PRK-1013426', 'c0000000-0000-0000-0000-000000000010', 'Dry fallen tree branch hanging over morning walking track in Sector 21C', 'Citizen reported issue regarding parks & gardens requiring municipal maintenance and inspection.', 'Parks & Gardens', 'Block E Central Road', 'Near SRS Cinema, Sector 21C', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000010', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.298, 28.431), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000099';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'TRF-1013563', 'c0000000-0000-0000-0000-000000000002', 'Missing directional signage at flyover divergence point in Sector 28', 'Citizen reported issue regarding traffic requiring municipal maintenance and inspection.', 'Traffic', 'Mathura Road Service Lane', 'Near Sector 28 Metro Station, Sector 28', 'Faridabad', 'Haryana', '121008', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000002', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.314, 28.441), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000100';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ROA-1013700', 'c0000000-0000-0000-0000-000000000003', 'Hazardous asphalt crater causing vehicle bottoming out in Sector 82', 'Citizen reported issue regarding road maintenance requiring municipal maintenance and inspection.', 'Road Maintenance', 'BPTP Park Grandeura Outer', 'Near Master Road, Sector 82', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000003', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.351, 28.392), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000101';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'SAN-1013837', 'c0000000-0000-0000-0000-000000000004', 'Illegal construction demolition waste dumped on roadside in Sector 86', 'Citizen reported issue regarding sanitation requiring municipal maintenance and inspection.', 'Sanitation', 'Omaxe Heights Connector', 'Near Nahar Singh Palace Road, Sector 86', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326), ARRAY[]::text[], 'processed', NOW() - interval '28 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000004', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.362, 28.405), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000102';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'ELE-1013974', 'c0000000-0000-0000-0000-000000000005', 'High-tension overhead cable sagging below safety clearance in Ballabgarh', 'Citizen reported issue regarding electricity requiring municipal maintenance and inspection.', 'Electricity', 'Main Mathura Highway', 'Near Ballabgarh Bus Terminal, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326), ARRAY[]::text[], 'processed', NOW() - interval '14 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000005', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000103';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'LGT-1014111', 'c0000000-0000-0000-0000-000000000006', 'Flickering high-mast lamp pole at commercial junction in Ballabgarh', 'Citizen reported issue regarding street lights requiring municipal maintenance and inspection.', 'Street Lights', 'Chawla Colony Main Market', 'Near Arya Samaj Mandir, Ballabgarh', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326), ARRAY[]::text[], 'processed', NOW() - interval '3 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000006', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.321, 28.341), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000104';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'DRN-1014248', 'c0000000-0000-0000-0000-000000000007', 'Stagnant stormwater breeding mosquitoes outside primary school in Sector 15', 'Citizen reported issue regarding drainage requiring municipal maintenance and inspection.', 'Drainage', 'Main Market Road', 'Near Community Centre, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326), ARRAY[]::text[], 'processed', NOW() - interval '78 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000007', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.319, 28.4024), 4326));
  
    v_c_id := 'c1000000-0000-0000-0000-000000000105';
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, images, status, created_at)
    VALUES (v_c_id, 'WTR-1014385', 'c0000000-0000-0000-0000-000000000008', 'Broken municipal pipeline valve leaking thousands of liters in Sector 15', 'Citizen reported issue regarding water supply requiring municipal maintenance and inspection.', 'Water Supply', 'Pocket A, Lane 4', 'Near Vidya Mandir School, Sector 15', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326), ARRAY[]::text[], 'processed', NOW() - interval '52 hours');

    INSERT INTO processed_complaints (id, user_id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES (v_c_id, 'c0000000-0000-0000-0000-000000000008', NULL, 5.0, 'low', 'verified', ST_SetSRID(ST_MakePoint(77.318, 28.4045), 4326));
  
    -- Seed realistic task history for workers to establish ETA baseline
    INSERT INTO completed_complaints (id, complaint_id, worker_id, image_url, notes, time_to_resolve_minutes, rating, rating_feedback, rated_at, completed_at)
    SELECT 
        gen_random_uuid(),
        rc.id,
        'da000000-0000-0000-0000-000000000001',
        NULL,
        'Asphalt resurfaced and roller compacted.',
        95,
        5,
        'Great work, very smooth finish.',
        NOW() - interval '5 days',
        NOW() - interval '5 days'
    FROM raw_complaints rc WHERE rc.category = 'Road Maintenance' AND rc.id != 'c1000000-0000-0000-0000-000000000001' LIMIT 1;
    

    INSERT INTO completed_complaints (id, complaint_id, worker_id, image_url, notes, time_to_resolve_minutes, rating, rating_feedback, rated_at, completed_at)
    SELECT 
        gen_random_uuid(),
        rc.id,
        'da000000-0000-0000-0000-000000000013',
        NULL,
        'Fuse box replaced and live cables re-insulated.',
        110,
        4,
        'Prompt electrical service.',
        NOW() - interval '3 days',
        NOW() - interval '3 days'
    FROM raw_complaints rc WHERE rc.category = 'Electricity' LIMIT 1;
    

    -- Run auto-escalation right away to set initial scores
    PERFORM auto_escalate_priorities_v2();

END $$;

-- 6. STORED PROCEDURE: REFRESH DEMO TIMESTAMPS & WORKFORCE STATES
CREATE OR REPLACE FUNCTION refresh_demo_complaints_timestamps()
RETURNS jsonb AS $$
DECLARE
    v_count INT := 0;
BEGIN
    -- 1. Restore worker assignments to pristine demo baseline
    UPDATE processed_complaints 
    SET staff_id = NULL, complaint_status = 'verified'
    WHERE id NOT IN ('c1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000003')
      AND complaint_status != 'resolved';

    -- Re-assign Worker 1 (Amit Verma) to complaint 2
    UPDATE processed_complaints
    SET staff_id = 'da000000-0000-0000-0000-000000000001', complaint_status = 'in_progress'
    WHERE id = 'c1000000-0000-0000-0000-000000000002';

    -- Reset staff statuses to baseline (w0000001 busy, w0000002 available, w0000003 busy)
    UPDATE staff SET status = 'available';
    UPDATE staff SET status = 'busy' WHERE id IN ('da000000-0000-0000-0000-000000000001', 'da000000-0000-0000-0000-000000000004', 'da000000-0000-0000-0000-000000000006', 'da000000-0000-0000-0000-000000000009', 'da000000-0000-0000-0000-000000000013', 'da000000-0000-0000-0000-000000000015', 'da000000-0000-0000-0000-000000000019', 'da000000-0000-0000-0000-000000000024', 'da000000-0000-0000-0000-000000000026');

    -- 2. Shift timestamps across 5 relative operational buckets
    -- Bucket 1: 78h ago (> 72h SLA breach -> Critical for citizens)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '78 hours'
    WHERE id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id LIMIT 20
    );

    -- Bucket 2: 52h ago (> 48h SLA breach -> High)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '52 hours'
    WHERE id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id OFFSET 20 LIMIT 25
    );

    -- Bucket 3: 28h ago (> 24h SLA breach -> Medium)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '28 hours'
    WHERE id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id OFFSET 45 LIMIT 25
    );

    -- Bucket 4: 14h ago (> 12h Executive breach -> Critical for Officials)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '14 hours'
    WHERE user_id IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001');

    -- Bucket 5: Fresh 2 hours ago (including Rahul's fresh complaint)
    UPDATE raw_complaints 
    SET created_at = NOW() - interval '2 hours'
    WHERE id = 'c1000000-0000-0000-0000-000000000001'
       OR id IN (
        SELECT id FROM raw_complaints 
        WHERE user_id NOT IN ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'eb000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001')
        ORDER BY id OFFSET 70
    );

    -- Rahul's In-Progress complaint (18h ago) and Resolved complaint (24h ago)
    UPDATE raw_complaints SET created_at = NOW() - interval '18 hours' WHERE id = 'c1000000-0000-0000-0000-000000000002';
    UPDATE raw_complaints SET created_at = NOW() - interval '24 hours' WHERE id = 'c1000000-0000-0000-0000-000000000003';

    -- 3. Recalculate all priorities dynamically in SQL
    PERFORM auto_escalate_priorities_v2();

    SELECT COUNT(*) INTO v_count FROM raw_complaints;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Demo baseline restored: dates staggered, worker assignments reset, and priorities re-evaluated.',
        'total_complaints', v_count,
        'refreshed_at', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
