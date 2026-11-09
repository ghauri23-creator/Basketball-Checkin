const STORAGE_KEY = 'basketballCheckinDB';

const dateBadge = document.getElementById('dateBadge');
const notInGrid = document.getElementById('notInGrid');
const checkinList = document.getElementById('checkinList');
const notInCount = document.getElementById('notInCount');
const inCount = document.getElementById('inCount');
const rosterList = document.getElementById('rosterList');
const storageWarning = document.getElementById('storageWarning');
const prevDayBtn = document.getElementById('prevDayBtn');
const nextDayBtn = document.getElementById('nextDayBtn');
const todayBtn = document.getElementById('todayBtn');
const viewDateInput = document.getElementById('viewDateInput');
const resetDayBtn = document.getElementById('resetDayBtn');

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function fmtDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function dateToKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return dateToKey(new Date());
}

function shiftDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dateToKey(dt);
}

// The date currently shown on the main screen — defaults to today, but can
// be moved to any past date to check in or correct an earlier session.
let viewDate = todayKey();

// --- Storage (all data lives in this browser's localStorage) ---

let dbCache = null;

function initialDB() {
  const names = [
    'Jenna Elmasry #3',
    'Enaya Hasan #7',
    'Suhayla Abdusshaheed #13',
    'Marium Ghauri #11',
    'Aila Malik #12',
    'Duaa Shahid #10',
    'Zehra Turan #19',
    'Zaara Ghauri #14',
    'Jena Abdullah #18',
    'Amal Memon #29',
  ];
  return {
    players: names.map(name => ({ id: uid(), name, active: true })),
    sessions: {},
  };
}

function loadDB() {
  if (dbCache) return dbCache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    dbCache = raw ? JSON.parse(raw) : initialDB();
  } catch (e) {
    console.error('Failed to read local storage, starting fresh.', e);
    dbCache = initialDB();
  }
  return dbCache;
}

function saveDB(db) {
  dbCache = db;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    storageWarning.hidden = true;
  } catch (e) {
    console.error('Failed to save to local storage.', e);
    storageWarning.hidden = false;
  }
}

function getOrCreateSession(db, dateKey) {
  if (!db.sessions[dateKey]) {
    db.sessions[dateKey] = { date: dateKey, checkins: [] };
  }
  return db.sessions[dateKey];
}

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

// --- Rendering ---

