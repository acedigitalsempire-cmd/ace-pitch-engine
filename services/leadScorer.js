/**
 * leadScorer.js — Opportunity Scoring for Ace Pitch Engine
 * Score: 0–100. Higher = more urgent need = better lead.
 */

function scoreLead(place) {
  const reviews  = parseInt(place.reviews || place.rating_count || 0, 10);
  const rating   = parseFloat(place.rating || 0);

  const scoreData = {
    noWebsite:    { points: 50, label: 'No website found',              earned: true },
    lowReviews:   { points: 20, label: 'Under 10 Google reviews',       earned: reviews < 10 },
    lowRating:    { points: 15, label: 'Rating below 4.2 stars',        earned: rating > 0 && rating < 4.2 },
    noRating:     { points: 10, label: 'No Google rating at all',       earned: rating === 0 },
    freeEmail:    { points: 5,  label: 'Uses free email (Gmail/Yahoo)', earned: true }, // always true here
  };

  const score = Object.values(scoreData).reduce((sum, s) => sum + (s.earned ? s.points : 0), 0);

  const tier =
    score >= 85 ? { label: 'HOT LEAD',  color: '#e53e3e', emoji: '🔥' } :
    score >= 70 ? { label: 'STRONG',    color: '#dd6b20', emoji: '⚡' } :
    score >= 55 ? { label: 'MODERATE',  color: '#d69e2e', emoji: '✅' } :
                  { label: 'LOW',       color: '#718096', emoji: '📋' };

  const painPoints = detectPainPoints(place, reviews, rating);
  const opportunities = detectOpportunities(place, reviews, rating);

  return { score: Math.min(100, score), scoreData, tier, painPoints, opportunities };
}

function detectPainPoints(place, reviews, rating) {
  const points = [];
  points.push('No website — losing every customer who searches online first');
  if (reviews === 0)      points.push('Zero Google reviews — no social proof whatsoever');
  else if (reviews < 5)   points.push(`Only ${reviews} Google review${reviews === 1 ? '' : 's'} — dangerously low trust`);
  else if (reviews < 10)  points.push(`Only ${reviews} Google reviews — below the trust threshold`);
  if (rating > 0 && rating < 4.0) points.push(`${rating}★ rating — competitors with websites are outranking them`);
  if (!place.phone)       points.push('No phone number visible in search results');
  points.push('Invisible to the 97% of customers who search online before buying');
  return points;
}

function detectOpportunities(place, reviews, rating) {
  return [
    'Build a professional 5-page website ($299–$499 one-time)',
    'Set up Google Business Profile properly',
    'Add click-to-call and WhatsApp contact buttons',
    'Local SEO to rank for their trade in their city',
    'Monthly maintenance retainer ($49–$99/month)',
  ];
}

module.exports = { scoreLead };
