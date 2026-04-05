import logger from './logger.js';

/**
 * Parses a Tally webhook payload into a clean, normalized client object.
 *
 * Tally sends data in this shape:
 * {
 *   "eventId": "...",
 *   "eventType": "FORM_RESPONSE",
 *   "createdAt": "...",
 *   "data": {
 *     "responseId": "...",
 *     "fields": [
 *       { "key": "question_abc", "label": "What is your business name?", "type": "INPUT_TEXT", "value": "Acme Corp" },
 *       ...
 *     ]
 *   }
 * }
 */

// Map Tally field labels to clean internal keys
const FIELD_MAP = {
  // Section 1: Your Business
  'What is your business name?': 'businessName',
  'What is your full name?': 'contactName',
  'What is your email address?': 'contactEmail',
  'What is your phone number?': 'contactPhone',
  'What city and state is your business based in?': 'location',
  'What areas do you serve?': 'serviceAreas',
  'What does your business do? Describe it like you\'re telling a friend.': 'businessDescription',
  'How many years have you been in business?': 'yearsInBusiness',
  'Do you have an existing website?': 'hasWebsite',
  'If yes, what is your website URL?': 'websiteUrl',
  'What do you like about your current site? What do you dislike?': 'siteLikesDislikes',

  // Section 2: Your Customers
  'Who is your ideal customer? Describe them in detail.': 'idealCustomer',
  'What problem does your business solve for them?': 'problemSolved',
  'What are the biggest hesitations or concerns new customers has before hiring you?': 'customerHesitations',

  // Section 3: Your Business Edge
  'What does your business do better than anyone else in your area?': 'competitiveAdvantage',
  'What do you wish more people knew about your business?': 'underknownStrength',
  'Do you have any awards, certifications, guarantees, or credentials worth highlighting?': 'credentials',

  // Section 4: Goals
  'What is the main goal of your new website?': 'websiteGoal',
  'Are there any specific pages or features you know you want? (e.g. gallery, booking calendar, video, store)': 'desiredFeatures',
  'What does success look like for you 90 days after the site launches?': 'successVision',

  // Section 5: Brand & Design
  'Pick 3 words that describe how you want your brand to feel.': 'brandWords',
  'Do you have an existing logo?': 'hasLogo',
  'If yes, do you have the logo files': 'logoFiles',
  'Do you have brand colors you want to use? If yes, list them.': 'brandColors',
  'List 1–3 websites you like the look of and why. (They don\'t have to be in your industry)': 'inspirationSites',

  // Section 6: Competition
  'List 3–5 competitors you\'re aware of. (Business names or website URLs)': 'knownCompetitors',
  'Is there anything a competitor does that you admire or want to do better than?': 'competitorAdmiration',
};

/**
 * Parse a Tally webhook body into a normalized client data object.
 * @param {object} body — raw request body from Tally
 * @returns {object} normalized client data
 */
export function parseTallyForm(body) {
  if (!body?.data?.fields || !Array.isArray(body.data.fields)) {
    logger.error({ body }, 'Invalid Tally payload — missing data.fields');
    throw new Error('Invalid Tally webhook payload');
  }

  const fields = body.data.fields;
  const client = {};

  for (const field of fields) {
    const label = field.label?.trim();
    const key = FIELD_MAP[label];

    if (key) {
      // Handle different Tally field value types
      let value = field.value;

      // Choice/radio fields come as arrays or objects
      if (field.type === 'CHECKBOXES' && Array.isArray(value)) {
        value = value.map((v) => v.label || v).join(', ');
      } else if (field.type === 'MULTIPLE_CHOICE' || field.type === 'DROPDOWN') {
        value = value?.label || value;
      } else if (Array.isArray(value)) {
        value = value.join(', ');
      }

      client[key] = value ?? '';
    } else if (label) {
      logger.warn({ label, type: field.type }, 'Unmapped Tally field');
    }
  }

  // Normalize booleans
  client.hasWebsite = /^yes$/i.test(String(client.hasWebsite));
  client.hasLogo = /^yes$/i.test(String(client.hasLogo));

  // Validate required fields
  if (!client.businessName) throw new Error('Missing required field: businessName');
  if (!client.contactEmail) throw new Error('Missing required field: contactEmail');

  // Add metadata
  client.responseId = body.data.responseId;
  client.submittedAt = body.createdAt || new Date().toISOString();

  logger.info({ businessName: client.businessName, responseId: client.responseId }, 'Tally form parsed successfully');
  return client;
}

export default { parseTallyForm };
