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

const parseSender = (fromStr) => {
  if (!fromStr) return { email: 'no-reply@s2dent.com' };

  const match = fromStr.match(/^(?:"?([^"<]+)"?\s)?<([^>]+)>$/);
  if (match) {
    const name = match[1]?.trim();
    const email = match[2]?.trim();
    return name ? { name, email } : { email };
  }

  return { email: fromStr.trim() };
};

const formatRecipients = (to) => {
  if (Array.isArray(to)) {
    return to.map(email => ({ email: String(email).trim() }));
  }
  if (typeof to === 'string') {
    return to.split(',')
      .map(email => ({ email: email.trim() }))
      .filter(e => e.email);
  }
  return [];
};

const buildBrevoPayload = ({ to, subject, message, html, text }) => {
  const htmlContent = html || interpolateTemplate(genericTemplate, {
    message: escapeHtml(message || text || ''),
  });
  
  return {
    sender: parseSender(env.email.from),
    to: formatRecipients(to),
    subject,
    htmlContent,
    textContent: text || message || '',
  };
};

const sendToBrevoApi = async (payload) => {
  //console.log(`Api key is: ${env.email.brevoApiKey}`);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.email.brevoApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned status ${response.status}: ${errorText}`);
  }
  
  return response;
};

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

    const payload = buildBrevoPayload({ to, subject, message, html, text });
    await sendToBrevoApi(payload);
    
    console.log(`Email sent successfully to ${to}`);
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
