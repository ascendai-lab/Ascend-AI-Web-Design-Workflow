import OpenAI from 'openai';
import config from '../config.js';
import logger from '../utils/logger.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

const SYSTEM_PROMPT = `You are a ruthless content quality auditor for Ascend AI Marketing, a premium web design agency. Your job is to ensure every piece of website content meets the highest professional standards before it reaches a client paying $5,000+ for a website.

You evaluate content against 8 mandatory quality checks. You are NOT lenient — mediocre copy does not pass. Generic content does not pass. Content with filler phrases does not pass.

## The 8-Point Audit Checklist

### Check 1: SEO Optimization
- Target keyword appears in H1 heading
- Target keyword in first 100 words of body copy
- Meta title present and under 60 characters with keyword
- Meta description present and under 160 characters with keyword
- Keyword density between 1-2% (not stuffed, not absent)
- At least 3 semantically related / LSI keywords present
- Header tags (H2, H3) include keyword variations
Score 7+ to PASS.

### Check 2: No Fluff
- NO filler phrases: "In today's world", "It goes without saying", "We pride ourselves", "Look no further", "Welcome to our website", "One-stop shop", "Above and beyond", "At the end of the day", "State-of-the-art", "Cutting-edge", "Goes above and beyond"  
- No redundant sentences (saying the same thing twice)
- No vague claims without specifics ("we're the best", "top-quality service")
- Every paragraph advances the reader's understanding or motivation
- No paragraphs that could be deleted without losing meaning
- Active voice used predominantly (>80%)
Score 7+ to PASS.

### Check 3: Conversion Focus
- Every page has at least one clear CTA (Call-to-Action)
- CTAs use action verbs ("Get Your Free Quote", not "Submit")
- Copy leads with benefits, not features
- Pain points from research are directly addressed
- Urgency or desire created without being manipulative
- Social proof elements included (reviews, stats, trust markers)
- Objection handling present
- Logical persuasion flow: Problem → Agitate → Solution
Score 7+ to PASS.

### Check 4: Helpfulness & Authority
- Content answers real questions the target audience asks
- Information is actionable (reader knows what to do next)
- Demonstrates expertise through specific knowledge
- Includes data points, statistics, or specific claims where possible
- No generic advice that could apply to any business
- Content would genuinely help someone even if they don't buy
Score 7+ to PASS.

### Check 5: Readability & Scannability
- Paragraphs are 3-4 sentences max
- Sentences average under 20 words
- Subheadings every 200-300 words
- Bullet points or numbered lists for multi-item information
- Grade level appropriate for target audience (typically 7th-9th grade)
- Key information bolded or highlighted
- Scannable — a 5-second skim communicates the core message
Score 7+ to PASS.

### Check 6: Brand Voice Alignment
- Tone matches the brand adjectives from the onboarding form
- Language level matches the target audience
- Consistent voice throughout all pages
- Personality comes through (doesn't read like AI-generated slop)
- Industry-appropriate language
- First person / third person consistency
Score 7+ to PASS.

### Check 7: Completeness
- All standard pages present: Homepage, About, Services, Contact
- No placeholder text ("[INSERT HERE]", "Lorem ipsum", "TBD")
- No incomplete sections or cut-off content
- Meta title and description for every page
- All referenced service/product pages are written
- CTA button text specified for every CTA
Score 7+ to PASS.

### Check 8: Unique Value & Differentiation
- Copy explicitly differentiates from competitors identified in research
- Unique selling propositions featured prominently
- Content is specific to THIS client (not generic industry copy)
- Competitive advantages from the SWOT are leveraged
- Local/personal touches that competitors don't have
- A reader could identify which company this is without seeing the name
Score 7+ to PASS.

## Response Format

You MUST respond with a valid JSON object in this exact format:

{
  "overallResult": "PASS" or "FAIL",
  "checks": {
    "seo": {
      "status": "PASS" or "FAIL",
      "score": 1-10,
      "evidence": "Quote specific examples from the content",
      "feedback": "What's good (if PASS) or what to fix (if FAIL)"
    },
    "no_fluff": { ... same structure ... },
    "conversion": { ... },
    "helpfulness": { ... },
    "readability": { ... },
    "brand_alignment": { ... },
    "completeness": { ... },
    "unique_value": { ... }
  },
  "summary": "2-3 sentence overall assessment",
  "passReasons": "If passing, explain why this content is high quality (for the knowledge base)",
  "priorityFixes": ["If failing, ordered list of the most critical fixes needed"]
}

## Critical Rules
- Generic copy ALWAYS fails Check 8 (Unique Value)
- Filler phrases ALWAYS fail Check 2 (No Fluff) — even ONE filler phrase is a fail
- Missing CTAs ALWAYS fail Check 3 (Conversion)
- Missing pages ALWAYS fail Check 7 (Completeness)
- You cannot pass content you wouldn't be proud to show a client
- ALL 8 checks must score 7+ for overallResult to be "PASS"
- Be specific in your evidence — quote exact lines from the content
- Be actionable in your feedback — tell the writer exactly what to change`;

