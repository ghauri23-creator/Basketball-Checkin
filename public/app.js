const dateBadge = document.getElementById('dateBadge');
const notInGrid = document.getElementById('notInGrid');
const checkinList = document.getElementById('checkinList');
const notInCount = document.getElementById('notInCount');
const inCount = document.getElementById('inCount');
const rosterList = document.getElementById('rosterList');

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fmtDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

async function loadState() {
  const state = await api('/api/state');
  dateBadge.textContent = fmtDate(state.date);

  const checkedInIds = new Set(state.checkins.map(c => c.playerId));
  const notIn = state.players.filter(p => !checkedInIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  const timesById = Object.fromEntries(state.checkins.map(c => [c.playerId, c.time]));
  const inList = state.players
    .filter(p => checkedInIds.has(p.id))
    .sort((a, b) => timesById[a.id].localeCompare(timesById[b.id]));

  notInCount.textContent = notIn.length;
  inCount.textContent = inList.length;

  notInGrid.innerHTML = '';
  if (notIn.length === 0) {
    notInGrid.innerHTML = '<div class="empty-msg">Everyone is checked in, or the roster is empty.</div>';
  }
  for (const p of notIn) {
    const btn = document.createElement('button');
    btn.className = 'player-btn';
    btn.textContent = p.name;
    btn.addEventListener('click', () => checkIn(p.id));
    notInGrid.appendChild(btn);
  }

  checkinList.innerHTML = '';
  for (const p of inList) {
    const li = document.createElement('li');
    li.className = 'checkin-item';
    li.innerHTML = `
      <span class="name">${escapeHtml(p.name)}</span>
      <span class="time">${fmtTime(timesById[p.id])}</span>
      <button class="undo-btn" data-id="${p.id}">undo</button>
    `;
    li.querySelector('.undo-btn').addEventListener('click', () => undoCheckIn(p.id));
    checkinList.appendChild(li);
  }

  await refreshRosterList(state.players);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function checkIn(playerId) {
  await api(`/api/checkin/${playerId}`, { method: 'POST' });
  loadState();
}

async function undoCheckIn(playerId) {
  await api(`/api/checkin/${playerId}`, { method: 'DELETE' });
  loadState();
}

async function refreshRosterList(players) {
  rosterList.innerHTML = '';
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
  for (const p of sorted) {
    const li = document.createElement('li');
    li.className = 'roster-item';
    li.innerHTML = `<span>${escapeHtml(p.name)}</span><button class="remove-btn" data-id="${p.id}">Remove</button>`;
    li.querySelector('.remove-btn').addEventListener('click', async () => {
      if (confirm(`Remove ${p.name} from the roster?`)) {
        await api(`/api/players/${p.id}`, { method: 'DELETE' });
        loadState();
      }
    });
    rosterList.appendChild(li);
  }
}

// --- Modals ---
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.getElementById('manageBtn').addEventListener('click', () => openModal('manageModal'));
document.getElementById('historyBtn').addEventListener('click', () => {
  openModal('historyModal');
  loadHistorySessions();
});
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) backdrop.classList.remove('open');
  });
});

// --- Add player ---
document.getElementById('addPlayerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const input = document.getElementById('newPlayerName');
  const name = input.value.trim();
  if (!name) return;
  await api('/api/players', { method: 'POST', body: JSON.stringify({ name }) });
  input.value = '';
  loadState();
});

document.getElementById('bulkAddBtn').addEventListener('click', async () => {
  const textarea = document.getElementById('bulkNames');
  const names = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (names.length === 0) return;
  await api('/api/players/bulk', { method: 'POST', body: JSON.stringify({ names }) });
  textarea.value = '';
  loadState();
});

// --- History ---
async function loadHistorySessions() {
  const sessions = await api('/api/sessions');
  const container = document.getElementById('historySessions');
  container.innerHTML = '';
  if (sessions.length === 0) {
    container.innerHTML = '<p class="muted">No history yet.</p>';
    return;
  }
  for (const s of sessions) {
    const btn = document.createElement('button');
    btn.className = 'history-date-btn';
    btn.textContent = `${s.date} (${s.count})`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.history-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadHistoryDetail(s.date);
    });
    container.appendChild(btn);
  }
}

async function loadHistoryDetail(date) {
  const detail = await api(`/api/sessions/${date}`);
  const container = document.getElementById('historyDetail');
  if (detail.checkins.length === 0) {
    container.innerHTML = '<p class="muted">No check-ins recorded for this date.</p>';
    return;
  }
  const items = detail.checkins
    .map(c => `<li><span>${escapeHtml(c.name)}</span><span>${fmtTime(c.time)}</span></li>`)
    .join('');
  container.innerHTML = `<ul>${items}</ul>`;
}

// --- Auto-refresh so a shared/tablet view stays current ---
setInterval(loadState, 15000);

loadState();
