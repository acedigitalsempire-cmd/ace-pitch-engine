/**
 * leadScorer.js — Opportunity Scoring for Ace Pitch Engine
 * Score: 0–100. Higher = better lead.
 *
 * SWEET SPOT per research: 10–50 reviews, active, no website, free email
 * AVOID: 0 reviews (no budget), 50+ reviews (already pitched), franchises
 */

function scoreLead(place) {
  const reviews = parseInt(place.reviews || place.rating_count || 0, 10);
  const rating  = parseFloat(place.rating || 0);

  // ── Core qualifier: no website (non-negotiable, always earned here) ──────
  const noWebsite = { points: 40, label: 'No website detected', earned: true };

  // ── Review sweet spot: 10–50 is ideal ────────────────────────────────────
  const inSweetSpot = reviews >= 10 && reviews <= 50;
  const hasMinReviews = reviews >= 5 && reviews < 10;
  const tooFewReviews = reviews < 5;
  const tooManyReviews = reviews > 50;

  const reviewScore = (() => {
    if (inSweetSpot)    return { points: 30, label: `${reviews} reviews — in the ideal 10–50 range`, earned: true };
    if (hasMinReviews)  return { points: 15, label: `${reviews} reviews — active but below sweet spot`, earned: true };
    if (tooFewReviews)  return { points: 5,  label: `${reviews} reviews — very low, may lack budget`, earned: true };
    if (tooManyReviews) return { points: 0,  label: `${reviews} reviews — above 50, likely already pitched`, earned: false };
    return { points: 0, label: 'No reviews found', earned: false };
  })();

  // ── Rating: below 4.2 = they need help, above = complacent ──────────────
  const ratingScore = (() => {
    if (rating === 0)              return { points: 10, label: 'No rating yet — brand new or invisible online', earned: true };
    if (rating > 0 && rating < 4.0) return { points: 15, label: `${rating}★ rating — below competitor average`, earned: true };
    if (rating >= 4.0 && rating < 4.2) return { points: 10, label: `${rating}★ rating — slightly below 4.2 threshold`, earned: true };
    return { points: 0, label: `${rating}★ rating — above 4.2, may be complacent`, earned: false };
  })();

  // ── Free email = owner-operated, no marketing team ───────────────────────
  const freeEmail = { points: 5, label: 'Free email (Gmail/Yahoo) — owner runs this personally', earned: true };

  // ── Hard penalty: too many reviews = likely already been pitched ──────────
  const overPitchedPenalty = tooManyReviews ? -10 : 0;

  const scoreData = { noWebsite, reviewScore, ratingScore, freeEmail };

  const rawScore = Object.values(scoreData).reduce((sum, s) => sum + (s.earned ? s.points : 0), 0) + overPitchedPenalty;
  const score = Math.min(100, Math.max(0, rawScore));

  const tier =
    score >= 80 ? { label: 'HOT LEAD',  color: '#e53e3e', emoji: '🔥' } :
    score >= 65 ? { label: 'STRONG',    color: '#dd6b20', emoji: '⚡' } :
    score >= 45 ? { label: 'MODERATE',  color: '#d69e2e', emoji: '✅' } :
                  { label: 'LOW',       color: '#718096', emoji: '📋' };

  const painPoints  = detectPainPoints(place, reviews, rating);
  const opportunities = detectOpportunities(place, reviews, rating);

  // Filter flag: should we pitch this lead at all?
  const qualified = score >= 45 && reviews <= 50;

  return { score, scoreData, tier, painPoints, opportunities, qualified };
}

function detectPainPoints(place, reviews, rating) {
  const points = [];
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
  return points;
}

function detectOpportunities(place, reviews, rating) {
  return [
    'Professional 5-page website built for their trade ($299 to $499 one-time)',
    'Google Business Profile fully optimised',
    'Click-to-call and contact form for instant lead capture',
    'Local SEO setup to rank for their service in their city',
    'Optional monthly maintenance retainer ($49 to $99/month)',
  ];
}

module.exports = { scoreLead };
