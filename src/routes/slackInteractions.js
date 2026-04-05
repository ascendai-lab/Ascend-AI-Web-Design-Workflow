import { Router } from 'express';
import crypto from 'crypto';
import config from '../config.js';
import logger from '../utils/logger.js';
import { getPipelineRun, updatePipelineRun } from '../services/knowledgeBase.js';
import { sendContentReviewEmail } from '../services/email.js';
import { updateMessage, openRevisionModal, postMessage } from '../services/slack.js';
import { runContentAgent } from '../agents/contentAgent.js';
import { runAuditLoop } from '../pipeline/auditLoop.js';
import { createGoogleDoc } from '../services/googleDocs.js';
import { createClientFolder } from '../services/googleDrive.js';

const router = Router();

/**
 * POST /slack/interactions
 * Handles Slack interactive components (button clicks, modal submissions).
 */
router.post('/interactions', async (req, res) => {
  // Slack sends the payload as a URL-encoded "payload" field
  const rawPayload = req.body.payload;
  if (!rawPayload) {
    return res.status(400).send('Missing payload');
  }

  const payload = JSON.parse(rawPayload);

  // Verify Slack signature
  if (!verifySlackSignature(req)) {
    logger.warn('Slack → invalid signature');
    return res.status(401).send('Invalid signature');
  }

  // Respond immediately to Slack (they require <3s response)
  res.status(200).send();

  try {
    if (payload.type === 'block_actions') {
      await handleBlockAction(payload);
    } else if (payload.type === 'view_submission') {
      await handleViewSubmission(payload);
    }
  } catch (err) {
    logger.error({ error: err.message, type: payload.type }, 'Slack Interaction → error');
  }
});

/**
 * Handle button clicks (Approve / Revise).
 */
async function handleBlockAction(payload) {
  const action = payload.actions[0];
  const pipelineId = action.value;
  const user = payload.user.name || payload.user.id;

  logger.info({ action: action.action_id, pipelineId, user }, 'Slack → button click');

  if (action.action_id === 'approve_content') {
    // ── APPROVE FLOW ─────────────────────────────
    const run = getPipelineRun(pipelineId);
    if (!run) {
      logger.error({ pipelineId }, 'Slack → pipeline run not found');
      return;
    }

    const formData = JSON.parse(run.form_data);

    // Update Slack message
    await updateMessage(
      payload.message.ts,
      `✅ *Content Approved by ${user}*\n\n📧 Sending review link to ${formData.contactEmail}...`,
    );

    // Send email to client
    await sendContentReviewEmail(
      formData.contactEmail,
      formData.businessName,
      formData.contactName,
      run.drive_content_link,
    );

    // Update pipeline status
    updatePipelineRun(pipelineId, {
      status: 'emailed',
      completed_at: new Date().toISOString(),
    });

    await postMessage(
      `📧 Email sent to ${formData.contactName} (${formData.contactEmail}) with the Google Doc link.\n\n✅ Pipeline complete for *${formData.businessName}*.`,
    );

    logger.info({ pipelineId, clientName: formData.businessName }, '🎉 Pipeline → complete, email sent');
  } else if (action.action_id === 'revise_content') {
    // ── REVISE FLOW → Open feedback modal ────────
    await openRevisionModal(payload.trigger_id, pipelineId);
  }
}

/**
 * Handle modal submissions (revision feedback).
 */
async function handleViewSubmission(payload) {
  // Extract pipeline ID from callback_id: "revision_feedback_{pipelineId}"
  const callbackId = payload.view.callback_id;
  const pipelineId = callbackId.replace('revision_feedback_', '');
  const feedback =
    payload.view.state.values.feedback_block.feedback_text.value;

  logger.info({ pipelineId, feedbackLength: feedback.length }, 'Slack → revision feedback received');

  const run = getPipelineRun(pipelineId);
  if (!run) {
    logger.error({ pipelineId }, 'Slack → pipeline run not found');
    return;
  }

  const formData = JSON.parse(run.form_data);
  const research = typeof run.research_report === 'string'
    ? JSON.parse(run.research_report)
    : run.research_report;

  await postMessage(
    `🔄 *Revision requested for ${formData.businessName}*\n\n> ${feedback}\n\nRewriting content...`,
  );

  updatePipelineRun(pipelineId, { status: 'revising' });

  // Re-run content writer with the human feedback
  try {
    const revisionPrompt = `## Human Revision Request\n\nThe client account manager reviewed the content and requested the following changes:\n\n${feedback}\n\nPlease incorporate this feedback while maintaining all audit quality standards.`;

    const content = await runContentAgent(formData, research, revisionPrompt, run.content_markdown);

    // Create new Google Doc
    const folderId = await createClientFolder(formData.businessName);
    const doc = await createGoogleDoc(
      `${formData.businessName} — Website Content (Revised)`,
      content,
      folderId,
    );

    updatePipelineRun(pipelineId, {
      content_markdown: content,
      drive_content_link: doc.webViewLink,
      status: 'awaiting_approval',
    });

    // Import dynamically to avoid circular dependency
    const { notifyContentReady } = await import('../services/slack.js');
    await notifyContentReady({
      clientName: formData.businessName,
      reportLink: run.drive_report_link,
      docLink: doc.webViewLink,
      auditAttempts: 'Revised',
      pipelineId,
    });
  } catch (err) {
    logger.error({ pipelineId, error: err.message }, 'Revision → failed');
    await postMessage(`❌ Revision failed for ${formData.businessName}: ${err.message}`);
    updatePipelineRun(pipelineId, { status: 'failed', error_message: err.message });
  }
}

/**
 * Verify the Slack signing secret.
 */
function verifySlackSignature(req) {
  try {
    const timestamp = req.headers['x-slack-request-timestamp'];
    const slackSignature = req.headers['x-slack-signature'];

    if (!timestamp || !slackSignature) return false;

    // Prevent replay attacks (5 minutes)
    const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
    if (parseInt(timestamp) < fiveMinAgo) return false;

    const sigBaseString = `v0:${timestamp}:${req.rawBody || ''}`;
    const mySignature =
      'v0=' +
      crypto
        .createHmac('sha256', config.slack.signingSecret)
        .update(sigBaseString)
        .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(slackSignature));
  } catch {
    return false;
  }
}

export default router;
