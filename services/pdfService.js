/**
 * pdfService.js — Branded Audit PDF Generator
 * Ace Digitals Global | Ace Pitch Engine
 * Uses PDFKit — no Puppeteer, works on Render free tier
 */

const PDFDocument = require('pdfkit');

// ─── Brand Palette ────────────────────────────────────────────────────────────
const BRAND = {
  navy:    '#1B2A4A',   // deep navy — primary brand dark
  white:   '#FFFFFF',
  offWhite:'#F8F9FC',
  gold:    '#C9A84C',   // refined gold accent
  slate:   '#4A5568',   // body text
  light:   '#E8ECF4',   // light rule lines
  red:     '#C53030',   // urgency / warning
  green:   '#276749',   // positive / opportunity
  midGrey: '#718096',
};

function hex2rgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function applyColor(doc, hex) {
  doc.fillColor(hex2rgb(hex));
}

/**
 * Generate a branded 6-page PDF audit for a single lead.
 * Returns a Buffer.
 */
async function generateAuditPDF(lead, pitch) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const W = 595.28;
      const H = 841.89;

      // ── PAGE 1: COVER ──────────────────────────────────────────────────────
      drawCover(doc, lead, W, H);

      // ── PAGE 2: EXECUTIVE SUMMARY ──────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, W, 'Executive Summary', 2);
      drawExecutiveSummary(doc, lead, W);
      drawFooter(doc, W, H, 2);

      // ── PAGE 3: DIGITAL PRESENCE AUDIT ────────────────────────────────────
      doc.addPage();
      drawHeader(doc, W, 'Digital Presence Audit', 3);
      drawAuditTable(doc, lead, W);
      drawFooter(doc, W, H, 3);

      // ── PAGE 4: REVENUE IMPACT ────────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, W, 'Revenue Impact Analysis', 4);
      drawRevenueImpact(doc, lead, W, H);
      drawFooter(doc, W, H, 4);

      // ── PAGE 5: OUR SOLUTION ─────────────────────────────────────────────
      doc.addPage();
      drawHeader(doc, W, 'Our Solution For You', 5);
      drawSolution(doc, lead, W);
      drawFooter(doc, W, H, 5);

      // ── PAGE 6: CTA + CONTACT ─────────────────────────────────────────────
      doc.addPage();
      drawCTAPage(doc, lead, W, H);

      doc.end();

    } catch (err) {
      reject(err);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COVER PAGE
// ─────────────────────────────────────────────────────────────────────────────
function drawCover(doc, lead, W, H) {
  // Full navy background
  doc.rect(0, 0, W, H).fill(hex2rgb(BRAND.navy));

  // Gold top accent bar
  doc.rect(0, 0, W, 8).fill(hex2rgb(BRAND.gold));

  // Watermark text (very faint)
  doc.save()
    .fillColor([255, 255, 255])
    .opacity(0.04)
    .font('Helvetica-Bold')
    .fontSize(80)
    .rotate(-30, { origin: [W / 2, H / 2] })
    .text('ACE DIGITALS GLOBAL', W / 2 - 280, H / 2 - 40, { align: 'center' })
    .restore();

  // Brand name
  doc.fillColor(hex2rgb(BRAND.gold))
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('ACE DIGITALS GLOBAL', 50, 60, { letterSpacing: 3 });

  // Divider line in gold
  doc.moveTo(50, 82).lineTo(W - 50, 82).strokeColor(hex2rgb(BRAND.gold)).lineWidth(0.5).stroke();

  // Report tag
  doc.fillColor([255, 255, 255]).opacity(0.6)
    .font('Helvetica')
    .fontSize(10)
    .text('CONFIDENTIAL DIGITAL AUDIT REPORT', 50, 95, { letterSpacing: 2 });

  doc.opacity(1);

  // Business name — large
  const bizName = lead.name.toUpperCase();
  doc.fillColor([255, 255, 255])
    .font('Helvetica-Bold')
    .fontSize(bizName.length > 24 ? 28 : 34)
    .text(bizName, 50, 200, { width: W - 100 });

  // Category badge
  const cat = (lead.service || lead.category || 'Local Business').toUpperCase();
  doc.fillColor(hex2rgb(BRAND.gold))
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(cat, 50, 280, { letterSpacing: 2 });

  // Location
  doc.fillColor([255, 255, 255]).opacity(0.7)
    .font('Helvetica')
    .fontSize(12)
    .text((lead.address || lead.location || '').toUpperCase(), 50, 300);

  doc.opacity(1);

  // SCORE BOX
  const scoreTier = lead.scoreData?.tier || { label: 'OPPORTUNITY', color: BRAND.gold };
  const scoreColor = scoreTier.color || BRAND.gold;

  doc.rect(50, 360, 180, 120).fill(hex2rgb(scoreColor));
  doc.fillColor([255, 255, 255])
    .font('Helvetica-Bold')
    .fontSize(56)
    .text(`${lead.score}`, 50, 378, { width: 180, align: 'center' });
  doc.font('Helvetica').fontSize(9)
    .text('OPPORTUNITY SCORE /100', 50, 452, { width: 180, align: 'center', letterSpacing: 1 });

  // Key findings boxes
  const findings = [
    { label: 'Website', value: 'NONE FOUND', color: BRAND.red },
    { label: 'Email Type', value: (lead.email || '').split('@')[1]?.toUpperCase() || 'FREE EMAIL', color: BRAND.green },
    { label: 'Reviews', value: lead.reviews > 0 ? `${lead.reviews} Reviews` : 'None', color: BRAND.midGrey },
    { label: 'Rating', value: lead.rating > 0 ? `${lead.rating}★` : 'No Rating', color: BRAND.midGrey },
  ];

  let fx = 260;
  const fW = (W - fx - 50) / 2 - 8;

  findings.forEach((f, i) => {
    const col = i % 2 === 0 ? fx : fx + fW + 8;
    const row = i < 2 ? 360 : 415;

    doc.rect(col, row, fW, 48).fill(hex2rgb(BRAND.white + '15' || [255, 255, 255]));
    // Use opacity trick for light rect
    doc.save().rect(col, row, fW, 48).fill([255, 255, 255]).opacity(0.08).restore();

    doc.fillColor([255, 255, 255]).opacity(0.55)
      .font('Helvetica').fontSize(8)
      .text(f.label.toUpperCase(), col + 10, row + 8, { letterSpacing: 1 });

    doc.fillColor(hex2rgb(f.color)).opacity(1)
      .font('Helvetica-Bold').fontSize(11)
      .text(f.value, col + 10, row + 22);
  });

  // Prepared for / by block
  const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  doc.moveTo(50, 530).lineTo(W - 50, 530)
    .strokeColor(hex2rgb(BRAND.gold)).opacity(0.3).lineWidth(0.5).stroke();
  doc.opacity(1);

  doc.fillColor([255, 255, 255]).opacity(0.5)
    .font('Helvetica').fontSize(9)
    .text(`PREPARED FOR:  ${lead.name}`, 50, 545);
  doc.text(`DATE:  ${nowStr}`, 50, 560);
  doc.opacity(1);

  // Bottom brand block
  doc.rect(0, H - 100, W, 100).fill(hex2rgb(BRAND.gold));

  doc.fillColor(hex2rgb(BRAND.navy))
    .font('Helvetica-Bold')
    .fontSize(13)
    .text('ACE DIGITALS GLOBAL', 50, H - 78);

  doc.font('Helvetica').fontSize(9)
    .text('info@acedigitalsempire.com  |  acedigitalsempire.com  |  WhatsApp: +234 907 958 1937', 50, H - 58);

  doc.font('Helvetica').fontSize(8).opacity(0.7)
    .text('Digital Marketing  •  Website Design  •  SEO  •  AI Automation', 50, H - 40);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED HEADER (pages 2–5)
// ─────────────────────────────────────────────────────────────────────────────
function drawHeader(doc, W, title, pageNum) {
  doc.rect(0, 0, W, 70).fill(hex2rgb(BRAND.navy));
  doc.rect(0, 0, W, 4).fill(hex2rgb(BRAND.gold));

  doc.fillColor(hex2rgb(BRAND.gold))
    .font('Helvetica-Bold').fontSize(9)
    .text('ACE DIGITALS GLOBAL', 30, 18, { letterSpacing: 2 });

  doc.fillColor([255, 255, 255])
    .font('Helvetica-Bold').fontSize(16)
    .text(title, 30, 38);

  doc.fillColor([255, 255, 255]).opacity(0.5)
    .font('Helvetica').fontSize(9)
    .text(`Page ${pageNum} of 6`, W - 80, 28);

  doc.opacity(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED FOOTER
// ─────────────────────────────────────────────────────────────────────────────
function drawFooter(doc, W, H, pageNum) {
  doc.rect(0, H - 40, W, 40).fill(hex2rgb(BRAND.light));

  doc.fillColor(hex2rgb(BRAND.navy))
    .font('Helvetica').fontSize(8)
    .text('Ace Digitals Global  |  info@acedigitalsempire.com  |  acedigitalsempire.com  |  WhatsApp: +234 907 958 1937',
      30, H - 26, { width: W - 60, align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 2: EXECUTIVE SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
function drawExecutiveSummary(doc, lead, W) {
  let y = 100;

  // Intro text
  doc.fillColor(hex2rgb(BRAND.slate))
    .font('Helvetica')
    .fontSize(11)
    .text(`This report was prepared exclusively for ${lead.name}, a ${lead.service || lead.category} business operating in ${lead.location}. It analyses their current digital presence and quantifies the revenue opportunity available by addressing the gaps identified below.`,
      40, y, { width: W - 80, lineGap: 4 });

  y += 70;

  // Key metrics row
  const metrics = [
    { label: 'Website',  value: 'NONE',        sub: 'Not found online',    color: BRAND.red   },
    { label: 'Score',    value: `${lead.score}/100`, sub: 'Opportunity score', color: BRAND.gold  },
    { label: 'Reviews',  value: `${lead.reviews}`,   sub: 'Google reviews',    color: lead.reviews < 10 ? BRAND.red : BRAND.green },
    { label: 'Rating',   value: lead.rating > 0 ? `${lead.rating}★` : 'N/A', sub: 'Google rating', color: BRAND.navy },
  ];

  const mW = (W - 80) / 4 - 8;
  metrics.forEach((m, i) => {
    const mx = 40 + i * (mW + 8);
    doc.rect(mx, y, mW, 72).fill(hex2rgb(BRAND.offWhite));
    doc.rect(mx, y, mW, 4).fill(hex2rgb(m.color));

    doc.fillColor(hex2rgb(m.color))
      .font('Helvetica-Bold').fontSize(22)
      .text(m.value, mx + 8, y + 14, { width: mW - 16, align: 'center' });

    doc.fillColor(hex2rgb(BRAND.navy))
      .font('Helvetica-Bold').fontSize(8)
      .text(m.label.toUpperCase(), mx + 8, y + 42, { width: mW - 16, align: 'center', letterSpacing: 1 });

    doc.fillColor(hex2rgb(BRAND.midGrey))
      .font('Helvetica').fontSize(8)
      .text(m.sub, mx + 8, y + 56, { width: mW - 16, align: 'center' });
  });

  y += 100;

  // Issues found
  doc.fillColor(hex2rgb(BRAND.navy))
    .font('Helvetica-Bold').fontSize(13)
    .text('Issues Identified', 40, y);

  y += 20;

  const pains = lead.painPoints || [
    'No website found',
    'No online presence detected',
    'Invisible to online customers',
  ];

  pains.forEach(p => {
    doc.rect(40, y, 12, 12).fill(hex2rgb(BRAND.red));
    doc.fillColor([255, 255, 255])
      .font('Helvetica-Bold').fontSize(8)
      .text('!', 40, y + 1, { width: 12, align: 'center' });

    doc.fillColor(hex2rgb(BRAND.slate))
      .font('Helvetica').fontSize(10)
      .text(p, 62, y + 1, { width: W - 102 });

    y += 22;
  });

  y += 16;

  // Opportunities
  doc.fillColor(hex2rgb(BRAND.navy))
    .font('Helvetica-Bold').fontSize(13)
    .text('Growth Opportunities', 40, y);

  y += 20;

  const opps = lead.opportunities || [
    'Professional website build',
    'Google Business optimisation',
    'Local SEO',
  ];

  opps.forEach(o => {
    doc.rect(40, y, 12, 12).fill(hex2rgb(BRAND.green));
    doc.fillColor([255, 255, 255])
      .font('Helvetica-Bold').fontSize(8)
      .text('✓', 40, y + 1, { width: 12, align: 'center' });

    doc.fillColor(hex2rgb(BRAND.slate))
      .font('Helvetica').fontSize(10)
      .text(o, 62, y + 1, { width: W - 102 });

    y += 22;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 3: AUDIT TABLE
// ─────────────────────────────────────────────────────────────────────────────
function drawAuditTable(doc, lead, W) {
  let y = 95;

  const rows = [
    { item: 'Business Website',         status: 'MISSING',       severity: 'CRITICAL', color: BRAND.red    },
    { item: 'Google Business Profile',  status: lead.reviews > 0 ? 'PARTIAL' : 'MISSING', severity: lead.reviews > 0 ? 'MODERATE' : 'HIGH', color: lead.reviews > 0 ? BRAND.gold : BRAND.red },
    { item: 'Professional Email',       status: 'FREE EMAIL',    severity: 'HIGH',     color: BRAND.gold   },
    { item: 'Online Reviews',           status: lead.reviews > 0 ? `${lead.reviews} reviews` : 'NONE', severity: lead.reviews >= 10 ? 'LOW' : 'HIGH', color: lead.reviews >= 10 ? BRAND.green : BRAND.red },
    { item: 'Star Rating',              status: lead.rating > 0 ? `${lead.rating} / 5.0` : 'NONE', severity: lead.rating >= 4.2 ? 'LOW' : 'HIGH', color: lead.rating >= 4.2 ? BRAND.green : BRAND.red },
    { item: 'Social Media Presence',    status: 'UNVERIFIED',    severity: 'MODERATE', color: BRAND.gold   },
    { item: 'Local SEO Visibility',     status: 'NOT OPTIMISED', severity: 'CRITICAL', color: BRAND.red    },
    { item: 'Mobile-Ready Website',     status: 'N/A',           severity: 'CRITICAL', color: BRAND.red    },
  ];

  // Table header
  const colW = [W - 80 - 160 - 120, 160, 120];
  const colX = [40, 40 + colW[0], 40 + colW[0] + colW[1]];

  doc.rect(40, y, W - 80, 28).fill(hex2rgb(BRAND.navy));
  ['AUDIT ITEM', 'CURRENT STATUS', 'SEVERITY'].forEach((h, i) => {
    doc.fillColor([255, 255, 255]).font('Helvetica-Bold').fontSize(8)
      .text(h, colX[i] + 8, y + 9, { width: colW[i] - 10, letterSpacing: 1 });
  });

  y += 28;

  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? BRAND.offWhite : BRAND.white;
    doc.rect(40, y, W - 80, 26).fill(hex2rgb(bg));
    doc.rect(40, y, W - 80, 26).stroke(hex2rgb(BRAND.light));

    doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(10)
      .text(row.item, colX[0] + 8, y + 7);

    doc.fillColor(hex2rgb(row.color)).font('Helvetica-Bold').fontSize(9)
      .text(row.status, colX[1] + 8, y + 7, { width: colW[1] - 16 });

    // Severity pill
    const pillW = 90;
    const pillX = colX[2] + (colW[2] - pillW) / 2;
    doc.rect(pillX, y + 5, pillW, 16).fill(hex2rgb(row.color));
    doc.fillColor([255, 255, 255]).font('Helvetica-Bold').fontSize(8)
      .text(row.severity, pillX, y + 8, { width: pillW, align: 'center' });

    y += 26;
  });

  y += 24;

  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(10)
    .text('This audit was conducted using publicly available data from Google Maps, Google Search, and business directory platforms. All findings reflect the digital presence of this business at the time of this report.',
      40, y, { width: W - 80, lineGap: 3 });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 4: REVENUE IMPACT
// ─────────────────────────────────────────────────────────────────────────────
function drawRevenueImpact(doc, lead, W, H) {
  let y = 95;

  // Stats based on trade averages
  const avgJobValue = 180;  // USD average service call
  const searchersPerMonth = 320;  // avg local searches for trade
  const conversionRate = 0.03;
  const monthlyLost = Math.round(searchersPerMonth * conversionRate * avgJobValue);
  const annualLost  = monthlyLost * 12;

  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(11)
    .text(`Every month, hundreds of people in ${lead.location} search online for a ${lead.service || 'local service'} provider. Without a website, ${lead.name} is invisible to every one of those searches. Here is what that costs in lost revenue:`,
      40, y, { width: W - 80, lineGap: 4 });

  y += 70;

  // Big number boxes
  const nums = [
    { label: 'Est. Monthly Searches', value: `~${searchersPerMonth.toLocaleString()}`, sub: `for ${lead.service || 'services'} in ${lead.location}` },
    { label: 'Monthly Revenue Lost',  value: `$${monthlyLost.toLocaleString()}+`,      sub: 'at avg $180 per job, 3% capture rate' },
    { label: 'Annual Revenue at Risk',value: `$${annualLost.toLocaleString()}+`,       sub: 'every year without an online presence' },
  ];

  const nW = (W - 80 - 20) / 3;
  nums.forEach((n, i) => {
    const nx = 40 + i * (nW + 10);
    doc.rect(nx, y, nW, 100).fill(hex2rgb(i === 2 ? BRAND.navy : BRAND.offWhite));

    doc.fillColor(i === 2 ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.navy))
      .font('Helvetica-Bold').fontSize(22)
      .text(n.value, nx + 10, y + 16, { width: nW - 20, align: 'center' });

    doc.fillColor(i === 2 ? [255, 255, 255] : hex2rgb(BRAND.navy))
      .font('Helvetica-Bold').fontSize(9)
      .text(n.label.toUpperCase(), nx + 10, y + 52, { width: nW - 20, align: 'center', letterSpacing: 1 });

    doc.fillColor(i === 2 ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.midGrey))
      .font('Helvetica').fontSize(8)
      .text(n.sub, nx + 10, y + 68, { width: nW - 20, align: 'center' });
  });

  y += 130;

  // Context paragraph
  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(13)
    .text('The Good News', 40, y);

  y += 20;

  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(10)
    .text(`These customers are still out there searching. They are just finding your competitors instead. A professional website built by Ace Digitals Global captures that traffic and turns it into booked jobs. Our typical ${lead.service || 'trade'} clients report seeing new enquiries within the first 30 days of launch.`,
      40, y, { width: W - 80, lineGap: 4 });

  y += 70;

  // Comparison block
  doc.rect(40, y, (W - 90) / 2, 100).fill(hex2rgb(BRAND.red + '15'));
  doc.rect(40, y, (W - 90) / 2, 100)
    .stroke(hex2rgb(BRAND.red));

  const col2x = 40 + (W - 90) / 2 + 10;
  doc.rect(col2x, y, (W - 90) / 2, 100).fill(hex2rgb(BRAND.green + '15'));
  doc.rect(col2x, y, (W - 90) / 2, 100)
    .stroke(hex2rgb(BRAND.green));

  doc.fillColor(hex2rgb(BRAND.red)).font('Helvetica-Bold').fontSize(10)
    .text('WITHOUT A WEBSITE', 40, y + 10, { width: (W - 90) / 2, align: 'center', letterSpacing: 1 });

  const withoutList = ['Invisible on Google Search', 'Losing jobs to competitors', 'Relying only on word of mouth', 'No way to show past work'];
  withoutList.forEach((w, i) => {
    doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(9)
      .text(`✗  ${w}`, 50, y + 28 + i * 16, { width: (W - 90) / 2 - 20 });
  });

  doc.fillColor(hex2rgb(BRAND.green)).font('Helvetica-Bold').fontSize(10)
    .text('WITH ACE DIGITALS WEBSITE', col2x, y + 10, { width: (W - 90) / 2, align: 'center', letterSpacing: 1 });

  const withList = ['Ranking on Google for local searches', 'Leads coming in 24/7', 'Professional credibility online', 'Portfolio + reviews visible'];
  withList.forEach((w, i) => {
    doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(9)
      .text(`✓  ${w}`, col2x + 10, y + 28 + i * 16, { width: (W - 90) / 2 - 20 });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 5: SOLUTION
// ─────────────────────────────────────────────────────────────────────────────
function drawSolution(doc, lead, W) {
  let y = 95;

  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(11)
    .text(`Ace Digitals Global offers a complete website solution built specifically for ${lead.service || 'trade'} businesses like ${lead.name}. No templates, no DIY builders. A real professional website built to convert visitors into paying customers.`,
      40, y, { width: W - 80, lineGap: 4 });

  y += 60;

  // Packages
  const packages = [
    {
      name: 'STARTER',
      price: '$299',
      ideal: 'Solo operators just getting online',
      color: BRAND.slate,
      features: ['5-page professional website', 'Mobile-responsive design', 'Google Business Profile setup', 'Contact form + click-to-call', 'Basic local SEO setup', '1 round of revisions'],
    },
    {
      name: 'PROFESSIONAL',
      price: '$449',
      ideal: 'Growing businesses needing more',
      color: BRAND.navy,
      features: ['Everything in Starter', '8-page website', 'Photo gallery / portfolio', 'Google Analytics setup', 'Review generation system', '3 months free support'],
      highlight: true,
    },
    {
      name: 'PREMIUM',
      price: '$499',
      ideal: 'Established businesses ready to dominate',
      color: BRAND.gold,
      features: ['Everything in Professional', 'Full local SEO package', 'Speed optimisation', 'Lead capture forms', 'Social media integration', '6 months free support'],
    },
  ];

  const pW = (W - 80 - 20) / 3;

  packages.forEach((pkg, i) => {
    const px = 40 + i * (pW + 10);

    // Shadow effect
    doc.rect(px + 3, y + 3, pW, 300).fill([220, 220, 230]);
    doc.rect(px, y, pW, 300).fill(pkg.highlight ? hex2rgb(BRAND.navy) : hex2rgb(BRAND.offWhite));
    doc.rect(px, y, pW, 6).fill(hex2rgb(pkg.color));

    if (pkg.highlight) {
      doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(8)
        .text('MOST POPULAR', px, y - 18, { width: pW, align: 'center', letterSpacing: 2 });
    }

    const textCol = pkg.highlight ? [255, 255, 255] : hex2rgb(BRAND.navy);

    doc.fillColor(textCol).font('Helvetica-Bold').fontSize(11)
      .text(pkg.name, px + 10, y + 20, { letterSpacing: 2 });

    doc.fillColor(pkg.highlight ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.navy))
      .font('Helvetica-Bold').fontSize(28)
      .text(pkg.price, px + 10, y + 40);

    doc.fillColor(pkg.highlight ? [255, 255, 255] : hex2rgb(BRAND.midGrey))
      .font('Helvetica').fontSize(8)
      .text(pkg.ideal, px + 10, y + 76, { width: pW - 20 });

    let fy = y + 100;
    pkg.features.forEach(f => {
      doc.fillColor(pkg.highlight ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.green))
        .font('Helvetica-Bold').fontSize(9).text('✓', px + 10, fy);
      doc.fillColor(pkg.highlight ? [200, 220, 255] : hex2rgb(BRAND.slate))
        .font('Helvetica').fontSize(9).text(f, px + 24, fy, { width: pW - 34 });
      fy += 18;
    });
  });

  y += 320;

  // Money-back guarantee line
  doc.rect(40, y, W - 80, 36).fill(hex2rgb(BRAND.gold));
  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(11)
    .text('All packages include: free consultation, satisfaction guarantee, and full ownership of your website.',
      50, y + 10, { width: W - 100, align: 'center' });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE 6: CTA PAGE
// ─────────────────────────────────────────────────────────────────────────────
function drawCTAPage(doc, lead, W, H) {
  doc.rect(0, 0, W, H).fill(hex2rgb(BRAND.navy));
  doc.rect(0, 0, W, 6).fill(hex2rgb(BRAND.gold));

  doc.fillColor(hex2rgb(BRAND.gold))
    .font('Helvetica-Bold').fontSize(10)
    .text('ACE DIGITALS GLOBAL', 40, 40, { letterSpacing: 3 });

  doc.fillColor([255, 255, 255])
    .font('Helvetica-Bold').fontSize(28)
    .text(`Ready to Get\n${lead.name} Online?`, 40, 80, { width: W - 80 });

  doc.fillColor([255, 255, 255]).opacity(0.7)
    .font('Helvetica').fontSize(12)
    .text(`Your website can be live within 7 business days. Every day without one is another day your competitors are winning customers that should be yours.`,
      40, 170, { width: W - 80, lineGap: 4 });

  doc.opacity(1);

  // Steps
  const steps = [
    { num: '01', title: 'Reply to this email', desc: 'Tell us you want to get started or ask any questions' },
    { num: '02', title: 'Free 20-min consultation', desc: 'We learn about your business and plan the perfect website' },
    { num: '03', title: 'Website live in 7 days', desc: 'We build it, you approve it, we launch it — simple' },
  ];

  let sy = 250;
  steps.forEach(s => {
    doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(24)
      .text(s.num, 40, sy);
    doc.fillColor([255, 255, 255]).font('Helvetica-Bold').fontSize(12)
      .text(s.title, 80, sy + 4);
    doc.fillColor([255, 255, 255]).opacity(0.6).font('Helvetica').fontSize(10)
      .text(s.desc, 80, sy + 22, { width: W - 140 });
    doc.opacity(1);
    sy += 56;
  });

  // Contact block
  doc.rect(40, sy + 10, W - 80, 120).fill(hex2rgb(BRAND.gold));

  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(14)
    .text('Get in touch today', 60, sy + 28);

  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(11)
    .text(`Email:       info@acedigitalsempire.com`, 60, sy + 52);
  doc.text(`WhatsApp:  +234 907 958 1937`, 60, sy + 70);
  doc.text(`Website:    acedigitalsempire.com`, 60, sy + 88);

  doc.fillColor(hex2rgb(BRAND.navy)).opacity(0.6).font('Helvetica').fontSize(8)
    .text('(WhatsApp preferred for fastest response)', 60, sy + 108);

  doc.opacity(1);

  // Bottom disclaimer
  doc.fillColor([255, 255, 255]).opacity(0.35).font('Helvetica').fontSize(7.5)
    .text(`This audit was prepared exclusively for ${lead.name}. Data sourced from publicly available online directories. Revenue estimates are based on industry averages and are illustrative only. To unsubscribe from future communications from Ace Digitals Global, reply with the word UNSUBSCRIBE.`,
      40, H - 70, { width: W - 80, lineGap: 3, align: 'center' });

  doc.opacity(1);
}

module.exports = { generateAuditPDF };
