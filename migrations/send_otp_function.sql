-- Migration: Create server-side function to send OTP emails via Resend
-- This avoids CORS issues by making the HTTP call from within PostgreSQL
-- using Supabase's pg_net extension (pre-installed on all Supabase projects).
--
-- Run this in Supabase SQL Editor AFTER running otp_codes_table.sql

-- Enable the pg_net extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function that stores an OTP and sends it via Resend
-- Called from the frontend via supabase.rpc('send_otp', { ... })
CREATE OR REPLACE FUNCTION send_otp(
  p_email TEXT,
  p_code TEXT,
  p_user_name TEXT DEFAULT NULL,
  p_resend_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expiry TIMESTAMPTZ;
  v_email_body TEXT;
  v_subject TEXT;
  v_request_id BIGINT;
BEGIN
  -- 1. Invalidate old unused codes for this email
  UPDATE otp_codes
  SET used = TRUE
  WHERE email = LOWER(p_email) AND used = FALSE;

  -- 2. Store the new code with 10-minute expiry
  v_expiry := NOW() + INTERVAL '10 minutes';

  INSERT INTO otp_codes (email, code, expires_at, used)
  VALUES (LOWER(p_email), p_code, v_expiry, FALSE);

  -- 3. Build email HTML
  v_subject := p_code || ' is your OneServe verification code';
  
  v_email_body := '<div style="font-family: ''Segoe UI'', sans-serif; max-width: 480px; margin: 40px auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">'
    || '<div style="text-align: center; margin-bottom: 24px;">'
    || '<h1 style="color: #059669; font-size: 24px; margin: 0;">OneServe</h1>'
    || '<p style="color: #64748b; font-size: 14px; margin-top: 4px;">Civic Services Platform</p>'
    || '</div>'
    || '<p style="color: #334155; font-size: 16px;">Hello' || COALESCE(' ' || p_user_name, '') || ',</p>'
    || '<p style="color: #334155; font-size: 15px;">Use the following code to verify your account:</p>'
    || '<div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">'
    || '<span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: monospace;">' || p_code || '</span>'
    || '</div>'
    || '<p style="color: #64748b; font-size: 13px; text-align: center;">This code expires in 10 minutes.</p>'
    || '<p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">If you didn''t request this, please ignore this email.</p>'
    || '</div>';

  -- 4. Send email via Resend using pg_net (async HTTP POST)
  IF p_resend_key IS NOT NULL AND p_resend_key != '' THEN
    SELECT net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || p_resend_key
      ),
      body := jsonb_build_object(
        'from', 'OneServe <onboarding@resend.dev>',
        'to', p_email,
        'subject', v_subject,
        'html', v_email_body
      )
    ) INTO v_request_id;

    RETURN jsonb_build_object('success', TRUE, 'message', 'OTP stored and email queued', 'request_id', v_request_id);
  ELSE
    -- No API key provided, just store the code
    RETURN jsonb_build_object('success', TRUE, 'message', 'OTP stored (no email key provided)');
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION send_otp(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION send_otp(TEXT, TEXT, TEXT, TEXT) TO authenticated;
