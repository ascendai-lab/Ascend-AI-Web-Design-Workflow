import { WebClient } from '@slack/web-api';
import config from '../config.js';
import logger from '../utils/logger.js';

const slack = new WebClient(config.slack.botToken);

/**
 * Send a research-complete notification.
 */
export async function notifyResearchComplete({ clientName, reportLink, highlights }) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🔬 Research Complete: ${clientName}`, emoji: true },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Research report is ready!*\n\n📄 <${reportLink}|View Research Report PDF>\n\n${highlights || ''}`,
      },
    },
    {
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `⏳ Content writing agent is now drafting website copy...` }],
    },
  ];

  const result = await slack.chat.postMessage({
    channel: config.slack.channelId,
    text: `🔬 Research Complete: ${clientName}`,
    blocks,
  });

  logger.info({ clientName, ts: result.ts }, 'Slack → research notification sent');
  return result.ts;
}

/**
 * Send a content-ready notification with Approve/Revise buttons.
 */
export async function notifyContentReady({ clientName, reportLink, docLink, auditAttempts, pipelineId }) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `🎉 Content Ready: ${clientName}`, emoji: true },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `*Website content has been written and passed the quality audit!*`,
          ``,
          `📄 Research Report: <${reportLink}|View PDF>`,
          `📝 Website Content: <${docLink}|View Google Doc>`,
          ``,
          `✅ Audit: Passed on attempt ${auditAttempts}`,
        ].join('\n'),
      },
    },
    { type: 'divider' },
    {
      type: 'actions',
      block_id: `content_approval_${pipelineId}`,
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Approve & Send to Client', emoji: true },
          style: 'primary',
          action_id: 'approve_content',
          value: pipelineId,
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '❌ Revise', emoji: true },
          style: 'danger',
          action_id: 'revise_content',
          value: pipelineId,
        },
      ],
    },
  ];

  const result = await slack.chat.postMessage({
    channel: config.slack.channelId,
    text: `🎉 Content Ready: ${clientName} — Review and approve`,
    blocks,
  });

  logger.info({ clientName, pipelineId, ts: result.ts }, 'Slack → content approval sent');
  return result.ts;
}

/**
 * Update a message after approval/rejection.
 */
export async function updateMessage(ts, text) {
  await slack.chat.update({
    channel: config.slack.channelId,
    ts,
    text,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text },
      },
    ],
  });
}

/**
 * Post a simple message to the channel.
 */
export async function postMessage(text) {
  return slack.chat.postMessage({
    channel: config.slack.channelId,
    text,
  });
}

/**
 * Open a modal to collect revision feedback.
 */
export async function openRevisionModal(triggerId, pipelineId) {
  await slack.views.open({
    trigger_id: triggerId,
    view: {
      type: 'modal',
      callback_id: `revision_feedback_${pipelineId}`,
      title: { type: 'plain_text', text: 'Revision Notes' },
      submit: { type: 'plain_text', text: 'Send Back for Revision' },
      blocks: [
        {
          type: 'input',
          block_id: 'feedback_block',
          label: { type: 'plain_text', text: 'What needs to be changed?' },
          element: {
            type: 'plain_text_input',
            action_id: 'feedback_text',
            multiline: true,
            placeholder: { type: 'plain_text', text: 'Describe what you want revised...' },
          },
        },
      ],
    },
  });
}

export default {
  notifyResearchComplete,
  notifyContentReady,
  updateMessage,
  postMessage,
  openRevisionModal,
};
