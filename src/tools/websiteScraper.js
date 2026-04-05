import axios from 'axios';
import * as cheerio from 'cheerio';
import logger from '../utils/logger.js';

const MAX_CONTENT_LENGTH = 12000; // characters — keeps token usage reasonable

/**
 * Scrape a website URL and extract structured content.
 * @param {string} url — the URL to scrape
 * @returns {object} extracted page data
 */
export async function scrapeWebsite(url) {
  logger.info({ url }, 'Website Scraper → fetching');

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: (s) => s < 400,
    });

    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, noscript, iframe, nav, footer, header').remove();

    // Extract structured data
    const title = $('title').text().trim();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaKeywords = $('meta[name="keywords"]').attr('content') || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    // Headings
    const headings = [];
    $('h1, h2, h3').each((_, el) => {
      const tag = $(el).prop('tagName').toLowerCase();
      const text = $(el).text().trim();
      if (text) headings.push({ tag, text });
    });

    // Main body text
    let bodyText = $('main, article, [role="main"], .content, #content, body')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim();

    if (bodyText.length > MAX_CONTENT_LENGTH) {
      bodyText = bodyText.substring(0, MAX_CONTENT_LENGTH) + '… [truncated]';
    }

    // Links (internal + external)
    const links = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && text && !href.startsWith('#') && !href.startsWith('javascript:')) {
        links.push({ text: text.substring(0, 80), href });
      }
    });

    // Images (for content analysis)
    const images = [];
    $('img[src]').each((_, el) => {
      images.push({
        src: $(el).attr('src'),
        alt: $(el).attr('alt') || '[no alt text]',
      });
    });

    const result = {
      url,
      title,
      metaDescription,
      metaKeywords,
      ogTitle,
      ogDescription,
      headings: headings.slice(0, 30),
      bodyText,
      linkCount: links.length,
      sampleLinks: links.slice(0, 15),
      imageCount: images.length,
      imagesWithoutAlt: images.filter((i) => i.alt === '[no alt text]').length,
    };

    logger.info({ url, title, headingCount: headings.length, bodyLength: bodyText.length }, 'Website Scraper → complete');
    return result;
  } catch (err) {
    logger.error({ url, error: err.message }, 'Website Scraper → failed');
    return {
      url,
      error: `Failed to scrape: ${err.message}`,
      title: '',
      metaDescription: '',
      headings: [],
      bodyText: '',
    };
  }
}

/**
 * OpenAI function definition for agents.
 */
export const websiteScraperToolDef = {
  type: 'function',
  function: {
    name: 'scrape_website',
    description:
      'Fetch and analyze a website URL. Extracts the page title, meta description, headings (H1/H2/H3), body text content, link count, image count, and images missing alt text. Use this to analyze client websites and competitor sites.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The full URL to scrape (e.g. https://example.com)',
        },
      },
      required: ['url'],
    },
  },
};

export default { scrapeWebsite, websiteScraperToolDef };
