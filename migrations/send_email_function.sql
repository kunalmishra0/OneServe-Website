-- Migration: Create a generic server-side email sending function
-- Uses pg_net to call Resend API from within PostgreSQL (avoids CORS)
-- Run this in Supabase SQL Editor
--
-- This replaces ALL direct browser-to-Resend API calls.

-- Enable pg_net if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Generic email sending function
-- Called from the frontend via supabase.rpc('send_email', { ... })
CREATE OR REPLACE FUNCTION send_email(
  p_to TEXT,
  p_subject TEXT,
  p_html TEXT,
  p_from TEXT DEFAULT 'OneServe <onboarding@resend.dev>',
  p_resend_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id BIGINT;
BEGIN
  IF p_resend_key IS NULL OR p_resend_key = '' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'No API key provided');
  END IF;

  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || p_resend_key
    ),
    body := jsonb_build_object(
      'from', p_from,
      'to', p_to,
      'subject', p_subject,
      'html', p_html
    )
  ) INTO v_request_id;

  RETURN jsonb_build_object('success', TRUE, 'message', 'Email queued', 'request_id', v_request_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', FALSE, 'error', SQLERRM);
END;
$$;

-- Grant execute to both anon and authenticated users
GRANT EXECUTE ON FUNCTION send_email(TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION send_email(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
