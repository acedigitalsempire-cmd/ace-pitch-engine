/**
 * serpService.js — SerpApi Google Maps + Email Discovery
 * Ace Digitals Global | Ace Pitch Engine
 * Upgraded: smarter queries, Nigeria detection, token efficiency
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

const FREE_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au',
  'yahoo.com.ng', 'hotmail.com', 'hotmail.co.uk', 'hotmail.ca',
  'outlook.com', 'outlook.co.uk', 'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'live.com', 'msn.com', 'protonmail.com', 'pm.me',
  'googlemail.com',
];

// Nigerian locations detection
const NIGERIAN_KEYWORDS = [
  'lagos', 'abuja', 'kano', 'ibadan', 'port harcourt', 'benin city',
  'kaduna', 'enugu', 'onitsha', 'warri', 'calabar', 'owerri', 'uyo',
  'nigeria', 'ng', 'lekki', 'ikeja', 'victoria island', 'surulere',
  'ajah', 'yaba', 'apapa', 'ikorodu', 'mushin', 'oshodi',
];

function detectNigeria(location) {
  if (!location) return false;
  const loc = location.toLowerCase();
  return NIGERIAN_KEYWORDS.some(kw => loc.includes(kw));
}

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
 * Uses a precise query to avoid wasting SerpAPI tokens on irrelevant results
 */
async function searchGoogleMaps(service, location, apiKey) {
  if (!apiKey || apiKey === 'YOUR_SERP_KEY') {
    throw new Error('SerpApi key not configured.');
  }

  const isNigeria = detectNigeria(location);

  // Use a tighter query — no filler words, just the core trade + location
  // This returns more relevant results per token spent
  const query = `${service} ${location}`;
  console.log(`[SerpApi Maps] Query: "${query}" | Nigeria: ${isNigeria}`);

  const params = {
    engine: 'google_maps',
    q: query,
    api_key: apiKey,
    type: 'search',
    ll: '@0,0,14z', // global zoom — overridden by query location
    hl: 'en',
    num: '20', // fetch 20 at once — more efficient than multiple small calls
  };

  // For Nigerian searches use Google Maps with Nigeria country code
  if (isNigeria) {
    params.gl = 'ng';
    params.hl = 'en';
  } else {
    params.gl = 'us';
  }

  const data = await serpGet(params);
  const results = data.local_results || data.place_results || [];

  console.log(`[SerpApi Maps] Raw results: ${results.length}`);
  return results;
}

/**
 * Find email for a business — single precise query to save SerpAPI tokens
 * Old version ran 3 queries per business — this runs 1, sometimes 2
 */
async function findEmail(businessName, location, apiKey) {
  const isNigeria = detectNigeria(location);
  const allFound = [];

  // Query 1 — most efficient, catches 80% of emails
  const q1 = `"${businessName}" ${location} contact email`;
  try {
    const data = await serpGet({
      engine: 'google',
      q: q1,
      api_key: apiKey,
      num: '5',
      hl: 'en',
      gl: isNigeria ? 'ng' : 'us',
    });

    if (data.knowledge_graph) {
      const kgEmails = extractEmails(JSON.stringify(data.knowledge_graph));
      allFound.push(...kgEmails.map(e => ({ email: e, source: 'knowledge_graph' })));
    }

    const organic = data.organic_results || [];
    const blob = organic.map(r =>
      [r.snippet || '', r.title || '', r.displayed_link || ''].join(' ')
    ).join(' ');
    const organicEmails = extractEmails(blob);
    allFound.push(...organicEmails.map(e => ({ email: e, source: 'organic' })));

    if (data.answer_box) {
      const abEmails = extractEmails(JSON.stringify(data.answer_box));
      allFound.push(...abEmails.map(e => ({ email: e, source: 'answer_box' })));
    }

    await sleep(300);

  } catch (err) {
    console.warn(`[EmailSearch] Query 1 failed: ${err.message}`);
  }

  // Only run query 2 if query 1 found nothing — saves tokens
  if (allFound.length === 0) {
    const q2 = isNigeria
      ? `${businessName} ${location} gmail whatsapp`
      : `${businessName} ${location} gmail yahoo email`;

    try {
      const data = await serpGet({
        engine: 'google',
        q: q2,
        api_key: apiKey,
        num: '5',
        hl: 'en',
        gl: isNigeria ? 'ng' : 'us',
      });

      const organic = data.organic_results || [];
      const blob = organic.map(r =>
        [r.snippet || '', r.title || '', r.displayed_link || ''].join(' ')
      ).join(' ');
      const organicEmails = extractEmails(blob);
      allFound.push(...organicEmails.map(e => ({ email: e, source: 'organic_fallback' })));

      await sleep(300);
    } catch (err) {
      console.warn(`[EmailSearch] Query 2 failed: ${err.message}`);
    }
  }

  // Prefer free email — that is our target
  const freeEmail = allFound.find(e => isFreeEmail(e.email));
  if (freeEmail) return freeEmail;
  if (allFound.length > 0) return allFound[0];

  return { email: null, source: null };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { searchGoogleMaps, findEmail, detectNigeria };
