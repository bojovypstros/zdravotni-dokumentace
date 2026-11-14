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
