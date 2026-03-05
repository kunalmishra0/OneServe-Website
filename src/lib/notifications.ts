// All emails are sent via a Supabase server-side function (send_email)
// using pg_net to call the Resend API. This avoids CORS issues
// and keeps the API key off the frontend.

import { supabase } from "./supabase";

const resendKey = import.meta.env.VITE_RESEND_API_KEY;

/**
 * Send an email via the server-side Supabase function.
 * Uses pg_net internally to call the Resend API.
 */
const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  from?: string,
) => {
  if (!resendKey) {
    console.warn("Resend API key missing. Skipping email.");
    return;
  }

  try {
    const { data, error } = await supabase.rpc("send_email", {
      p_to: to,
      p_subject: subject,
      p_html: html,
      p_from: from || "OneServe <onboarding@resend.dev>",
      p_resend_key: resendKey,
    });

    if (error) {
      console.error("send_email RPC error:", error);
    }

    if (data && data.success === false) {
      console.error("Email send failed:", data.error);
    }
  } catch (error) {
    console.error("sendEmail unexpected error:", error);
  }
};

export const sendComplaintConfirmation = async (
  email: string,
  refId: string,
  category: string,
) => {
  await sendEmail(
    email,
    `Complaint Filed Successfully - ${refId}`,
    `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; font-size: 24px; margin: 0;">OneServe</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Civic Services Platform</p>
        </div>
        <h2 style="color: #059669;">Complaint Received</h2>
        <p>Hello,</p>
        <p>Your complaint has been successfully registered on the OneServe platform.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <p style="margin: 0;"><strong>Reference ID:</strong> ${refId}</p>
          <p style="margin: 5px 0 0 0;"><strong>Category:</strong> ${category}</p>
        </div>
        <p>You can track the status of your complaint using the reference ID above in the OneServe app.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Best regards,<br/>The OneServe Team</p>
      </div>
    `,
  );
};

export const sendStaffAssignmentNotification = async (
  email: string,
  refId: string,
  staffName: string,
  staffContact: string,
  eta: string,
) => {
  await sendEmail(
    email,
    `Staff Assigned to Your Complaint - ${refId}`,
    `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; font-size: 24px; margin: 0;">OneServe</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Civic Services Platform</p>
        </div>
        <h2 style="color: #2563eb;">Action Taken: Staff Assigned</h2>
        <p>A staff member has been assigned to address your complaint <strong>${refId}</strong>.</p>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0;"><strong>Staff Name:</strong> ${staffName}</p>
          <p style="margin: 5px 0;"><strong>Contact:</strong> ${staffContact}</p>
          <p style="margin: 5px 0 0 0;"><strong>Estimated Arrival:</strong> ${eta}</p>
        </div>
        
        <p>The staff member is on their way. Please ensure area accessibility.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Best regards,<br/>The OneServe Team</p>
      </div>
    `,
  );
};
