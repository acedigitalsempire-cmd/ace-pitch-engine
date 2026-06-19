/**
 * /api/pitch — GPT-4o Custom Pitch Generator
 * Writes a unique cold outreach email for each specific business
 */

const express = require('express');
const router = express.Router();
const https = require('https');

function openaiPost(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
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
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not set.' });
  }

  const { name, service, location, rating, reviews, address, painPoints, opportunities, score } = lead;

  const ratingLine  = rating > 0 ? `${rating} stars on Google` : 'no star rating yet';
  const reviewsLine = reviews > 0 ? `${reviews} Google review${reviews === 1 ? '' : 's'}` : 'no Google reviews yet';
  const addressLine = address || location;

  const systemPrompt = `You are a world-class cold outreach copywriter specialising in selling professional websites to small local trade businesses in the USA, UK, Canada, and Europe.

Your job is to write a cold outreach email from Uchenna Richard (DigitalUche), founder of Ace Digitals Global, a digital marketing agency that specialises in building websites for local trade businesses.

CRITICAL RULES:
1. Every email must feel hand-written specifically for THIS business only — never generic
2. Acknowledge something specific about their trade and their local market
3. Do NOT say "I noticed you don't have a website" bluntly — be tactful and warm
4. Empathise with how busy trade business owners are before pitching
5. Show real understanding of their trade (plumber, electrician, etc.) and the problems they face without a website
6. Highlight the opportunity cost — customers they are losing RIGHT NOW to competitors with websites
7. Make the offer crystal clear: professional 5-page website starting at $299
8. Create genuine urgency — not fake countdown timers, but real business urgency
9. The CTA must be simple: reply to this email to claim a free website audit
10. Keep the total email under 280 words — trade business owners are busy people
11. Use first name of the business or the owner if obvious from the name, otherwise address the team
12. NEVER use em dashes or hyphens used as dashes
13. NEVER sound like AI copy — write like a real human consultant who genuinely wants to help
14. End with a PS line that adds one final compelling fact or question
15. Tone: warm, direct, confident, never pushy or desperate`;

  const userPrompt = `Write a cold outreach email to this specific business:

Business name: ${name}
Trade/Service: ${service}
Location: ${addressLine}
Google rating: ${ratingLine}
Google reviews: ${reviewsLine}
Pain points identified: ${(painPoints || []).join('; ')}
Score: ${score}/100

Sender details:
Name: Uchenna Richard (DigitalUche)
Agency: Ace Digitals Global
Email: info@acedigitalsempire.com
WhatsApp: +234 907 958 1937
Website: acedigitalsempire.com

Also write a compelling email SUBJECT LINE (separate from the body) that creates urgency and is personalised to this specific business. The subject line must make them feel this email is just for them.

Output format — respond in this exact JSON:
{
  "subject": "The subject line here",
  "body": "The full email body here with line breaks as \\n"
}`;

  try {
    console.log(`[Pitch] Generating for: ${name}`);

    const response = await openaiPost({
      model: 'gpt-4o',
      max_tokens: 800,
      temperature: 0.82,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    }, apiKey);

    if (response.error) {
      throw new Error(`OpenAI: ${response.error.message}`);
    }

    const raw = response.choices?.[0]?.message?.content;
    if (!raw) throw new Error('OpenAI returned empty content');

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('GPT returned invalid JSON for pitch');
    }

    if (!parsed.subject || !parsed.body) {
      throw new Error('GPT response missing subject or body fields');
    }

    console.log(`[Pitch] Done for: ${name}`);
    return res.json({ success: true, subject: parsed.subject, body: parsed.body });

  } catch (err) {
    console.error('[Pitch error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
