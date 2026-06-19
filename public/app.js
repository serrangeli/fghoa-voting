'use strict';

// ── Option Data (loaded from server via /api/config) ──────────────────────────
let OPTIONS = [];

const _STUB_OPTIONS = [
  {
    id: 'A',
    name: 'Surface Only',
    image: '0. SURFACE ONLY.jpg',
    budget: '100% — Baseline',
    budgetClass: 'budget-a',
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
    id: 'B',
    name: 'Simple Rec Area',
    image: '1. SIMPLE-REC-AREA.jpg',
    budget: 'Shorter timeline · Lower cost',
    budgetClass: 'budget-b',
    tag: 'Flexible Lawn + Shelter',
    tagColor: '#28a745',
    description: 'Remove both tennis courts and replace with an open green lawn, a prefab timber ' +
      'shelter with outdoor furniture, a curved hardscape patio, a stone walkway, and moderate landscaping.',
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
    id: 'C',
    name: 'Shelter Only Area',
    image: '2. SHELTER-ONLY-AREA.jpg',
    budget: 'Shorter timeline · Medium cost',
    budgetClass: 'budget-c',
    tag: 'Premium Shelter + Garden',
    tagColor: '#7cb518',
    description: 'Demo courts and replace with a larger custom timber premium shelter with built-in seating, ' +
      'an ornamental garden focal point, elaborate specimen planting beds, a manicured ' +
      'wave-pattern lawn, and natural stepping stone pathways. A resort-park aesthetic for the community.',
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
    id: 'D',
    name: 'Rec Area + Bocce Courts',
    image: '4. REC-AREA-BOCCE.jpg',
    budget: 'Medium timeline · Medium cost',
    budgetClass: 'budget-d',
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
    id: 'E',
    name: 'Multi-Purpose Court',
    image: '5. MULTI-PURPOSE.jpg',
    budget: 'Longer timeline · Higher cost',
    budgetClass: 'budget-e',
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
    id: 'F',
    name: 'Shelter + Amphitheater',
    image: '3. SHELTER-AMPHITEATRE-AREA.jpg',
    budget: '~250% – 380% of Baseline',
    budgetClass: 'budget-f',
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

// ── State ────────────────────────────────────────────────────────────────────
let firstChoice  = null;
let secondChoice = null;
let overlayOptionId = null;

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadOptions();
  renderCards();
  fetchStats();
  setupCommentCounter();
});

async function loadOptions() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('config fetch failed');
    OPTIONS = await res.json();
  } catch {
    OPTIONS = _STUB_OPTIONS; // fall back to built-in data if server unreachable
  }
}

