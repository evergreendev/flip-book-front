This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Password recovery deployment

Recovery uses the existing server-only `BACKEND_URL` and anonymous JSON POSTs to
`/auth/forgot-password` and `/auth/reset-password`. Configure the backend's
`PASSWORD_RESET_URL` as `https://<frontend-host>/reset-password`; emails must append
`?token=<64 lowercase hex characters>`. No token validation request is made.

Both `/forgot-password` and `/reset-password` are native public Next.js routes.
Serve them through the Next.js server (`npm run build` then `npm start`, or
`npm run window-build` on Windows) so an email link works as a direct request.
They bypass analytics session middleware. The reset route sends `Referrer-Policy:
no-referrer`, disables caching, and strips its query in the document head before
hydration. Next.js development request logging excludes this route.

**Hosting requirement:** the initial email URL reaches your host before browser
JavaScript can remove the token. Configure the CDN, load balancer, reverse proxy,
APM and hosting access logs to omit query strings for `/reset-password`, and
exclude this route from any subsequently added page analytics/session replay.
Do not record recovery POST bodies or Next.js request headers. These external
services are not configured in this repository. For an nginx host, a pathname-only
access log can replace any existing query-bearing log:

```nginx
# http context: $uri excludes query strings; do not use $request or $request_uri.
log_format pathname_only '$remote_addr $request_method $uri $status';
# server context: replace (rather than add to) existing access_log directives.
access_log /var/log/nginx/access.log pathname_only;
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Run focused tests with `node --test tests/password-recovery.test.cjs`. Browser
coverage uses an isolated contract mock backend and Chromium: install Playwright
in your test environment, set `PLAYWRIGHT_MODULE` to its `playwright` or
`playwright-core` module path, and run
`node --test tests/password-recovery.browser.cjs` (port 3123 must be free).
Set `RECOVERY_TEST_PRODUCTION=1` to exercise `next start` after building.
This checks direct email navigation, token removal, anonymous email submission,
password rules, pending controls, expired/reused links, rate-limit cooldown,
server/network errors, cookie clearing, success notice, and old/new sign-in.
Live backend verification still requires a delivered email and a test account;
the mock cannot establish actual delivery, token expiry, or backend password changes.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
