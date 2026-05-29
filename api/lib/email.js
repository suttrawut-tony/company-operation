/**
 * Company Operation — Email sender
 * Uses nodemailer if SMTP_HOST is set. Otherwise logs the message
 * (so dev/forgot-password still works without SMTP credentials).
 */
const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || 'noreply@sda-group.com';
  const t = getTransporter();
  if (!t) {
    console.log('═══ [email] SMTP not configured — would have sent: ═══');
    console.log('  To:      %s', to);
    console.log('  Subject: %s', subject);
    console.log('  Text:    %s', text);
    console.log('════════════════════════════════════════════════════');
    return { delivered: false, logged: true };
  }
  await t.sendMail({ from, to, subject, text, html });
  return { delivered: true };
}

module.exports = { sendMail };