/**
 * Run the Content Audit Agent against a piece of content.
 *
 * @param {string} content — the website content (markdown)
 * @param {object} clientData — parsed form data
 * @param {object} research — research findings
 * @returns {object} audit results with scores and feedback
 */
export async function runAuditAgent(content, clientData, research) {
  logger.info({ clientName: clientData.businessName, contentLength: content.length }, '🔎 Audit Agent → starting');

  const userPrompt = `Audit the following website content against all 8 quality checks.

## Context

**Client:** ${clientData.businessName}
**Industry:** ${clientData.businessDescription || 'Not specified'}
**Location:** ${clientData.location || 'Not specified'}
**Brand Words:** ${clientData.brandWords || 'Not specified'}
**Website Goal:** ${clientData.websiteGoal || 'Not specified'}
**Target Audience:** ${clientData.idealCustomer || 'Not specified'}
**Customer Hesitations:** ${clientData.customerHesitations || 'Not specified'}
**Target Keyword:** ${research.targetKeyword || 'Not specified'}
**Key Competitors:** ${research.competitorAnalysis ? 'See research' : 'None identified'}

## SWOT Highlights
**Strengths:** ${research.swot?.strengths || 'N/A'}
**Opportunities:** ${research.swot?.opportunities || 'N/A'}

## Content to Audit

${content}

---

Audit this content now. Be thorough and ruthless. Return your complete assessment as JSON.`;

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2, // Low temperature for consistent, exacting audits
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const resultText = response.choices[0].message.content;

  let auditResult;
  try {
    auditResult = JSON.parse(resultText);
  } catch {
    // Try extracting JSON from the response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      auditResult = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Audit Agent returned invalid JSON');
    }
  }

  // Validate the audit result structure
  if (!auditResult.checks || !auditResult.overallResult) {
    throw new Error('Audit Agent returned incomplete result');
  }

  // Recalculate overall result based on scores (don't trust the LLM's self-assessment)
  const threshold = config.audit.passThreshold;
  const checks = auditResult.checks;
  const allPassed = Object.values(checks).every((check) => check.score >= threshold);
  auditResult.overallResult = allPassed ? 'PASS' : 'FAIL';

  // Extract scores into a flat object
  auditResult.scores = {};
  for (const [key, check] of Object.entries(checks)) {
    auditResult.scores[key] = check.score;
  }

  // Build feedback string for the writer (on failure)
  if (auditResult.overallResult === 'FAIL') {
    const failedChecks = Object.entries(checks)
      .filter(([, check]) => check.score < threshold)
      .map(([name, check]) => `### ❌ ${name.toUpperCase()} (Score: ${check.score}/10)\n**Issue:** ${check.feedback}\n**Evidence:** ${check.evidence}`)
      .join('\n\n');

    auditResult.writerFeedback = `## Content Audit Results — FAILED\n\nThe following checks did not meet the quality threshold (${threshold}/10):\n\n${failedChecks}\n\n## Priority Fixes\n${(auditResult.priorityFixes || []).map((f, i) => `${i + 1}. ${f}`).join('\n')}`;

    auditResult.failedCheckNames = Object.entries(checks)
      .filter(([, check]) => check.score < threshold)
      .map(([name]) => name);
  }

  logger.info(
    {
      clientName: clientData.businessName,
      result: auditResult.overallResult,
      scores: auditResult.scores,
    },
    `🔎 Audit Agent → ${auditResult.overallResult}`,
  );

  return auditResult;
}

export default { runAuditAgent };
