/* ── Tab Navigation ─────────────────────────────────────── */
const tabs = document.querySelectorAll('.nav-tab');
tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

function switchTab(name) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
  document.querySelector(`[data-tab="${name}"]`).classList.add('active');
  if (name === 'dashboard') loadDashboard();
  if (name === 'discover')  loadDiscover();
  if (name === 'metrics')   loadMetrics();
}

/* ── API helpers ─────────────────────────────────────────── */
async function api(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
async function post(path, body) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/* ── Toast ───────────────────────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 300); }, 3000);
}

/* ── Card Builder ────────────────────────────────────────── */
function buildCard(uc, delay = 0) {
  const voted = localStorage.getItem(`voted_${uc.id}`);
  const tags = (uc.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
  const d = document.createElement('div');
  d.className = 'uc-card';
  d.style.animationDelay = `${delay * 0.05}s`;
  d.innerHTML = `
    <div class="card-top">
      <div class="card-title">${esc(uc.title)}</div>
      <span class="impact-badge impact-${uc.impact}">${uc.impact}</span>
    </div>
    <p class="card-desc">${esc(uc.description)}</p>
    <div class="card-meta">
      <span class="meta-pill"><span class="dot"></span>${esc(uc.team)}</span>
      <span class="meta-pill">🤖 ${esc(uc.ai_tool)}</span>
      <span class="meta-pill">📂 ${esc(uc.category)}</span>
    </div>
    ${tags ? `<div class="card-tags">${tags}</div>` : ''}
    <div class="card-footer">
      <span class="card-date">By ${esc(uc.submitted_by)} · ${uc.date}</span>
      <button class="upvote-btn ${voted ? 'voted' : ''}" id="upvote-${uc.id}" onclick="upvote('${uc.id}', this)">
        ▲ <span id="count-${uc.id}">${uc.upvotes || 0}</span>
      </button>
    </div>`;
  return d;
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

/* ── Dashboard ───────────────────────────────────────────── */
async function loadDashboard() {
  await loadFilters();
  await fetchAndRenderDashboard();
}

async function loadFilters() {
  const f = await api('/api/filters');
  const teamSel = document.getElementById('filter-team');
  const toolSel = document.getElementById('filter-tool');
  // Reset to first option only
  teamSel.innerHTML = '<option value="">All Teams</option>';
  toolSel.innerHTML = '<option value="">All Tools</option>';
  f.teams.forEach(t => teamSel.appendChild(new Option(t, t)));
  f.ai_tools.forEach(t => toolSel.appendChild(new Option(t, t)));
  teamSel.onchange = fetchAndRenderDashboard;
  toolSel.onchange = fetchAndRenderDashboard;
  document.getElementById('filter-impact').onchange = fetchAndRenderDashboard;
}

async function fetchAndRenderDashboard() {
  const grid = document.getElementById('dashboard-grid');
  const countEl = document.getElementById('dashboard-count');
  grid.innerHTML = '<div class="loader">Loading use cases…</div>';

  const team   = document.getElementById('filter-team').value;
  const tool   = document.getElementById('filter-tool').value;
  const impact = document.getElementById('filter-impact').value;

  const params = new URLSearchParams();
  if (team)   params.set('team', team);
  if (tool)   params.set('ai_tool', tool);
  if (impact) params.set('impact', impact);

  const data = await api(`/api/use-cases?${params}`);
  grid.innerHTML = '';
  countEl.textContent = `Showing ${data.total} use case${data.total !== 1 ? 's' : ''}`;

  if (!data.total) {
    grid.innerHTML = '<div class="empty-state"><h3>No results</h3><p>Try adjusting your filters.</p></div>';
    return;
  }
  data.use_cases.forEach((uc, i) => grid.appendChild(buildCard(uc, i)));
}

function resetFilters() {
  document.getElementById('filter-team').value   = '';
  document.getElementById('filter-tool').value   = '';
  document.getElementById('filter-impact').value = '';
  fetchAndRenderDashboard();
}

/* ── Discover ─────────────────────────────────────────────── */
let searchTimer;
function debounceSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadDiscover, 280);
}

async function loadDiscover() {
  const q = document.getElementById('search-input').value.trim();
  const grid = document.getElementById('discover-grid');
  const countEl = document.getElementById('discover-count');
  grid.innerHTML = '<div class="loader">Searching…</div>';

  const params = new URLSearchParams();
  if (q) params.set('search', q);

  const data = await api(`/api/use-cases?${params}`);
  grid.innerHTML = '';
  countEl.textContent = q
    ? `${data.total} result${data.total !== 1 ? 's' : ''} for "${q}"`
    : `${data.total} use case${data.total !== 1 ? 's' : ''} available`;

  if (!data.total) {
    grid.innerHTML = '<div class="empty-state"><h3>Nothing found</h3><p>Try a different keyword.</p></div>';
    return;
  }
  data.use_cases.forEach((uc, i) => grid.appendChild(buildCard(uc, i)));
}

/* ── Metrics ─────────────────────────────────────────────── */
async function loadMetrics() {
  const m = await api('/api/metrics');

  // Stat cards
  const statRow = document.getElementById('stat-cards');
  statRow.innerHTML = '';
  [
    { label: 'Total Use Cases', value: m.total_use_cases, sub: 'submitted across org' },
    { label: 'Teams Using AI',  value: m.total_teams,      sub: 'active teams' },
    { label: 'Unique AI Tools', value: m.top_tools.length, sub: 'tools in use' },
    { label: 'High Impact',     value: m.impact_distribution.High, sub: 'high-impact cases' },
  ].forEach((s, i) => {
    const c = document.createElement('div');
    c.className = 'stat-card';
    c.style.animationDelay = `${i * 0.07}s`;
    c.innerHTML = `<div class="stat-label">${s.label}</div><div class="stat-value">${s.value}</div><div class="stat-sub">${s.sub}</div>`;
    statRow.appendChild(c);
  });

  // Tools chart
  const maxCount = Math.max(...m.top_tools.map(t => t.count), 1);
  document.getElementById('tools-chart').innerHTML = m.top_tools.map(t => `
    <div class="bar-item">
      <div class="bar-label"><span>${esc(t.tool)}</span><span>${t.count}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(t.count/maxCount*100)}%"></div></div>
    </div>`).join('');

  // Impact chart
  const impMap = [
    { label: 'High',   val: m.impact_distribution.High,   cls: 'green' },
    { label: 'Medium', val: m.impact_distribution.Medium, cls: 'amber' },
    { label: 'Low',    val: m.impact_distribution.Low,    cls: 'coral' },
  ];
  const maxI = Math.max(...impMap.map(x => x.val), 1);
  document.getElementById('impact-chart').innerHTML = impMap.map(x => `
    <div class="bar-item">
      <div class="bar-label"><span>${x.label}</span><span>${x.val}</span></div>
      <div class="bar-track"><div class="bar-fill ${x.cls}" style="width:${Math.round(x.val/maxI*100)}%"></div></div>
    </div>`).join('');

  // Top cases
  const ranks = ['r1','r2','r3','',''];
  document.getElementById('top-cases-list').innerHTML = m.top_cases.map((c, i) => `
    <div class="top-case-row">
      <div class="top-rank ${ranks[i] || ''}">#${i+1}</div>
      <div class="top-info">
        <div class="top-title">${esc(c.title)}</div>
        <div class="top-team">${esc(c.team)} · ${esc(c.ai_tool)}</div>
      </div>
      <span class="top-votes">▲ ${c.upvotes}</span>
    </div>`).join('') || '<p style="color:var(--muted);font-size:13px;">No data yet.</p>';

  // Teams
  document.getElementById('teams-list').innerHTML = m.teams.map(t =>
    `<span class="team-chip"><span class="team-dot"></span>${esc(t)}</span>`).join('');
}

/* ── Upvote ──────────────────────────────────────────────── */
async function upvote(id, btn) {
  if (localStorage.getItem(`voted_${id}`)) { showToast('Already upvoted!'); return; }
  const data = await post(`/api/use-cases/${id}/upvote`, {});
  document.querySelectorAll(`#count-${id}`).forEach(el => el.textContent = data.upvotes);
  document.querySelectorAll(`#upvote-${id}`).forEach(el => el.classList.add('voted'));
  localStorage.setItem(`voted_${id}`, '1');
  showToast('Thanks for the upvote!');
}

/* ── Submit Form ─────────────────────────────────────────── */
async function handleSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Publishing…';

  const tags = document.getElementById('f-tags').value
    .split(',').map(t => t.trim()).filter(Boolean);

  const payload = {
    title:        document.getElementById('f-title').value,
    description:  document.getElementById('f-desc').value,
    team:         document.getElementById('f-team').value,
    ai_tool:      document.getElementById('f-tool').value,
    impact:       document.getElementById('f-impact').value,
    category:     document.getElementById('f-category').value,
    submitted_by: document.getElementById('f-name').value,
    tags,
  };

  try {
    await post('/api/use-cases', payload);
    document.getElementById('submit-form').classList.add('hidden');
    document.getElementById('form-success').classList.remove('hidden');
    showToast('Use case published!');
  } catch {
    showToast('Something went wrong. Please try again.');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Publish Use Case';
  }
}

/* ── Init ─────────────────────────────────────────────────── */
loadDashboard();
