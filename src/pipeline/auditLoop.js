import config from '../config.js';
import logger from '../utils/logger.js';
import { runContentAgent } from '../agents/contentAgent.js';
import { runAuditAgent } from '../agents/auditAgent.js';
import { saveSuccessfulContent, saveAuditFailure } from '../services/knowledgeBase.js';

/**
 * The Write → Audit → Revise loop.
 * Content is written, then audited against the 8-point quality gate.
 * If it fails, audit feedback is sent back to the writer for revision.
 * Max attempts determined by config.audit.maxAttempts (default 3).
 *
 * @param {object} clientData — parsed Tally form
 * @param {object} research — research findings
 * @returns {{ content: string, auditResult: object, attempts: number, failHistory: Array }}
 */
export async function runAuditLoop(clientData, research) {
  const maxAttempts = config.audit.maxAttempts;
  let content = null;
  let auditResult = null;
  let attempts = 0;
  const failHistory = [];

  const industry = clientData.businessDescription || clientData.businessName;

  while (attempts < maxAttempts) {
    attempts++;
    logger.info({ clientName: clientData.businessName, attempt: attempts, maxAttempts }, '🔄 Audit Loop → attempt');

    // ── Step 1: Write (or Revise) ──────────────────
    if (attempts === 1) {
      // First attempt — fresh content
      content = await runContentAgent(clientData, research);
    } else {
      // Revision — send back the feedback + previous content
      const revisionFeedback = auditResult.writerFeedback;
      content = await runContentAgent(clientData, research, revisionFeedback, content);
    }

    // ── Step 2: Audit ──────────────────────────────
    auditResult = await runAuditAgent(content, clientData, research);

    if (auditResult.overallResult === 'PASS') {
      logger.info(
        { clientName: clientData.businessName, attempt: attempts, scores: auditResult.scores },
        '✅ Audit Loop → PASSED',
      );

      // Save to knowledge base for learning
      try {
        saveSuccessfulContent({
          clientIndustry: industry,
          targetAudience: clientData.idealCustomer || '',
          contentType: 'full_site',
          content,
          targetKeyword: research.targetKeyword || '',
          brandTone: clientData.brandWords || '',
          websiteGoal: clientData.websiteGoal || '',
          auditScores: auditResult.scores,
          passReasons: auditResult.passReasons || auditResult.summary || '',
          failHistory,
          attemptsToPass: attempts,
          clientName: clientData.businessName,
        });
      } catch (err) {
        logger.error({ error: err.message }, 'Failed to save to knowledge base');
      }

      return { content, auditResult, attempts, failHistory };
    }

    // ── Failed — record and loop ───────────────────
    logger.warn(
      {
        clientName: clientData.businessName,
        attempt: attempts,
        failedChecks: auditResult.failedCheckNames,
      },
      '❌ Audit Loop → FAILED, revising...',
    );

    failHistory.push({
      attempt: attempts,
      failedChecks: auditResult.failedCheckNames,
      feedback: auditResult.writerFeedback,
      scores: auditResult.scores,
    });

    // Save failure to knowledge base for anti-pattern learning
    try {
      saveAuditFailure({
        clientIndustry: industry,
        contentType: 'full_site',
        failedChecks: auditResult.failedCheckNames,
        feedback: auditResult.writerFeedback,
        attemptNumber: attempts,
      });
    } catch (err) {
      logger.error({ error: err.message }, 'Failed to save audit failure');
    }
  }

  // Exhausted all attempts — return with warning
  logger.warn(
    { clientName: clientData.businessName, finalAttempt: attempts },
    '⚠️ Audit Loop → exhausted all attempts, proceeding with warning',
  );

  return {
    content,
    auditResult,
    attempts,
    failHistory,
    exhausted: true,
  };
}

export default { runAuditLoop };
