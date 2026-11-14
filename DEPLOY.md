# Deploy / auto-sync (combat-server)

## Path

`/var/webserver/health.combatostrich.dev` — git checkout of this repo (`main`).

Remote: `git@github.com:bojovypstros/zdravotni-dokumentace.git` (SSH).

## Pull on demand

```bash
/var/webserver/health.combatostrich.dev/scripts/pull-main.sh
```

Or:

```bash
cd /var/webserver/health.combatostrich.dev && git pull --ff-only origin main
```

## Cron (auto-sync)

User crontab on combat-server pulls `main` every **5 minutes**. Log:

`/var/webserver/health.combatostrich.dev/.pull-main.log` (gitignored).

```cron
*/5 * * * * /var/webserver/health.combatostrich.dev/scripts/pull-main.sh >> /var/webserver/health.combatostrich.dev/.pull-main.log 2>&1
```

No webhook or CI deploy is configured.

## Nginx / SSL

Owned by the server operator. See `nginx/` — reverse-proxy templates only; do not enable from this repo automatically. Agents never touch live nginx/SSL.

## Database

Production uses the **existing PostgreSQL** instance on combat-server. The server owner creates the database and role; the app connects via env (not committed). Local Docker Compose Postgres remains optional for development.

## systemd (Next.js process)

Same style as **olympiax** on this host: a **system** unit (`Type=simple`, `User` + `WorkingDirectory`, absolute `pnpm` from nvm PATH, `Restart=always`). Exec uses `pnpm exec next start` (avoids broken `pnpm start --` arg forwarding). Template:

`deploy/health.combatostrich.dev.service`

Secrets come from the deploy checkout `.env` via `EnvironmentFile` (not committed). App listens on `127.0.0.1:3000` for the nginx reverse-proxy template.

### Enable / start (server owner)

```bash
sudo cp /var/webserver/health.combatostrich.dev/deploy/health.combatostrich.dev.service \
  /etc/systemd/system/health.combatostrich.dev.service
sudo systemctl daemon-reload
sudo systemctl enable --now health.combatostrich.dev.service
sudo systemctl status health.combatostrich.dev.service --no-pager
curl -sS http://127.0.0.1:3000/api/health
```

### After code pull

```bash
cd /var/webserver/health.combatostrich.dev
git pull --ff-only origin main   # or scripts/pull-main.sh
pnpm install
pnpm exec prisma migrate deploy  # when schema changes
pnpm build
sudo systemctl restart health.combatostrich.dev.service
```

Stop any ad-hoc `pnpm start` / `next start` on port 3000 before enabling the unit.
