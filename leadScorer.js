/**
 * leadScorer.js — Opportunity Scoring for Ace Pitch Engine
 * Score: 0–100. Minimum 50 to qualify — below 50 is filtered out.
 * Sweet spot: 10–50 reviews, no website, free email
 */

const { detectNigeria } = require('./serpService');

function scoreLead(place, location) {
  const reviews = parseInt(place.reviews || place.rating_count || 0, 10);
  const rating  = parseFloat(place.rating || 0);
  const isNigeria = detectNigeria(location || '');

  // ── No website — non-negotiable core qualifier ───────────────────────────
  const noWebsite = { points: 40, label: 'No website detected', earned: true };

  // ── Review sweet spot ────────────────────────────────────────────────────
  const reviewScore = (() => {
    if (reviews >= 10 && reviews <= 50)
      return { points: 30, label: `${reviews} reviews — in the ideal 10–50 range`, earned: true };
    if (reviews >= 5 && reviews < 10)
      return { points: 15, label: `${reviews} reviews — active but below sweet spot`, earned: true };
    if (reviews < 5)
      return { points: 5,  label: `${reviews} reviews — very low, may lack budget`, earned: true };
    // Nigerian market tolerance — slightly higher review cap
    if (isNigeria && reviews > 50 && reviews <= 80)
      return { points: 10, label: `${reviews} reviews — above ideal but Nigerian market less saturated`, earned: true };
    return { points: 0, label: `${reviews} reviews — above 50, likely already pitched`, earned: false };
  })();

  // ── Rating ────────────────────────────────────────────────────────────────
  const ratingScore = (() => {
    if (rating === 0)
      return { points: 10, label: 'No rating yet — brand new or invisible online', earned: true };
    if (rating > 0 && rating < 4.0)
      return { points: 15, label: `${rating}★ rating — below competitor average`, earned: true };
    if (rating >= 4.0 && rating < 4.2)
      return { points: 10, label: `${rating}★ rating — slightly below 4.2 threshold`, earned: true };
    return { points: 0, label: `${rating}★ rating — above 4.2, may be complacent`, earned: false };
  })();

  // ── Free email = owner-operated ──────────────────────────────────────────
  const freeEmail = { points: 5, label: 'Free email (Gmail/Yahoo) — owner runs this personally', earned: true };

  // ── Penalty for over-pitched ──────────────────────────────────────────────
  const overPitchedPenalty = (reviews > 50 && !isNigeria) ? -10 : 0;

  const scoreData = { noWebsite, reviewScore, ratingScore, freeEmail };
  const rawScore = Object.values(scoreData).reduce((sum, s) => sum + (s.earned ? s.points : 0), 0) + overPitchedPenalty;
  const score = Math.min(100, Math.max(0, rawScore));

  const tier =
    score >= 80 ? { label: 'HOT LEAD',  color: '#e53e3e' } :
    score >= 65 ? { label: 'STRONG',    color: '#dd6b20' } :
    score >= 50 ? { label: 'MODERATE',  color: '#d69e2e' } :
                  { label: 'LOW',       color: '#718096' };

  const painPoints    = detectPainPoints(place, reviews, rating, isNigeria);
  const opportunities = detectOpportunities(place, isNigeria);

  // MINIMUM SCORE 50 — anything below is not worth pitching
  const qualified = score >= 50 && (isNigeria ? reviews <= 80 : reviews <= 50);

  return { score, scoreData, tier, painPoints, opportunities, qualified, isNigeria };
}

function detectPainPoints(place, reviews, rating, isNigeria) {
  const points = [];
  if (isNigeria) {
    points.push('No website — losing every customer who searches Google before making a call');
    if (reviews === 0)
      points.push('Zero Google reviews — no proof of credibility for new customers in Lagos');
    else if (reviews < 10)
      points.push(`Only ${reviews} Google reviews — below the trust level most customers expect before calling`);
    if (rating > 0 && rating < 4.0)
      points.push(`${rating}★ rating — competitors with better online presence are capturing these customers`);
    if (!place.phone)
      points.push('Phone number not easily visible on Google — customers who cannot find a number quickly move on');
    points.push('Invisible on Google when potential customers search for this service in their area');
  } else {
    points.push('No website — losing every customer who searches Google before calling');
    if (reviews === 0)
      points.push('Zero Google reviews — zero social proof to new customers');
    else if (reviews < 10)
      points.push(`Only ${reviews} Google reviews — below the trust threshold most customers expect`);
    else if (reviews > 50)
      points.push(`${reviews} reviews but still no website — missing quote requests every single day`);
    if (rating > 0 && rating < 4.0)
      points.push(`${rating}★ rating — competitors with websites and better profiles are winning the clicks`);
    if (!place.phone)
      points.push('No phone number visible in Google search results');
    points.push('Invisible to the customers already searching for this service in their city');
  }
  return points;
}

function detectOpportunities(place, isNigeria) {
  if (isNigeria) {
    return [
      'Professional business website built for their trade and local market (starting at ₦150,000)',
      'Google Business Profile fully set up and optimised',
      'WhatsApp click-to-chat button for instant customer contact',
      'Local SEO setup to rank on Google in their area',
      'Optional monthly maintenance retainer (₦30,000/month)',
    ];
  }
  return [
    'Professional 5-page website built for their trade ($299 to $499 one-time)',
    'Google Business Profile fully optimised',
    'Click-to-call and contact form for instant lead capture',
    'Local SEO setup to rank for their service in their city',
    'Optional monthly maintenance retainer ($49 to $99/month)',
  ];
}

module.exports = { scoreLead };