// ── Render Cards ─────────────────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = OPTIONS.map(opt => `
    <div class="option-card" id="card-${opt.id}" data-id="${opt.id}">
      <div class="card-ribbon"></div>
      <div class="card-ribbon-label" id="ribbon-${opt.id}"></div>

      <div class="card-image-wrap" onclick="openOverlay('${opt.id}')" title="Click for full details">
        <img src="/images/${encodeURIComponent(opt.image)}" alt="${opt.name}" loading="lazy">
        <span class="card-option-badge">Option ${opt.id}</span>
        <span class="card-budget-badge ${opt.budgetClass}">${opt.tag}</span>
        <span class="card-image-hint">🔍 Click for details</span>
      </div>

      <div class="card-body">
        <div class="card-title" onclick="openOverlay('${opt.id}')">${opt.name}</div>
      </div>

      <div class="card-vote-row">
        <button class="btn-choice" id="btn-first-${opt.id}"
          onclick="selectChoice('${opt.id}', 'first')" title="Mark as your 1st choice">
          🥇 1st Choice
        </button>
        <button class="btn-choice" id="btn-second-${opt.id}"
          onclick="selectChoice('${opt.id}', 'second')" title="Mark as your 2nd choice">
          🥈 2nd Choice
        </button>
      </div>
    </div>
  `).join('');
}

// ── Choice Selection Logic ────────────────────────────────────────────────────
function selectChoice(optionId, rank) {
  if (rank === 'first') {
    if (firstChoice === optionId) {
      firstChoice = null;                         // deselect
    } else {
      if (secondChoice === optionId) secondChoice = null; // can't be both
      firstChoice = optionId;
    }
  } else {
    if (secondChoice === optionId) {
      secondChoice = null;                        // deselect
    } else {
      if (firstChoice === optionId) firstChoice = null;   // can't be both
      secondChoice = optionId;
    }
  }
  updateAllUI();
}

function updateAllUI() {
  OPTIONS.forEach(opt => {
    const card   = document.getElementById(`card-${opt.id}`);
    const btnF   = document.getElementById(`btn-first-${opt.id}`);
    const btnS   = document.getElementById(`btn-second-${opt.id}`);
    const ribbon = document.getElementById(`ribbon-${opt.id}`);

    const isFirst  = firstChoice  === opt.id;
    const isSecond = secondChoice === opt.id;

    card.classList.toggle('selected-first',  isFirst);
    card.classList.toggle('selected-second', isSecond);
    btnF.classList.toggle('active-first',  isFirst);
    btnS.classList.toggle('active-second', isSecond);

    ribbon.textContent = isFirst ? '1st' : isSecond ? '2nd' : '';
  });

  // also update overlay buttons if open
  if (overlayOptionId) {
    const oF = document.getElementById(`overlay-btn-first-${overlayOptionId}`);
    const oS = document.getElementById(`overlay-btn-second-${overlayOptionId}`);
    if (oF) oF.classList.toggle('active-first',  firstChoice  === overlayOptionId);
    if (oS) oS.classList.toggle('active-second', secondChoice === overlayOptionId);
  }

  // update selection banner
  const fOpt = OPTIONS.find(o => o.id === firstChoice);
  const sOpt = OPTIONS.find(o => o.id === secondChoice);

  const fName = document.getElementById('firstSelName');
  const sName = document.getElementById('secondSelName');

  fName.textContent = fOpt ? `Option ${fOpt.id} — ${fOpt.name}` : '— not selected —';
  sName.textContent = sOpt ? `Option ${sOpt.id} — ${sOpt.name}` : '— not selected —';

  fName.classList.toggle('empty', !fOpt);
  sName.classList.toggle('empty', !sOpt);
}

// ── Overlay ───────────────────────────────────────────────────────────────────
function openOverlay(optionId) {
  const opt = OPTIONS.find(o => o.id === optionId);
  if (!opt) return;
  overlayOptionId = optionId;

  const isFirst  = firstChoice  === optionId;
  const isSecond = secondChoice === optionId;

  document.getElementById('overlayBody').innerHTML = `
    <img class="overlay-image" src="/images/${encodeURIComponent(opt.image)}" alt="${opt.name}">
    <div class="overlay-body-content">
      <div class="overlay-header-row">
        <div class="overlay-title">${opt.name}</div>
        <span class="overlay-budget-pill ${opt.budgetClass}">${opt.tag}</span>
      </div>
      <div class="overlay-option-label">Option ${opt.id}</div>
      <p class="overlay-description">${opt.description}</p>
      <div class="pros-cons-grid">
        <div class="pros-box">
          <h4>✅ Pros</h4>
          <ul>${opt.pros.map(p => `<li>${p}</li>`).join('')}</ul>
        </div>
        <div class="cons-box">
          <h4>❌ Cons</h4>
          <ul>${opt.cons.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="overlay-vote-row">
        <button class="btn-choice ${isFirst ? 'active-first' : ''}" id="overlay-btn-first-${opt.id}"
          onclick="selectChoice('${opt.id}', 'first')">
          🥇 1st Choice
        </button>
        <button class="btn-choice ${isSecond ? 'active-second' : ''}" id="overlay-btn-second-${opt.id}"
          onclick="selectChoice('${opt.id}', 'second')">
          🥈 2nd Choice
        </button>
      </div>
    </div>
  `;

  const overlay = document.getElementById('overlay');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeOverlay() {
  document.getElementById('overlay').classList.remove('active');
  document.body.style.overflow = '';
  overlayOptionId = null;
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('overlay')) closeOverlay();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeOverlay();
    closeModal('alreadyVotedModal');
    closeModal('successModal');
  }
});

// ── Modal helpers ─────────────────────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
  document.body.style.overflow = '';
}

// ── Vote submission ────────────────────────────────────────────────────────────
async function submitVote(forceUpdate = false) {
  clearFormMessage();

  const house   = document.getElementById('houseNumber').value.trim();
  const comment = document.getElementById('comment').value.trim();

  // Validate
  if (!house) {
    return showFormError('Please enter your house number.');
  }
  if (!firstChoice) {
    return showFormError('Please select your 1st Choice concept from the cards above.');
  }
  if (!secondChoice) {
    return showFormError('Please select your 2nd Choice concept from the cards above.');
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const res = await fetch('/api/vote', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        house,
        first:   firstChoice,
        second:  secondChoice,
        comment,
        update:  forceUpdate
      })
    });

    const data = await res.json();

    if (res.status === 409 && data.error === 'already_voted') {
      // Show already-voted modal
      const when = new Date(data.vote.timestamp).toLocaleString();
      const fOpt = OPTIONS.find(o => o.id === data.vote.first);
      const sOpt = OPTIONS.find(o => o.id === data.vote.second);

      document.getElementById('alreadyVotedDetails').innerHTML = `
        <p>House <strong>${house}</strong> already shared an opinion on <strong>${when}</strong>.</p>
        <p style="margin-top:8px">
          Previous 1st: <strong>Option ${data.vote.first} — ${fOpt ? fOpt.name : data.vote.first}</strong><br>
          Previous 2nd: <strong>Option ${data.vote.second} — ${sOpt ? sOpt.name : data.vote.second}</strong>
        </p>
        ${data.vote.comment ? `<p style="margin-top:8px;font-style:italic">"${data.vote.comment}"</p>` : ''}
        <p style="margin-top:10px">Would you like to <strong>replace</strong> that opinion with your current selections?</p>
      `;
      openModal('alreadyVotedModal');

    } else if (res.ok && data.success) {
      // Success
      const fOpt = OPTIONS.find(o => o.id === firstChoice);
      const sOpt = OPTIONS.find(o => o.id === secondChoice);
      document.getElementById('successTitle').textContent = data.updated ? 'Opinion Updated!' : 'Opinion Recorded!';
      document.getElementById('successDetails').innerHTML = `
        <p>Thank you, house <strong>${house}</strong>!</p>
        <p style="margin-top:8px">
          🥇 1st Choice: <strong>Option ${firstChoice} — ${fOpt.name}</strong><br>
          🥈 2nd Choice: <strong>Option ${secondChoice} — ${sOpt.name}</strong>
        </p>
        ${comment ? `<p style="margin-top:8px;font-style:italic">"${comment}"</p>` : ''}
      `;
      openModal('successModal');
      fetchStats(); // refresh counter

    } else {
      showFormError(data.error || 'Something went wrong. Please try again.');
    }

  } catch (err) {
    showFormError('Network error — please check your connection and try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit My Opinion';
  }
}

// Called when user confirms they want to update their existing vote
function confirmUpdate() {
  closeModal('alreadyVotedModal');
  submitVote(true);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function fetchStats() {
  try {
    const res  = await fetch('/api/stats');
    const data = await res.json();
    const pct  = Math.round((data.total / data.households) * 100);
    document.getElementById('voteCounter').innerHTML =
      `🗳️ <strong>${data.total}</strong> of <strong>${data.households}</strong> households have shared their opinion &nbsp;·&nbsp; ${pct}% participation`;
  } catch {
    document.getElementById('voteCounter').textContent = 'Participation count unavailable.';
  }
}

// ── Comment counter ───────────────────────────────────────────────────────────
function setupCommentCounter() {
  const ta  = document.getElementById('comment');
  const cnt = document.getElementById('charCount');
  ta.addEventListener('input', () => {
    cnt.textContent = `${ta.value.length} / 1000`;
  });
}

// ── Form helpers ──────────────────────────────────────────────────────────────
function showFormError(msg) {
  const el = document.getElementById('formMessage');
  el.textContent = msg;
  el.className = 'form-message error';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearFormMessage() {
  const el = document.getElementById('formMessage');
  el.textContent = '';
  el.className = 'form-message';
}
