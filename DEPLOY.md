# Deploy Roomly on cPanel (Git only)

Your live site runs the **built** files in `dist/`. That folder is now committed to GitHub — a normal **git pull** is enough if you point your domain at it.

---

## "The system cannot deploy" error

cPanel requires **both**:

1. A valid `.cpanel.yml` in the repo root (included in this project)
2. A **clean working tree** on the server (no modified tracked files)

### Fix uncommitted changes (most common blocker)

1. **cPanel → Terminal**
2. Go to your repo folder (same path as Git Version Control):
   ```bash
   cd ~/roomly
   bash deploy/fix-git-state.sh
   ```
   Or manually:
   ```bash
   cd ~/roomly
   git fetch origin main
   git reset --hard origin/main
   ```
3. **Do not edit files** in File Manager inside the git repo after this
4. Go back to **Git Version Control → Manage → Deploy HEAD Commit**

`config.php` is untracked and safe — it will not be deleted.

### Set deployment path (required once)

1. **Git Version Control → Manage → Pull or Deploy**
2. Under **Deploy your repository**, enter:
   ```
   /home/YOURUSER/public_html
   ```
3. Click **Update** / **Save**
4. **Update from Remote**, then **Deploy HEAD Commit**

### If deploy still fails

Use **Method A** (point document root to `.../roomly/dist`) — no Deploy button needed.

---

## Method A — No Deploy button needed (recommended if Deploy is greyed out)

Use this when **Deploy HEAD Commit** is not clickable. Many Namecheap/cPanel plans work this way.

### One-time setup

1. **Git Version Control** → note your **Repository Path**, e.g.:
   ```
   /home/youruser/roomly
   ```
   (or `/home/youruser/repositories/roomly`)

2. **Update from Remote** — pull latest code (must include the `dist/` folder).

3. **cPanel → Domains** (or **Addon Domains** / **Subdomains**)
   - Edit your domain
   - Change **Document Root** to:
     ```
     /home/youruser/roomly/dist
     ```
     (your real clone path + `/dist`)
   - Save

4. **API config** (first time):
   - File Manager → open `roomly/dist/api/`
   - Copy `config.example.php` → `config.php`
   - Edit `config.php` with your MySQL credentials from cPanel

5. **Database** (first time): phpMyAdmin → import `roomly/dist/api/database.sql`

### Every update after `git push`

1. **Git Version Control → Manage**
2. **Update from Remote** only
3. Hard refresh browser: `Ctrl+Shift+R` / `Cmd+Shift+R`

No Deploy button required — the domain serves `dist/` directly from the git folder.

---

## Method B — Deploy HEAD Commit (if your host supports it)

The button stays **greyed out** until ALL of these are true:

1. You have **pulled** the latest commit (needs `.cpanel.yml` in the repo root)
2. A **Deployment Path** is saved on the repository
3. Your hosting plan allows Git deployment (not all shared plans do)

### Enable the Deploy button

1. **Git Version Control → Manage** your repo
2. Open the **Pull or Deploy** tab (or **Deployment** section)
3. Find **Deploy your repository** / **Deployment Path**
4. Enter your live folder, e.g.:
   ```
   /home/youruser/public_html
   ```
5. Click **Update** or **Save**
6. **Update from Remote** (pull latest)
7. **Deploy HEAD Commit** should now be clickable

### Every update

1. **Update from Remote**
2. **Deploy HEAD Commit**
3. Hard refresh browser

Deploy copies `dist/` → your deployment path and keeps `api/config.php` if it already exists.

---

## Why your changes were not showing before

| What you had | Problem |
|--------------|---------|
| Git pull only | Repo had source code (`src/`) but not the built site |
| Old `public_html` | Domain still pointed at old files, not the git repo |
| No deploy / wrong root | `dist/` never became what the browser loads |

---

## Verify it worked

- Sidebar says **All Bills** (not "Bill Details")
- Settings → Parking has **Share Space**
- No "Navigated to Roommates" toast on menu clicks

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Deploy button greyed out | Use **Method A** (point document root to `.../roomly/dist`) |
| Deploy button still greyed out after path set | Your plan may not support deploy — use **Method A** |
| `dist/` folder missing after pull | Wait 2 min for GitHub Action, pull again |
| Login / API errors | Create or fix `dist/api/config.php` with DB credentials |
| Old site still shows | Wrong document root; hard refresh; try incognito |
| 404 on page refresh | Ensure `dist/.htaccess` exists (SPA routing) |

---

## Your repository paths (fill in)

Replace these with your real cPanel values:

| Setting | Your value |
|---------|------------|
| Git clone path | `/home/________/roomly` |
| Document root (Method A) | `/home/________/roomly/dist` |
| Deployment path (Method B) | `/home/________/public_html` |
