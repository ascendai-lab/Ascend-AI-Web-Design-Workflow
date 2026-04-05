import 'dotenv/config';

/**
 * Centralized configuration — validates all required env vars at startup.
 * If anything critical is missing the process exits immediately.
 */

const required = [
  'OPENAI_API_KEY',
  'BRAVE_SEARCH_API_KEY',
  'GOOGLE_SERVICE_ACCOUNT_KEY_PATH',
  'GOOGLE_DRIVE_PARENT_FOLDER_ID',
  'SLACK_BOT_TOKEN',
  'SLACK_SIGNING_SECRET',
  'SLACK_CHANNEL_ID',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables:\n  ${missing.join('\n  ')}`);
  console.error('\nCopy .env.example → .env and fill in all values.');
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-5.4-mini',
  },

  // Brave Search
  brave: {
    apiKey: process.env.BRAVE_SEARCH_API_KEY,
  },

  // Google
  google: {
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    driveParentFolderId: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
  },

  // Slack
  slack: {
    botToken: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    channelId: process.env.SLACK_CHANNEL_ID,
  },

  // Email
  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM,
  },

  // Audit
  audit: {
    maxAttempts: parseInt(process.env.MAX_AUDIT_ATTEMPTS, 10) || 3,
    passThreshold: parseInt(process.env.AUDIT_PASS_THRESHOLD, 10) || 7,
  },

  // Optional
  tally: {
    webhookSecret: process.env.TALLY_WEBHOOK_SECRET || '',
  },
};

export default config;
