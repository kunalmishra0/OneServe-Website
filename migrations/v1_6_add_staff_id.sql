-- Add staff_id to processed_complaints to support multiple task assignments per worker
ALTER TABLE processed_complaints ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id);
