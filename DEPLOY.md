# Deploy Roomly on cPanel (Git only)

Your live site runs the **built** files in `dist/`, not the React source. GitHub Actions builds `dist/` automatically on every push to `main`.

## One-time setup in cPanel

1. **Git Version Control** — clone `https://github.com/tipugit/roomly.git`
2. Open **Manage** on the repository
3. Under **Deployment**, set **Deployment Path** to your live folder:
   - Main domain: `/home/YOURUSER/public_html`
   - Subdomain: `/home/YOURUSER/subdomain.folder`
4. Click **Save**

5. **Database** (first time only):
   - phpMyAdmin → import `api/database.sql`
   - If upgrading an older DB, also run `api/migrations/001_feature_enhancements.sql`

6. **API config** (first time only):
   - After first deploy, edit `public_html/api/config.php` with your MySQL credentials
   - Or copy from `config.example.php` before going live

## Update live site after every `git push`

1. cPanel → **Git Version Control** → **Manage**
2. Click **Update from Remote** (pulls latest, including built `dist/`)
3. Click **Deploy HEAD Commit** (runs `.cpanel.yml` → copies `dist/` to your live folder)

4. Hard refresh your browser: `Ctrl+Shift+R` / `Cmd+Shift+R`

## Verify deployment worked

- Sidebar shows **All Bills** (not "Bill Details")
- Settings → Parking has **Share Space** toggle
- No "Navigated to Roommates" toast when clicking menu items

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Old site still showing | Hard refresh; confirm deployment path is correct |
| API errors / login fails | Check `api/config.php` exists in live folder with correct DB credentials |
| Deploy fails: dist missing | Wait 1–2 min for GitHub Action to finish after push, then pull again |
| Deploy fails: no npm | Pull again after GitHub Action runs — dist is committed by CI |
