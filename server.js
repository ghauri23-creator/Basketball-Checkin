const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function loadDB() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const initial = { players: [], sessions: {} };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function todayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getOrCreateSession(db, dateKey) {
  if (!db.sessions[dateKey]) {
    db.sessions[dateKey] = { date: dateKey, checkins: [] };
  }
  return db.sessions[dateKey];
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Roster ---

app.get('/api/players', (req, res) => {
  const db = loadDB();
  res.json(db.players);
});

app.post('/api/players', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const db = loadDB();
  const player = { id: crypto.randomUUID(), name, active: true };
  db.players.push(player);
  saveDB(db);
  res.status(201).json(player);
});

app.post('/api/players/bulk', (req, res) => {
  const names = Array.isArray(req.body.names) ? req.body.names : [];
  const db = loadDB();
  const added = [];
  for (const raw of names) {
    const name = String(raw).trim();
    if (!name) continue;
    const player = { id: crypto.randomUUID(), name, active: true };
    db.players.push(player);
    added.push(player);
  }
  saveDB(db);
  res.status(201).json(added);
});

app.put('/api/players/:id', (req, res) => {
  const db = loadDB();
  const player = db.players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const name = (req.body.name || '').trim();
  if (name) player.name = name;
  saveDB(db);
  res.json(player);
});

// Soft-delete: keep the player record (so past attendance history still
// shows their name) but hide them from the active roster going forward.
app.delete('/api/players/:id', (req, res) => {
  const db = loadDB();
  const player = db.players.find(p => p.id === req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  player.active = false;
  saveDB(db);
  res.json({ ok: true });
});

// --- Check-in ---

app.get('/api/state', (req, res) => {
  const db = loadDB();
  const dateKey = req.query.date || todayKey();
  const session = db.sessions[dateKey] || { date: dateKey, checkins: [] };
  res.json({
    date: dateKey,
    players: db.players.filter(p => p.active),
    checkins: session.checkins,
  });
});

app.post('/api/checkin/:playerId', (req, res) => {
  const db = loadDB();
  const player = db.players.find(p => p.id === req.params.playerId);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  const dateKey = todayKey();
  const session = getOrCreateSession(db, dateKey);
  const already = session.checkins.find(c => c.playerId === player.id);
  if (already) return res.json(already);
  const record = { playerId: player.id, time: new Date().toISOString() };
  session.checkins.push(record);
  saveDB(db);
  res.status(201).json(record);
});

app.delete('/api/checkin/:playerId', (req, res) => {
  const db = loadDB();
  const dateKey = todayKey();
  const session = getOrCreateSession(db, dateKey);
  session.checkins = session.checkins.filter(c => c.playerId !== req.params.playerId);
  saveDB(db);
  res.json({ ok: true });
});

// --- History ---

app.get('/api/sessions', (req, res) => {
  const db = loadDB();
  const summaries = Object.values(db.sessions)
    .map(s => ({ date: s.date, count: s.checkins.length }))
    .sort((a, b) => b.date.localeCompare(a.date));
  res.json(summaries);
});

app.get('/api/sessions/:date', (req, res) => {
  const db = loadDB();
  const session = db.sessions[req.params.date] || { date: req.params.date, checkins: [] };
  const playersById = Object.fromEntries(db.players.map(p => [p.id, p.name]));
  const checkins = session.checkins
    .map(c => ({ ...c, name: playersById[c.playerId] || '(removed player)' }))
    .sort((a, b) => a.time.localeCompare(b.time));
  res.json({ date: session.date, checkins });
});

app.listen(PORT, () => {
  console.log(`Basketball check-in app running at http://localhost:${PORT}`);
});
