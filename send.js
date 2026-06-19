/**
 * /api/send — Email Delivery via Resend API
 * Sends custom pitch email + branded PDF attachment to each lead
 * CAN-SPAM / GDPR compliant: includes unsubscribe, honest sender identity
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const { generateAuditPDF } = require('../services/pdfService');

function resendPost(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.resend.com',
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

router.post('/', async (req, res) => {
  const { lead, subject, pitchBody } = req.body;

  if (!lead || !subject || !pitchBody) {
    return res.status(400).json({ error: 'lead, subject, and pitchBody are all required.' });
  }
  if (!lead.email) {
    return res.status(400).json({ error: 'Lead has no email address.' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured.' });
  }

  // Sender: use verified domain if available, else Resend onboarding fallback
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName  = 'Uchenna Richard | Ace Digitals Global';
  const ownerCopy = process.env.OWNER_EMAIL || 'jobhauntgithub@gmail.com';

  try {
    // Step 1: Generate the branded PDF audit
    console.log(`[Send] Generating PDF for: ${lead.name}`);
    const pdfBuffer = await generateAuditPDF(lead, { subject, body: pitchBody });
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfFilename = `${(lead.name || 'Business').replace(/[^a-z0-9]/gi, '_')}_Audit_Ace_Digitals.pdf`;

    // Step 2: Build the HTML email body
    const htmlBody = buildEmailHTML(lead, pitchBody);

    // Step 3: Send to the lead
    console.log(`[Send] Sending to lead: ${lead.email}`);
    const sendResult = await resendPost({
      from: `${fromName} <${fromEmail}>`,
      to:   [lead.email],
      subject,
      html: htmlBody,
      attachments: [{ filename: pdfFilename, content: pdfBase64 }],
      headers: {
        'List-Unsubscribe': `<mailto:${fromEmail}?subject=Unsubscribe>`,
      },
    }, resendKey);

    if (sendResult.status >= 400) {
      const errMsg = sendResult.body?.message || sendResult.body?.error || JSON.stringify(sendResult.body);
      throw new Error(`Resend rejected email: ${errMsg}`);
    }

    // Step 4: Owner copy (no PDF attachment to save bandwidth)
    await resendPost({
      from: `Ace Pitch Engine <${fromEmail}>`,
      to:   [ownerCopy],
      subject: `[SENT] ${subject} → ${lead.email}`,
      html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:600px">
        <h2 style="color:#1B2A4A">Pitch Sent — Owner Copy</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px;color:#718096;width:120px">Business</td><td style="padding:6px;font-weight:bold">${lead.name}</td></tr>
          <tr><td style="padding:6px;color:#718096">Email sent to</td><td style="padding:6px">${lead.email}</td></tr>
          <tr><td style="padding:6px;color:#718096">Service</td><td style="padding:6px">${lead.service || lead.category}</td></tr>
          <tr><td style="padding:6px;color:#718096">Location</td><td style="padding:6px">${lead.location}</td></tr>
          <tr><td style="padding:6px;color:#718096">Score</td><td style="padding:6px">${lead.score}/100</td></tr>
          <tr><td style="padding:6px;color:#718096">Subject sent</td><td style="padding:6px">${subject}</td></tr>
        </table>
        <hr style="margin:20px 0;border:none;border-top:1px solid #eee">
        <h3 style="color:#1B2A4A">Pitch body sent:</h3>
        <div style="background:#f8f9fc;padding:16px;border-left:3px solid #C9A84C;white-space:pre-wrap;font-size:13px;line-height:1.6">${pitchBody}</div>
      </div>`,
    }, resendKey);

    console.log(`[Send] Done. Resend ID: ${sendResult.body?.id}`);
    return res.json({ success: true, id: sendResult.body?.id, to: lead.email });

  } catch (err) {
    console.error('[Send error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HTML EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
function buildEmailHTML(lead, pitchBody) {
  const bodyLines = (pitchBody || '')
    .split('\n')
    .map(l => l.trim() === '' ? '<br>' : `<p style="margin:0 0 14px;line-height:1.7;font-size:15px;color:#374151">${l}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Message from Ace Digitals Global</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F8;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:620px;margin:28px auto;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <!-- Header -->
  <div style="background:#1B2A4A;padding:0">
    <div style="height:4px;background:#C9A84C"></div>
    <div style="padding:28px 36px">
      <div style="font-size:13px;font-weight:700;color:#C9A84C;letter-spacing:3px;text-transform:uppercase">Ace Digitals Global</div>
      <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:4px;letter-spacing:1px">DIGITAL MARKETING &nbsp;•&nbsp; WEBSITE DESIGN &nbsp;•&nbsp; LOCAL SEO</div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:36px">
    ${bodyLines}
  </div>

  <!-- CTA Button -->
  <div style="padding:0 36px 36px;text-align:center">
    <a href="mailto:info@acedigitalsempire.com?subject=Re: Website for ${encodeURIComponent(lead.name)}"
       style="display:inline-block;background:#1B2A4A;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 36px;border-radius:3px;letter-spacing:0.5px">
      Reply to Claim Your Free Audit Call
    </a>
    <div style="margin-top:12px;font-size:12px;color:#9CA3AF">
      Or message us on WhatsApp: <a href="https://wa.me/2349079581937" style="color:#1B2A4A;font-weight:600">+234 907 958 1937</a>
    </div>
  </div>

  <!-- Attachment note -->
  <div style="margin:0 36px 24px;background:#FEF9EC;border-left:3px solid #C9A84C;padding:14px 16px;border-radius:2px">
    <div style="font-size:13px;font-weight:600;color:#92400E;margin-bottom:4px">Your Free Digital Audit Report is attached</div>
    <div style="font-size:12px;color:#78350F;line-height:1.5">We prepared a personalised 6-page PDF audit for ${lead.name} showing exactly what is costing you customers online and a clear plan to fix it — at no cost or obligation.</div>
  </div>

  <!-- Footer -->
  <div style="background:#F8F9FC;border-top:1px solid #E5E7EB;padding:20px 36px">
    <div style="font-size:12px;color:#6B7280;line-height:1.7">
      <strong style="color:#374151">Uchenna Richard (DigitalUche)</strong><br>
      Founder, Ace Digitals Global<br>
      Email: info@acedigitalsempire.com &nbsp;|&nbsp; WhatsApp: +234 907 958 1937<br>
      Website: acedigitalsempire.com &nbsp;|&nbsp; Social: @DigitalUche
    </div>
    <div style="margin-top:14px;font-size:11px;color:#9CA3AF;line-height:1.6">
      You are receiving this email because ${lead.name} appeared in a public business directory without a website listing. We reach out to businesses we believe we can genuinely help.<br>
      To stop receiving messages from us, reply with the word <strong>UNSUBSCRIBE</strong> and we will remove you immediately.
    </div>
  </div>

</div>
</body>
</html>`;
}

module.exports = router;
