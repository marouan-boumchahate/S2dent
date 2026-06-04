import nodemailer from 'nodemailer';
import { env } from '../config/env.js';


const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');
const interpolateTemplate = (template, replacements) => Object.entries(replacements).reduce(
  (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value ?? '')),
  template
);
const wrapEmailHtml = (title, body) => `
  <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;padding:32px 20px;">
      <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e5e7eb;box-shadow:0 8px 24px rgba(15,23,42,0.06);">
        <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;margin-bottom:12px;">S2dent</div>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;">${escapeHtml(title)}</h1>
        <div style="font-size:16px;line-height:1.7;color:#374151;">${body}</div>
      </div>
    </div>
  </div>
`;


const otpTemplate = wrapEmailHtml(
  'Your verification code',
  `<p style="margin:0 0 18px;">Use this code to complete your verification:</p>
   <div style="display:inline-block;padding:16px 22px;border-radius:12px;background:#0f172a;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:.14em;">{{code}}</div>
   <p style="margin:18px 0 0;color:#6b7280;font-size:14px;">If you did not request this code, you can safely ignore this email.</p>`
);
const welcomeTemplate = wrapEmailHtml(
  'Welcome to S2dent',
  `<p style="margin:0 0 12px;">Hello {{name}},</p>
   <p style="margin:0;">Your account is ready. You can now continue using the platform and complete the next steps in your workflow.</p>`
);
const genericTemplate = wrapEmailHtml(
  'Notification from S2dent',
  `<p style="margin:0;white-space:pre-line;">{{message}}</p>`
);
const transporter = nodemailer.createTransport({
  host: env.email.smtpHost,
  port: env.email.smtpPort,
  secure: env.email.smtpPort === 465,
  auth: env.email.smtpUser && env.email.smtpPass ? {
    user: env.email.smtpUser,
    pass: env.email.smtpPass,
  } : undefined,
});

const logMailFailure = (recipient, error) => {
  console.error(`Email delivery failed for ${recipient}: ${error?.message || error}`);
};


const sendEmail = async ({ to, subject, message, html, text }) => {
  try {
    // During tests I don't want to send real emails; just log them and return.
    if ((!env.PRODUCTION) || (env.NODE_ENV === 'test')) {
      console.log('\n[EMAIL - test mode]');
      console.log(`From: ${env.email.from}`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      if (html) console.log('HTML:', html);
      else console.log('Message:', message || text || '');
      console.log('--- end email ---\n');
      return;
    }

    void transporter.sendMail({
      from: env.email.from,
      to,
      subject,
      text: text || message || '',
      html: html || interpolateTemplate(genericTemplate, {
        message: escapeHtml(message || text || ''),
      }),
    })
      .then(() => {
        console.log(`Email sent successfully to ${to}`);
      })
      .catch((error) => {
        logMailFailure(to, error);
      });
  } catch (error) {
    logMailFailure(to, error);
  }
};
const sendOtpEmail = async (to, otp) => sendEmail({
  to,
  subject: 'Your OTP Code',
  html: interpolateTemplate(otpTemplate, { code: escapeHtml(otp) }),
  text: `Your OTP code is: ${otp}`,
});
const sendWelcomeEmail = async (to, name) => sendEmail({
  to,
  subject: 'Welcome to S2dent',
  html: interpolateTemplate(welcomeTemplate, { name: escapeHtml(name) }),
  text: `Hello ${name}, welcome to S2dent.`,
});


export { sendEmail, sendOtpEmail, sendWelcomeEmail };