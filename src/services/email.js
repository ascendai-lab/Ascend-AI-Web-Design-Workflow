import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from '../config.js';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false, // STARTTLS
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

/**
 * Send the content review email to the client.
 *
 * @param {string} to — client email
 * @param {string} clientName — business name
 * @param {string} contactName — client contact name
 * @param {string} docLink — Google Doc link
 */
export async function sendContentReviewEmail(to, clientName, contactName, docLink) {
  let htmlTemplate;
  try {
    htmlTemplate = readFileSync(join(__dirname, '../../templates/email.html'), 'utf-8');
  } catch {
    // Fallback if template doesn't exist
    htmlTemplate = DEFAULT_EMAIL_HTML;
  }

  const html = htmlTemplate
    .replace(/{{clientName}}/g, clientName)
    .replace(/{{contactName}}/g, contactName || clientName)
    .replace(/{{docLink}}/g, docLink);

  const info = await transporter.sendMail({
    from: config.email.from,
    to,
    subject: `${clientName} — Your Website Content is Ready for Review`,
    html,
    text: `Hi ${contactName},\n\nGreat news! The website content for ${clientName} is ready for your review.\n\nView your content here: ${docLink}\n\nPlease review and leave any comments directly on the document. We'll incorporate your feedback before moving to design.\n\nBest,\nAscend AI Marketing Team`,
  });

  logger.info({ to, messageId: info.messageId }, 'Email → sent to client');
  return info.messageId;
}

const DEFAULT_EMAIL_HTML = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; padding: 20px 0;">
    <h1 style="color: #7c3aed; margin: 0;">Ascend AI Marketing</h1>
  </div>
  <hr style="border: none; border-top: 2px solid #7c3aed; margin: 20px 0;">
  <p>Hi {{contactName}},</p>
  <p>Great news! The website content for <strong>{{clientName}}</strong> is ready for your review.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="{{docLink}}" style="background: #7c3aed; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">Review Your Content →</a>
  </div>
  <p>Please review the document and leave any comments or suggestions directly on it. We'll incorporate your feedback before moving to design.</p>
  <p>Best,<br><strong>Ascend AI Marketing Team</strong></p>
  <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0 10px;">
  <p style="font-size: 12px; color: #999; text-align: center;">Ascend AI Marketing · Powered by AI, guided by strategy</p>
</body>
</html>`;

export default { sendContentReviewEmail };
