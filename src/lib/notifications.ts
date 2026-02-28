import { Resend } from "resend";

// Initialize Resend with the API key from environment variables
const resendKey = import.meta.env.VITE_RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

export const sendComplaintConfirmation = async (
  email: string,
  refId: string,
  category: string,
) => {
  if (!resend) {
    console.warn("Resend API key missing. Skipping email.");
    return;
  }

  try {
    await resend.emails.send({
      from: "OneServe Notifications <notifications@oneserve.gov>", // Note: Needs domain verification in Resend production
      to: email,
      subject: `Complaint Filed Successfully - ${refId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #059669;">Complaint Received</h2>
          <p>Hello,</p>
          <p>Your complaint has been successfully registered on the OneServe platform.</p>
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Reference ID:</strong> ${refId}</p>
            <p style="margin: 5px 0 0 0;"><strong>Category:</strong> ${category}</p>
          </div>
          <p>You can track the status of your complaint using the reference ID above in the OneServe app.</p>
          <p>Best regards,<br/>The OneServe Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};

export const sendStaffAssignmentNotification = async (
  email: string,
  refId: string,
  staffName: string,
  staffContact: string,
  eta: string,
) => {
  if (!resend) {
    console.warn("Resend API key missing. Skipping email.");
    return;
  }

  try {
    await resend.emails.send({
      from: "OneServe Updates <updates@oneserve.gov>",
      to: email,
      subject: `Staff Assigned to Your Complaint - ${refId}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #2563eb;">Action Taken: Staff Assigned</h2>
          <p>A staff member has been assigned to address your complaint <strong>${refId}</strong>.</p>
          
          <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0;"><strong>Staff Name:</strong> ${staffName}</p>
            <p style="margin: 5px 0;"><strong>Contact:</strong> ${staffContact}</p>
            <p style="margin: 5px 0 0 0;"><strong>Estimated Arrival:</strong> ${eta}</p>
          </div>
          
          <p>The staff member is on their way. Please ensure area accessibility.</p>
          <p>Best regards,<br/>The OneServe Team</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
};
