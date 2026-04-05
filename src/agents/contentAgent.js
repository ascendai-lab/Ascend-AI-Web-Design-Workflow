import OpenAI from 'openai';
import config from '../config.js';
import logger from '../utils/logger.js';
import { braveSearch, braveSearchToolDef } from '../tools/braveSearch.js';
import { getKnowledge, knowledgeBaseToolDef } from '../services/knowledgeBase.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

const SYSTEM_PROMPT = `You are an elite conversion copywriter at Ascend AI Marketing, a premium web design agency. You write website content that converts visitors into paying customers.

You have access to 2 tools:
1. brave_search — Search the web for additional research, copywriting inspiration, and industry-specific language
2. get_knowledge — Query the knowledge base for successful content examples and common failure patterns from past projects

## Your Writing Process

### Step 1: Prepare
- Query the knowledge base for similar industry/audience content examples
- Search for industry-specific language, jargon, and customer terminology
- Review the research findings and identify key messages

### Step 2: Write
Using the research report and client form data, write ALL website content in Markdown format.

### Content Structure

Write content for these pages (adapt based on client needs):

#### Homepage
- Hero section (headline, subheadline, CTA)
- Value proposition / what they do section
- Key benefits (3-4, benefit-focused not feature-focused)
- Social proof section (testimonials placeholder, stats)
- Call-to-action section

#### About Page
- Company story (authentic, relatable)
- Mission statement
- Why choose them
- Team/credentials section

#### Services Page(s)
- Service overview
- Individual service descriptions
- Process/how it works
- Pricing signals (if applicable)

#### Contact Page
- Contact intro copy
- Form CTA copy
- Business hours/location info

### Writing Rules (CRITICAL)

1. **BENEFITS OVER FEATURES** — Always lead with what the customer gets, not what the business does
2. **NO FLUFF** — Every sentence must advance the reader's understanding or motivation. Zero filler phrases.
3. **CONVERSION-FOCUSED** — Every page has at least one clear CTA with action verbs
4. **SPECIFIC, NOT GENERIC** — Use the actual business details, credentials, and differentiators from the research
5. **SEO-OPTIMIZED** — Include the target keyword naturally in H1, first paragraph, meta title/description
6. **SCANNABLE** — Short paragraphs (3-4 sentences max), subheadings every 200-300 words, bullet points for lists
7. **ADDRESS OBJECTIONS** — Directly address the customer hesitations mentioned in the form
8. **BRAND VOICE** — Match the 3 brand words the client selected
9. **DIFFERENTIATE** — Use SWOT findings to position the business against competitors

## Output Format

Return the complete website content as a single Markdown document with clear page separators:

\`\`\`
---meta-title: "Page Title | Business Name"
meta-description: "Compelling 150-char description"
target-keyword: "primary keyword"
---

# Page Name

[content]

---

# Next Page

[content]
\`\`\`

Include meta title and meta description for EVERY page.

NEVER use these phrases:
- "Welcome to our website"
- "In today's world"
- "We pride ourselves"
- "It goes without saying"
- "Look no further"
- "One-stop shop"
- "Above and beyond"
- "At the end of the day"
- "State-of-the-art"
- "Cutting-edge"`;

const tools = [braveSearchToolDef, knowledgeBaseToolDef];

const toolExecutors = {
  brave_search: async (args) => await braveSearch(args.query, args.count),
  get_knowledge: async (args) => getKnowledge(args.industry, args.audience || '', args.content_type),
};

/**
 * Run the Content Writer Agent.
 *
 * @param {object} clientData — parsed Tally form data
 * @param {object} research — research findings from Research Agent
 * @param {string} [revisionFeedback] — optional feedback from auditor or human
 * @param {string} [previousContent] — the previous attempt's content
 * @returns {string} website content in Markdown
 */
