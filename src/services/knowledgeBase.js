import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../data/knowledge.db');
const SCHEMA_PATH = join(__dirname, '../db/schema.sql');

let db;

/**
 * Initialize the SQLite database, creating tables if needed.
 */
export function initDatabase() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schema = readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  logger.info({ path: DB_PATH }, 'Knowledge base initialized');
  return db;
}

/**
 * Save a successful content piece + audit results to the knowledge base.
 */
export function saveSuccessfulContent({
  clientIndustry,
  targetAudience,
  contentType,
  content,
  targetKeyword = '',
  brandTone = '',
  websiteGoal = '',
  auditScores = {},
  passReasons = '',
  failHistory = [],
  attemptsToPass = 1,
  clientName = '',
}) {
  const id = uuidv4();
  const overall =
    Object.values(auditScores).reduce((a, b) => a + b, 0) / Object.keys(auditScores).length || 0;

  const stmt = db.prepare(`
    INSERT INTO successful_content
      (id, client_industry, target_audience, content_type, content, target_keyword, brand_tone, website_goal,
       seo_score, no_fluff_score, conversion_score, helpfulness_score,
       readability_score, brand_alignment_score, completeness_score, unique_value_score,
       overall_score, pass_reasons, fail_history, attempts_to_pass, client_name)
    VALUES
      (?, ?, ?, ?, ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    clientIndustry,
    targetAudience,
    contentType,
    content,
    targetKeyword,
    brandTone,
    websiteGoal,
    auditScores.seo || 0,
    auditScores.no_fluff || 0,
    auditScores.conversion || 0,
    auditScores.helpfulness || 0,
    auditScores.readability || 0,
    auditScores.brand_alignment || 0,
    auditScores.completeness || 0,
    auditScores.unique_value || 0,
    overall,
    passReasons,
    JSON.stringify(failHistory),
    attemptsToPass,
    clientName,
  );

  logger.info({ id, clientIndustry, contentType, overall }, 'Knowledge base → saved successful content');
  return id;
}

/**
 * Save an audit failure for anti-pattern learning.
 */
export function saveAuditFailure({ clientIndustry, contentType, failedChecks, feedback, attemptNumber }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO audit_failures (id, client_industry, content_type, failed_checks, feedback, attempt_number)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, clientIndustry, contentType, JSON.stringify(failedChecks), feedback, attemptNumber);

  logger.debug({ id, clientIndustry, failedChecks }, 'Knowledge base → saved audit failure');
}

/**
 * Retrieve successful content examples for the Content Writer agent.
 * Searches by industry, audience, and content type — returns top examples.
 */
export function getKnowledge(industry, audience, contentType, limit = 5) {
  // First try exact match
  let results = db
    .prepare(
      `SELECT content, pass_reasons, overall_score, brand_tone, target_keyword, attempts_to_pass
       FROM successful_content
       WHERE client_industry LIKE ? AND content_type = ?
       ORDER BY overall_score DESC
       LIMIT ?`,
    )
    .all(`%${industry}%`, contentType, limit);

  // Fall back to broader match if no results
  if (results.length === 0) {
    results = db
      .prepare(
        `SELECT content, pass_reasons, overall_score, brand_tone, target_keyword, attempts_to_pass
         FROM successful_content
         WHERE content_type = ?
         ORDER BY overall_score DESC
         LIMIT ?`,
      )
      .all(contentType, limit);
  }

  // Also get common failure patterns to avoid
  const failures = db
    .prepare(
      `SELECT failed_checks, feedback
       FROM audit_failures
       WHERE client_industry LIKE ? AND content_type = ?
       ORDER BY created_at DESC
       LIMIT 3`,
    )
    .all(`%${industry}%`, contentType);

  return {
    successExamples: results,
    failurePatterns: failures.map((f) => ({
      failedChecks: JSON.parse(f.failed_checks),
      feedback: f.feedback,
    })),
  };
}

/**
 * OpenAI function definition for the Content Writer agent.
 */
export const knowledgeBaseToolDef = {
  type: 'function',
  function: {
    name: 'get_knowledge',
    description:
      'Retrieve successful content examples and failure patterns from the knowledge base. Use this before writing to learn from past successes and avoid past mistakes. Returns top-performing content for similar industries and content types, along with common failure reasons.',
    parameters: {
      type: 'object',
      properties: {
        industry: { type: 'string', description: 'The client industry (e.g. plumbing, dental, landscaping).' },
        audience: { type: 'string', description: 'The target audience description.' },
        content_type: {
          type: 'string',
          enum: ['homepage', 'about', 'services', 'service_detail', 'contact', 'full_site'],
          description: 'The type of content to retrieve examples for.',
        },
      },
      required: ['industry', 'content_type'],
    },
  },
};

// ── Pipeline run tracking ─────────────────────

export function createPipelineRun(clientName, clientEmail, formData) {
  const id = uuidv4();
  db.prepare(
    `INSERT INTO pipeline_runs (id, client_name, client_email, form_data) VALUES (?, ?, ?, ?)`,
  ).run(id, clientName, clientEmail, JSON.stringify(formData));
  return id;
}

export function updatePipelineRun(id, updates) {
  const allowed = [
    'status',
    'research_report',
    'content_markdown',
    'audit_attempts',
    'drive_report_link',
    'drive_content_link',
    'error_message',
    'completed_at',
  ];
  const sets = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    }
  }
  if (sets.length > 0) {
    values.push(id);
    db.prepare(`UPDATE pipeline_runs SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }
}

export function getPipelineRun(id) {
  return db.prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(id);
}

export default {
  initDatabase,
  saveSuccessfulContent,
  saveAuditFailure,
  getKnowledge,
  knowledgeBaseToolDef,
  createPipelineRun,
  updatePipelineRun,
  getPipelineRun,
};
