# ArusKas account and sync service

This is a separate Node service for the CashFlow PWA. It uses a dedicated PostgreSQL database and does not read or write BisaBaca account tables.

## Configuration

Set `DATABASE_URL`, `APP_ORIGIN` (the HTTPS CashFlow origin), `PORT` (default `3001`), and SMTP settings `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. Keep these values in the VPS environment file, never in this repository. Apply `schema.sql` once to the dedicated CashFlow database before starting the service.

The VPS reverse proxy must route `/api/account/*` to `127.0.0.1:3001` before its static-file handler. Run this service under its own non-root systemd user and service unit. PostgreSQL should remain bound to loopback and use a separate database role for this application.

## Endpoints

- `POST /api/account/signup`, `login`, `check`, `logout`, `logout-all`, `verify`, `recover`, and `reset`
- `GET /api/account/sync` and `POST /api/account/sync`

Sessions use random opaque tokens in HttpOnly, Secure, SameSite=Lax cookies; only token hashes are stored. Transaction sync uses stable transaction IDs and server-side tombstones. A removed transaction cannot be recreated by a stale offline device.

Email/password is the first login method. Google OAuth is not enabled because no Google OAuth client is configured on the VPS. This service is not deployed by local development or by the static CashFlow pull procedure. Configure the separate database, environment file, systemd unit, SMTP values, and Caddy route before enabling account UI in production.

## VPS routing

Install this service directory at `/opt/cashflow-account`, owned by a dedicated non-root `cashflow` user. Add the API handler before the static file handler in the existing `kas.bisabaca.web.id` Caddy site:

```caddyfile
handle /api/account/* {
    reverse_proxy 127.0.0.1:3001
}
```

The remaining site handler should continue serving `/home/ubuntu/CashFlow`. The systemd unit template is `cashflow-account.service`; create its dedicated OS user and `/etc/cashflow-account.env` from `env.example` with a separate PostgreSQL role/database, `APP_ORIGIN=https://kas.bisabaca.web.id`, and SMTP settings before enabling it. Do not point `DATABASE_URL` at the BisaBaca database or give this service access to BisaBaca's environment file. Run `npm ci --omit=dev` in `/opt/cashflow-account` after copying the service files there.

Create the database and apply its schema as an administrator:

```sh
sudo -u postgres createuser --pwprompt cashflow_app
sudo -u postgres createdb --owner=cashflow_app cashflow
sudo -u postgres psql -d cashflow -f /opt/cashflow-account/schema.sql
```

Install the service unit into `/etc/systemd/system`, reload systemd, then enable `cashflow-account`. Verify the local `/health` endpoint and the public `/api/account/check` route after Caddy has been reloaded. Configure a scheduled, off-host backup for the `cashflow` database before inviting users.
