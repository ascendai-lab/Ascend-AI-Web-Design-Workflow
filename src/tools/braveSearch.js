import axios from 'axios';
import config from '../config.js';
import logger from '../utils/logger.js';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

/**
 * Search the web using the Brave Search API.
 * @param {string} query — the search query
 * @param {number} count — number of results (default 10, max 20)
 * @returns {Array<{title: string, url: string, snippet: string}>}
 */
export async function braveSearch(query, count = 10) {
  logger.info({ query, count }, 'Brave Search → executing query');

  try {
    const { data } = await axios.get(BRAVE_API_URL, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': config.brave.apiKey,
      },
      params: {
        q: query,
        count: Math.min(count, 20),
        text_decorations: false,
        search_lang: 'en',
      },
      timeout: 15000,
    });

    const results = (data.web?.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.description || '',
    }));

    logger.info({ query, resultCount: results.length }, 'Brave Search → complete');
    return results;
  } catch (err) {
    logger.error({ query, error: err.message }, 'Brave Search → failed');
    return [{ title: 'Search error', url: '', snippet: `Search failed: ${err.message}` }];
  }
}

/**
 * OpenAI function definition for the Research & Content agents.
 */
export const braveSearchToolDef = {
  type: 'function',
  function: {
    name: 'brave_search',
    description:
      'Search the web using Brave Search. Use this to find information about businesses, industries, competitors, market trends, audience data, and copywriting research. Returns titles, URLs, and snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to look up on the web.',
        },
        count: {
          type: 'number',
          description: 'Number of results to return (1-20). Default 10.',
        },
      },
      required: ['query'],
    },
  },
};

export default { braveSearch, braveSearchToolDef };
