import { supabase } from "./supabase";

const resendKey = import.meta.env.VITE_RESEND_API_KEY;

/**
 * Generate a cryptographically random 6-digit OTP.
 * Falls back to Math.random if crypto API is unavailable.
 */
export function generateOTP(): string {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const code = (array[0] % 900000) + 100000; // ensures 6 digits
    return code.toString();
  }
  // Fallback
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Store OTP in the database, then send the email via server-side function.
 * Uses two RPC calls:
 *   1. Direct table operations to store the OTP
 *   2. send_email RPC to dispatch via Resend (server-side, no CORS)
 */
export async function sendAndStoreOTP(
  email: string,
  code: string,
  userName?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Invalidate old unused codes for this email
    await supabase
      .from("otp_codes")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // 2. Store new code with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("otp_codes").insert({
      email: email.toLowerCase(),
      code,
      expires_at: expiresAt,
      used: false,
    });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return { success: false, error: insertError.message };
    }

    // 3. Send email via server-side function (no CORS)
    if (resendKey) {
      const otpHtml = `
        <div style="font-family: 'Segoe UI', sans-serif; max-width: 480px; margin: 40px auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #059669; font-size: 24px; margin: 0;">OneServe</h1>
            <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Civic Services Platform</p>
          </div>
          <p style="color: #334155; font-size: 16px;">Hello${userName ? ` ${userName}` : ""},</p>
          <p style="color: #334155; font-size: 15px;">Use the following code to verify your account:</p>
          <div style="background: linear-gradient(135deg, #059669, #10b981); padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #64748b; font-size: 13px; text-align: center;">This code expires in 10 minutes.</p>
          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
        </div>
      `;

      const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');
      
      const response = await fetch(`${API_URL}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: `${code} is your OneServe verification code`,
          html: otpHtml,
        })
      });

      const data = await response.json();

      if (!response.ok || (data && !data.success)) {
        console.error("OTP email send error:", data.error || response.statusText);
        // Non-fatal: OTP is stored, user can check DB or resend
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("sendAndStoreOTP unexpected error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Verify an OTP code against the stored value.
 * Marks the code as used upon successful verification.
 */
export async function verifyOTP(
  email: string,
  code: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: "Invalid or expired verification code. Please try again.",
      };
    }

    // Mark code as used
    await supabase.from("otp_codes").update({ used: true }).eq("id", data.id);

    return { valid: true };
  } catch (err: any) {
    console.error("verifyOTP error:", err);
    return { valid: false, error: "Verification failed. Please try again." };
  }
}
