# Basketball-Checkin

A simple attendance check-in app for a basketball team.

Add your roster, then when a player arrives just tap their name — it
records the arrival time. Past days are kept in an attendance history.

## Running it

```bash
npm install
npm start
```

Then open http://localhost:3000 in a browser (works well on a phone or
tablet left at the gym door).

## Features

- **Manage Roster** — add players one at a time or paste a whole roster
  (one name per line); remove players you no longer need.
- **Check-in** — tap a player's name to record their arrival time for
  today. Checked-in players move to the "Checked In" list with their
  arrival time; tap "undo" to correct a mistake.
- **Attendance History** — browse past dates to see who showed up and
  when.

## Data storage

Attendance and roster data are stored in `data/db.json`, created
automatically on first run. Back that file up if you want to preserve
history long-term.
