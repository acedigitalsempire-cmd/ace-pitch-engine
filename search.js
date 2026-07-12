/**
 * /api/search — Lead Discovery
 * Uses SerpApi Google Maps to find local businesses
 * Filters: no website + free email + score >= 50 only
 */

const express = require('express');
const router = express.Router();
const { searchGoogleMaps, findEmail, detectNigeria } = require('../services/serpService');
const { scoreLead } = require('../services/leadScorer');

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

  const isNigeria = detectNigeria(location);
  console.log(`[Search] "${service}" in "${location}" | Nigeria: ${isNigeria}`);

  try {
    const rawResults = await searchGoogleMaps(service, location, serpKey);

    if (!rawResults || rawResults.length === 0) {
      return res.json({ success: true, count: 0, leads: [], message: 'No results found. Try a more specific city or different niche.' });
    }

    const leads = [];
    const seen = new Set();
    let skippedWebsite = 0;
    let skippedNoEmail = 0;
    let skippedLowScore = 0;

    for (const place of rawResults) {
      try {
        // FILTER 1: Skip if has website
        if (hasWebsite(place)) {
          skippedWebsite++;
          console.log(`[SKIP website] ${place.title}`);
          continue;
        }

        // FILTER 2: Dedup
        const dedupeKey = place.place_id || `${place.title}|${place.address}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        // FILTER 3: Score the lead BEFORE spending a search token on email
        // This saves tokens — only search email for leads that score >= 50
        const { score, qualified, scoreData, tier, painPoints, opportunities, isNigeria: leadNigeria } = scoreLead(place, location);

        if (!qualified || score < 50) {
          skippedLowScore++;
          console.log(`[SKIP low-score ${score}] ${place.title}`);
          continue;
        }

        // FILTER 4: Find email — only for qualified leads
        console.log(`[Email search] ${place.title} (score: ${score})`);
        const emailResult = await findEmail(place.title, location, serpKey);

        if (!emailResult.email) {
          skippedNoEmail++;
          console.log(`[SKIP no-email] ${place.title}`);
          continue;
        }

        if (isCustomDomainEmail(emailResult.email)) {
          console.log(`[SKIP custom-domain email] ${place.title} → ${emailResult.email}`);
          continue;
        }

        console.log(`[QUALIFIED] ${place.title} → ${emailResult.email} | Score: ${score}`);

        const lead = buildLead(place, emailResult, location, service, score, scoreData, tier, painPoints, opportunities, leadNigeria);
        leads.push(lead);

        await sleep(600);

      } catch (err) {
        console.error(`[Lead error] ${place.title}: ${err.message}`);
      }
    }

    console.log(`[Search complete] Qualified: ${leads.length} | Skipped: website=${skippedWebsite} low-score=${skippedLowScore} no-email=${skippedNoEmail}`);

    cache.set(cacheKey, { ts: Date.now(), leads });

    return res.json({
      success: true,
      source: 'live',
      count: leads.length,
      leads,
      skipped: { website: skippedWebsite, lowScore: skippedLowScore, noEmail: skippedNoEmail },
    });

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
    place.serpapi_place_details?.website
  );
}

const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ca', 'yahoo.com.au', 'yahoo.com.ng',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.ca', 'outlook.com', 'outlook.co.uk',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'live.com', 'msn.com',
  'protonmail.com', 'pm.me', 'googlemail.com',
];

function isCustomDomainEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

function buildLead(place, emailResult, location, service, score, scoreData, tier, painPoints, opportunities, isNigeria) {
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
    tier,
    painPoints,
    opportunities,
    isNigeria,
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
