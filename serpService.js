/**
 * serpService.js — SerpApi Google Maps + Email Discovery
 * Ace Digitals Global | Ace Pitch Engine
 */

const https = require('https');

const SERP_BASE = 'https://serpapi.com/search.json';

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-z]{2,}/gi;

const EMAIL_BLACKLIST = [
  'sentry.io', 'example.com', 'test.com', 'domain.com', 'noreply',
  'no-reply', 'placeholder', 'wixpress.com', 'squarespace.com',
  'wordpress.com', 'google.com', 'yelp.com', 'facebook.com',
  'instagram.com', 'twitter.com', 'linkedin.com', 'tripadvisor.com',
  'trustpilot.com', 'bbb.org', 'yellowpages.com', 'thumbtack.com',
  'homeadvisor.com', 'angi.com', 'houzz.com', 'bark.com',
  'checkatrade.com', 'ratedpeople.com', 'mybuilder.com',
  'amazonaws.com', 'cloudfront.net', 'sendgrid.net', 'mailchimp.com',
];

// Free email domains — these are what we WANT to find
const FREE_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.ca', 'outlook.com',
  'outlook.co.uk', 'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'live.com', 'msn.com', 'protonmail.com', 'pm.me', 'googlemail.com',
];

function serpGet(params) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams(params).toString();
    const url = `${SERP_BASE}?${qs}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('SerpApi returned invalid JSON')); }
      });
    }).on('error', reject);
  });
}

function isValidEmail(email) {
  if (!email || email.length < 6) return false;
  if (!email.includes('@')) return false;
  const domain = (email.split('@')[1] || '').toLowerCase();
  for (const bl of EMAIL_BLACKLIST) {
    if (domain.includes(bl) || email.toLowerCase().includes(bl)) return false;
  }
  return /\.[a-z]{2,}$/.test(domain);
}

function isFreeEmail(email) {
  const domain = (email.split('@')[1] || '').toLowerCase();
  return FREE_DOMAINS.includes(domain);
}

function extractEmails(text) {
  return (text.match(EMAIL_REGEX) || [])
    .map(e => e.toLowerCase().trim())
    .filter(e => isValidEmail(e));
}

/**
 * Search Google Maps for local businesses
 */
async function searchGoogleMaps(service, location, apiKey) {
  if (!apiKey || apiKey === 'YOUR_SERP_KEY') {
    throw new Error('SerpApi key not configured.');
  }

  const query = `${service} in ${location}`;
  console.log(`[SerpApi Maps] Query: "${query}"`);

  const data = await serpGet({
    engine: 'google_maps',
    q: query,
    api_key: apiKey,
    hl: 'en',
    type: 'search',
  });

  if (data.error) {
    throw new Error(`SerpApi error: ${data.error}`);
  }

  const results = data.local_results || [];
  console.log(`[SerpApi Maps] ${results.length} results returned`);
  return results;
}

/**
 * Try to find a contact email for a business via Google organic search.
 * Prioritises free email addresses (Gmail/Yahoo etc.) over custom domains.
 * Returns { email, source } or { email: null }
 */
async function findEmail(businessName, location, apiKey) {
  const queries = [
    `"${businessName}" "${location}" email contact`,
    `${businessName} ${location} gmail OR yahoo email`,
    `${businessName} ${location} contact`,
  ];

  const allFound = [];

  for (const q of queries) {
    try {
      const data = await serpGet({
        engine: 'google',
        q,
        api_key: apiKey,
        num: '5',
        hl: 'en',
      });

      // Check knowledge graph
      if (data.knowledge_graph) {
        const kgText = JSON.stringify(data.knowledge_graph);
        const kgEmails = extractEmails(kgText);
        allFound.push(...kgEmails.map(e => ({ email: e, source: 'knowledge_graph' })));
      }

      // Check organic snippets + titles
      const organic = data.organic_results || [];
      const blob = organic.map(r =>
        [r.snippet || '', r.title || '', r.displayed_link || ''].join(' ')
      ).join(' ');
      const organicEmails = extractEmails(blob);
      allFound.push(...organicEmails.map(e => ({ email: e, source: 'organic' })));

      // Check answer box if present
      if (data.answer_box) {
        const abText = JSON.stringify(data.answer_box);
        const abEmails = extractEmails(abText);
        allFound.push(...abEmails.map(e => ({ email: e, source: 'answer_box' })));
      }

      await sleep(400);

    } catch (err) {
      console.warn(`[EmailSearch] Query failed: ${err.message}`);
    }
  }

  // Priority 1: Free email addresses (Gmail/Yahoo) — exactly what we want
  const freeEmail = allFound.find(e => isFreeEmail(e.email));
  if (freeEmail) return freeEmail;

  // Priority 2: Any valid email
  if (allFound.length > 0) return allFound[0];

  return { email: null, source: null };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { searchGoogleMaps, findEmail };
