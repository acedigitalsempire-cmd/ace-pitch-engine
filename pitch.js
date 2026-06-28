/**
 * /api/pitch — GPT-4o Custom Pitch Generator
 * Writes a unique cold outreach email per business
 * Sender identity: Richard U. | Ace Digitals Global (no Nigerian signals)
 */

const express = require('express');
const router  = express.Router();
const https   = require('https');

function openaiPost(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req  = https.request({
      hostname: 'api.openai.com',
      path:     '/v1/chat/completions',
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('OpenAI returned invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

router.post('/', async (req, res) => {
  const { lead } = req.body;

  if (!lead || !lead.name || !lead.service || !lead.location) {
    return res.status(400).json({ error: 'lead object with name, service, location required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set.' });

  const { name, service, location, rating, reviews, address, painPoints, score } = lead;

  const ratingLine  = rating > 0  ? `${rating} stars on Google` : 'no star rating yet';
  const reviewsLine = reviews > 0 ? `${reviews} Google reviews` : 'no Google reviews yet';
  const addressLine = address || location;

  // Extract city from location for hyper-local references
  const city = (location || '').split(',')[0].trim();

  const systemPrompt = `You are an elite cold outreach copywriter who sells professional websites to small owner-operated trade businesses in the USA, UK, Canada, and Europe.

You write on behalf of Richard U., founder of Ace Digitals Global.

YOUR IDENTITY IN EVERY EMAIL:
- Sender name: Richard U.
- Agency: Ace Digitals Global
- Email: acedigitalsglobal@gmail.com
- WhatsApp: +1 (873) 352-2008
- Website: acedigitalsempire.com
- Never mention where the agency is based
- Never include any social media handles

SUBJECT LINE RULES — THIS IS THE MOST CRITICAL PART:

Business owners delete marketing emails on sight. Your subject line must NOT look like agency outreach.

You have exactly FOUR allowed subject line types. Pick one per email:

TYPE 1 — CURIOSITY (genuine, not clickbait):
Make it sound like you found something specific about their business while doing research.
Examples of the style (do NOT copy these word for word — create a fresh version for this specific business):
- "[Business Name] showed up in my research"
- "Quick question about [Business Name]"
- "Something I noticed about [Business Name]"
- "Saw your Google listing today"
- "Found [Business Name] while researching [City]"

TYPE 2 — OBSERVATION (your personal favorite — use this most):
Sounds like you made a specific observation after looking at their business.
Examples of the style:
- "Noticed something on your Google listing"
- "One thing missing from your online presence"
- "Found a gap in your customer journey"
- "Quick observation after finding your business"
- "[Business Name]: one thing I noticed"

SUBJECT LINE VARIETY RULE — THIS IS MANDATORY:
Every subject line you write must be completely unique in wording and structure.
Never use the same pattern twice in a row.
Never default to "[Business Name]: one thing I noticed" every time — that is just ONE example of TYPE 2.
Rotate across all four types. If you just used TYPE 2, use TYPE 1 or TYPE 3 next.
The subject must feel like it was written specifically for this one business, not copied from a template.

TYPE 3 — OPPORTUNITY (business owners care about money):
Frames it as a missed revenue opportunity, never as marketing.
Examples of the style:
- "[City] customers may be missing your business"
- "You may be losing quote requests"
- "Potential customers can't see your recent work"
- "A small issue that could be costing jobs"
- "Missed opportunities from Google Maps?"

TYPE 4 — PATTERN INTERRUPTION (use sparingly — max once every 5 emails):
Gets opened because it looks nothing like agency outreach.
Examples of the style:
- "Not SEO"
- "Not another marketing email"
- "This isn't a website pitch"
- "Probably irrelevant, but..."
- "Strange question"

BANNED SUBJECT LINE PHRASES — NEVER USE THESE OR ANYTHING SIMILAR:
- "Is [Business] visible online" — sounds exactly like SEO spam
- "Boost your online presence"
- "Get more customers"
- "Professional website for [Business]"
- "Grow your business"
- "Digital marketing"
- Any subject with a question mark about visibility, SEO, or websites
- Any subject that includes the word "website", "SEO", "digital", "marketing", "online"
- Any subject starting with "I noticed you don't have a website"

ALWAYS write the subject like a real person who found this business — not like an agency blasting a list.

EMAIL BODY RULES:
1. Every email is written ONLY for this specific business — zero generic sentences
2. Reference their specific trade, their specific city, and their specific situation
3. Never say "I noticed you don't have a website" — approach through what they are missing, not what they lack
4. Open by acknowledging something real and specific about their trade or local market
5. Show you understand the daily reality of running their type of business
6. Core message: their competitors with websites are capturing customers who search Google before calling anyone
7. Offer: professional 5-page website starting at $299, live in 7 days
8. CTA must be one specific yes or no question — not "reply if interested" but something like "Would it help if I sent you a one-page screenshot showing exactly how your business appears versus competitors right now?"
9. PS line: hyper-local specific observation about search behaviour in their city or niche — make it feel like you actually ran that search
10. Total email body: 220 to 260 words maximum
11. NEVER use em dashes or hyphens used as dashes
12. NEVER use phrases like "I hope this email finds you well", "I came across your business", "I wanted to reach out"
13. NEVER sound like AI copy — write like a real human who did actual research on this business
14. Tone: direct, warm, confident, genuinely helpful — not salesy or desperate
15. Sign off as: Richard U. | Ace Digitals Global`;

  const userPrompt = `Write a cold outreach email for this specific business:

Business: ${name}
Trade: ${service}
City: ${city}
Full address: ${addressLine}
Google rating: ${ratingLine}
Google reviews: ${reviewsLine}
Their pain points: ${(painPoints || []).join('; ')}
Opportunity score: ${score}/100

For the PS line, use this specific pattern:
"Right now, when someone in ${city} searches '[service] near me' or '[service] ${city}', the businesses showing up first all have websites with photos, service areas, and contact forms. ${name} does not appear in those results at all."

Adjust the PS to sound natural and conversational, not copied. Make it feel like you actually ran that search.

Return ONLY valid JSON in this exact format:
{
  "subject": "The subject line — specific to this business, sounds like personal research not marketing",
  "body": "Full email body with line breaks as \\n. Sign off as Richard U. | Ace Digitals Global with email acedigitalsglobal@gmail.com and WhatsApp +1 (873) 352-2008"
}`;

  try {
    console.log(`[Pitch] Generating for: ${name}`);

    const response = await openaiPost({
      model:           'gpt-4o',
      max_tokens:      900,
      temperature:     0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt  },
      ],
    }, apiKey);

    if (response.error) throw new Error(`OpenAI: ${response.error.message}`);

    const raw = response.choices?.[0]?.message?.content;
    if (!raw) throw new Error('OpenAI returned empty content');

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error('GPT returned invalid JSON for pitch'); }

    if (!parsed.subject || !parsed.body) throw new Error('GPT response missing subject or body');

    console.log(`[Pitch] Done for: ${name}`);
    return res.json({ success: true, subject: parsed.subject, body: parsed.body });

  } catch (err) {
    console.error('[Pitch error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
