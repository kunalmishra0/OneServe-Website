-- Migration V4: Split location_text into detailed address fields
-- Targets: raw_complaints, processed_complaints

-- 1. Update raw_complaints table
ALTER TABLE raw_complaints
ADD COLUMN address_line_1 text,
ADD COLUMN address_line_2 text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN pincode text;

-- Data Migration (Best Effort): Move existing location_text to address_line_1 for continuity
UPDATE raw_complaints
SET address_line_1 = location_text;

-- Drop the old column
ALTER TABLE raw_complaints
DROP COLUMN location_text;


-- 2. Update processed_complaints table
ALTER TABLE processed_complaints
ADD COLUMN address_line_1 text,
ADD COLUMN address_line_2 text,
ADD COLUMN city text,
ADD COLUMN state text,
ADD COLUMN pincode text;

-- Data Migration (Best Effort)
UPDATE processed_complaints
SET address_line_1 = location_text;

-- Drop the old column
ALTER TABLE processed_complaints
DROP COLUMN location_text;
