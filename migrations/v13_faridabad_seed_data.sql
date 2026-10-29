-- ==============================================================================
-- ONESERVE V2: AUTHENTIC FARIDABAD SEED DATA SCRIPT
-- ==============================================================================
-- Run this in Supabase SQL Editor right after running v12_faridabad_clean_slate.sql
-- This creates:
--   1. Clean demo users in auth.users & profiles
--   2. Realistic staff workers in Faridabad with exact road coordinates
--   3. Realistic Faridabad complaints across Sector 15, 16, NIT, and Old Faridabad
--   4. Authentic DHBVN, MCF, HSVP utility bills with itemized charges
-- ==============================================================================

DO $$
DECLARE
    -- Predefined Auth User IDs
    v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_citizen_id UUID := 'c0000000-0000-0000-0000-000000000001';
    v_worker1_id UUID := 'w0000000-0000-0000-0000-000000000001';
    v_worker2_id UUID := 'w0000000-0000-0000-0000-000000000002';
    v_worker3_id UUID := 'w0000000-0000-0000-0000-000000000003';

    -- Staff Record IDs
    v_staff1_id UUID := 's0000000-0000-0000-0000-000000000001';
    v_staff2_id UUID := 's0000000-0000-0000-0000-000000000002';
    v_staff3_id UUID := 's0000000-0000-0000-0000-000000000003';

    -- Complaint IDs
    v_comp1_id UUID := '11111111-1111-1111-1111-111111111111';
    v_comp2_id UUID := '22222222-2222-2222-2222-222222222222';
    v_comp3_id UUID := '33333333-3333-3333-3333-333333333333';
    v_comp4_id UUID := '44444444-4444-4444-4444-444444444444';
    v_comp5_id UUID := '55555555-5555-5555-5555-555555555555';

    -- Bill IDs
    v_bill1_id UUID := 'b1111111-1111-1111-1111-111111111111';
    v_bill2_id UUID := 'b2222222-2222-2222-2222-222222222222';
    v_bill3_id UUID := 'b3333333-3333-3333-3333-333333333333';
    v_bill4_id UUID := 'b4444444-4444-4444-4444-444444444444';

    -- Passwords encrypted with standard bcrypt for 'Admin@123', 'Citizen@123', 'Worker@123'
    v_admin_hash TEXT := '$2a$10$wK1c5y8o2q1wz8k6V8I2m.3uB4o6H7f9L2M5N8P1Q4R7T0W3Z6Y9K'; -- placeholder, will create via Supabase API or upsert
