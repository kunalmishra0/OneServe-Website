-- Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- ----------------------------------------------------
-- 1. UPDATE COMPLAINTS TABLE TO SUPPORT LOCATION
-- ----------------------------------------------------
-- Add location column to raw_complaints if it doesn't exist
ALTER TABLE raw_complaints ADD COLUMN IF NOT EXISTS location geography(POINT);
CREATE INDEX IF NOT EXISTS idx_complaints_location ON raw_complaints USING GIST (location);




-- ----------------------------------------------------
-- 2. CREATE STAFF TABLE
-- ----------------------------------------------------
-- Drop table if exists to start fresh (for dev environment)
DROP TABLE IF EXISTS staff CASCADE;

CREATE TABLE staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  assigned_zone TEXT NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'busy', 'off_duty')),
  current_assignment_id UUID REFERENCES raw_complaints(id),
  contact_number TEXT,
  performance_rating NUMERIC(3, 1) DEFAULT 5.0,
  complaints_handled INTEGER DEFAULT 0,
  avatar_url TEXT,
  location geography(POINT) -- Precise location of the staff member
);

-- Index for fast geospatial queries
CREATE INDEX IF NOT EXISTS idx_staff_location ON staff USING GIST (location);

-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON staff FOR SELECT USING (true);
CREATE POLICY "Enable write access for authenticated users" ON staff FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update access for authenticated users" ON staff FOR UPDATE USING (auth.role() = 'authenticated');

