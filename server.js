import express from 'express';
import cors from 'cors';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' })); // Allow all origins for dev
app.use(express.json());

// Nodemailer transport configuration
// We recommend using an SMTP service like Gmail, Sendgrid, or Resend SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use host/port for generic SMTP
  auth: {
    user: process.env.EMAIL_USER, // e.g. 'your-email@gmail.com'
    pass: process.env.EMAIL_PASS, // e.g. 'your-app-password'
  },
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, replyTo } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const mailOptions = {
      from: `"OneServe Platform" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      replyTo: replyTo || process.env.EMAIL_USER,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully: %s', info.messageId);

    res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Please ensure EMAIL_USER and EMAIL_PASS are set in your .env file.`);
});
