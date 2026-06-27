/**
 * Ace Pitch Engine — Lead Generation + Outreach System
 * Built for Ace Digitals Global
 * Deploy target: Render.com
 */

const express = require('express');
const path = require('path');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/search', require('./routes/search'));
app.use('/api/pitch', require('./routes/pitch'));
app.use('/api/send', require('./routes/send'));
app.use('/api/preview-pdf', (req, res, next) => {
  req.url = '/preview-pdf';
  require('./routes/send')(req, res, next);
});

// Health check — UptimeRobot pings this
app.get('/health', (req, res) => {
  res.json({ status: 'ok', brand: 'Ace Digitals Global', ts: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Ace Pitch Engine running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

// Extend timeout to 120s — PDF generation + SMTP can be slow
server.timeout = 120000;
server.keepAliveTimeout = 120000;