export async function runContentAgent(clientData, research, revisionFeedback = null, previousContent = null) {
  logger.info({ clientName: clientData.businessName, isRevision: !!revisionFeedback }, '✍️ Content Agent → starting');

  // Determine industry from business description
  const industry = extractIndustry(clientData.businessDescription || clientData.businessName);

  let userPrompt;

  if (revisionFeedback && previousContent) {
    userPrompt = `## REVISION REQUIRED

The previous content did not pass the quality audit. Here is the feedback:

### Audit Feedback
${revisionFeedback}

### Previous Content (DO NOT START FROM SCRATCH — revise the sections that failed)
${previousContent}

---

Fix ONLY the issues identified in the audit feedback. Keep everything that passed intact.
Return the complete, revised website content.`;
  } else {
    userPrompt = `Write complete website content for this client.

## Client Details
- **Business Name:** ${clientData.businessName}
- **Location:** ${clientData.location || 'Not specified'}
- **Service Areas:** ${clientData.serviceAreas || 'Not specified'}
- **Years in Business:** ${clientData.yearsInBusiness || 'Not specified'}
- **Business Description:** ${clientData.businessDescription || 'Not specified'}
- **Website Goal:** ${clientData.websiteGoal || 'Not specified'}

## Target Audience
- **Ideal Customer:** ${clientData.idealCustomer || 'Not specified'}
- **Problem Solved:** ${clientData.problemSolved || 'Not specified'}
- **Customer Hesitations:** ${clientData.customerHesitations || 'Not specified'}

## Brand
- **Brand Words:** ${clientData.brandWords || 'Not specified'}
- **Desired Pages/Features:** ${clientData.desiredFeatures || 'Not specified'}
- **Inspiration Sites:** ${clientData.inspirationSites || 'Not specified'}

## Competitive Edge
- **What They Do Best:** ${clientData.competitiveAdvantage || 'Not specified'}
- **Underknown Strength:** ${clientData.underknownStrength || 'Not specified'}
- **Credentials:** ${clientData.credentials || 'Not specified'}

## Research Findings

### Target Keyword: ${research.targetKeyword || `${industry} ${clientData.location || ''}`}

### SWOT Analysis
**Strengths:** ${research.swot?.strengths || 'N/A'}
**Weaknesses:** ${research.swot?.weaknesses || 'N/A'}
**Opportunities:** ${research.swot?.opportunities || 'N/A'}
**Threats:** ${research.swot?.threats || 'N/A'}

### Gap Analysis & Recommendations
${research.gapAnalysis || 'N/A'}

### Website Recommendations
${research.websiteRecommendations || 'N/A'}

### Competitor Analysis
${research.competitorAnalysis || 'N/A'}

### Audience Analysis
${research.audienceAnalysis || 'N/A'}

### Industry Analysis
${research.industryAnalysis || 'N/A'}

---

IMPORTANT: Before writing, use the get_knowledge tool to check for successful examples in the "${industry}" industry. Then write the complete website content. Make it specific to THIS business — generic copy is unacceptable.`;
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  let content = null;
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.6,
      max_tokens: 16000,
    });

    const choice = response.choices[0];

    if (choice.message.tool_calls?.length > 0) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        logger.info({ tool: fnName }, `Content Agent → calling tool: ${fnName}`);

        const executor = toolExecutors[fnName];
        let result;
        try {
          result = await executor(args);
        } catch (err) {
          result = { error: err.message };
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    } else {
      content = choice.message.content;
      break;
    }
  }

  if (!content) {
    throw new Error('Content Agent failed to produce content after maximum iterations');
  }

  logger.info(
    { clientName: clientData.businessName, contentLength: content.length, iterations },
    '✍️ Content Agent → complete',
  );

  return content;
}

/**
 * Simple industry extraction from business description.
 */
function extractIndustry(description) {
  const lower = description.toLowerCase();
  const industries = [
    'plumbing', 'hvac', 'electrical', 'roofing', 'landscaping', 'cleaning',
    'dental', 'medical', 'legal', 'accounting', 'real estate', 'restaurant',
    'fitness', 'salon', 'spa', 'auto', 'construction', 'photography',
    'marketing', 'consulting', 'insurance', 'financial', 'moving',
    'pest control', 'painting', 'flooring', 'remodeling', 'veterinary',
  ];
  for (const ind of industries) {
    if (lower.includes(ind)) return ind;
  }
  return description.split(' ').slice(0, 3).join(' ');
}

export default { runContentAgent };
