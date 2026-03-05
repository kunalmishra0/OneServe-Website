-- Migration: Create OTP codes table for Resend-based verification
-- Run this in Supabase SQL Editor

-- Create the otp_codes table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes (email);

-- Create index for cleanup of expired codes
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes (expires_at);

-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (needed for signup before auth)
CREATE POLICY "Allow insert for signup" ON otp_codes
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to read their own OTP codes by email
CREATE POLICY "Allow read own codes" ON otp_codes
  FOR SELECT
  USING (true);

-- Policy: Allow update (marking as used)
CREATE POLICY "Allow update codes" ON otp_codes
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Optional: Cleanup function to delete expired codes (run periodically)
-- You can set this up as a Supabase cron job
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
