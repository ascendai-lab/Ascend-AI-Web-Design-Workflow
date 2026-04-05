import axios from 'axios';
import logger from '../utils/logger.js';

const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

/**
 * Run a Google PageSpeed Insights audit on a URL.
 * Free API — no API key required for basic usage.
 *
 * @param {string} url — the URL to audit
 * @param {'mobile'|'desktop'} strategy — device strategy
 * @returns {object} audit results with scores and recommendations
 */
export async function auditWebsite(url, strategy = 'mobile') {
  logger.info({ url, strategy }, 'Site Audit → running PageSpeed Insights');

  try {
    const { data } = await axios.get(PSI_API_URL, {
      params: {
        url,
        strategy,
        category: ['performance', 'seo', 'accessibility', 'best-practices'],
      },
      timeout: 60000, // PSI can be slow
    });

    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};

    // Extract scores (0-100)
    const scores = {};
    for (const [key, cat] of Object.entries(categories)) {
      scores[key] = Math.round((cat.score || 0) * 100);
    }

    // Extract key audit findings
    const findings = [];
    const importantAudits = [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'speed-index',
      'meta-description',
      'document-title',
      'image-alt',
      'link-text',
      'is-crawlable',
      'robots-txt',
      'viewport',
      'font-size',
      'tap-targets',
      'http-status-code',
    ];

    for (const auditId of importantAudits) {
      const audit = audits[auditId];
      if (audit) {
        findings.push({
          id: auditId,
          title: audit.title,
          score: audit.score,
          displayValue: audit.displayValue || '',
          description: audit.description?.substring(0, 200) || '',
        });
      }
    }

    const result = {
      url,
      strategy,
      scores,
      findings,
      overallAssessment:
        scores.performance >= 90
          ? 'Excellent performance'
          : scores.performance >= 50
            ? 'Needs improvement'
            : 'Poor performance — significant issues',
    };

    logger.info({ url, scores }, 'Site Audit → complete');
    return result;
  } catch (err) {
    logger.error({ url, error: err.message }, 'Site Audit → failed');
    return {
      url,
      error: `Audit failed: ${err.message}`,
      scores: {},
      findings: [],
    };
  }
}

/**
 * OpenAI function definition for agents.
 */
export const siteAuditToolDef = {
  type: 'function',
  function: {
    name: 'audit_website',
    description:
      'Run a performance and SEO audit on a website URL using Google PageSpeed Insights. Returns scores for performance, SEO, accessibility, and best practices (0-100), plus specific findings and recommendations. Use this to audit client websites and competitor sites.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to audit (e.g. https://example.com)',
        },
        strategy: {
          type: 'string',
          enum: ['mobile', 'desktop'],
          description: 'Device strategy for audit. Default: mobile',
        },
      },
      required: ['url'],
    },
  },
};

export default { auditWebsite, siteAuditToolDef };
