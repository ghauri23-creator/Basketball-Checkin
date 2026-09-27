# Basketball-Checkin

A simple attendance check-in app for a basketball team — add your roster,
then when a player arrives just tap their name and it records the arrival
time. Past days are kept in an attendance history.

This is a **static, client-side-only app**: there is no server and no
database. All data (roster + attendance history) is stored in the
browser's local storage on whichever device you use it on.

## Running it on an iPad (recommended setup)

1. Host these files somewhere with a stable HTTPS URL — the easiest free
   option is **GitHub Pages**:
   - In this repo on GitHub, go to **Settings → Pages**.
   - Under "Build and deployment", choose **Deploy from a branch**.
   - Pick this branch and the **/ (root)** folder, then Save.
   - GitHub gives you a URL like `https://<username>.github.io/Basketball-Checkin/`.
2. On the iPad, open that URL in **Safari**.
3. Tap the **Share** button, then **Add to Home Screen**.
4. Launch it from the home screen icon from now on — it opens full-screen
   like a real app, and after the first load it keeps working **even with
   no Wi-Fi**, since the app itself is cached on the device.

Because the data lives only in that iPad's Safari storage, use the
**Backup / restore** option under "Manage Roster" to export a JSON backup
occasionally (especially before clearing Safari's website data, or if you
ever need to move to a different iPad).

## Running it anywhere else

There's no build step — it's plain HTML/CSS/JS. You can:
- Open `index.html` directly in a browser, or
- Serve the folder with any static file server, e.g. `npx serve .`

## Files

- `index.html`, `style.css`, `app.js` — the app itself
- `manifest.json`, `service-worker.js`, `icons/` — make it installable as
  a home-screen app and work offline
