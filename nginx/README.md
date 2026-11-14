# Nginx config (templates only)

The server owner manages the live nginx service and SSL certificates.

- Place editable nginx config snippets for `health.combatostrich.dev` in this folder.
- Do **not** enable configs from here automatically; copy/link into the system nginx layout only when ready.
- Any `*.example.conf` files below are templates only — not live.
- Agents never modify live nginx or SSL; templates only.
- Target shape: **HTTPS reverse proxy → Next.js** (not static `root` / `index.html`).

Known hostname: `health.combatostrich.dev`

## Phase 2 – cookies / proxy headers

When enabling the live reverse proxy, keep at least:

- `Host`, `X-Real-IP`, `X-Forwarded-For`, **`X-Forwarded-Proto`**

`X-Forwarded-Proto` must reflect HTTPS so session cookies get the `Secure` flag
(`HttpOnly`, `SameSite=Lax`, `Path=/`). Do not strip `Cookie` / `Set-Cookie`.
Agents do not touch live nginx — template only.
