import OpenAI from 'openai';
import config from '../config.js';
import logger from '../utils/logger.js';
import { braveSearch, braveSearchToolDef } from '../tools/braveSearch.js';
import { scrapeWebsite, websiteScraperToolDef } from '../tools/websiteScraper.js';
import { auditWebsite, siteAuditToolDef } from '../tools/siteAudit.js';
import { findCompetitors, competitorFinderToolDef } from '../tools/competitorFinder.js';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

const SYSTEM_PROMPT = `You are a senior market research analyst at a top web design agency called Ascend AI Marketing. Your job is to conduct thorough, actionable research that will directly inform website content strategy.

You have access to 4 tools:
1. brave_search — Search the web for information
2. scrape_website — Analyze any website's content, SEO, and structure
3. audit_website — Run performance/SEO audits on websites (PageSpeed Insights)
4. find_competitors — Discover competitors by industry and location

## Your Research Process

You MUST follow this systematic approach:

### Step 1: Industry Research
- Search for industry trends, market size, and customer behavior patterns
- Identify what customers in this industry value most
- Find common pain points and purchase triggers

### Step 2: Client Website Audit (if they have one)
- Scrape their current website for content analysis
- Run a PageSpeed Insights audit
- Identify content gaps, messaging issues, and missed opportunities

### Step 3: Competitor Research
- Use find_competitors to discover top competitors
- Scrape at least 3 competitor websites
- Analyze what competitors do well and poorly
- Identify messaging gaps and differentiation opportunities

### Step 4: Audience Research
- Search for audience demographics, priorities, and objections in this industry
- Identify what language/terminology resonates with the target audience
- Find common questions potential customers ask

### Step 5: SWOT + Gap Analysis
- Synthesize all research into a clear SWOT analysis
- Identify specific gaps the client can exploit
- Provide actionable recommendations for the website

## Output Format

You must return your findings as a structured JSON object with these keys:
- executiveSummary (string): 2-3 paragraph high-level summary
- industryAnalysis (string): Industry trends, market insights, customer behavior (markdown)
- audienceAnalysis (string): Target audience profile, pain points, purchase drivers (markdown)
- competitorAnalysis (string): Detailed competitor breakdown with strengths/weaknesses (markdown)
- websiteAudit (string): Current website analysis if applicable (markdown)
- swot: { strengths (string), weaknesses (string), opportunities (string), threats (string) } — each as markdown bullet lists
- gapAnalysis (string): Specific gaps and opportunities the client can exploit (markdown)
- websiteRecommendations (string): Strategic recommendations for the new website content (markdown)
- targetKeyword (string): The primary SEO keyword recommendation for their website

Be thorough. Be specific. Use actual data points from your research. Do NOT be generic — every insight should be tied to THIS specific client, industry, and market.`;

const tools = [braveSearchToolDef, websiteScraperToolDef, siteAuditToolDef, competitorFinderToolDef];

// Tool executor lookup
const toolExecutors = {
  brave_search: async (args) => await braveSearch(args.query, args.count),
  scrape_website: async (args) => await scrapeWebsite(args.url),
  audit_website: async (args) => await auditWebsite(args.url, args.strategy),
  find_competitors: async (args) => await findCompetitors(args.business_name, args.industry, args.location),
};

/**
 * Run the Research Agent — autonomous multi-step research process.
 *
 * @param {object} clientData — parsed Tally form data
 * @returns {object} structured research findings
 */
export async function runResearchAgent(clientData) {
  logger.info({ clientName: clientData.businessName }, '🔬 Research Agent → starting');

  // Build user prompt from form data
  const userPrompt = `Conduct comprehensive research for this web design client:

## Client Information
- **Business Name:** ${clientData.businessName}
- **Location:** ${clientData.location || 'Not specified'}
- **Service Areas:** ${clientData.serviceAreas || 'Not specified'}
- **Years in Business:** ${clientData.yearsInBusiness || 'Not specified'}
- **Business Description:** ${clientData.businessDescription || 'Not specified'}
- **Has Website:** ${clientData.hasWebsite ? `Yes — ${clientData.websiteUrl}` : 'No'}
${clientData.hasWebsite && clientData.siteLikesDislikes ? `- **Site Likes/Dislikes:** ${clientData.siteLikesDislikes}` : ''}

## Target Audience
- **Ideal Customer:** ${clientData.idealCustomer || 'Not specified'}
- **Problem Solved:** ${clientData.problemSolved || 'Not specified'}
- **Customer Hesitations:** ${clientData.customerHesitations || 'Not specified'}

## Competitive Edge
- **What They Do Best:** ${clientData.competitiveAdvantage || 'Not specified'}
- **Underknown Strength:** ${clientData.underknownStrength || 'Not specified'}
- **Credentials:** ${clientData.credentials || 'Not specified'}

## Website Goals
- **Main Goal:** ${clientData.websiteGoal || 'Not specified'}
- **Success Vision (90 days):** ${clientData.successVision || 'Not specified'}

## Known Competitors
${clientData.knownCompetitors || 'None listed'}

## What They Admire About Competitors
${clientData.competitorAdmiration || 'Nothing specified'}

---

Now conduct your full research process. Use all your tools. Be thorough and specific.
Return your complete findings as a JSON object.`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userPrompt },
  ];

  let research = null;
  let iterations = 0;
  const MAX_ITERATIONS = 25; // Safety limit on tool-calling loops

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    logger.debug({ iteration: iterations }, 'Research Agent → LLM call');

    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages,
      tools,
      tool_choice: iterations < 3 ? 'auto' : 'auto', // Let the model decide
      temperature: 0.4,
      max_completion_tokens: 16000,
    });

    const choice = response.choices[0];

    // If the model wants to call tools
    if (choice.finish_reason === 'tool_calls' || choice.message.tool_calls?.length > 0) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        logger.info({ tool: fnName, args: Object.keys(args) }, `Research Agent → calling tool: ${fnName}`);

        const executor = toolExecutors[fnName];
        let result;
        try {
          result = await executor(args);
        } catch (err) {
          result = { error: err.message };
          logger.error({ tool: fnName, error: err.message }, 'Research Agent → tool error');
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    } else {
      // Model returned final answer
      const content = choice.message.content;
      try {
        // Try to parse JSON from the response
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1] || jsonMatch[0];
          research = JSON.parse(jsonStr);
        } else {
          // If not JSON, wrap it
          research = { executiveSummary: content, raw: true };
        }
      } catch {
        research = { executiveSummary: content, raw: true };
      }
      break;
    }
  }

  if (!research) {
    throw new Error('Research Agent failed to produce results after maximum iterations');
  }

  logger.info(
    { clientName: clientData.businessName, iterations, hasKeyword: !!research.targetKeyword },
    '🔬 Research Agent → complete',
  );

  return research;
}

export default { runResearchAgent };
