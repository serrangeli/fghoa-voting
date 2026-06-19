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
const CONFIG_FILE     = path.join(DATA_DIR, 'config.json');

// ── Default option definitions (source of truth for names / descriptions) ────
const DEFAULT_OPTIONS = [
  {
    id: 'BACKUP1', visible: false,
    name: 'Surface Only',
    image: '0. SURFACE ONLY.jpg',
    budget: '100% — Baseline',
    budgetClass: 'budget-backup1',
    tag: 'Baseline Budget',
    tagColor: '#6c757d',
    description: 'Resurface the 2 existing tennis courts — no demolition, no new construction. ' +
      'Includes crack repair, new acrylic resurfacing coats, repainted court lines, and replacement nets and hardware. ' +
      'The footprint stays exactly as it is today.',
    pros: [
      'Lowest possible budget — no surprises',
      'Fastest completion: 2–4 weeks',
      'No permits beyond routine maintenance',
      'No disruption to pool area or parking',
      'Lowest impact on HOA monthly dues',
      'Preserves all existing infrastructure'
    ],
    cons: [
      'Zero transformation — same space, same look',
      'Tennis participation in HOAs is declining nationally',
      'Courts will need resurfacing again in 10–15 years',
      'No social or gathering value added to the community',
      'Perception: "we just fixed what was already broken"'
    ]
  },
  {
    id: 'A', visible: true,
    name: 'Simple Rec Area',
    image: '1. SIMPLE-REC-AREA.jpg',
    budget: 'Shorter timeline · Lower cost',
    budgetClass: 'budget-a',
    tag: 'Flexible Lawn + Shelter',
    tagColor: '#28a745',
    description: 'Remove both tennis courts and replace with an open green lawn, a prefab timber ' +
      'shelter with outdoor furniture, a curved hardscape patio, a stone walkway, and moderate landscaping. ' +
      'A complete visual transformation.',
    pros: [
      'Shelter + furniture creates an immediate community gathering hub',
      'Open lawn is flexible — events, kids play, yoga, informal sports, cornhole',
      'Low permitting complexity — fast approval'
    ],
    cons: [
      'No dedicated active sport or recreation element remains',
      'No strong destination draw beyond residents\' own backyards',
      'Shelter can feel underused without organized community programming'
    ]
  },
  {
    id: 'B', visible: true,
    name: 'Shelter Only Area',
    image: '2. SHELTER-ONLY-AREA.jpg',
    budget: 'Shorter timeline · Medium cost',
    budgetClass: 'budget-b',
    tag: 'Premium Shelter + Garden',
    tagColor: '#7cb518',
    description: 'Demo courts and replace with a larger custom timber premium shelter with built-in seating, ' +
      'an ornamental garden, and a landscaped lawn. A resort-park aesthetic for the community.',
    pros: [
      'Premium resort-park aesthetic — feels like a private club amenity',
      'Covered premium shelter with built-in seating drives regular daily use — great for resident events',
      'Quiet retreat character — excellent for seniors and social gatherings'
    ],
    cons: [
      'Elaborate landscaping = highest ongoing maintenance cost of any passive option',
      'No active sport element — residents who used tennis courts lose their amenity',
      'Less engagement from younger and more active residents'
    ]
  },
  {
    id: 'C', visible: true,
    name: 'Rec Area + Bocce Courts',
    image: '4. REC-AREA-BOCCE.jpg',
    budget: 'Medium timeline · Medium cost',
    budgetClass: 'budget-c',
    tag: 'Bocce + Social Hub',
    tagColor: '#b07d00',
    description: 'Demo courts and build 2–3 bocce court lanes with timber borders, ' +
      'cornhole hardscape pads, an open lawn area, a timber shelter or gazebo, ' +
      'a circular gathering patio, and perimeter landscaping. Activity-focused with a strong social hub.',
    pros: [
      'Bocce is one of the fastest-growing HOA amenities in the US',
      'Multiple activities in one space: bocce, cornhole, open lawn, shelter',
      'Shelter + circular patio creates a strong social gathering atmosphere'
    ],
    cons: [
      'Niche appeal — bocce may not draw all demographics equally',
      'Bocce courts require periodic re-grading (ongoing maintenance cost)',
      'Less draw for families with young children'
    ]
  },
  {
    id: 'D', visible: true,
    name: 'Multi-Purpose Court',
    image: '5. MULTI-PURPOSE.jpg',
    budget: 'Longer timeline · Higher cost',
    budgetClass: 'budget-d',
    tag: 'Sports Court + Shelter',
    tagColor: '#e06000',
    description: 'Demo both tennis courts and replace with one large color-coded multi-sport surface ' +
      'combining pickleball, basketball, and tennis lines — plus basketball hoops, perimeter fencing, ' +
      'a timber shelter or gazebo, a circular gathering patio, and surrounding landscaping.',
    pros: [
      'Pickleball is the #1 fastest-growing sport in the US — a major HOA draw',
      'Best option for raising community home values',
      'Widest age range appeal: kids, teens, adults, and seniors'
    ],
    cons: [
      'Most hardscape-heavy option — least "green park" feel',
      'Pickleball noise can be a concern for adjacent neighbors',
      'Equipment and net storage solution required'
    ]
  },
  {
    id: 'BACKUP2', visible: false,
    name: 'Shelter + Amphitheater',
    image: '3. SHELTER-AMPHITEATRE-AREA.jpg',
    budget: '~250% – 380% of Baseline',
    budgetClass: 'budget-backup2',
    tag: '+150% to +280%',
    tagColor: '#c0392b',
    description: 'The most ambitious option: demo courts and build a large multi-bay timber pavilion, ' +
      'a tiered outdoor amphitheater with stepped bench seating on an earthen berm, ' +
      'a circular fire pit gathering patio, a large hardscape platform, and elaborate tropical mixed landscaping.',
    pros: [
      'Most dramatic transformation — creates a true community destination',
      'Amphitheater enables concerts, outdoor movies, HOA meetings, and seasonal events',
      'Creates a lasting community identity and strong neighborhood pride',
      'Circular fire pit patio provides a year-round social hub',
      'Best long-term ROI if the community holds regular organized events',
      'Prestigious aesthetic — can attract buyers and increase property values'
    ],
    cons: [
      'Highest budget of all options by a significant margin',
      'Amphitheater requires active programming to justify the investment',
      'Event noise can create conflicts with adjacent neighbors',
      'Longest construction timeline and most complex permitting process',
      'Highest ongoing maintenance burden of all options',
      'Without regular programming, becomes the most expensive underused amenity'
    ]
  }
];

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

