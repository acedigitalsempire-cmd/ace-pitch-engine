/**
 * /api/pitch — GPT-4o Custom Pitch Generator
 * Location-aware: Nigerian vs International tone
 * Industry-specific language per niche
 * Strong subject lines that drive opens
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

// Industry-specific context to make the pitch sound like an expert wrote it
function getIndustryContext(service) {
  const s = (service || '').toLowerCase();

  if (s.includes('hydraulic') || s.includes('hose')) return {
    industry: 'hydraulic hose repair',
    customerType: 'fleet managers, construction site supervisors, and equipment operators',
    searchBehavior: 'searching Google for emergency hydraulic hose repair near them when equipment breaks down on a job site',
    urgency: 'Equipment downtime is money. When a hose bursts on a job site, the first repair shop that shows up on Google gets the call.',
    trustSignal: 'certifications, turnaround time, and mobile repair capability',
    currency: 'USD',
  };

  if (s.includes('welding') || s.includes('fabrication')) return {
    industry: 'welding and metal fabrication',
    customerType: 'contractors, manufacturers, and facility managers',
    searchBehavior: 'searching for certified welders and fabricators online before making a call',
    urgency: 'Most welding jobs are project-based. The shop that shows up first on Google gets the quote request.',
    trustSignal: 'certifications, portfolio of past work, and types of metal they work with',
    currency: 'USD',
  };

  if (s.includes('tank') || s.includes('cleaning')) return {
    industry: 'tank cleaning',
    customerType: 'industrial facility managers, food processing plant operators, and municipal water authorities',
    searchBehavior: 'researching tank cleaning companies online before putting out an RFQ',
    urgency: 'Tank cleaning is a compliance requirement. Facility managers who cannot find a certified company quickly will move on to whoever shows up first.',
    trustSignal: 'compliance certifications, safety records, and the types of tanks they service',
    currency: 'USD',
  };

  if (s.includes('parking') || s.includes('striping') || s.includes('line')) return {
    industry: 'parking lot striping',
    customerType: 'property managers, retail center owners, and HOA managers',
    searchBehavior: 'searching Google for parking lot striping companies when their lot needs repainting or a new property needs marking done',
    urgency: 'Parking lot striping is often seasonal and deadline-driven — new tenants, inspections, or seasonal repaints. The company that shows up on Google gets the call.',
    trustSignal: 'photos of completed lots, types of paint used, and ADA compliance experience',
    currency: 'USD',
  };

  if (s.includes('hood') || s.includes('exhaust') || s.includes('kitchen')) return {
    industry: 'commercial kitchen hood and exhaust cleaning',
    customerType: 'restaurant owners, hotel kitchen managers, and facility directors',
    searchBehavior: 'searching for certified hood cleaning companies before their next fire marshal inspection',
    urgency: 'Fire marshal inspections are not optional. Restaurant owners who cannot quickly find a certified hood cleaning company online are stressed and ready to call whoever shows up on Google.',
    trustSignal: 'NFPA 96 certification, compliance documentation, and photos of before and after cleans',
    currency: 'USD',
  };

  if (s.includes('plumb')) return {
    industry: 'plumbing',
    customerType: 'homeowners and property managers',
    searchBehavior: 'searching Google for a plumber when something breaks — usually urgent',
    urgency: 'Plumbing calls are almost always urgent. The plumber that shows up in Google search gets the emergency call.',
    trustSignal: 'licensing, response time, and service area coverage',
    currency: 'USD',
  };

  if (s.includes('electric')) return {
    industry: 'electrical services',
    customerType: 'homeowners, contractors, and property managers',
    searchBehavior: 'searching Google for a licensed electrician — especially before a project or after an emergency',
    urgency: 'Electrical work requires licensing. Customers search specifically for licensed electricians on Google because they cannot risk unlicensed work.',
    trustSignal: 'licensing, insurance, and types of work they specialise in',
    currency: 'USD',
  };

  if (s.includes('roof')) return {
    industry: 'roofing',
    customerType: 'homeowners and property managers',
    searchBehavior: 'searching Google immediately after a storm or when they spot a leak',
    urgency: 'Roof damage is urgent and weather-dependent. Roofers that rank on Google after a storm capture the entire market in their area.',
    trustSignal: 'photos of completed roofs, years in business, and insurance credentials',
    currency: 'USD',
  };

  if (s.includes('pest') || s.includes('exterminator')) return {
    industry: 'pest control',
    customerType: 'homeowners, restaurant owners, and property managers',
    searchBehavior: 'searching Google the moment they discover a pest problem — which is usually immediate',
    urgency: 'Pest problems feel urgent and personal. Customers call the first company they find on Google that looks credible.',
    trustSignal: 'licensing, types of pests handled, and guaranteed service',
    currency: 'USD',
  };

  // Nigerian niches
  if (s.includes('fashion') || s.includes('tailor') || s.includes('sewing')) return {
    industry: 'fashion and tailoring',
    customerType: 'individuals and corporate clients looking for custom clothing',
    searchBehavior: 'searching Google and Instagram for tailors in their area before making contact',
    urgency: 'Fashion clients do not walk into random shops anymore. They search online first, look at photos, and then contact.',
    trustSignal: 'portfolio photos, turnaround time, and types of outfits they specialise in',
    currency: 'NGN',
  };

  if (s.includes('real estate') || s.includes('property')) return {
    industry: 'real estate and property',
    customerType: 'property buyers, renters, and investors',
    searchBehavior: 'searching Google for properties and agents in specific areas before making contact',
    urgency: 'Real estate clients research online for weeks before contacting anyone. The agent or developer with a website and property listings gets contacted first.',
    trustSignal: 'property listings, location coverage, and agent credentials',
    currency: 'NGN',
  };

  if (s.includes('salon') || s.includes('barber') || s.includes('hair')) return {
    industry: 'hair salon and barbershop',
    customerType: 'individuals looking for hair services in their area',
    searchBehavior: 'searching Google and Instagram for salons nearby before deciding where to go',
    urgency: 'Salons with online presence and photos attract clients from far beyond their immediate neighbourhood.',
    trustSignal: 'portfolio photos, services offered, and pricing transparency',
    currency: 'NGN',
  };

  // Default fallback
  return {
    industry: service,
    customerType: 'local customers and businesses',
    searchBehavior: 'searching Google for this type of service before making a call',
    urgency: 'The first business that shows up on Google for this service gets the customer.',
    trustSignal: 'professional website, reviews, and service details',
    currency: 'USD',
  };
}

// Nigerian location detection
function isNigerianLead(location) {
  const NIGERIAN_KEYWORDS = [
    'lagos', 'abuja', 'kano', 'ibadan', 'port harcourt', 'benin city',
    'kaduna', 'enugu', 'onitsha', 'warri', 'calabar', 'owerri', 'uyo',
    'nigeria', 'lekki', 'ikeja', 'victoria island', 'surulere', 'ajah',
    'yaba', 'apapa', 'ikorodu', 'mushin', 'oshodi',
  ];
  const loc = (location || '').toLowerCase();
  return NIGERIAN_KEYWORDS.some(kw => loc.includes(kw));
}

router.post('/', async (req, res) => {
  const { lead } = req.body;

  if (!lead || !lead.name || !lead.service || !lead.location) {
    return res.status(400).json({ error: 'lead object with name, service, location required.' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not set.' });

  const { name, service, location, rating, reviews, address, painPoints, score } = lead;
  const isNigeria = lead.isNigeria || isNigerianLead(location);
  const industry  = getIndustryContext(service);

  const ratingLine  = rating > 0  ? `${rating} stars on Google` : 'no star rating yet';
  const reviewsLine = reviews > 0 ? `${reviews} Google reviews` : 'no Google reviews yet';
  const addressLine = address || location;
  const city        = (location || '').split(',')[0].trim();

  const senderEmail   = 'clients@acedigitalsempire.com';
  const senderPhone   = isNigeria ? '+234 907 958 1937' : '+1 (873) 352-2008';
  const websitePrice  = isNigeria ? '₦150,000' : '$299';
  const deliveryDays  = '7';

  const systemPrompt = isNigeria
    ? buildNigerianSystemPrompt(senderEmail, senderPhone, websitePrice, deliveryDays, industry)
    : buildInternationalSystemPrompt(senderEmail, senderPhone, websitePrice, deliveryDays, industry);

  const userPrompt = buildUserPrompt(name, service, city, addressLine, ratingLine, reviewsLine, painPoints, score, industry, isNigeria);

  try {
    console.log(`[Pitch] Generating for: ${name} | Nigeria: ${isNigeria} | Industry: ${industry.industry}`);

    const response = await openaiPost({
      model:           'gpt-4o',
      max_tokens:      900,
      temperature:     0.88,
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

    console.log(`[Pitch] Done: ${name} | Subject: ${parsed.subject}`);
    return res.json({ success: true, subject: parsed.subject, body: parsed.body });

  } catch (err) {
    console.error('[Pitch error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

function buildInternationalSystemPrompt(email, phone, price, days, industry) {
  return `You are an elite cold outreach copywriter who sells professional websites to small owner-operated ${industry.industry} businesses across the USA, UK, Canada, and Europe.

You write on behalf of Richard U., founder of Ace Digitals Global.

YOUR IDENTITY IN EVERY EMAIL:
- Sender name: Richard U.
- Agency: Ace Digitals Global
- Email: ${email}
- WhatsApp: ${phone}
- Website: acedigitalsempire.com
- Never mention where the agency is based
- Never include social media handles

INDUSTRY CONTEXT YOU MUST USE:
- Industry: ${industry.industry}
- Who searches for this business: ${industry.customerType}
- How they search: ${industry.customerType} are ${industry.searchBehavior}
- The urgency angle: ${industry.urgency}
- What builds trust in this industry: ${industry.trustSignal}

SUBJECT LINE RULES — THIS IS THE MOST CRITICAL PART:
The subject line must trigger curiosity or feel like a personal observation. It must NOT look like a marketing email.

Use ONE of these four types and rotate across emails — never use the same pattern twice:

TYPE 1 — CONVERSATIONAL QUESTION (feels like a colleague asking):
Examples of the style — create fresh versions, do not copy:
- "Are you still taking on new clients this week?"
- "Do you get calls from people who found you on Google?"
- "Quick question about your ${industry.industry} business"
- "Are you the right person to ask about [specific thing]?"

TYPE 2 — PERSONAL OBSERVATION (sounds like you researched them):
Examples of the style:
- "Something I noticed about [Business Name]"
- "Found [Business Name] while looking into ${industry.industry} in [city]"
- "One thing missing from your online presence"
- "[Business Name]: quick observation"

TYPE 3 — OPPORTUNITY FRAMING (business owners care about money):
Examples of the style:
- "[City] customers may not be finding you yet"
- "Potential clients in [city] cannot see your work online"
- "A small gap that could be costing you jobs"
- "Quote requests may be going to your competitors right now"

TYPE 4 — PATTERN INTERRUPT (use sparingly, max 1 in 5):
Examples of the style:
- "Not a sales pitch"
- "Probably irrelevant, but..."
- "This might not be for you"
- "Strange question about ${industry.industry}"

BANNED SUBJECT LINES — NEVER USE:
- Anything with the word "website", "SEO", "digital", "marketing", "online presence" in the subject
- "I noticed you don't have a website"
- "Boost your visibility"
- "Grow your business"
- Generic "[Business Name]: one thing I noticed" every single time

EMAIL BODY RULES:
1. Open with something specific about the ${industry.industry} business or their local market — never a generic opener
2. Show you understand what running a ${industry.industry} business actually involves day to day
3. The core message: ${industry.urgency}
4. What they are losing: ${industry.customerType} are ${industry.searchBehavior} and not finding this business
5. Your offer: professional website starting at ${price}, live in ${days} days
6. CTA: one specific yes/no question — not "reply if interested" but something like a specific offer to show them proof
7. PS line: a hyper-local, specific observation about what happens when someone searches for ${industry.industry} in their city right now
8. Total length: 200 to 250 words maximum — trade owners do not read long emails
9. NEVER use em dashes
10. NEVER use "I hope this email finds you well", "I came across your business", "I wanted to reach out"
11. NEVER sound like AI — write like a real human who specifically researched this business
12. Tone: direct, warm, confident, genuinely useful — not salesy
13. Sign off as: Richard U. | Ace Digitals Global with email ${email} and WhatsApp ${phone}

The email must align naturally with the subject line. If the subject asks a question, the email should answer or build on it. The subject and email should feel like they came from the same person who did real research.`;
}

function buildNigerianSystemPrompt(email, phone, price, days, industry) {
  return `You are an expert business development writer who helps Nigerian small businesses understand why they need a professional website. You write on behalf of Richard, founder of Ace Digitals Global.

You understand the Nigerian business environment deeply. You know that:
- Most Nigerian small business owners rely on WhatsApp, word of mouth, and Instagram
- Many are skeptical of online services because they have been scammed before
- They respond to direct, plain language — not corporate speak
- They care about value for money and want to know exactly what they are getting
- They trust recommendations and proof over claims

YOUR IDENTITY:
- Sender name: Richard
- Agency: Ace Digitals Global
- Email: ${email}
- WhatsApp: ${phone}
- Website: acedigitalsempire.com

INDUSTRY CONTEXT:
- Industry: ${industry.industry}
- Who searches for this business: ${industry.customerType}
- The opportunity: ${industry.urgency}
- What builds trust: ${industry.trustSignal}

SUBJECT LINE RULES:
Write a subject that feels like a direct message from someone they know, not a marketing email. Nigerian business owners open emails that feel personal and direct.

Use ONE of these styles:
TYPE 1 — DIRECT QUESTION (feels like a friend asking):
- "Are you still taking new customers?"
- "Quick question about your ${industry.industry} business"
- "Can I ask you something about your business?"
- "Do customers find you easily on Google?"

TYPE 2 — PERSONAL OBSERVATION:
- "Something I noticed about your business"
- "Found your ${industry.industry} business while doing research in [city]"
- "I checked your Google listing"

TYPE 3 — MONEY ANGLE (Nigerians respond to this directly):
- "Customers in [city] may not be finding you yet"
- "You might be losing customers to competitors with websites"
- "A simple thing that could bring you more customers"

BANNED:
- Never mention "website" or "SEO" in the subject
- Never sound like a marketing blast
- Never use corporate language

EMAIL BODY RULES FOR NIGERIAN MARKET:
1. Write in clear, direct Nigerian English — not pidgin, not overly formal, just clear and human
2. Open by acknowledging something real about running a ${industry.industry} business in their city
3. Do not assume they know what SEO or digital marketing means — explain the benefit, not the technical term
4. The message: customers in their area are searching Google for ${industry.industry} and finding other businesses instead
5. Your offer: professional website starting at ${price}, ready in ${days} days, with WhatsApp integration
6. CTA: one direct question — something they can answer with yes or no on WhatsApp
7. PS line: a specific, real observation about what happens when someone in their city searches for ${industry.industry} on Google right now
8. Total length: 180 to 230 words — keep it short
9. NEVER use em dashes
10. NEVER sound like AI or a bulk marketing email
11. Tone: warm, direct, like a knowledgeable friend who genuinely wants to help — not a salesperson
12. Sign off as: Richard | Ace Digitals Global with WhatsApp ${phone} and email ${email}
13. Mention WhatsApp prominently — Nigerian business owners prefer WhatsApp to email

The subject and email must feel connected and natural.`;
}

function buildUserPrompt(name, service, city, address, ratingLine, reviewsLine, painPoints, score, industry, isNigeria) {
  if (isNigeria) {
    return `Write a cold outreach email for this Nigerian business:

Business name: ${name}
Type of business: ${service}
City: ${city}
Address: ${address}
Google rating: ${ratingLine}
Google reviews: ${reviewsLine}
Pain points: ${(painPoints || []).join('; ')}
Opportunity score: ${score}/100

For the PS line, use this specific angle:
"When someone in ${city} searches '${service} near me' or '${service} in ${city}' on Google right now, the businesses appearing first all have professional websites. ${name} does not show up in those results at all."

Rewrite the PS to sound natural and conversational in the Nigerian context, as if you actually searched right now and are reporting what you found.

Return ONLY valid JSON in this exact format:
{
  "subject": "The subject line",
  "body": "Full email body with line breaks as \\n. Sign off as Richard | Ace Digitals Global"
}`;
  }

  return `Write a cold outreach email for this specific business:

Business: ${name}
Trade: ${service}
Industry context: ${industry.industry}
City: ${city}
Full address: ${address}
Google rating: ${ratingLine}
Google reviews: ${reviewsLine}
Who searches for them: ${industry.customerType}
Why it is urgent: ${industry.urgency}
What builds trust in this industry: ${industry.trustSignal}
Their pain points: ${(painPoints || []).join('; ')}
Opportunity score: ${score}/100

For the PS line, use this specific pattern:
"Right now, when someone in ${city} searches '${service} near me' or '${service} ${city}', the businesses showing up first all have professional websites with ${industry.trustSignal}. ${name} does not appear in those results at all."

Rewrite the PS to sound natural and conversational, as if you actually ran that search just now and are telling them what you found.

Return ONLY valid JSON in this exact format:
{
  "subject": "The subject line — specific to this business, sounds personal not like marketing",
  "body": "Full email body with line breaks as \\n. Sign off as Richard U. | Ace Digitals Global"
}`;
}

module.exports = router;