function render() {
  const db = loadDB();
  const dateKey = viewDate;
  const session = getOrCreateSession(db, dateKey);
  const isToday = dateKey === todayKey();
  dateBadge.textContent = fmtDate(dateKey);
  dateBadge.classList.toggle('past', !isToday);
  viewDateInput.value = dateKey;
  viewDateInput.max = todayKey();
  nextDayBtn.disabled = !(dateKey < todayKey());
  todayBtn.hidden = isToday;
  resetDayBtn.hidden = session.checkins.length === 0;

  const activePlayers = db.players.filter(p => p.active);
  const checkedInIds = new Set(session.checkins.map(c => c.playerId));
  const notIn = activePlayers.filter(p => !checkedInIds.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  const timesById = Object.fromEntries(session.checkins.map(c => [c.playerId, c.time]));
  const inList = activePlayers
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

  renderRosterList(activePlayers);
}

function renderRosterList(players) {
  rosterList.innerHTML = '';
  const sorted = [...players].sort((a, b) => a.name.localeCompare(b.name));
  for (const p of sorted) {
    const li = document.createElement('li');
    li.className = 'roster-item';
    li.innerHTML = `<span>${escapeHtml(p.name)}</span><button class="remove-btn" data-id="${p.id}">Remove</button>`;
    li.querySelector('.remove-btn').addEventListener('click', () => {
      if (confirm(`Remove ${p.name} from the roster?`)) {
        removePlayer(p.id);
      }
    });
    rosterList.appendChild(li);
  }
}

// --- Actions ---

function checkIn(playerId) {
  const db = loadDB();
  const session = getOrCreateSession(db, viewDate);
  if (session.checkins.some(c => c.playerId === playerId)) return;
  session.checkins.push({ playerId, time: new Date().toISOString() });
  saveDB(db);
  render();
}

function undoCheckIn(playerId) {
  const db = loadDB();
  const session = getOrCreateSession(db, viewDate);
  session.checkins = session.checkins.filter(c => c.playerId !== playerId);
  saveDB(db);
  render();
}

function addPlayer(name) {
  const db = loadDB();
  db.players.push({ id: uid(), name, active: true });
  saveDB(db);
  render();
}

function addPlayersBulk(names) {
  const db = loadDB();
  for (const name of names) {
    db.players.push({ id: uid(), name, active: true });
  }
  saveDB(db);
  render();
}

// Soft-delete: keep the player record so past attendance history still
// shows their name, but hide them from the active roster going forward.
function removePlayer(playerId) {
  const db = loadDB();
  const player = db.players.find(p => p.id === playerId);
  if (player) player.active = false;
  saveDB(db);
  render();
}

// --- Modals ---
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

prevDayBtn.addEventListener('click', () => {
  viewDate = shiftDateKey(viewDate, -1);
  render();
});
nextDayBtn.addEventListener('click', () => {
  if (nextDayBtn.disabled) return;
  viewDate = shiftDateKey(viewDate, 1);
  render();
});
todayBtn.addEventListener('click', () => {
  viewDate = todayKey();
  render();
});
viewDateInput.addEventListener('change', () => {
  if (!viewDateInput.value) return;
  viewDate = viewDateInput.value;
  render();
});
resetDayBtn.addEventListener('click', () => {
  const db = loadDB();
  const session = getOrCreateSession(db, viewDate);
  if (session.checkins.length === 0) return;
  const ok = confirm(`Reset all check-ins for ${fmtDate(viewDate)}? This clears everyone's check-in time for this day only and cannot be undone.`);
  if (!ok) return;
  session.checkins = [];
  saveDB(db);
  render();
});

document.getElementById('manageBtn').addEventListener('click', () => openModal('manageModal'));
document.getElementById('historyBtn').addEventListener('click', () => {
  openModal('historyModal');
  renderHistorySessions();
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
document.getElementById('addPlayerForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('newPlayerName');
  const name = input.value.trim();
  if (!name) return;
  addPlayer(name);
  input.value = '';
});

document.getElementById('bulkAddBtn').addEventListener('click', () => {
  const textarea = document.getElementById('bulkNames');
  const names = textarea.value.split('\n').map(s => s.trim()).filter(Boolean);
  if (names.length === 0) return;
  addPlayersBulk(names);
  textarea.value = '';
});

// --- Backup / restore (data lives only in this browser) ---
document.getElementById('exportBtn').addEventListener('click', () => {
  const db = loadDB();
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `basketball-checkin-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.players || !imported.sessions) throw new Error('Not a valid backup file');
      if (!confirm('This will replace all current roster and attendance data on this device. Continue?')) return;
      saveDB(imported);
      render();
    } catch (err) {
      alert('Could not read that file as a backup: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// --- History ---
function renderHistorySessions() {
  const db = loadDB();
  const sessions = Object.values(db.sessions)
    .map(s => ({ date: s.date, count: s.checkins.length }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const container = document.getElementById('historySessions');
  container.innerHTML = '';
  if (sessions.length === 0) {
    container.innerHTML = '<p class="muted">No history yet.</p>';
    document.getElementById('historyDetail').innerHTML = '<p class="muted">Select a date to view details.</p>';
    return;
  }
  for (const s of sessions) {
    const btn = document.createElement('button');
    btn.className = 'history-date-btn';
    btn.textContent = `${s.date} (${s.count})`;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.history-date-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHistoryDetail(s.date);
    });
    container.appendChild(btn);
  }
}

function renderHistoryDetail(date) {
  const db = loadDB();
  const session = db.sessions[date] || { checkins: [] };
  const playersById = Object.fromEntries(db.players.map(p => [p.id, p.name]));
  const checkins = [...session.checkins]
    .sort((a, b) => a.time.localeCompare(b.time));

  const container = document.getElementById('historyDetail');
  if (checkins.length === 0) {
    container.innerHTML = '<p class="muted">No check-ins recorded for this date.</p>';
    return;
  }
  const items = checkins
    .map(c => `<li><span>${escapeHtml(playersById[c.playerId] || '(removed player)')}</span><span>${fmtTime(c.time)}</span></li>`)
    .join('');
  container.innerHTML = `<ul>${items}</ul>`;
}

// --- Install as an app + offline support ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  });
}

render();