const VALID_OPTIONS    = ['BACKUP1', 'A', 'B', 'C', 'D', 'BACKUP2'];
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

// ── Config helpers ────────────────────────────────────────────────────────────
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return DEFAULT_OPTIONS.map(o => Object.assign({}, o));
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
    if (!raw.trim()) return DEFAULT_OPTIONS.map(o => Object.assign({}, o));
    const stored = JSON.parse(raw);
    // Merge with defaults so any new fields added to defaults are picked up
    return DEFAULT_OPTIONS.map(def => {
      const override = stored.find(s => s.id === def.id);
      return override ? Object.assign({}, def, override) : Object.assign({}, def);
    });
  } catch {
    return DEFAULT_OPTIONS.map(o => Object.assign({}, o));
  }
}

function saveConfig(cfg) {
  ensureDataDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

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
  return String(h).replace(/[^0-9]/g, '').trim().substring(0, 5);
}

function sanitizeComment(c) {
  return String(c || '').substring(0, 1000);
}

function sanitizeEmail(e) {
  const s = String(e || '').trim().substring(0, 254);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : '';
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
  const { house, first, second, comment, email, update } = req.body || {};

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

  // Also ensure only currently-visible options can receive new votes
  const visibleIds = loadConfig().filter(o => o.visible !== false).map(o => o.id);
  if (!visibleIds.includes(first) || !visibleIds.includes(second)) {
    return res.status(400).json({ error: 'That option is not available for this vote.' });
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
    email:     sanitizeEmail(email),
    timestamp: new Date().toISOString(),
    updated:   !!(votes[houseKey] && update)
  };

  saveVotes(votes);
  res.json({ success: true, updated: votes[houseKey].updated });
});

// ── API: Public option config (visible options only) ─────────────────────────
app.get('/api/config', (req, res) => {
  const cfg = loadConfig();
  res.json(cfg.filter(o => o.visible !== false));
});

// ── API: Admin — get full option config ───────────────────────────────────────
app.get('/api/admin/config', (req, res) => {
  res.json(loadConfig());
});

// ── API: Admin — save option config ──────────────────────────────────────────
app.post('/api/admin/config', (req, res) => {
  const cfg = req.body;
  if (!Array.isArray(cfg) || cfg.length === 0)
    return res.status(400).json({ error: 'Invalid config format.' });
  for (const opt of cfg) {
    if (!opt.id || !VALID_OPTIONS.includes(opt.id) || typeof opt.visible !== 'boolean' ||
        typeof opt.name !== 'string' || typeof opt.description !== 'string' ||
        !Array.isArray(opt.pros) || !Array.isArray(opt.cons))
      return res.status(400).json({ error: `Invalid config for option "${opt.id}".` });
    // Sanitize string lengths
    opt.name        = String(opt.name).substring(0, 100);
    opt.description = String(opt.description).substring(0, 2000);
    opt.pros        = opt.pros.map(p => String(p).substring(0, 300)).filter(p => p.trim());
    opt.cons        = opt.cons.map(c => String(c).substring(0, 300)).filter(c => c.trim());
  }
  saveConfig(cfg);
  res.json({ success: true });
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
