/**
 * pdfService.js — Branded Audit PDF Generator
 * Ace Digitals Global | Ace Pitch Engine
 * Upgraded: Nigeria-aware, industry-specific figures, correct contact info
 */

const PDFDocument = require('pdfkit');

const BRAND = {
  navy:    '#1B2A4A',
  white:   '#FFFFFF',
  offWhite:'#F8F9FC',
  gold:    '#C9A84C',
  slate:   '#4A5568',
  light:   '#E8ECF4',
  red:     '#C53030',
  green:   '#276749',
  midGrey: '#718096',
};

function hex2rgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

// ── Nigeria detection ─────────────────────────────────────────────────────────
const NIGERIAN_KEYWORDS = [
  'lagos','abuja','kano','ibadan','port harcourt','benin city',
  'kaduna','enugu','onitsha','warri','calabar','owerri','uyo',
  'nigeria','lekki','ikeja','victoria island','surulere','ajah',
  'yaba','apapa','ikorodu','mushin','oshodi',
];

function isNigeriaLocation(location) {
  if (!location) return false;
  const loc = location.toLowerCase();
  return NIGERIAN_KEYWORDS.some(kw => loc.includes(kw));
}

// ── Industry-specific data ────────────────────────────────────────────────────
function getIndustryData(service, isNigeria) {
  const s = (service || '').toLowerCase();

  if (s.includes('hydraulic') || s.includes('hose')) {
    return {
      searchVolume:     isNigeria ? 180  : 420,
      avgJobValue:      isNigeria ? 45000 : 320,
      conversionRate:   0.04,
      customerType:     'fleet managers, construction companies, and equipment operators',
      urgencyFact:      'Equipment downtime costs thousands per hour. Hydraulic failures are emergencies.',
      trustNeeds:       'response time, mobile repair capability, and certifications',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('welding') || s.includes('fabricat')) {
    return {
      searchVolume:     isNigeria ? 210  : 380,
      avgJobValue:      isNigeria ? 80000 : 650,
      conversionRate:   0.035,
      customerType:     'contractors, manufacturers, and industrial facility managers',
      urgencyFact:      'Most welding contracts start with a Google search. The shop with photos of past work wins the quote.',
      trustNeeds:       'portfolio of past work, certifications, and types of metal they work with',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('tank') || s.includes('septic')) {
    return {
      searchVolume:     isNigeria ? 160  : 290,
      avgJobValue:      isNigeria ? 120000 : 850,
      conversionRate:   0.04,
      customerType:     'industrial facility managers, food processing operators, and municipalities',
      urgencyFact:      'Tank cleaning is a compliance requirement. Facility managers who cannot find a certified company online are forced to make emergency calls at premium rates.',
      trustNeeds:       'compliance certifications, safety records, and types of tanks serviced',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('parking') || s.includes('striping') || s.includes('line marking')) {
    return {
      searchVolume:     isNigeria ? 90   : 340,
      avgJobValue:      isNigeria ? 200000 : 1800,
      conversionRate:   0.045,
      customerType:     'property managers, retail center owners, and HOA managers',
      urgencyFact:      'Parking lot striping is deadline-driven. New tenants, inspections, and seasonal repaints all create urgent search demand.',
      trustNeeds:       'photos of completed lots, ADA compliance experience, and types of paint used',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('hood') || s.includes('exhaust') || s.includes('kitchen cleaning')) {
    return {
      searchVolume:     isNigeria ? 140  : 510,
      avgJobValue:      isNigeria ? 95000 : 480,
      conversionRate:   0.05,
      customerType:     'restaurant owners, hotel kitchen managers, and facility directors',
      urgencyFact:      'Fire marshal inspections are not optional. Restaurant owners who cannot quickly find a certified hood cleaning company online call the first one that shows up on Google.',
      trustNeeds:       'NFPA 96 certification, compliance documentation, and before-and-after photos',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('plumb')) {
    return {
      searchVolume:     isNigeria ? 380  : 920,
      avgJobValue:      isNigeria ? 35000 : 280,
      conversionRate:   0.06,
      customerType:     'homeowners and property managers',
      urgencyFact:      'Plumbing calls are almost always urgent. The plumber that shows up first on Google gets the emergency call.',
      trustNeeds:       'licensing, response time, and service area coverage',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('electric')) {
    return {
      searchVolume:     isNigeria ? 290  : 760,
      avgJobValue:      isNigeria ? 60000 : 420,
      conversionRate:   0.05,
      customerType:     'homeowners, contractors, and property managers',
      urgencyFact:      'Electrical work requires licensing. Customers specifically search for licensed electricians because they cannot risk unlicensed work.',
      trustNeeds:       'licensing, insurance, and types of electrical work they specialise in',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('fashion') || s.includes('tailor') || s.includes('sewing')) {
    return {
      searchVolume:     220,
      avgJobValue:      85000,
      conversionRate:   0.04,
      customerType:     'individuals and corporate clients seeking custom clothing',
      urgencyFact:      'Fashion clients search Instagram and Google for tailors before contacting anyone. A portfolio online converts browsing into booking.',
      trustNeeds:       'portfolio photos, turnaround time, and types of outfits they specialise in',
      starterPrice:     '₦150,000',
      proPrice:         '₦250,000',
      premiumPrice:     '₦350,000',
      currency:         '₦',
      currencyCode:     'NGN',
    };
  }

  if (s.includes('real estate') || s.includes('property')) {
    return {
      searchVolume:     isNigeria ? 680  : 1200,
      avgJobValue:      isNigeria ? 500000 : 8500,
      conversionRate:   0.02,
      customerType:     'property buyers, renters, and investors',
      urgencyFact:      'Real estate clients research online for weeks before contacting anyone. Agents with a website and listings get contacted first.',
      trustNeeds:       'property listings, location coverage, and agent credentials',
      starterPrice:     isNigeria ? '₦250,000' : '$499',
      proPrice:         isNigeria ? '₦400,000' : '$799',
      premiumPrice:     isNigeria ? '₦600,000' : '$1,199',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  if (s.includes('salon') || s.includes('barber') || s.includes('hair')) {
    return {
      searchVolume:     isNigeria ? 450  : 820,
      avgJobValue:      isNigeria ? 12000 : 85,
      conversionRate:   0.06,
      customerType:     'individuals looking for hair services in their area',
      urgencyFact:      'Salons with an online presence and portfolio photos attract clients from far beyond their immediate neighbourhood.',
      trustNeeds:       'portfolio photos, services and pricing, and location visibility',
      starterPrice:     isNigeria ? '₦150,000' : '$299',
      proPrice:         isNigeria ? '₦250,000' : '$449',
      premiumPrice:     isNigeria ? '₦350,000' : '$499',
      currency:         isNigeria ? '₦' : '$',
      currencyCode:     isNigeria ? 'NGN' : 'USD',
    };
  }

  // Default
  return {
    searchVolume:     isNigeria ? 200  : 380,
    avgJobValue:      isNigeria ? 50000 : 300,
    conversionRate:   0.04,
    customerType:     'local customers and businesses',
    urgencyFact:      'The first business that shows up on Google for this service gets the customer.',
    trustNeeds:       'professional website, reviews, and clear service information',
    starterPrice:     isNigeria ? '₦150,000' : '$299',
    proPrice:         isNigeria ? '₦250,000' : '$449',
    premiumPrice:     isNigeria ? '₦350,000' : '$499',
    currency:         isNigeria ? '₦' : '$',
    currencyCode:     isNigeria ? 'NGN' : 'USD',
  };
}

// ── Contact info by location ──────────────────────────────────────────────────
function getContactInfo(isNigeria) {
  return {
    email:    'clients@acedigitalsempire.com',
    phone:    isNigeria ? '+234 907 958 1937' : '+1 (873) 352-2008',
    website:  'acedigitalsempire.com',
    whatsapp: isNigeria ? '+234 907 958 1937' : '+1 (873) 352-2008',
  };
}

// ── Main PDF generator ────────────────────────────────────────────────────────
async function generateAuditPDF(lead, pitch) {
  return new Promise((resolve, reject) => {
    try {
      const doc      = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
      const buffers  = [];

      doc.on('data',  chunk => buffers.push(chunk));
      doc.on('end',   () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const W = 595.28;
      const H = 841.89;

      const isNigeria = lead.isNigeria || isNigeriaLocation(lead.location);
      const industry  = getIndustryData(lead.service, isNigeria);
      const contact   = getContactInfo(isNigeria);

      drawCover(doc, lead, W, H, industry, contact, isNigeria);

      doc.addPage();
      drawHeader(doc, W, 'Executive Summary', 2);
      drawExecutiveSummary(doc, lead, W, industry, isNigeria);
      drawFooter(doc, W, H, contact);

      doc.addPage();
      drawHeader(doc, W, 'Digital Presence Audit', 3);
      drawAuditTable(doc, lead, W, industry);
      drawFooter(doc, W, H, contact);

      doc.addPage();
      drawHeader(doc, W, 'Revenue Impact Analysis', 4);
      drawRevenueImpact(doc, lead, W, H, industry, isNigeria);
      drawFooter(doc, W, H, contact);

      doc.addPage();
      drawHeader(doc, W, 'Our Solution For You', 5);
      drawSolution(doc, lead, W, industry, isNigeria);
      drawFooter(doc, W, H, contact);

      doc.addPage();
      drawCTAPage(doc, lead, W, H, industry, contact, isNigeria);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ── COVER PAGE ────────────────────────────────────────────────────────────────
function drawCover(doc, lead, W, H, industry, contact, isNigeria) {
  doc.rect(0,0,W,H).fill(hex2rgb(BRAND.navy));
  doc.rect(0,0,W,8).fill(hex2rgb(BRAND.gold));

  // Watermark
  doc.save().fillColor([255,255,255]).opacity(0.04)
    .font('Helvetica-Bold').fontSize(80)
    .rotate(-30, { origin:[W/2,H/2] })
    .text('ACE DIGITALS GLOBAL', W/2-280, H/2-40, { align:'center' })
    .restore();

  doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(11)
    .text('ACE DIGITALS GLOBAL', 50, 60, { letterSpacing:3 });
  doc.moveTo(50,82).lineTo(W-50,82).strokeColor(hex2rgb(BRAND.gold)).lineWidth(0.5).stroke();
  doc.fillColor([255,255,255]).opacity(0.6).font('Helvetica').fontSize(10)
    .text('CONFIDENTIAL DIGITAL AUDIT REPORT', 50, 95, { letterSpacing:2 });
  doc.opacity(1);

  const bizName = lead.name.toUpperCase();
  doc.fillColor([255,255,255]).font('Helvetica-Bold')
    .fontSize(bizName.length > 24 ? 26 : 32)
    .text(bizName, 50, 200, { width:W-100 });

  const cat = (lead.service || lead.category || 'Local Business').toUpperCase();
  doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(10)
    .text(cat, 50, 280, { letterSpacing:2 });

  doc.fillColor([255,255,255]).opacity(0.7).font('Helvetica').fontSize(12)
    .text((lead.address || lead.location || '').toUpperCase(), 50, 300);
  doc.opacity(1);

  // Score box
  const scoreColor = lead.score >= 80 ? BRAND.red : lead.score >= 65 ? '#D4600A' : lead.score >= 50 ? BRAND.gold : BRAND.midGrey;
  doc.rect(50,360,180,120).fill(hex2rgb(scoreColor));
  doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(56)
    .text(`${lead.score}`, 50, 378, { width:180, align:'center' });
  doc.font('Helvetica').fontSize(9)
    .text('OPPORTUNITY SCORE /100', 50, 452, { width:180, align:'center', letterSpacing:1 });

  const findings = [
    { label:'Website',    value:'NONE FOUND',   color:BRAND.red   },
    { label:'Email Type', value:(lead.email||'').split('@')[1]?.toUpperCase()||'FREE EMAIL', color:BRAND.green },
    { label:'Reviews',    value:lead.reviews > 0 ? `${lead.reviews} Reviews`:'None', color:BRAND.midGrey },
    { label:'Rating',     value:lead.rating  > 0 ? `${lead.rating}★`:'No Rating',   color:BRAND.midGrey },
  ];

  let fx = 260;
  const fW = (W-fx-50)/2 - 8;
  findings.forEach((f,i) => {
    const col = i%2===0 ? fx : fx+fW+8;
    const row = i<2 ? 360 : 415;
    doc.save().rect(col,row,fW,48).fill([255,255,255]).opacity(0.08).restore();
    doc.fillColor([255,255,255]).opacity(0.55).font('Helvetica').fontSize(8)
      .text(f.label.toUpperCase(), col+10, row+8, { letterSpacing:1 });
    doc.fillColor(hex2rgb(f.color)).opacity(1).font('Helvetica-Bold').fontSize(11)
      .text(f.value, col+10, row+22);
  });

  const nowStr = new Date().toLocaleDateString('en-GB',{ day:'numeric', month:'long', year:'numeric' });
  doc.moveTo(50,530).lineTo(W-50,530).strokeColor(hex2rgb(BRAND.gold)).opacity(0.3).lineWidth(0.5).stroke();
  doc.opacity(1);
  doc.fillColor([255,255,255]).opacity(0.5).font('Helvetica').fontSize(9)
    .text(`PREPARED FOR:  ${lead.name}`, 50, 545);
  doc.text(`DATE:  ${nowStr}`, 50, 560);
  doc.opacity(1);

  // Bottom contact bar
  doc.rect(0,H-100,W,100).fill(hex2rgb(BRAND.gold));
  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(13)
    .text('ACE DIGITALS GLOBAL', 50, H-78);
  doc.font('Helvetica').fontSize(9)
    .text(`${contact.email}  |  ${contact.website}  |  WhatsApp: ${contact.whatsapp}`, 50, H-58);
  doc.font('Helvetica').fontSize(8).opacity(0.7)
    .text('Website Design  •  Local SEO  •  Digital Marketing  •  AI Automation', 50, H-40);
}

// ── HEADER ────────────────────────────────────────────────────────────────────
function drawHeader(doc, W, title, pageNum) {
  doc.rect(0,0,W,70).fill(hex2rgb(BRAND.navy));
  doc.rect(0,0,W,4).fill(hex2rgb(BRAND.gold));
  doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(9)
    .text('ACE DIGITALS GLOBAL', 30, 18, { letterSpacing:2 });
  doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(16).text(title, 30, 38);
  doc.fillColor([255,255,255]).opacity(0.5).font('Helvetica').fontSize(9)
    .text(`Page ${pageNum} of 6`, W-80, 28);
  doc.opacity(1);
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function drawFooter(doc, W, H, contact) {
  doc.rect(0,H-40,W,40).fill(hex2rgb(BRAND.light));
  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(8)
    .text(`Ace Digitals Global  |  ${contact.email}  |  ${contact.website}  |  WhatsApp: ${contact.whatsapp}`,
      30, H-26, { width:W-60, align:'center' });
}

// ── PAGE 2: EXECUTIVE SUMMARY ─────────────────────────────────────────────────
function drawExecutiveSummary(doc, lead, W, industry, isNigeria) {
  let y = 100;
  const cur = industry.currency;

  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(11)
    .text(`This report was prepared exclusively for ${lead.name}, a ${lead.service || lead.category} business in ${lead.location}. It analyses their current digital presence and identifies the revenue opportunity available by addressing the gaps found below.`,
      40, y, { width:W-80, lineGap:4 });
  y += 70;

  const metrics = [
    { label:'Website',  value:'NONE',          sub:'Not found online',      color:BRAND.red   },
    { label:'Score',    value:`${lead.score}/100`, sub:'Opportunity score',  color:BRAND.gold  },
    { label:'Reviews',  value:`${lead.reviews}`,   sub:'Google reviews',     color:lead.reviews<10?BRAND.red:BRAND.green },
    { label:'Rating',   value:lead.rating>0?`${lead.rating}★`:'N/A', sub:'Google rating', color:BRAND.navy },
  ];

  const mW = (W-80)/4 - 8;
  metrics.forEach((m,i) => {
    const mx = 40 + i*(mW+8);
    doc.rect(mx,y,mW,72).fill(hex2rgb(BRAND.offWhite));
    doc.rect(mx,y,mW,4).fill(hex2rgb(m.color));
    doc.fillColor(hex2rgb(m.color)).font('Helvetica-Bold').fontSize(22)
      .text(m.value, mx+8, y+14, { width:mW-16, align:'center' });
    doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(8)
      .text(m.label.toUpperCase(), mx+8, y+42, { width:mW-16, align:'center', letterSpacing:1 });
    doc.fillColor(hex2rgb(BRAND.midGrey)).font('Helvetica').fontSize(8)
      .text(m.sub, mx+8, y+56, { width:mW-16, align:'center' });
  });
  y += 100;

  // Industry-specific urgency fact
  doc.rect(40,y,W-80,50).fill(hex2rgb(BRAND.offWhite));
  doc.rect(40,y,4,50).fill(hex2rgb(BRAND.gold));
  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(10)
    .text('Why This Matters for ' + (lead.service || 'This Business'), 54, y+8);
  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(9)
    .text(industry.urgencyFact, 54, y+24, { width:W-104 });
  y += 66;

  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(13)
    .text('Issues Identified', 40, y);
  y += 20;

  const pains = lead.painPoints || ['No website found','No online presence detected','Invisible to online customers'];
  pains.forEach(p => {
    doc.rect(40,y,12,12).fill(hex2rgb(BRAND.red));
    doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(8).text('!', 40, y+1, { width:12, align:'center' });
    doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(10)
      .text(p, 62, y+1, { width:W-102 });
    y += 22;
  });
  y += 16;

  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(13)
    .text('Growth Opportunities', 40, y);
  y += 20;

  const opps = lead.opportunities || [
    `Professional website starting at ${industry.starterPrice}`,
    'Google Business Profile optimisation',
    'Local SEO setup',
    isNigeria ? 'WhatsApp integration for instant customer contact' : 'Click-to-call and lead capture forms',
  ];
  opps.forEach(o => {
    doc.rect(40,y,12,12).fill(hex2rgb(BRAND.green));
    doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(8).text('✓', 40, y+1, { width:12, align:'center' });
    doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(10)
      .text(o, 62, y+1, { width:W-102 });
    y += 22;
  });
}

// ── PAGE 3: AUDIT TABLE ───────────────────────────────────────────────────────
function drawAuditTable(doc, lead, W, industry) {
  let y = 95;

  // Industry-specific trust signal row
  const rows = [
    { item:'Business Website',                            status:'MISSING',            severity:'CRITICAL', color:BRAND.red    },
    { item:'Google Business Profile',                     status:lead.reviews>0?'PARTIAL':'MISSING', severity:lead.reviews>0?'MODERATE':'HIGH', color:lead.reviews>0?BRAND.gold:BRAND.red },
    { item:'Professional Contact Email',                  status:'FREE EMAIL',          severity:'HIGH',     color:BRAND.gold   },
    { item:'Google Reviews',                              status:lead.reviews>0?`${lead.reviews} reviews`:'NONE', severity:lead.reviews>=10?'LOW':'HIGH', color:lead.reviews>=10?BRAND.green:BRAND.red },
    { item:'Star Rating',                                 status:lead.rating>0?`${lead.rating} / 5.0`:'NONE', severity:lead.rating>=4.2?'LOW':'HIGH', color:lead.rating>=4.2?BRAND.green:BRAND.red },
    { item:`${industry.trustNeeds.split(',')[0]} Online`, status:'NOT VISIBLE',         severity:'CRITICAL', color:BRAND.red    },
    { item:'Local Search Visibility',                     status:'NOT OPTIMISED',       severity:'CRITICAL', color:BRAND.red    },
    { item:'Mobile-Ready Website',                        status:'N/A — No Website',    severity:'CRITICAL', color:BRAND.red    },
  ];

  const colW = [W-80-160-120, 160, 120];
  const colX = [40, 40+colW[0], 40+colW[0]+colW[1]];

  doc.rect(40,y,W-80,28).fill(hex2rgb(BRAND.navy));
  ['AUDIT ITEM','CURRENT STATUS','SEVERITY'].forEach((h,i) => {
    doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(8)
      .text(h, colX[i]+8, y+9, { width:colW[i]-10, letterSpacing:1 });
  });
  y += 28;

  rows.forEach((row,idx) => {
    const bg = idx%2===0 ? BRAND.offWhite : BRAND.white;
    doc.rect(40,y,W-80,26).fill(hex2rgb(bg));
    doc.rect(40,y,W-80,26).stroke(hex2rgb(BRAND.light));
    doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(10).text(row.item, colX[0]+8, y+7);
    doc.fillColor(hex2rgb(row.color)).font('Helvetica-Bold').fontSize(9)
      .text(row.status, colX[1]+8, y+7, { width:colW[1]-16 });
    const pillW = 90;
    const pillX = colX[2]+(colW[2]-pillW)/2;
    doc.rect(pillX,y+5,pillW,16).fill(hex2rgb(row.color));
    doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(8)
      .text(row.severity, pillX, y+8, { width:pillW, align:'center' });
    y += 26;
  });

  y += 24;
  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(10)
    .text('This audit was conducted using publicly available data from Google Maps, Google Search, and business directory platforms. All findings reflect the digital presence of this business at the time this report was generated.',
      40, y, { width:W-80, lineGap:3 });
}

// ── PAGE 4: REVENUE IMPACT ────────────────────────────────────────────────────
function drawRevenueImpact(doc, lead, W, H, industry, isNigeria) {
  let y = 95;
  const cur = industry.currency;

  const monthlyLost = Math.round(industry.searchVolume * industry.conversionRate * industry.avgJobValue);
  const annualLost  = monthlyLost * 12;

  const formatMoney = (n) => {
    if (isNigeria) return `${cur}${Number(n).toLocaleString()}`;
    return `${cur}${Number(n).toLocaleString()}`;
  };

  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(11)
    .text(`Every month, people in ${lead.location} search online for a ${lead.service || 'local'} provider. These are ${industry.customerType} who decide which business to contact based on what they find on Google. Without a website, ${lead.name} is invisible to every one of those searches.`,
      40, y, { width:W-80, lineGap:4 });
  y += 80;

  // Industry-specific numbers
  const nums = [
    { label:'Est. Monthly Searches', value:`~${industry.searchVolume.toLocaleString()}`, sub:`for ${lead.service || 'this service'} in ${lead.location}` },
    { label:'Monthly Revenue Lost',  value:`${formatMoney(monthlyLost)}+`, sub:`at avg ${formatMoney(industry.avgJobValue)} per job` },
    { label:'Annual Revenue at Risk',value:`${formatMoney(annualLost)}+`, sub:'every year without an online presence' },
  ];

  const nW = (W-80-20)/3;
  nums.forEach((n,i) => {
    const nx = 40 + i*(nW+10);
    doc.rect(nx,y,nW,100).fill(hex2rgb(i===2 ? BRAND.navy : BRAND.offWhite));
    doc.fillColor(i===2 ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.navy))
      .font('Helvetica-Bold').fontSize(n.value.length > 10 ? 16 : 20)
      .text(n.value, nx+10, y+16, { width:nW-20, align:'center' });
    doc.fillColor(i===2 ? [255,255,255] : hex2rgb(BRAND.navy))
      .font('Helvetica-Bold').fontSize(8)
      .text(n.label.toUpperCase(), nx+10, y+52, { width:nW-20, align:'center', letterSpacing:1 });
    doc.fillColor(i===2 ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.midGrey))
      .font('Helvetica').fontSize(8)
      .text(n.sub, nx+10, y+68, { width:nW-20, align:'center' });
  });
  y += 130;

  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(13).text('The Good News', 40, y);
  y += 20;
  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(10)
    .text(`These customers are still searching. They are just finding competitors instead. A professional website built by Ace Digitals Global puts ${lead.name} in front of those searches and turns them into booked jobs. ${industry.urgencyFact}`,
      40, y, { width:W-80, lineGap:4 });
  y += 70;

  // Comparison boxes — light solid backgrounds for readability
  const boxW = (W-90)/2;
  const col2x = 40+boxW+10;
  const boxH  = 130;

  doc.rect(40,y,boxW,boxH).fill([255,235,235]);
  doc.rect(40,y,boxW,boxH).stroke(hex2rgb(BRAND.red));
  doc.rect(col2x,y,boxW,boxH).fill([225,245,230]);
  doc.rect(col2x,y,boxW,boxH).stroke(hex2rgb(BRAND.green));

  doc.fillColor(hex2rgb(BRAND.red)).font('Helvetica-Bold').fontSize(9)
    .text('WITHOUT A WEBSITE', 40, y+10, { width:boxW, align:'center', letterSpacing:1 });
  ['Invisible on Google Search','Losing jobs to competitors','No way to show past work online','Relying on word of mouth only'].forEach((w,i) => {
    doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(9)
      .text(`×  ${w}`, 50, y+30+i*20, { width:boxW-20 });
  });

  doc.fillColor(hex2rgb(BRAND.green)).font('Helvetica-Bold').fontSize(9)
    .text('WITH ACE DIGITALS GLOBAL', col2x, y+10, { width:boxW, align:'center', letterSpacing:1 });
  const withItems = isNigeria
    ? ['Appearing on Google in your area','New customers finding you daily','WhatsApp enquiries from real clients','Professional credibility online']
    : ['Ranking on Google for local searches','Leads and quote requests 24/7','Professional credibility online','Portfolio and reviews visible to all'];
  withItems.forEach((w,i) => {
    doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(9)
      .text(`+  ${w}`, col2x+10, y+30+i*20, { width:boxW-20 });
  });
}

// ── PAGE 5: SOLUTION ──────────────────────────────────────────────────────────
function drawSolution(doc, lead, W, industry, isNigeria) {
  let y = 95;

  doc.fillColor(hex2rgb(BRAND.slate)).font('Helvetica').fontSize(11)
    .text(`Ace Digitals Global builds professional websites specifically for ${lead.service || 'trade'} businesses like ${lead.name}. No template builder shortcuts. No AI-generated filler. A real website built to convert visitors into paying customers.`,
      40, y, { width:W-80, lineGap:4 });
  y += 60;

  const packages = [
    {
      name: 'STARTER',
      price: industry.starterPrice,
      ideal: isNigeria ? 'Small businesses just getting online' : 'Solo operators just getting online',
      color: BRAND.slate,
      features: isNigeria
        ? ['5-page professional website','Mobile-responsive design','Google Business Profile setup','WhatsApp click-to-chat integration','Basic local SEO setup','1 round of revisions']
        : ['5-page professional website','Mobile-responsive design','Google Business Profile setup','Contact form + click-to-call','Basic local SEO setup','1 round of revisions'],
    },
    {
      name: 'PROFESSIONAL',
      price: industry.proPrice,
      ideal: isNigeria ? 'Growing businesses needing more reach' : 'Growing businesses needing more',
      color: BRAND.navy,
      highlight: true,
      features: isNigeria
        ? ['Everything in Starter','8-page website with portfolio','Google Analytics setup','Review generation support','Social media links integrated','3 months free support']
        : ['Everything in Starter','8-page website with portfolio','Google Analytics setup','Review generation system','3 months free support','2 rounds of revisions'],
    },
    {
      name: 'PREMIUM',
      price: industry.premiumPrice,
      ideal: isNigeria ? 'Established businesses ready to dominate' : 'Established businesses ready to dominate',
      color: BRAND.gold,
      features: isNigeria
        ? ['Everything in Professional','Full local SEO package','Speed optimisation','Lead capture forms','Monthly maintenance included','6 months free support']
        : ['Everything in Professional','Full local SEO package','Speed optimisation','Lead capture forms','Social media integration','6 months free support'],
    },
  ];

  const pW = (W-80-20)/3;
  packages.forEach((pkg,i) => {
    const px = 40 + i*(pW+10);
    doc.rect(px+3,y+3,pW,300).fill([220,220,230]);
    doc.rect(px,y,pW,300).fill(pkg.highlight ? hex2rgb(BRAND.navy) : hex2rgb(BRAND.offWhite));
    doc.rect(px,y,pW,6).fill(hex2rgb(pkg.color));

    if (pkg.highlight) {
      doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(8)
        .text('MOST POPULAR', px, y-18, { width:pW, align:'center', letterSpacing:2 });
    }

    const textCol = pkg.highlight ? [255,255,255] : hex2rgb(BRAND.navy);
    doc.fillColor(textCol).font('Helvetica-Bold').fontSize(11)
      .text(pkg.name, px+10, y+20, { letterSpacing:2 });

    doc.fillColor(pkg.highlight ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.navy))
      .font('Helvetica-Bold').fontSize(pkg.price.length > 8 ? 18 : 26)
      .text(pkg.price, px+10, y+40);

    doc.fillColor(pkg.highlight ? [255,255,255] : hex2rgb(BRAND.midGrey))
      .font('Helvetica').fontSize(8)
      .text(pkg.ideal, px+10, y+76, { width:pW-20 });

    let fy = y+100;
    pkg.features.forEach(f => {
      doc.fillColor(pkg.highlight ? hex2rgb(BRAND.gold) : hex2rgb(BRAND.green))
        .font('Helvetica-Bold').fontSize(9).text('✓', px+10, fy);
      doc.fillColor(pkg.highlight ? [200,220,255] : hex2rgb(BRAND.slate))
        .font('Helvetica').fontSize(9).text(f, px+24, fy, { width:pW-34 });
      fy += 18;
    });
  });

  y += 320;
  doc.rect(40,y,W-80,36).fill(hex2rgb(BRAND.gold));
  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(10)
    .text('All packages include: free consultation, satisfaction guarantee, and full ownership of your website.',
      50, y+10, { width:W-100, align:'center' });
}

// ── PAGE 6: CTA ───────────────────────────────────────────────────────────────
function drawCTAPage(doc, lead, W, H, industry, contact, isNigeria) {
  doc.rect(0,0,W,H).fill(hex2rgb(BRAND.navy));
  doc.rect(0,0,W,6).fill(hex2rgb(BRAND.gold));

  doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(10)
    .text('ACE DIGITALS GLOBAL', 40, 40, { letterSpacing:3 });

  doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(28)
    .text(`Ready to Get\n${lead.name} Online?`, 40, 80, { width:W-80 });

  const ctaBody = isNigeria
    ? `Your website can be live within 7 business days. Every day without one is another day your competitors are getting calls from customers who should be finding you instead. The investment starts at ${industry.starterPrice} and pays for itself with one new client.`
    : `Your website can be live within 7 business days. Every day without one is another day your competitors are capturing customers that should be calling you. The investment starts at ${industry.starterPrice} and pays for itself within the first month.`;

  doc.fillColor([255,255,255]).opacity(0.7).font('Helvetica').fontSize(12)
    .text(ctaBody, 40, 170, { width:W-80, lineGap:4 });
  doc.opacity(1);

  const steps = [
    { num:'01', title: isNigeria ? 'Send us a WhatsApp or email' : 'Reply to this email',
      desc: isNigeria ? 'Tell us you are interested or ask any questions on WhatsApp' : 'Tell us you want to get started or ask any questions' },
    { num:'02', title:'Free 20-minute consultation',
      desc:'We learn about your business and plan the right website for your trade' },
    { num:'03', title:'Website live in 7 days',
      desc:'We build it, you review it, we launch it — you own it fully' },
  ];

  let sy = 250;
  steps.forEach(s => {
    doc.fillColor(hex2rgb(BRAND.gold)).font('Helvetica-Bold').fontSize(24).text(s.num, 40, sy);
    doc.fillColor([255,255,255]).font('Helvetica-Bold').fontSize(12).text(s.title, 80, sy+4);
    doc.fillColor([255,255,255]).opacity(0.6).font('Helvetica').fontSize(10)
      .text(s.desc, 80, sy+22, { width:W-140 });
    doc.opacity(1);
    sy += 56;
  });

  doc.rect(40,sy+10,W-80,130).fill(hex2rgb(BRAND.gold));
  doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica-Bold').fontSize(14)
    .text('Get in touch today', 60, sy+28);

  if (isNigeria) {
    doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(10)
      .text(`WhatsApp:  ${contact.whatsapp}`, 60, sy+50);
    doc.text(`Email:        ${contact.email}`, 60, sy+68);
    doc.text(`Website:    ${contact.website}`, 60, sy+86);
    doc.fillColor(hex2rgb(BRAND.navy)).opacity(0.6).font('Helvetica').fontSize(8)
      .text('(WhatsApp is fastest — message us any time)', 60, sy+108);
  } else {
    doc.fillColor(hex2rgb(BRAND.navy)).font('Helvetica').fontSize(10)
      .text(`Email:        ${contact.email}`, 60, sy+50);
    doc.text(`WhatsApp:  ${contact.whatsapp}`, 60, sy+68);
    doc.text(`Website:    ${contact.website}`, 60, sy+86);
    doc.fillColor(hex2rgb(BRAND.navy)).opacity(0.6).font('Helvetica').fontSize(8)
      .text('(WhatsApp preferred for fastest response)', 60, sy+108);
  }
  doc.opacity(1);

  doc.fillColor([255,255,255]).opacity(0.35).font('Helvetica').fontSize(7.5)
    .text(`This audit was prepared exclusively for ${lead.name}. Data sourced from publicly available online directories. Revenue estimates are based on industry research and are illustrative. To opt out of future communications from Ace Digitals Global, reply with UNSUBSCRIBE.`,
      40, H-70, { width:W-80, lineGap:3, align:'center' });
  doc.opacity(1);
}

module.exports = { generateAuditPDF };