-- ----------------------------------------------------
-- 3. SEED DATA WITH COORDINATES
-- ----------------------------------------------------
INSERT INTO staff (full_name, role, assigned_zone, status, contact_number, performance_rating, complaints_handled, location) VALUES
('Ramesh Gupta', 'Electrician', 'Sector 15', 'available', '9876543210', 4.8, 12, ST_SetSRID(ST_MakePoint(77.3204, 28.3970), 4326)),
('Suresh Kumar', 'Sanitation Worker', 'NIT 5', 'available', '9876543211', 4.5, 8, ST_SetSRID(ST_MakePoint(77.2990, 28.3880), 4326)),
('Mahesh Singh', 'Road Technician', 'Charmwood Village', 'busy', '9876543212', 4.2, 5, ST_SetSRID(ST_MakePoint(77.2885, 28.4900), 4326)),
('Rajesh Verma', 'Water Technician', 'Sainik Colony', 'available', '9876543213', 4.9, 15, ST_SetSRID(ST_MakePoint(77.2800, 28.4100), 4326)),
('Dinesh Sharma', 'Drainage Worker', 'Sector 28', 'available', '9876543214', 4.6, 9, ST_SetSRID(ST_MakePoint(77.3050, 28.4200), 4326)),
('Vijay Singh', 'Street Light Technician', 'Greenfields Colony', 'available', '9876543215', 4.7, 11, ST_SetSRID(ST_MakePoint(77.3000, 28.4500), 4326)),
('Sunil Kumar', 'Gardener', 'Jawahar Colony', 'available', '9876543216', 4.4, 6, ST_SetSRID(ST_MakePoint(77.2900, 28.3700), 4326)),
('Anil Yadav', 'Traffic Warden', 'Ballabhgarh', 'busy', '9876543217', 4.3, 4, ST_SetSRID(ST_MakePoint(77.3300, 28.3400), 4326)),
('Mukesh Kumar', 'Electrician', 'Neharpar', 'available', '9876543218', 4.8, 13, ST_SetSRID(ST_MakePoint(77.3500, 28.4000), 4326)),
('Sanjay Singh', 'Sanitation Worker', 'Old Faridabad', 'available', '9876543219', 4.5, 7, ST_SetSRID(ST_MakePoint(77.3150, 28.4100), 4326)),
('Amit Kumar', 'Road Technician', 'Sector 37', 'available', '9876543220', 4.2, 3, ST_SetSRID(ST_MakePoint(77.3080, 28.4600), 4326)),
('Rahul Sharma', 'Water Technician', 'Dabua Colony', 'busy', '9876543221', 4.9, 14, ST_SetSRID(ST_MakePoint(77.2800, 28.3800), 4326)),
('Rohit Singh', 'Drainage Worker', 'Sanjay Colony', 'available', '9876543222', 4.6, 10, ST_SetSRID(ST_MakePoint(77.2900, 28.3900), 4326)),
('Vikas Gupta', 'Street Light Technician', 'Ashoka Enclave', 'available', '9876543223', 4.7, 12, ST_SetSRID(ST_MakePoint(77.2950, 28.4800), 4326)),
('Ajay Kumar', 'Gardener', 'Surajkund', 'available', '9876543224', 4.4, 5, ST_SetSRID(ST_MakePoint(77.2750, 28.4850), 4326)),
('Deepak Verma', 'Traffic Warden', 'Badarpur', 'available', '9876543225', 4.3, 4, ST_SetSRID(ST_MakePoint(77.3000, 28.5000), 4326)),
('Kunal Singh', 'Electrician', 'Okhla Phase 1', 'available', '9876543226', 4.8, 16, ST_SetSRID(ST_MakePoint(77.2800, 28.5200), 4326)),
('Manoj Kumar', 'Sanitation Worker', 'Jasola Vihar', 'available', '9876543227', 4.5, 9, ST_SetSRID(ST_MakePoint(77.2900, 28.5300), 4326)),
('Pankaj Sharma', 'Road Technician', 'Sarita Vihar', 'available', '9876543228', 4.2, 2, ST_SetSRID(ST_MakePoint(77.2950, 28.5250), 4326)),
('Arun Singh', 'Water Technician', 'Kalkaji', 'available', '9876543229', 4.9, 18, ST_SetSRID(ST_MakePoint(77.2600, 28.5400), 4326)),
('Devender Singh', 'Electrician', 'Sector 21C', 'available', '9876543230', 4.7, 11, ST_SetSRID(ST_MakePoint(77.3000, 28.4200), 4326)),
('Krishan Kumar', 'Sanitation Worker', 'Govindpuri', 'available', '9876543231', 4.4, 6, ST_SetSRID(ST_MakePoint(77.2700, 28.5300), 4326)),
('Rajeev Sharma', 'Road Technician', 'Sector 14', 'available', '9876543232', 4.3, 5, ST_SetSRID(ST_MakePoint(77.3180, 28.4000), 4326)),
('Naveen Gupta', 'Water Technician', 'Baselwa Colony', 'available', '9876543233', 4.6, 9, ST_SetSRID(ST_MakePoint(77.3100, 28.4050), 4326)),
('Vikram Singh', 'Drainage Worker', 'Sector 46', 'available', '9876543234', 4.5, 8, ST_SetSRID(ST_MakePoint(77.2900, 28.4400), 4326)),
('Somit Kumar', 'Street Light Technician', 'Greater Kailash', 'available', '9876543235', 4.8, 13, ST_SetSRID(ST_MakePoint(77.2400, 28.5500), 4326)),
('Praveen Kumar', 'Gardener', 'Sector 15', 'available', '9876543236', 4.2, 4, ST_SetSRID(ST_MakePoint(77.3204, 28.3970), 4326)),
('Kuldeep Singh', 'Traffic Warden', 'NIT 1', 'available', '9876543237', 4.9, 14, ST_SetSRID(ST_MakePoint(77.2950, 28.3850), 4326)),
('Mohit Sharma', 'Electrician', 'Saket', 'available', '9876543238', 4.7, 10, ST_SetSRID(ST_MakePoint(77.2100, 28.5200), 4326)),
('Sandeep Kumar', 'Sanitation Worker', 'Nehru Place', 'available', '9876543239', 4.4, 7, ST_SetSRID(ST_MakePoint(77.2500, 28.5500), 4326));
