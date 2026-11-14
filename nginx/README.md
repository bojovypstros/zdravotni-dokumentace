# Nginx config (templates only)

The server owner manages the live nginx service and SSL certificates.

- Place editable nginx config snippets for `health.combatostrich.dev` in this folder.
- Do **not** enable configs from here automatically; copy/link into the system nginx layout only when ready.
- Any `*.example.conf` files below are templates only — not live.
- Agents never modify live nginx or SSL; templates only.
- Target shape: **HTTPS reverse proxy → Next.js** (not static `root` / `index.html`).

Known hostname: `health.combatostrich.dev`
