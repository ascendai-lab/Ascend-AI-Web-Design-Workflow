import { braveSearch } from './braveSearch.js';
import logger from '../utils/logger.js';

/**
 * Discover competitors for a business using targeted search queries.
 *
 * @param {string} businessName
 * @param {string} industry — e.g. "plumbing", "landscaping"
 * @param {string} location — e.g. "Miami, FL"
 * @returns {Array<{name: string, url: string, description: string}>}
 */
export async function findCompetitors(businessName, industry, location) {
  logger.info({ businessName, industry, location }, 'Competitor Finder → searching');

  const queries = [
    `best ${industry} companies in ${location}`,
    `${industry} near ${location} reviews`,
    `top rated ${industry} ${location}`,
    `${industry} services ${location} -${businessName}`,
  ];

  const allResults = [];
  const seenUrls = new Set();

  for (const query of queries) {
    const results = await braveSearch(query, 5);
    for (const r of results) {
      // Deduplicate by domain
      try {
        const domain = new URL(r.url).hostname;
        if (!seenUrls.has(domain) && !r.url.includes('yelp.com') && !r.url.includes('yellowpages.com')) {
          seenUrls.add(domain);
          allResults.push({
            name: r.title.split(' - ')[0].split(' | ')[0].trim(),
            url: r.url,
            description: r.snippet,
          });
        }
      } catch {
        // skip invalid URLs
      }
    }
  }

  const competitors = allResults.slice(0, 8);
  logger.info({ businessName, competitorCount: competitors.length }, 'Competitor Finder → complete');
  return competitors;
}

/**
 * OpenAI function definition.
 */
export const competitorFinderToolDef = {
  type: 'function',
  function: {
    name: 'find_competitors',
    description:
      'Discover competitors for a business by searching for similar companies in the same industry and location. Returns a list of competitor names, URLs, and descriptions. Use this to build the competitive landscape analysis.',
    parameters: {
      type: 'object',
      properties: {
        business_name: { type: 'string', description: 'The client business name.' },
        industry: { type: 'string', description: 'The industry or business type (e.g. plumbing, landscaping, dental).' },
        location: { type: 'string', description: 'The city/area the business operates in (e.g. Miami, FL).' },
      },
      required: ['business_name', 'industry', 'location'],
    },
  },
};

export default { findCompetitors, competitorFinderToolDef };
