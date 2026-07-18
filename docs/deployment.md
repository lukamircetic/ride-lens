# Deployment

Ride Lens uses two public origins:

- Web: `https://ride-lens.lukamircetic.ca` on Cloudflare Pages
- API: `https://api.ride-lens.lukamircetic.ca` on Coolify

The hosts are different origins, so the API restricts credentialed CORS to the web origin. They are subdomains of the same HTTPS site, so Better Auth's host-only, `SameSite=Lax` session cookie can remain on the API host without enabling cross-subdomain cookies.

## Before Deploying

1. Push a revision that passes `pnpm check` and `pnpm test`.
2. Generate a production auth secret:

   ```bash
   openssl rand -base64 32
   ```

3. Keep the result in the deployment environment only. Do not commit it.
4. Find the public IPv4 address of the VPS running Coolify.

## Deployment Order

Deploy in this order so each provider can validate its hostname:

1. Add the API DNS record.
2. Deploy the API in Coolify and verify its health endpoint over HTTPS.
3. Deploy the web app in Cloudflare Pages.
4. Attach the web custom domain. Let Pages create or confirm its DNS record.
5. Run the acceptance check at the end of this guide.

## DNS

The `lukamircetic.ca` zone is managed in Cloudflare. Add the API record before configuring
the Coolify domain:

| Type | Name            | Target               | Proxy              |
| ---- | --------------- | -------------------- | ------------------ |
| `A`  | `api.ride-lens` | `<COOLIFY_VPS_IPV4>` | DNS only initially |

After Coolify has issued a valid certificate, the record can remain DNS-only or be changed to
proxied. If it is proxied, use Cloudflare SSL/TLS mode **Full (strict)**.

Do not manually create the `ride-lens` website record first. Attach
`ride-lens.lukamircetic.ca` from the Pages project's **Custom domains** screen; Cloudflare
will create and associate the correct CNAME record. Creating only a standalone CNAME without
attaching it to the Pages project can produce a `522`.

## Backend on Coolify

1. Create an application from this repository and production branch.
2. Select the Dockerfile build pack and set the Dockerfile location to `Dockerfile.server`.
3. Set **Port Exposes** to `3002`.
4. Set the domain to `https://api.ride-lens.lukamircetic.ca`. Coolify will configure its reverse proxy and TLS certificate.
5. Add a persistent Docker volume named `ride-lens-data` with destination path `/data`.
6. Add these runtime environment variables:

   ```dotenv
   NODE_ENV=production
   HOST=0.0.0.0
   PORT=3002
   RIDE_LENS_DATA_DIR=/data
   BETTER_AUTH_URL=https://api.ride-lens.lukamircetic.ca
   RIDE_LENS_WEB_ORIGIN=https://ride-lens.lukamircetic.ca
   BETTER_AUTH_SECRET=<the generated secret>
   ```

7. Keep `BETTER_AUTH_SECRET` runtime-only. It is not needed while building the image.
8. Leave Coolify health checks enabled. `Dockerfile.server` checks `/health` and Coolify uses the image health check.
9. Deploy and verify:

   ```bash
   curl -fsS https://api.ride-lens.lukamircetic.ca/health
   ```

The server applies checked-in Drizzle migrations during startup. SQLite and uploaded FIT files are stored under `/data`, so both survive deployments.

## Frontend on Cloudflare Pages

1. Create a Pages project from the same repository and production branch.
2. Use the repository root as the root directory.
3. Set the build command to:

   ```bash
   pnpm --filter web build
   ```

4. Set the build output directory to `apps/web/dist`.
5. Add these production build environment variables:

   ```dotenv
   NODE_VERSION=24
   PNPM_VERSION=10.26.1
   VITE_SERVER_URL=https://api.ride-lens.lukamircetic.ca
   VITE_MAPTILER_API_KEY=<restricted browser key>
   ```

6. Add `VITE_MAPTILER_STYLE_ID` if a non-default MapTiler style is used. Keep the Node and
   pnpm pins in place so future Pages build-image updates do not change the build toolchain.
7. Attach the custom domain `ride-lens.lukamircetic.ca` and complete the DNS instructions shown by Pages.
8. Restrict the MapTiler browser key to `https://ride-lens.lukamircetic.ca`.
9. Deploy the Pages project.

## Acceptance Check

1. Confirm `https://api.ride-lens.lukamircetic.ca/health` returns `{"status":"ok"}`.
2. Open `https://ride-lens.lukamircetic.ca` in a private browser window.
3. Create the first account and confirm the empty ride state appears.
4. Reload the page and confirm the session remains authenticated.
5. Import a FIT file and confirm it appears after another reload.
6. Sign out and confirm ride APIs return `401` without the session.
7. Sign back in and confirm the imported ride is visible.
8. Open a nested route directly (for example `/segments`) and confirm the SPA loads.
9. Check the browser console and network panel for CORS, mixed-content, or cookie errors.

## Backup and Restore

Back up both of these paths from the Coolify volume:

- `/data/ride-lens.sqlite`
- `/data/uploads/`

Use SQLite's online backup command while the application is running, or stop the application before copying the database file. Keep the database and uploads from the same backup point.

Example online database backup inside the application container:

```bash
sqlite3 /data/ride-lens.sqlite ".backup '/data/ride-lens-backup.sqlite'"
```

Copy the resulting database backup and the uploads directory to storage outside the VPS. To restore, stop the application, replace the database and uploads from the same backup, then start it and verify `/health` before signing in.

## Deferred Auth Features

Password recovery, email verification, and closed registration are intentionally deferred.
Until they are implemented, anyone who can reach the site can create an account. Each
account's data remains isolated, but a private deployment should be protected with Cloudflare
Access or another network access policy. Protect account credentials and keep database
backups. Better Auth can add reset tokens later through `sendResetPassword` once an email
provider is configured.

## Provider References

- [Cloudflare Pages monorepos](https://developers.cloudflare.com/pages/configuration/monorepos/)
- [Cloudflare Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Coolify domains and automatic HTTPS](https://coolify.io/docs/knowledge-base/domains)
- [Coolify persistent storage](https://coolify.io/docs/knowledge-base/persistent-storage)
- [Coolify environment variables](https://coolify.io/docs/knowledge-base/environment-variables)
