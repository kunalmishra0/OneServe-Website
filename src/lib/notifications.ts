const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

/**
 * Send an email via the custom Node.js / Vercel Nodemailer server.
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
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Municipal Corporation Faridabad</p>
        </div>
        <h2 style="color: #059669;">Complaint Received</h2>
        <p>Hello,</p>
        <p>Your complaint has been successfully registered on the OneServe Municipal Portal.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
          <p style="margin: 0;"><strong>Reference ID:</strong> ${refId}</p>
          <p style="margin: 5px 0 0 0;"><strong>Category:</strong> ${category}</p>
          <p style="margin: 5px 0 0 0;"><strong>Jurisdiction:</strong> Municipal Corporation Faridabad (MCF)</p>
        </div>
        <p>You can track the live progress and worker dispatch using this reference number in the OneServe application.</p>
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
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">MCF Municipal Workforce Dispatch</p>
        </div>
        <h2 style="color: #2563eb;">Action Taken: Field Worker Assigned</h2>
        <p>A field technician has been dispatched for your complaint <strong>${refId}</strong>.</p>
        
        <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
          <p style="margin: 0;"><strong>Staff Name:</strong> ${staffName}</p>
          <p style="margin: 5px 0;"><strong>Department / Role:</strong> ${staffRole || 'Field Agent'}</p>
          <p style="margin: 5px 0;"><strong>Contact Number:</strong> ${staffContact}</p>
          <p style="margin: 5px 0 0 0;"><strong>Estimated Arrival:</strong> ${eta}</p>
        </div>
        
        <p>You can reach out to the assigned technician for specific access guidance or questions before arrival.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Best regards,<br/>The OneServe Team</p>
      </div>
    `,
  );
};

export const sendBillPaymentReceipt = async (
  email: string,
  billNumber: string,
  provider: string,
  amount: number,
  paymentId: string
) => {
  await sendEmail(
    email,
    `Payment Receipt - ${billNumber} (${provider})`,
    `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; font-size: 24px; margin: 0;">OneServe</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Faridabad Integrated Utility Billing</p>
        </div>
        <div style="background-color: #ecfdf5; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
          <h2 style="color: #047857; margin: 0; font-size: 20px;">Payment Successful</h2>
          <p style="color: #065f46; margin: 4px 0 0 0; font-size: 14px;">Your payment has been processed and credited to ${provider}.</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Bill / Assessment No:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1e293b;">${billNumber}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Utility Provider:</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #1e293b;">${provider}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Amount Paid:</td>
            <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: 700; color: #059669;">₹${amount.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Transaction Reference:</td>
            <td style="padding: 8px 0; text-align: right; font-family: monospace; color: #1e293b;">${paymentId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Payment Date:</td>
            <td style="padding: 8px 0; text-align: right; color: #1e293b;">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
          </tr>
        </table>
        
        <p style="color: #64748b; font-size: 13px;">This is a computer-generated civic tax / utility payment receipt under Haryana Municipal Act.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Best regards,<br/>Municipal Corporation Faridabad & OneServe Team</p>
      </div>
    `
  );
};

export const sendComplaintRejectionNotification = async (
  email: string,
  refId: string,
  reason: string,
) => {
  await sendEmail(
    email,
    `Complaint Update - ${refId}`,
    `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #059669; font-size: 24px; margin: 0;">OneServe</h1>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Civic Services Platform</p>
        </div>
        <h2 style="color: #ef4444;">Complaint Rejected</h2>
        <p>Hello,</p>
        <p>We have reviewed your complaint (Reference ID: <strong>${refId}</strong>) and unfortunately, we are unable to process it further at this time.</p>
        
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <p style="margin: 0;"><strong>Reason for rejection:</strong></p>
          <p style="margin: 5px 0 0 0; color: #991b1b;">${reason}</p>
        </div>
        
        <p>If you believe this was an error, please submit a new complaint with clearer evidence or contact support.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">Best regards,<br/>The OneServe Team</p>
      </div>
    `,
  );
};
