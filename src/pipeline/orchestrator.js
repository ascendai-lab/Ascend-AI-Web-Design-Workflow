import logger from '../utils/logger.js';
import { runResearchAgent } from '../agents/researchAgent.js';
import { runAuditLoop } from './auditLoop.js';
import { generateReport } from '../services/reportGenerator.js';
import { createClientFolder, uploadFile } from '../services/googleDrive.js';
import { createGoogleDoc } from '../services/googleDocs.js';
import { notifyResearchComplete, notifyContentReady } from '../services/slack.js';
import { createPipelineRun, updatePipelineRun } from '../services/knowledgeBase.js';

/**
 * The full pipeline orchestrator.
 * Coordinates the entire flow from Tally form → Research → Content → Audit → Google Drive → Slack.
 *
 * @param {object} clientData — parsed Tally form data
 * @returns {string} pipelineId for tracking
 */
export async function runPipeline(clientData) {
  const pipelineId = createPipelineRun(
    clientData.businessName,
    clientData.contactEmail,
    clientData,
  );

  logger.info({ pipelineId, clientName: clientData.businessName }, '🚀 Pipeline → started');

  try {
    // ── Step 1: Create Google Drive folder ───────────
    logger.info({ clientName: clientData.businessName }, 'Pipeline → creating Google Drive folder');
    const folderId = await createClientFolder(clientData.businessName);
    updatePipelineRun(pipelineId, { status: 'folder_created' });

    // ── Step 2: Run Research Agent ───────────────────
    logger.info({ clientName: clientData.businessName }, 'Pipeline → running research agent');
    const research = await runResearchAgent(clientData);
    updatePipelineRun(pipelineId, { status: 'research_complete', research_report: research });

    // ── Step 3: Generate & Upload Research Report ────
    logger.info({ clientName: clientData.businessName }, 'Pipeline → generating research report PDF');
    const reportPdf = await generateReport(research, clientData);
    const reportFile = await uploadFile(
      `${clientData.businessName} — Research Report.pdf`,
      reportPdf,
      'application/pdf',
      folderId,
    );
    updatePipelineRun(pipelineId, { drive_report_link: reportFile.webViewLink });

    // ── Step 4: Notify Slack — Research Complete ─────
    const highlights = research.targetKeyword
      ? `🎯 Target Keyword: *${research.targetKeyword}*`
      : '';
    await notifyResearchComplete({
      clientName: clientData.businessName,
      reportLink: reportFile.webViewLink,
      highlights,
    });

    // ── Step 5: Run Content Writer → Audit Loop ─────
    logger.info({ clientName: clientData.businessName }, 'Pipeline → running content + audit loop');
    updatePipelineRun(pipelineId, { status: 'content_writing' });
    const { content, auditResult, attempts, exhausted } = await runAuditLoop(clientData, research);
    updatePipelineRun(pipelineId, {
      status: 'auditing',
      content_markdown: content,
      audit_attempts: attempts,
    });

    // ── Step 6: Create Google Doc from content ───────
    logger.info({ clientName: clientData.businessName }, 'Pipeline → creating Google Doc');
    const doc = await createGoogleDoc(
      `${clientData.businessName} — Website Content`,
      content,
      folderId,
    );
    updatePipelineRun(pipelineId, { drive_content_link: doc.webViewLink });

    // ── Step 7: Notify Slack — Content Ready ─────────
    await notifyContentReady({
      clientName: clientData.businessName,
      reportLink: reportFile.webViewLink,
      docLink: doc.webViewLink,
      auditAttempts: attempts,
      pipelineId,
      exhausted,
    });

    updatePipelineRun(pipelineId, { status: 'awaiting_approval' });
    logger.info(
      { pipelineId, clientName: clientData.businessName, auditAttempts: attempts },
      '🎉 Pipeline → content ready, awaiting approval',
    );

    return pipelineId;
  } catch (err) {
    logger.error(
      { pipelineId, clientName: clientData.businessName, error: err.message, stack: err.stack },
      '❌ Pipeline → failed',
    );
    updatePipelineRun(pipelineId, { status: 'failed', error_message: err.message });
    throw err;
  }
}

export default { runPipeline };