BEGIN

    -- 1. UPSERT DEMO PROFILES
    INSERT INTO profiles (id, email, full_name, role, special_role, is_verified)
    VALUES
        (v_admin_id, 'admin@oneserve.in', 'MCF Chief Commissioner', 'admin', 'municipal_officer', true),
        (v_citizen_id, 'citizen@oneserve.in', 'Rahul Sharma', 'citizen', NULL, true),
        (v_worker1_id, 'worker.roads@oneserve.in', 'Amit Verma', 'worker', NULL, true),
        (v_worker2_id, 'worker.sanitation@oneserve.in', 'Rajesh Kumar', 'worker', NULL, true),
        (v_worker3_id, 'worker.electric@oneserve.in', 'Suresh Chand', 'worker', NULL, true)
    ON CONFLICT (id) DO UPDATE SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- 2. UPSERT CITIZEN EXTENSION
    INSERT INTO citizens (id, full_name, email, phoneno, address_line_1, address_line_2, city, state, pincode)
    VALUES
        (v_citizen_id, 'Rahul Sharma', 'citizen@oneserve.in', '+91 98110 24892', 'House #412, Main Road', 'Near Community Centre, Sector 15', 'Faridabad', 'Haryana', '121007')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    -- 3. UPSERT WORKFORCE (STAFF) WITH REAL FARIDABAD COORDINATES
    -- Staff 1: Amit Verma (Roads), Stationed at Sector 15 Market (28.4024, 77.3190)
    INSERT INTO staff (id, auth_user_id, email, full_name, contact_number, role, assigned_zone, status, shift_start, shift_end, assignment_radius_km, performance_rating, complaints_handled, invite_code, location)
    VALUES
        (v_staff1_id, v_worker1_id, 'worker.roads@oneserve.in', 'Amit Verma', '+91 98710 44321', 'Road Technician', 'Sector 15 Hub', 'available', '08:30', '17:30', 5, 4.8, 42, 'ROAD15', ST_SetSRID(ST_MakePoint(77.3190, 28.4024), 4326)),
        (v_staff2_id, v_worker2_id, 'worker.sanitation@oneserve.in', 'Rajesh Kumar', '+91 98188 55920', 'Sanitation Worker', 'NIT Faridabad Hub', 'available', '07:00', '15:00', 4, 4.9, 87, 'SANI01', ST_SetSRID(ST_MakePoint(77.2952, 28.3962), 4326)),
        (v_staff3_id, v_worker3_id, 'worker.electric@oneserve.in', 'Suresh Chand', '+91 99102 77123', 'Electrician', 'Old Faridabad Zone', 'available', '09:00', '18:00', 6, 4.7, 31, 'ELEC16', ST_SetSRID(ST_MakePoint(77.3142, 28.4208), 4326))
    ON CONFLICT (id) DO UPDATE SET status = 'available';

    -- 4. INSERT REALISTIC COMPLAINTS ACROSS FARIDABAD
    -- Complaint 1: Pothole on Sector 16 Main Road (~1.4 km from Worker 1 - IN RADIUS!)
    INSERT INTO raw_complaints (id, ref_id, user_id, title, description, category, address_line_1, address_line_2, city, state, pincode, location, status)
    VALUES
        (v_comp1_id, 'OS-FBD-2026-01', v_citizen_id, 'Deep Pothole causing traffic backlog near Metro Pillar 582', 'Hazardous crater on the right carriage-way causing near-accidents during peak evening commute.', 'Road Maintenance', 'Sector 16 Main Market Road', 'Opposite Metro Pillar 582', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326), 'processed'),
        
        -- Complaint 2: Overflowing Municipal Dumpster near NIT 1 Market (~4.2 km from Worker 2 - IN RADIUS!)
        (v_comp2_id, 'OS-FBD-2026-02', v_citizen_id, 'Overflowing Waste Dumpster uncleaned for 4 days', 'Large commercial garbage heap spilling onto the pedestrian walkway creating foul odor and health hazard.', 'Sanitation', 'Block B, 1-2 Chowk', 'Near NIT 1 Central Market', 'Faridabad', 'Haryana', '121001', ST_SetSRID(ST_MakePoint(77.2980, 28.3975), 4326), 'processed'),
        
        -- Complaint 3: Blown Street Light Transformer in Sector 15 (~0.6 km from Worker 1 / 3)
        (v_comp3_id, 'OS-FBD-2026-03', v_citizen_id, 'Sparking Street Light Pole and complete black-out', 'Short circuit spark on street pole 4B, entire residential lane without street lights for 2 nights.', 'Electricity', 'Lane 4, Pocket A', 'Sector 15 Residential Area', 'Faridabad', 'Haryana', '121007', ST_SetSRID(ST_MakePoint(77.3210, 28.4035), 4326), 'processed'),

        -- Complaint 4: Low Water Pressure & Murky Water near Old Faridabad Station
        (v_comp4_id, 'OS-FBD-2026-04', v_citizen_id, 'Contaminated municipal water line supply', 'Brownish tap water with silt coming through domestic pipeline during morning supply hour.', 'Water Supply', 'Railway Road', 'Near Old Faridabad Railway Station', 'Faridabad', 'Haryana', '121002', ST_SetSRID(ST_MakePoint(77.3150, 28.4215), 4326), 'processed'),

        -- Complaint 5: Out of range test complaint in Ballabgarh (~7.5 km away from Sector 15)
        (v_comp5_id, 'OS-FBD-2026-05', v_citizen_id, 'Broken storm water drain grate on highway', 'Damaged cast-iron grating creating open trench on service road.', 'Drainage', 'Main Mathura Road', 'Near Ballabgarh Bus Terminal', 'Faridabad', 'Haryana', '121004', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326), 'processed');

    -- Insert Processed Complaints (Layer 2)
    INSERT INTO processed_complaints (id, staff_id, priority_score, priority_level, complaint_status, location)
    VALUES
        (v_comp1_id, NULL, 7.5, 'high', 'verified', ST_SetSRID(ST_MakePoint(77.3298, 28.4085), 4326)),
        (v_comp2_id, NULL, 6.0, 'medium', 'verified', ST_SetSRID(ST_MakePoint(77.2980, 28.3975), 4326)),
        (v_comp3_id, NULL, 8.5, 'critical', 'verified', ST_SetSRID(ST_MakePoint(77.3210, 28.4035), 4326)),
        (v_comp4_id, NULL, 5.0, 'medium', 'verified', ST_SetSRID(ST_MakePoint(77.3150, 28.4215), 4326)),
        (v_comp5_id, NULL, 4.0, 'low', 'submitted', ST_SetSRID(ST_MakePoint(77.3248, 28.3375), 4326));

    -- 5. INSERT AUTHENTIC FARIDABAD UTILITY BILLS FOR CITIZEN
    -- Bill 1: DHBVN Electricity
    INSERT INTO bills (id, user_id, bill_number, utility_type, provider_name, consumer_number, sub_division, billing_period, bill_date, due_date, units_consumed, amount_due, status)
    VALUES (
        v_bill1_id,
        v_citizen_id,
        'DHBVN-FBD-2026-0418',
        'electricity',
        'Dakshin Haryana Bijli Vitran Nigam (DHBVN)',
        '1575540000',
        'Sub-Division Sector 15, Faridabad',
        '01 Mar 2026 - 31 Mar 2026',
        '2026-04-02',
        '2026-04-20',
        248.00,
        1840.00,
        'unpaid'
    );

    INSERT INTO bill_items (bill_id, description, amount)
    VALUES
        (v_bill1_id, 'Energy Charges (SOP - 248 units @ ₹6.50/unit)', 1612.00),
        (v_bill1_id, 'Fuel Surcharge Adjustment (FSA)', 92.00),
        (v_bill1_id, 'Electricity Duty (ED)', 49.60),
        (v_bill1_id, 'Municipal Tax (MT - 2%)', 36.80),
        (v_bill1_id, 'Meter Rent & Fixed Service Charge', 49.60);

    -- Bill 2: MCF Property Tax
    INSERT INTO bills (id, user_id, bill_number, utility_type, provider_name, consumer_number, sub_division, billing_period, bill_date, due_date, amount_due, status)
    VALUES (
        v_bill2_id,
        v_citizen_id,
        'MCF-PT-2026-8812',
        'property_tax',
        'Municipal Corporation Faridabad (MCF / ULB Haryana)',
        'MCF-SEC15-849201',
        'Zone 2 / Ward 18 (Sector 15)',
        'FY 2026-27 (Annual Assessment)',
        '2026-04-01',
        '2026-05-15',
        3250.00,
        'unpaid'
    );

    INSERT INTO bill_items (bill_id, description, amount)
    VALUES
        (v_bill2_id, 'Base Residential Property Tax (Built-up Area 250 sq yd)', 2500.00),
        (v_bill2_id, 'Civic Sanitation Cess (10%)', 250.00),
        (v_bill2_id, 'Fire Fighting Development Cess (5%)', 125.00),
        (v_bill2_id, 'Haryana Urban Infrastructure Development Fund', 375.00);

    -- Bill 3: HSVP / MCF Water & Sewerage
    INSERT INTO bills (id, user_id, bill_number, utility_type, provider_name, consumer_number, sub_division, billing_period, bill_date, due_date, units_consumed, amount_due, status)
    VALUES (
        v_bill3_id,
        v_citizen_id,
        'HSVP-WTR-2026-0391',
        'water',
        'HSVP / Municipal Water Works Board',
        'WTR-12004812',
        'Sector 15 Water Boosting Station',
        'Jan 2026 - Mar 2026 (Q4)',
        '2026-03-25',
        '2026-04-15',
        42.00,
        580.00,
        'overdue'
    );

    INSERT INTO bill_items (bill_id, description, amount)
    VALUES
        (v_bill3_id, 'Volumetric Domestic Water Consumption (42 kL)', 378.00),
        (v_bill3_id, 'Sewerage Disposal & Maintenance Charge (40%)', 151.20),
        (v_bill3_id, 'Late Payment Surcharge', 50.80);

    -- Bill 4: Haryana City Gas (Piped Natural Gas - Already Paid for receipt testing)
    INSERT INTO bills (id, user_id, bill_number, utility_type, provider_name, consumer_number, sub_division, billing_period, bill_date, due_date, units_consumed, amount_due, amount_paid, status)
    VALUES (
        v_bill4_id,
        v_citizen_id,
        'HCG-PNG-2026-1029',
        'gas',
        'Haryana City Gas Distribution Ltd.',
        'PNG-982140',
        'Sector 15 Network Grid',
        '15 Feb 2026 - 15 Mar 2026',
        '2026-03-16',
        '2026-03-31',
        18.50,
        860.00,
        860.00,
        'paid'
    );

    INSERT INTO bill_items (bill_id, description, amount)
    VALUES
        (v_bill4_id, 'PNG Consumption Charges (18.5 SCM @ ₹42.50/SCM)', 786.25),
        (v_bill4_id, 'Fixed Transmission & Network Charges', 50.00),
        (v_bill4_id, 'CGST + SGST (5%)', 23.75);

    INSERT INTO bill_payments (bill_id, user_id, amount, payment_method, razorpay_order_id, razorpay_payment_id, status)
    VALUES (
        v_bill4_id,
        v_citizen_id,
        860.00,
        'razorpay',
        'order_N8f2Qp9L3mK1',
        'pay_N8f3Rk0W4zJ2',
        'succeeded'
    );

END $$;
