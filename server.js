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

// Razorpay Payment Gateway integration
import Razorpay from 'razorpay';
import crypto from 'crypto';

app.post('/api/razorpay/create-order', async (req, res) => {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      return res.status(400).json({
        success: false,
        error: 'Razorpay keys not set. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file.',
      });
    }

    const { amount, currency = 'INR', receipt, notes } = req.body;
    if (!amount) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: Math.round(Number(amount) * 100), // convert rupees to paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: key_id,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/razorpay/verify-payment', async (req, res) => {
  try {
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment verification parameters' });
    }

    const hmac = crypto.createHmac('sha256', key_secret || '');
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature === razorpay_signature) {
      console.log('Payment verified successfully for payment_id:', razorpay_payment_id);
      res.status(200).json({ success: true, verified: true, paymentId: razorpay_payment_id });
    } else {
      console.warn('Payment signature mismatch');
      res.status(400).json({ success: false, verified: false, error: 'Signature verification failed' });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Please ensure EMAIL_USER and EMAIL_PASS are set in your .env file.`);
});
