/**
 * Test script — send a mock Tally webhook payload to the local server.
 * Usage: node scripts/test-webhook.js
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3000/webhook/tally';

const mockPayload = {
  eventId: 'test-event-001',
  eventType: 'FORM_RESPONSE',
  createdAt: new Date().toISOString(),
  data: {
    responseId: 'test-response-001',
    fields: [
      // Section 1: Your Business
      { key: 'q1', label: 'What is your business name?', type: 'INPUT_TEXT', value: 'Test Miami Plumbing Co' },
      { key: 'q2', label: 'What is your full name?', type: 'INPUT_TEXT', value: 'John Smith' },
      { key: 'q3', label: 'What is your email address?', type: 'INPUT_TEXT', value: 'test@example.com' },
      { key: 'q4', label: 'What is your phone number?', type: 'INPUT_TEXT', value: '305-555-1234' },
      { key: 'q5', label: 'What city and state is your business based in?', type: 'INPUT_TEXT', value: 'Miami, FL' },
      { key: 'q6', label: 'What areas do you serve?', type: 'INPUT_TEXT', value: 'Miami-Dade County, Broward County' },
      {
        key: 'q7',
        label: "What does your business do? Describe it like you're telling a friend.",
        type: 'TEXTAREA',
        value:
          "We're a family-owned plumbing company that handles everything from leaky faucets to full repiping. We specialize in emergency plumbing — we're the guys you call at 2am when your pipe bursts. We also do water heater installations and drain cleaning.",
      },
      { key: 'q8', label: 'How many years have you been in business?', type: 'INPUT_TEXT', value: '12' },
      { key: 'q9', label: 'Do you have an existing website?', type: 'MULTIPLE_CHOICE', value: 'Yes' },
      { key: 'q10', label: 'If yes, what is your website URL?', type: 'INPUT_TEXT', value: 'https://miamiplumbingco.com' },
      {
        key: 'q11',
        label: 'What do you like about your current site? What do you dislike?',
        type: 'TEXTAREA',
        value: "It's outdated, looks like it was made in 2010. Phone number is hard to find. But I like that it shows our services clearly.",
      },

      // Section 2: Your Customers
      {
        key: 'q12',
        label: 'Who is your ideal customer? Describe them in detail.',
        type: 'TEXTAREA',
        value:
          'Homeowners in Miami-Dade ages 30-65. They own their home, have a household income of $75K+. They want reliable, honest plumbing service they can trust.',
      },
      {
        key: 'q13',
        label: 'What problem does your business solve for them?',
        type: 'TEXTAREA',
        value:
          "Plumbing emergencies are stressful and most plumbers either don't pick up the phone or charge hidden fees. We solve the anxiety by being available 24/7 and giving upfront pricing.",
      },
      {
        key: 'q14',
        label: 'What are the biggest hesitations or concerns new customers has before hiring you?',
        type: 'TEXTAREA',
        value: 'Price transparency, response time, whether we are licensed and insured, fear of being upsold on work they don\'t need.',
      },

      // Section 3: Your Business Edge
      {
        key: 'q15',
        label: 'What does your business do better than anyone else in your area?',
        type: 'TEXTAREA',
        value:
          'Our 45-minute response time guarantee. If we don\'t arrive within 45 minutes for emergencies, the service call is free. No one else offers that.',
      },
      {
        key: 'q16',
        label: 'What do you wish more people knew about your business?',
        type: 'TEXTAREA',
        value: 'That our entire team is bilingual (English/Spanish). 40% of Miami homeowners prefer communicating in Spanish.',
      },
      {
        key: 'q17',
        label: 'Do you have any awards, certifications, guarantees, or credentials worth highlighting?',
        type: 'TEXTAREA',
        value: 'Licensed, bonded & insured. FL State License #CFC1234567. BBB A+ rated. Angi Super Service Award 2023 & 2024.',
      },

      // Section 4: Goals
      {
        key: 'q18',
        label: 'What is the main goal of your new website?',
        type: 'DROPDOWN',
        value: 'Phone calls',
      },
      {
        key: 'q19',
        label: 'Are there any specific pages or features you know you want? (e.g. gallery, booking calendar, video, store)',
        type: 'TEXTAREA',
        value: 'Service pages for each service, testimonials section, before/after gallery, click-to-call button.',
      },
      {
        key: 'q20',
        label: 'What does success look like for you 90 days after the site launches?',
        type: 'TEXTAREA',
        value: '50% more phone calls from the website. Ranking on page 1 for "emergency plumber miami".',
      },

      // Section 5: Brand & Design
      { key: 'q21', label: 'Pick 3 words that describe how you want your brand to feel.', type: 'INPUT_TEXT', value: 'Reliable, Friendly, Professional' },
      { key: 'q22', label: 'Do you have an existing logo?', type: 'MULTIPLE_CHOICE', value: 'Yes' },
      { key: 'q23', label: 'If yes, do you have the logo files', type: 'INPUT_TEXT', value: 'Yes, PNG and SVG' },
      { key: 'q24', label: 'Do you have brand colors you want to use? If yes, list them.', type: 'INPUT_TEXT', value: 'Navy blue (#1e3a5f) and orange (#f97316)' },
      {
        key: 'q25',
        label: "List 1–3 websites you like the look of and why. (They don't have to be in your industry)",
        type: 'TEXTAREA',
        value: 'https://www.rotorooter.com — clean layout. https://www.mrplumber.com — I like how they show services.',
      },

      // Section 6: Competition
      {
        key: 'q26',
        label: "List 3–5 competitors you're aware of. (Business names or website URLs)",
        type: 'TEXTAREA',
        value: 'Roto-Rooter, Mr. Rooter Plumbing, Flamingo Plumbing, Art Plumbing AC & Electric, Rescue Rooter',
      },
      {
        key: 'q27',
        label: 'Is there anything a competitor does that you admire or want to do better than?',
        type: 'TEXTAREA',
        value: "Roto-Rooter's brand recognition is incredible. I want that level of trust. Art Plumbing has great SEO — they rank for everything.",
      },
    ],
  },
};

async function sendTestWebhook() {
  console.log(`\n🧪 Sending test Tally webhook to: ${WEBHOOK_URL}\n`);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockPayload),
    });

    const data = await response.json();
    console.log(`✅ Response (${response.status}):`, JSON.stringify(data, null, 2));
    console.log('\n📊 The pipeline is now running in the background.');
    console.log('   Check your server logs and Slack channel for updates.\n');
  } catch (err) {
    console.error(`❌ Failed to send webhook:`, err.message);
    console.error('   Make sure the server is running: npm run dev\n');
  }
}

sendTestWebhook();
