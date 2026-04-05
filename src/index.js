import express from 'express';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import config from './config.js';
import logger from './utils/logger.js';
import { initDatabase } from './services/knowledgeBase.js';
import webhookRoutes from './routes/webhook.js';
import slackRoutes from './routes/slackInteractions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Ensure required directories exist ────────────
mkdirSync(join(__dirname, '../data'), { recursive: true });
mkdirSync(join(__dirname, '../logs'), { recursive: true });

// ── Initialize database ─────────────────────────
initDatabase();

// ── Create Express app ──────────────────────────
const app = express();

// Raw body capture for Slack signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

// ── Request logging ─────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
    });
  });
  next();
});

// ── Routes ──────────────────────────────────────
app.use('/webhook', webhookRoutes);
app.use('/slack', slackRoutes);

// Root health check
app.get('/', (req, res) => {
  res.json({
    service: 'Ascend AI — Agentic Client Onboarding',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      webhook: 'POST /webhook/tally',
      health: 'GET /webhook/health',
      slack: 'POST /slack/interactions',
    },
  });
});

// ── Error handling ──────────────────────────────
app.use((err, req, res, _next) => {
  logger.error({ error: err.message, stack: err.stack, path: req.path }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ────────────────────────────────
app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, '🚀 Ascend AI server started');
  logger.info('Endpoints:');
  logger.info(`  POST /webhook/tally     — Tally form webhook`);
  logger.info(`  GET  /webhook/health    — Health check`);
  logger.info(`  POST /slack/interactions — Slack button/modal handler`);
});

export default app;
