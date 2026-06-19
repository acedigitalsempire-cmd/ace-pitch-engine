/**
 * /api/search — Lead Discovery
 * Uses SerpApi Google Maps to find local businesses
 * Filters: no website + Gmail/Yahoo/Hotmail email only = qualified lead
 */

const express = require('express');
const router = express.Router();
const { searchGoogleMaps, findEmail } = require('../services/serpService');
const { scoreLead } = require('../services/leadScorer');

// Simple in-memory cache: key = "service|location", value = { ts, leads }
const cache = new Map();
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

router.post('/', async (req, res) => {
  const { service, location } = req.body;

  if (!service || !location) {
    return res.status(400).json({ error: 'service and location are both required.' });
  }

  const serpKey = process.env.SERP_API_KEY;
  if (!serpKey) {
    return res.status(500).json({ error: 'SERP_API_KEY not set in environment variables.' });
  }

  const cacheKey = `${service.toLowerCase().trim()}|${location.toLowerCase().trim()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return res.json({ success: true, source: 'cache', count: cached.leads.length, leads: cached.leads });
  }

  console.log(`[Search] "${service}" in "${location}"`);

  try {
    // Step 1: Google Maps results
    const rawResults = await searchGoogleMaps(service, location, serpKey);

    if (!rawResults || rawResults.length === 0) {
      return res.json({ success: true, count: 0, leads: [], message: 'No results found for this search. Try a different service or location.' });
    }

    const leads = [];
    const seen = new Set();

    for (const place of rawResults) {
      try {
        // FILTER 1: Skip if has website
        if (hasWebsite(place)) {
          console.log(`[SKIP website] ${place.title}`);
          continue;
        }

        // FILTER 2: Dedup
        const dedupeKey = place.place_id || `${place.title}|${place.address}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        // Step 2: Find email
        console.log(`[Email search] ${place.title}`);
        const emailResult = await findEmail(place.title, location, serpKey);

        // FILTER 3: Skip if no email found
        if (!emailResult.email) {
          console.log(`[SKIP no-email] ${place.title}`);
          continue;
        }

        // FILTER 4: Skip if email looks like custom domain (has website)
        if (isCustomDomainEmail(emailResult.email)) {
          console.log(`[SKIP custom-domain email] ${place.title} → ${emailResult.email}`);
          continue;
        }

        console.log(`[QUALIFIED] ${place.title} → ${emailResult.email}`);

        const lead = buildLead(place, emailResult, location, service);
        leads.push(lead);

        // Delay between email lookups to be kind to SerpApi quota
        await sleep(800);

      } catch (err) {
        console.error(`[Lead error] ${place.title}: ${err.message}`);
      }
    }

    // Cache result
    cache.set(cacheKey, { ts: Date.now(), leads });

    return res.json({ success: true, source: 'live', count: leads.length, leads });

  } catch (err) {
    console.error('[Search error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

function hasWebsite(place) {
  return !!(
    place.website ||
    place.links?.website ||
    place.extensions?.website ||
    (place.serpapi_place_details?.website)
  );
}

// Gmail, Yahoo, Hotmail, Outlook, iCloud, AOL = no custom domain = no website
const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.ca',
  'outlook.com', 'outlook.co.uk',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'live.com', 'msn.com',
  'protonmail.com', 'pm.me',
  'googlemail.com'
];

function isCustomDomainEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase() || '';
  // If domain is NOT in the free email list, it's a custom domain = probably has website
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

function buildLead(place, emailResult, location, service) {
  const { scoreData, score } = scoreLead(place);

  return {
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: place.title || 'Unknown Business',
    email: emailResult.email,
    emailSource: emailResult.source || 'web',
    phone: place.phone || extractPhone(place) || null,
    address: place.address || location,
    location,
    service,
    rating: parseFloat(place.rating || 0),
    reviews: parseInt(place.reviews || place.rating_count || 0, 10),
    category: place.type || service,
    thumbnail: place.thumbnail || null,
    score,
    scoreData,
    date: new Date().toISOString(),
    pitched: false,
    emailSent: false,
  };
}

function extractPhone(place) {
  return place.phone || place.extensions?.phone || null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = router;
