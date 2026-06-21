/**
 * /api/search — Lead Discovery
 * Supports single service OR multi-niche batch (paste multiple lines)
 * Filters: no website + free email only = qualified lead
 */

const express = require('express');
const router  = express.Router();
const { searchGoogleMaps, findEmail } = require('../services/serpService');
const { scoreLead } = require('../services/leadScorer');

const cache       = new Map();
const CACHE_TTL   = 8 * 60 * 60 * 1000; // 8 hours

// ── Free email domains ────────────────────────────────────────────────────────
const FREE_EMAIL_DOMAINS = [
  'gmail.com','yahoo.com','yahoo.co.uk','yahoo.ca','yahoo.com.au',
  'hotmail.com','hotmail.co.uk','hotmail.ca','outlook.com','outlook.co.uk',
  'icloud.com','me.com','mac.com','aol.com','live.com','msn.com',
  'protonmail.com','pm.me','googlemail.com',
];

// ── Parse niche input: handles "Niche 1 = Hydraulic Hose Repair" OR plain list ─
function parseNiches(raw) {
  if (!raw) return [];
  return raw
    .split('\n')
    .map(line => {
      // Strip "Niche N = " prefix if present
      const match = line.match(/^(?:niche\s*\d+\s*[=:]\s*)?(.+)$/i);
      return match ? match[1].trim() : line.trim();
    })
    .filter(Boolean);
}

// ── Route ─────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { service, niches, location } = req.body;

  if (!location) {
    return res.status(400).json({ error: 'location is required.' });
  }

  const serpKey = process.env.SERP_API_KEY;
  if (!serpKey) {
    return res.status(500).json({ error: 'SERP_API_KEY not set.' });
  }

  // Build service list — multi-niche OR single
  let serviceList = [];
  if (niches) {
    serviceList = parseNiches(niches);
  } else if (service) {
    serviceList = [service.trim()];
  }

  if (serviceList.length === 0) {
    return res.status(400).json({ error: 'Provide at least one service or niche.' });
  }

  console.log(`[Batch Search] ${serviceList.length} niches in "${location}":`, serviceList);

  const allLeads  = [];
  const seenGlobal = new Set();
  const results   = [];   // per-niche summary

  for (const svc of serviceList) {
    const cacheKey = `${svc.toLowerCase()}|${location.toLowerCase()}`;
    const cached   = cache.get(cacheKey);

    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      console.log(`[Cache HIT] ${cacheKey}`);
      allLeads.push(...cached.leads);
      results.push({ service: svc, count: cached.leads.length, source: 'cache' });
      continue;
    }

    console.log(`[Search] "${svc}" in "${location}"`);

    try {
      const rawResults = await searchGoogleMaps(svc, location, serpKey);
      const nichLeads  = [];

      for (const place of (rawResults || [])) {
        try {
          if (hasWebsite(place)) continue;

          const dedupeKey = place.place_id || `${place.title}|${place.address}`;
          if (seenGlobal.has(dedupeKey)) continue;
          seenGlobal.add(dedupeKey);

          const emailResult = await findEmail(place.title, location, serpKey);
          if (!emailResult.email)                    continue;
          if (isCustomDomainEmail(emailResult.email)) continue;

          const lead = buildLead(place, emailResult, location, svc);
          nichLeads.push(lead);
          await sleep(800);

        } catch (err) {
          console.error(`[Lead error] ${place.title}: ${err.message}`);
        }
      }

      cache.set(cacheKey, { ts: Date.now(), leads: nichLeads });
      allLeads.push(...nichLeads);
      results.push({ service: svc, count: nichLeads.length, source: 'live' });

      // Small gap between niche searches
      await sleep(500);

    } catch (err) {
      console.error(`[Niche error] ${svc}: ${err.message}`);
      results.push({ service: svc, count: 0, error: err.message });
    }
  }

  return res.json({
    success:  true,
    count:    allLeads.length,
    niches:   results,
    leads:    allLeads,
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function hasWebsite(place) {
  return !!(
    place.website ||
    place.links?.website ||
    place.extensions?.website ||
    place.serpapi_place_details?.website
  );
}

function isCustomDomainEmail(email) {
  const domain = (email.split('@')[1] || '').toLowerCase();
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

function buildLead(place, emailResult, location, service) {
  const { scoreData, score, tier, painPoints, opportunities } = scoreLead(place);
  return {
    id:          `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name:        place.title || 'Unknown Business',
    email:       emailResult.email,
    emailSource: emailResult.source || 'web',
    phone:       place.phone || place.extensions?.phone || null,
    address:     place.address || location,
    location,
    service,
    rating:      parseFloat(place.rating || 0),
    reviews:     parseInt(place.reviews || place.rating_count || 0, 10),
    category:    place.type || service,
    thumbnail:   place.thumbnail || null,
    score,
    scoreData,
    tier,
    painPoints,
    opportunities,
    date:        new Date().toISOString(),
    pitched:     false,
    emailSent:   false,
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = router;
