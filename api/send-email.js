import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Add CORS headers for local testing / cross-domain calls
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, replyTo } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // TEST EMAIL FORWARDING / DUAL-DELIVERY:
    // When sending to demo handles (@oneserve.in / @oneserve.test),
    // deliver to user's real email: mishrakunal132@gmail.com
    const userTestInbox = 'mishrakunal132@gmail.com';
    const isCleanDemoAddress = to.includes('@oneserve.in') || to.includes('@oneserve.test');
    
    const actualRecipient = isCleanDemoAddress ? userTestInbox : to;
    const bccList = !isCleanDemoAddress ? userTestInbox : undefined;

    const mailOptions = {
      from: `"OneServe Municipal Portal" <${process.env.EMAIL_USER}>`,
      to: actualRecipient,
      bcc: bccList,
      subject: `[OneServe -> ${to}] ${subject}`,
      html: `
        <div style="background-color: #f1f5f9; padding: 12px; margin-bottom: 20px; border-left: 4px solid #2563eb; border-radius: 4px; font-family: sans-serif; font-size: 13px; color: #334155;">
          <strong>OneServe Dual-Delivery Demo Banner:</strong><br/>
          Original Display Recipient: <code>${to}</code><br/>
          Delivered to User Inbox: <code>${userTestInbox}</code>
        </div>
        ${html}
      `,
      replyTo: replyTo || process.env.EMAIL_USER,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via OneServe Mailer: %s to %s (BCC: %s)', info.messageId, actualRecipient, bccList);

    return res.status(200).json({ success: true, messageId: info.messageId, deliveredTo: actualRecipient });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
