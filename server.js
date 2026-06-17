'use strict';

const express = require('express');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const app    = express();
const PORT   = process.env.PORT || 3000;

// ── Config — override via environment variables on the host ──────────────────
const SITE_PASSWORD    = process.env.SITE_PASSWORD || 'fgrecarea';
const DATA_DIR         = process.env.DATA_DIR || __dirname;
const VOTES_FILE       = path.join(DATA_DIR, 'votes.json');
// Images are bundled inside public/images — no external path needed

const TOKEN_COOKIE    = 'fghoa_auth';
const COOKIE_MAX_AGE  = 7 * 24 * 60 * 60; // 7 days in seconds

// ── Auth helpers ─────────────────────────────────────────────────────────────
function makeAuthToken() {
  return crypto.createHmac('sha256', 'fghoa-rec-area-salt-2026')
    .update(SITE_PASSWORD).digest('hex');
}

function parseCookies(req) {
  const list = {};
  (req.headers.cookie || '').split(';').forEach(pair => {
    const [k, ...v] = pair.trim().split('=');
    if (k) list[k.trim()] = decodeURIComponent(v.join('='));
  });
  return list;
}

function isAuthenticated(req) {
  return parseCookies(req)[TOKEN_COOKIE] === makeAuthToken();
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  const open = ['/login', '/api/login', '/favicon.ico'];
  if (open.includes(req.path)) return next();
  if (isAuthenticated(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated.' });
  res.redirect('/login');
}

const VALID_OPTIONS    = ['A', 'B', 'C', 'D', 'E', 'F'];
const TOTAL_HOUSEHOLDS = 97;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ── Login page ────────────────────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (isAuthenticated(req)) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ── Admin page ────────────────────────────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// ── API: Login ────────────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { password } = req.body || {};
  const given    = Buffer.from(String(password || '').trim());
  const expected = Buffer.from(SITE_PASSWORD);
  const match    = given.length === expected.length &&
    crypto.timingSafeEqual(given, expected);
  if (!match) return res.status(401).json({ error: 'Incorrect password. Please try again.' });
  res.setHeader('Set-Cookie',
    `${TOKEN_COOKIE}=${makeAuthToken()}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Strict`
  );
  res.json({ success: true });
});

// ── API: Logout ───────────────────────────────────────────────────────────────
app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${TOKEN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`);
  res.redirect('/login');
});

// ── Vote file helpers ────────────────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadVotes() {
  if (!fs.existsSync(VOTES_FILE)) return {};
  try {
    const raw = fs.readFileSync(VOTES_FILE, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVotes(votes) {
  ensureDataDir();
  fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2), 'utf8');
}

// ── Input validation ─────────────────────────────────────────────────────────
function sanitizeHouse(h) {
  // Allow alphanumeric + dash/space, max 10 chars
  return String(h).replace(/[^a-zA-Z0-9\-\s]/g, '').trim().substring(0, 10);
}

function sanitizeComment(c) {
  return String(c || '').substring(0, 1000);
}

// ── API: Check if house has voted ────────────────────────────────────────────
app.get('/api/vote/:house', (req, res) => {
  const house = sanitizeHouse(req.params.house);
  if (!house) return res.status(400).json({ error: 'Invalid house number.' });

  const votes = loadVotes();
  if (votes[house]) {
    res.json({ voted: true, vote: votes[house] });
  } else {
    res.json({ voted: false });
  }
});

// ── API: Submit or update vote ───────────────────────────────────────────────
app.post('/api/vote', (req, res) => {
  const { house, first, second, comment, update } = req.body || {};

  // Validate required fields
  if (!house || !first || !second) {
    return res.status(400).json({ error: 'House number, first choice, and second choice are required.' });
  }

  const houseKey = sanitizeHouse(house);
  if (!houseKey) {
    return res.status(400).json({ error: 'Invalid house number.' });
  }

  if (!VALID_OPTIONS.includes(first) || !VALID_OPTIONS.includes(second)) {
    return res.status(400).json({ error: 'Invalid option selection.' });
  }

  if (first === second) {
    return res.status(400).json({ error: '1st and 2nd choices must be different options.' });
  }

  const votes = loadVotes();

  // Already voted and not requesting update
  if (votes[houseKey] && !update) {
    return res.status(409).json({
      error: 'already_voted',
      timestamp: votes[houseKey].timestamp,
      vote: votes[houseKey]
    });
  }

  votes[houseKey] = {
    house:     houseKey,
    first,
    second,
    comment:   sanitizeComment(comment),
    timestamp: new Date().toISOString(),
    updated:   !!(votes[houseKey] && update)
  };

  saveVotes(votes);
  res.json({ success: true, updated: votes[houseKey].updated });
});

// ── API: Stats (total count only — no results shown to avoid influencing votes) ──
app.get('/api/stats', (req, res) => {
  const votes = loadVotes();
  res.json({
    total:      Object.keys(votes).length,
    households: TOTAL_HOUSEHOLDS
  });
});

// ── API: Full results (admin use — protected by obscure path) ────────────────
app.get('/api/admin/results', (req, res) => {
  const votes = loadVotes();
  const tally = { first: {}, second: {} };

  VALID_OPTIONS.forEach(opt => {
    tally.first[opt]  = 0;
    tally.second[opt] = 0;
  });

  Object.values(votes).forEach(v => {
    if (tally.first[v.first]  !== undefined) tally.first[v.first]++;
    if (tally.second[v.second] !== undefined) tally.second[v.second]++;
  });

  res.json({
    total:      Object.keys(votes).length,
    households: TOTAL_HOUSEHOLDS,
    tally,
    votes       // full record for admin
  });
});


// ── API: Admin — export votes.json as downloadable file ──────────────────────
app.get('/api/admin/export', (req, res) => {
  const votes = loadVotes();
  res.setHeader('Content-Disposition', 'attachment; filename="votes.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(votes, null, 2));
});

// ── API: Admin — import / restore votes.json ──────────────────────────────────
app.post('/api/admin/import', (req, res) => {
  const incoming = req.body;
  if (typeof incoming !== 'object' || Array.isArray(incoming))
    return res.status(400).json({ error: 'Invalid votes file.' });
  for (const [key, v] of Object.entries(incoming)) {
    if (!v.house || !VALID_OPTIONS.includes(v.first) || !VALID_OPTIONS.includes(v.second))
      return res.status(400).json({ error: `Invalid entry for house "${key}".` });
  }
  saveVotes(incoming);
  res.json({ success: true, total: Object.keys(incoming).length });
});

// ── API: Admin — clear all votes ──────────────────────────────────────────────
app.post('/api/admin/clear', (req, res) => {
  saveVotes({});
  res.json({ success: true });
});
// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  FGHOA Recreation Area — Community Voting Site   ║');
  console.log(`  ║  http://localhost:${PORT}                              ║`);
  console.log(`  ║  Password: ${SITE_PASSWORD.padEnd(38)}║`);
  console.log('  ║  Admin:    /api/admin/results                    ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
});
