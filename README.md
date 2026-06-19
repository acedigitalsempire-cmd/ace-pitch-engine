# Ace Pitch Engine
### Lead Generation + Outreach System for Ace Digitals Global

Finds local trade businesses (plumbers, electricians, roofers, etc.) in the USA, UK, Canada, and Europe that have **no website** and a **free email address (Gmail/Yahoo)**. Scores each lead, generates a custom GPT-4o pitch email, attaches a branded 6-page PDF audit, and sends it via Resend — all from one dashboard.

---

## What It Does

1. You type a service (e.g. "Plumber") and a location (e.g. "Houston, Texas")
2. It searches Google Maps via SerpApi and finds local businesses
3. Filters out anyone with a website or a custom domain email
4. Scores remaining leads 0–100 based on opportunity level
5. You click "Generate Pitch" — GPT-4o writes a custom email just for that business
6. You review and edit the pitch if needed
7. Click "Send Pitch + PDF Audit" — Resend delivers the email with a 6-page branded PDF attached
8. You get an owner copy of every email sent

---

## Requirements

- [SerpApi](https://serpapi.com) account (free tier = 100 searches/month)
- [OpenAI](https://platform.openai.com) API key (GPT-4o)
- [Resend](https://resend.com) account (free tier = 3,000 emails/month)
- [Render](https://render.com) account (free tier)
- [UptimeRobot](https://uptimerobot.com) free account (keeps Render awake)

---

## Deploy to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/ace-pitch-engine.git
git push -u origin main
```

### Step 2: Create Render Web Service

1. Go to [render.com](https://render.com) and sign in
2. Click **New** > **Web Service**
3. Connect your GitHub repo
4. Render will auto-detect the settings from `render.yaml`
5. Click **Create Web Service**

### Step 3: Add Environment Variables

In your Render service dashboard, go to **Environment** and add:

| Key | Value |
|---|---|
| `SERP_API_KEY` | Your SerpApi key |
| `OPENAI_API_KEY` | Your OpenAI key |
| `RESEND_API_KEY` | Your Resend key |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` (until domain is back) |
| `OWNER_EMAIL` | Your personal email for owner copies |

### Step 4: Set Up UptimeRobot

1. Go to [uptimerobot.com](https://uptimerobot.com) and create a free account
2. Click **Add New Monitor**
3. Type: HTTP(s)
4. Friendly Name: Ace Pitch Engine
5. URL: `https://your-render-app.onrender.com/health`
6. Monitoring Interval: Every 5 minutes
7. Click **Create Monitor**

This prevents Render's free tier from sleeping.

---

## When Your Domain Is Back

Once `acedigitalsempire.com` is renewed, update `RESEND_FROM_EMAIL` in Render environment to:

```
info@acedigitalsempire.com
```

Then verify the domain in your Resend dashboard under **Domains**.

---

## Using the Tool

### Search
- Enter a trade (Plumber, Electrician, HVAC, Roofer, Carpenter, Welder, Laundry, etc.)
- Enter a city and country/state (Houston Texas, Manchester UK, Toronto Ontario, etc.)
- Press Enter or click Search
- Results are cached for 8 hours — same search won't burn SerpApi credits again

### Reading Lead Cards
- **Score 85–100:** HOT LEAD — no website, no reviews, no rating. Pitch immediately.
- **Score 70–84:** STRONG — no website, very few reviews
- **Score 55–69:** MODERATE — no website, some reviews
- Below 55: low priority, pitch last

### Generating a Pitch
- Click any lead card to expand it
- Click **Generate Pitch**
- GPT-4o writes a unique email for that exact business
- Review it — edit anything you want in the text box
- Subject line is also editable

### Sending
- Click **Send Pitch + PDF Audit**
- Confirm the send dialog
- System generates a 6-page branded PDF for that business and attaches it
- Email goes to the lead
- Owner copy goes to your email

---

## SerpApi Free Tier Strategy

You have 100 searches per month. Each search run uses:
- 1 credit for Google Maps (finds up to 20 businesses)
- Up to 3 credits per business for email lookup

**To stay within 100 credits:**
- Do 3 full searches per week maximum
- Search different cities each time (cache prevents repeat burns)
- Prioritise HOT LEAD scores first — don't waste OpenAI tokens on low scores

---

## File Structure

```
ace-pitch-engine/
├── server.js                 Main Express server
├── package.json
├── render.yaml               Render deployment config
├── .env.example              Environment variable template
├── routes/
│   ├── search.js             Lead discovery endpoint
│   ├── pitch.js              GPT-4o pitch generation endpoint
│   └── send.js               Resend email + PDF delivery endpoint
├── services/
│   ├── serpService.js        SerpApi Google Maps + email finder
│   ├── leadScorer.js         0-100 opportunity scoring engine
│   └── pdfService.js         6-page branded PDF generator (PDFKit)
└── public/
    └── index.html            Full dashboard UI
```

---

## Contact

**Uchenna Richard (DigitalUche)**
Founder, Ace Digitals Global
Email: info@acedigitalsempire.com
WhatsApp: +234 907 958 1937
Website: acedigitalsempire.com
Social: @DigitalUche
