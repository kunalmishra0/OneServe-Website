const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

/**
 * Send an email via the custom Node.js Nodemailer server.
 */
const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  replyTo?: string,
) => {
  try {
    const response = await fetch(`${API_URL}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        replyTo,
      })
    });

    const data = await response.json();

    if (!response.ok || (data && !data.success)) {
      console.error("Email send failed w/ response:", data.error || response.statusText);
    } else {
      console.log("Email sent successfully!");
    }
  } catch (error) {
    console.error("sendEmail fetch error:", error);
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
  staffRole?: string
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
          <p style="margin: 5px 0;"><strong>Role/Type:</strong> ${staffRole || 'Field Agent'}</p>
          <p style="margin: 5px 0;"><strong>Contact:</strong> ${staffContact}</p>
          <p style="margin: 5px 0 0 0;"><strong>Estimated Arrival:</strong> ${eta}</p>
        </div>
        
        <p>You can contact the assigned staff member using the details above if you have any urgent queries. Our agent now has your location details and may reach out to you soon before arriving at your destination.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Best regards,<br/>The OneServe Team</p>
      </div>
    `,
  );
};
