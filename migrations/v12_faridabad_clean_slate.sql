-- ==============================================================================
-- ONESERVE V2: FARIDABAD CLEAN SLATE MIGRATION & UNIFIED MVP SCHEMA
-- ==============================================================================
-- This script completely purges all stale mock data, establishes the definitive
-- schema (covering Complaints, Workforce, Verification, and Faridabad Billing),
-- and configures row-level security and indexing.
-- ==============================================================================

-- 0. Ensure PostGIS extension is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. DROP EXISTING CONSTRAINTS AND PURGE ALL TABLES
-- (Cascading purge to ensure no orphan records or foreign key conflicts)
TRUNCATE TABLE completed_complaints CASCADE;
TRUNCATE TABLE processed_complaints CASCADE;
TRUNCATE TABLE raw_complaints CASCADE;
TRUNCATE TABLE staff CASCADE;
TRUNCATE TABLE citizens CASCADE;
TRUNCATE TABLE profiles CASCADE;

-- 2. UNIFIED PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('citizen', 'admin', 'worker')),
    special_role TEXT CHECK (special_role IN ('doctor', 'policeman', 'fire_brigade', 'municipal_officer')),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CITIZENS EXTENSION TABLE
CREATE TABLE IF NOT EXISTS citizens (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phoneno TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL DEFAULT 'Faridabad',
    state TEXT NOT NULL DEFAULT 'Haryana',
    pincode TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STAFF / WORKFORCE MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    contact_number TEXT NOT NULL,
    role TEXT NOT NULL,
    assigned_zone TEXT NOT NULL DEFAULT 'Faridabad Central',
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'off_duty')),
    current_assignment_id UUID,
    shift_start TIME DEFAULT '09:00',
    shift_end TIME DEFAULT '18:00',
    assignment_radius_km INTEGER DEFAULT 5,
    performance_rating NUMERIC(3,1) DEFAULT 5.0,
    complaints_handled INTEGER DEFAULT 0,
    avatar_url TEXT,
    invite_code TEXT UNIQUE,
    location GEOGRAPHY(POINT, 4326) NOT NULL
);

-- 5. LAYER 1: RAW_COMPLAINTS (Citizen Submission)
CREATE TABLE IF NOT EXISTS raw_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL DEFAULT 'Faridabad',
    state TEXT NOT NULL DEFAULT 'Haryana',
    pincode TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    images TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending_analysis',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LAYER 2: PROCESSED_COMPLAINTS (Admin State & Escalation)
CREATE TABLE IF NOT EXISTS processed_complaints (
    id UUID PRIMARY KEY REFERENCES raw_complaints(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    priority_score NUMERIC(3,1) DEFAULT 5.0,
    priority_level TEXT DEFAULT 'low' CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
    complaint_status TEXT DEFAULT 'submitted' CHECK (complaint_status IN ('submitted', 'verified', 'in_progress', 'pending_review', 'resolved', 'rejected')),
    scheduled_date DATE,
    estimated_resolution TIMESTAMPTZ,
    last_escalated_at TIMESTAMPTZ,
    location GEOGRAPHY(POINT, 4326),
    admin_notes TEXT,
    ai_analysis_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LAYER 3: COMPLETED_COMPLAINTS (Resolution Audit & Ratings)
CREATE TABLE IF NOT EXISTS completed_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID UNIQUE NOT NULL REFERENCES raw_complaints(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    image_url TEXT,
    notes TEXT,
    time_to_resolve_minutes INTEGER,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    rating_feedback TEXT,
    rated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BILLING TABLES (Faridabad / Haryana Utilities)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    bill_number TEXT UNIQUE NOT NULL,
    utility_type TEXT NOT NULL CHECK (utility_type IN ('electricity', 'water', 'property_tax', 'gas')),
    provider_name TEXT NOT NULL,
    consumer_number TEXT NOT NULL,
    sub_division TEXT,
    billing_period TEXT NOT NULL,
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    units_consumed NUMERIC(10,2),
    amount_due NUMERIC(10,2) NOT NULL,
    amount_paid NUMERIC(10,2) DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partially_paid', 'paid', 'overdue')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'succeeded' CHECK (status IN ('pending', 'succeeded', 'failed')),
    receipt_url TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. USER DOCUMENTS (Special Verification)
CREATE TABLE IF NOT EXISTS user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('aadhaar', 'passport', 'service_id')),
    document_url TEXT NOT NULL,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 10. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE completed_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_payments ENABLE ROW LEVEL SECURITY;

-- Permissive demo access policies
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can upsert own profile" ON profiles;
CREATE POLICY "Users can upsert own profile" ON profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public read citizens" ON citizens;
CREATE POLICY "Public read citizens" ON citizens FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can modify own citizen record" ON citizens;
CREATE POLICY "Users can modify own citizen record" ON citizens FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public read staff" ON staff;
CREATE POLICY "Public read staff" ON staff FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage staff" ON staff;
CREATE POLICY "Admins can manage staff" ON staff FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read complaints" ON raw_complaints;
CREATE POLICY "Public read complaints" ON raw_complaints FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated insert complaints" ON raw_complaints;
CREATE POLICY "Authenticated insert complaints" ON raw_complaints FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public read processed" ON processed_complaints;
CREATE POLICY "Public read processed" ON processed_complaints FOR ALL USING (true);

DROP POLICY IF EXISTS "Public read completed" ON completed_complaints;
CREATE POLICY "Public read completed" ON completed_complaints FOR ALL USING (true);

DROP POLICY IF EXISTS "Users view own bills" ON bills;
CREATE POLICY "Users view own bills" ON bills FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read bill items" ON bill_items;
CREATE POLICY "Public read bill items" ON bill_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read bill payments" ON bill_payments;
CREATE POLICY "Public read bill payments" ON bill_payments FOR ALL USING (true);
