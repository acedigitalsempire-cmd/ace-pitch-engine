/**
 * /api/send   — Email delivery via Resend
 * /api/preview-pdf — Returns PDF buffer directly for browser preview
 * CAN-SPAM / GDPR compliant
 */

const express = require('express');
const router  = express.Router();
const https   = require('https');
const { generateAuditPDF } = require('../services/pdfService');

function resendPost(payload, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req  = https.request({
      hostname: 'api.resend.com',
      path:     '/emails',
      method:   'POST',
      headers: {
        'Authorization':  `Bearer ${apiKey}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data',  c => data += c);
      res.on('end',   () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── PDF PREVIEW (opens in browser before sending) ───────────────────────────
router.post('/preview-pdf', async (req, res) => {
  const { lead } = req.body;
  if (!lead) return res.status(400).json({ error: 'lead is required.' });

  try {
    const pdfBuffer = await generateAuditPDF(lead, {});
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `inline; filename="${(lead.name || 'Audit').replace(/[^a-z0-9]/gi,'_')}_Audit.pdf"`,
      'Content-Length':      pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[Preview PDF error]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── SEND EMAIL + PDF ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { lead, subject, pitchBody } = req.body;

  if (!lead || !subject || !pitchBody) {
    return res.status(400).json({ error: 'lead, subject, and pitchBody are all required.' });
  }
  if (!lead.email) {
    return res.status(400).json({ error: 'Lead has no email address.' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured.' });

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const fromName  = 'Richard U. | Ace Digitals Global';
  const ownerCopy = process.env.OWNER_EMAIL || 'jobhauntgithub@gmail.com';

  try {
    console.log(`[Send] Generating PDF for: ${lead.name}`);
    const pdfBuffer   = await generateAuditPDF(lead, { subject, body: pitchBody });
    const pdfBase64   = pdfBuffer.toString('base64');
    const pdfFilename = `${(lead.name || 'Business').replace(/[^a-z0-9]/gi, '_')}_Audit_Ace_Digitals.pdf`;

    const htmlBody = buildEmailHTML(lead, pitchBody);

    console.log(`[Send] Sending to: ${lead.email}`);
    const sendResult = await resendPost({
      from:        `${fromName} <${fromEmail}>`,
      to:          [lead.email],
      subject,
      html:        htmlBody,
      attachments: [{ filename: pdfFilename, content: pdfBase64 }],
      headers:     { 'List-Unsubscribe': `<mailto:${fromEmail}?subject=Unsubscribe>` },
    }, resendKey);

    if (sendResult.status >= 400) {
      const errMsg = sendResult.body?.message || sendResult.body?.error || JSON.stringify(sendResult.body);
      throw new Error(`Resend rejected email: ${errMsg}`);
    }

    // Owner copy with PDF attached so you can see exactly what was sent
    await resendPost({
      from:    `Richard U. | Ace Digitals Global <${fromEmail}>`,
      to:      [ownerCopy],
      subject: `[SENT] ${subject} → ${lead.email}`,
      html: `<div style="font-family:Arial,sans-serif;padding:20px;max-width:620px">
        <h2 style="color:#1B2A4A;margin-bottom:4px">Pitch Sent — Owner Copy</h2>
        <p style="color:#718096;font-size:13px;margin:0 0 20px">The lead received this email with the PDF audit attached.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
          <tr style="background:#F8F9FC"><td style="padding:10px;color:#718096;width:130px;border:1px solid #E5E7EB">Business</td><td style="padding:10px;font-weight:bold;border:1px solid #E5E7EB">${lead.name}</td></tr>
          <tr><td style="padding:10px;color:#718096;border:1px solid #E5E7EB">Email sent to</td><td style="padding:10px;border:1px solid #E5E7EB">${lead.email}</td></tr>
          <tr style="background:#F8F9FC"><td style="padding:10px;color:#718096;border:1px solid #E5E7EB">Service</td><td style="padding:10px;border:1px solid #E5E7EB">${lead.service || lead.category}</td></tr>
          <tr><td style="padding:10px;color:#718096;border:1px solid #E5E7EB">Location</td><td style="padding:10px;border:1px solid #E5E7EB">${lead.location}</td></tr>
          <tr style="background:#F8F9FC"><td style="padding:10px;color:#718096;border:1px solid #E5E7EB">Score</td><td style="padding:10px;border:1px solid #E5E7EB"><strong>${lead.score}/100</strong></td></tr>
          <tr><td style="padding:10px;color:#718096;border:1px solid #E5E7EB">Reviews</td><td style="padding:10px;border:1px solid #E5E7EB">${lead.reviews || 0} reviews / ${lead.rating || 'No rating'}★</td></tr>
          <tr style="background:#F8F9FC"><td style="padding:10px;color:#718096;border:1px solid #E5E7EB">Subject sent</td><td style="padding:10px;border:1px solid #E5E7EB">${subject}</td></tr>
        </table>
        <h3 style="color:#1B2A4A;margin-bottom:10px">Pitch email sent:</h3>
        <div style="background:#F8F9FC;padding:16px;border-left:4px solid #C9A84C;white-space:pre-wrap;font-size:13px;line-height:1.7;color:#374151">${pitchBody}</div>
        <p style="margin-top:16px;font-size:12px;color:#9CA3AF">PDF audit also attached to this email for your records.</p>
      </div>`,
      attachments: [{ filename: pdfFilename, content: pdfBase64 }],
    }, resendKey);

    console.log(`[Send] Done. Resend ID: ${sendResult.body?.id}`);
    return res.json({ success: true, id: sendResult.body?.id, to: lead.email });

  } catch (err) {
    console.error('[Send error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── HTML EMAIL TEMPLATE ─────────────────────────────────────────────────────
function buildEmailHTML(lead, pitchBody) {
  const bodyLines = (pitchBody || '')
    .split('\n')
    .map(l => l.trim() === ''
      ? '<br>'
      : `<p style="margin:0 0 14px;line-height:1.7;font-size:15px;color:#374151">${l}</p>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Message from Ace Digitals Global</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F8;font-family:'Helvetica Neue',Arial,sans-serif">
<div style="max-width:620px;margin:28px auto;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">

  <div style="background:#1B2A4A;padding:0">
    <div style="height:4px;background:#C9A84C"></div>
    <div style="padding:24px 36px">
      <div style="font-size:12px;font-weight:700;color:#C9A84C;letter-spacing:3px;text-transform:uppercase">Ace Digitals Global</div>
      <div style="font-size:10px;color:rgba(255,255,255,.45);margin-top:4px;letter-spacing:1px">WEBSITE DESIGN &nbsp;•&nbsp; LOCAL SEO &nbsp;•&nbsp; DIGITAL MARKETING</div>
    </div>
  </div>

  <div style="padding:32px 36px">
    ${bodyLines}
  </div>

  <div style="padding:0 36px 32px;text-align:center">
    <a href="mailto:acedigitalsglobal@gmail.com?subject=Re: ${encodeURIComponent(lead.name)}"
       style="display:inline-block;background:#1B2A4A;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:13px 32px;border-radius:3px">
      Reply to This Email
    </a>
    <div style="margin-top:10px;font-size:12px;color:#9CA3AF">
      WhatsApp: <a href="https://wa.me/18733522008" style="color:#1B2A4A;font-weight:600">+1 (873) 352-2008</a>
    </div>
  </div>

  <div style="margin:0 36px 24px;background:#FEF9EC;border-left:3px solid #C9A84C;padding:14px 16px;border-radius:2px">
    <div style="font-size:13px;font-weight:600;color:#92400E;margin-bottom:4px">Free Digital Audit Report attached</div>
    <div style="font-size:12px;color:#78350F;line-height:1.5">We put together a personalised 6-page audit for ${lead.name} showing exactly which customers are slipping through and a clear plan to fix it.</div>
  </div>

  <div style="background:#F8F9FC;border-top:1px solid #E5E7EB;padding:18px 36px">
    <div style="font-size:12px;color:#6B7280;line-height:1.8">
      <strong style="color:#374151">Richard U.</strong><br>
      Founder, Ace Digitals Global<br>
      acedigitalsglobal@gmail.com &nbsp;|&nbsp; acedigitalsempire.com<br>
      WhatsApp: +1 (873) 352-2008
    </div>
    <div style="margin-top:12px;font-size:11px;color:#9CA3AF;line-height:1.6">
      You received this email because ${lead.name} appeared in public business directories without a website. We only contact businesses we believe we can genuinely help.<br>
      To unsubscribe, reply with <strong>UNSUBSCRIBE</strong> and we will remove you immediately.
    </div>
  </div>

</div>
</body>
</html>`;
}

module.exports = router;


