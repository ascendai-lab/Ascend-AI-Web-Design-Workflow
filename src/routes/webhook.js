import { Router } from 'express';
import logger from '../utils/logger.js';
import { parseTallyForm } from '../utils/formParser.js';
import { runPipeline } from '../pipeline/orchestrator.js';

const router = Router();

/**
 * POST /webhook/tally
 * Receives Tally form submissions and kicks off the full pipeline.
 */
router.post('/tally', async (req, res) => {
  try {
    // Tally sends eventType: FORM_RESPONSE for submissions
    if (req.body.eventType !== 'FORM_RESPONSE') {
      logger.debug({ eventType: req.body.eventType }, 'Webhook → ignoring non-response event');
      return res.status(200).json({ status: 'ignored' });
    }

    // Parse the form data
    const clientData = parseTallyForm(req.body);

    logger.info(
      { clientName: clientData.businessName, email: clientData.contactEmail },
      'Webhook → new client submission received',
    );

    // Respond immediately — pipeline runs in background
    res.status(200).json({
      status: 'accepted',
      message: `Pipeline started for ${clientData.businessName}`,
    });

    // Run the pipeline asynchronously (don't await — it takes minutes)
    runPipeline(clientData).catch((err) => {
      logger.error(
        { clientName: clientData.businessName, error: err.message },
        'Pipeline → unhandled error',
      );
    });
  } catch (err) {
    logger.error({ error: err.message }, 'Webhook → failed to process');
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /webhook/health
 * Simple health check endpoint.
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ascend-ai', timestamp: new Date().toISOString() });
});

export default router;
