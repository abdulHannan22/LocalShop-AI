# LocalShop AI - Installation and Deployment

This guide covers local development and deployment of the Vinext application
with Neon Postgres. The supported production shape is a Node.js process behind
HTTPS; the included `worker/` entrypoint is retained for compatible hosted
runtimes but is not a Cloudflare D1 deployment.

## Prerequisites

- Node.js 22.13 or newer (Node 22 LTS recommended)
- npm
- A Neon Postgres database (a pooled URL works for the app)
- A current Chrome, Edge or Firefox browser
- Optional: Gemini API key, Razorpay **test-mode** credentials

Check versions:

```powershell
node --version
npm --version
```

## Windows PowerShell installation

From the extracted project folder:

```powershell
cd D:\Projects\LocalShop-AI
npm ci
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL. Set DIRECT_DATABASE_URL if your provider
# supplies a separate direct connection string for migrations.
npm run db:migrate
npm run dev:portable
```

Open the URL printed by Vite. It is normally `http://localhost:3000`.

## macOS/Linux installation

```bash
npm ci
cp .env.example .env
# Edit .env and set DATABASE_URL. Set DIRECT_DATABASE_URL if needed for migrations.
npm run db:migrate
npm run dev:portable
```

Use `npm install` instead of `npm ci` when you intentionally need to refresh
the lockfile. Open the URL printed by Vite; it is normally
`http://localhost:3000`.

## First-use workflow

1. Open `/` and create or sign in to a merchant owner account.
2. Open `/store/<slug>` to use the customer experience. Replace `<slug>` with
   the store slug created during signup.
3. Open `/admin` with an address listed in `PLATFORM_ADMIN_EMAILS` to create
   another merchant and invite its owner.
4. Return to the merchant workspace and use **Staff** to invite a manager,
   admin or sales agent.
5. Test customer password or OTP sign-in from the storefront. OTP codes are
   returned in the API response only when email delivery is not configured.

## Environment configuration

The safe default `.env` works without external services once `DATABASE_URL` is set:

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.7-flash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
PLATFORM_ADMIN_EMAILS=
CUSTOMER_SESSION_SECRET=
MERCHANT_SESSION_SECRET=
DEV_AUTOLOGIN=false
DEV_USER_EMAIL=owner@nova.local
DEV_USER_NAME=Nova Store Owner
```

### Identity and sessions

Merchant users sign in with the database-backed email/password flow. Customers
can register with a password or request a one-time code. Set
`CUSTOMER_SESSION_SECRET` and `MERCHANT_SESSION_SECRET` to long random values
in every deployed environment; blank values use development fallbacks and are
not suitable for production.

The `DEV_*` settings are local-development conveniences only. Do not use
`DEV_AUTOLOGIN=true` in production. Hosted ChatGPT deployments may also provide
verified `oai-authenticated-user-*` headers for the platform identity path; do
not manufacture these headers at an application or browser boundary.

### Gemini

Add `GEMINI_API_KEY` to enable structured model extraction. If the request
fails or output is invalid, deterministic extraction keeps the shopping flow
working.

### Razorpay test mode

Add all three Razorpay values from a test-mode account. The application creates
Payment Links through the backend; credentials never enter browser code.

Set the webhook endpoint on a public deployment to:

```text
https://YOUR_DOMAIN/api/webhooks/razorpay
```

Keep test and live credentials separate. The supplied implementation and UI are
designed for buildathon/test use.

## Verify before deployment

```powershell
npm run typecheck
npm run build:portable
npm run check
npm test
```

`npm test` rebuilds the app and runs the production rendered-output checks.

Recommended manual smoke test:

1. Customer search returns products from the selected store only.
2. Checkout fails until confirmation is explicit.
3. The selected product is revalidated for stock.
4. The resulting order appears in the correct merchant's Orders page.
5. Owner/admin can invite staff; non-authorized roles cannot open Staff.
6. Platform admin can create and suspend a merchant.
7. A suspended merchant's store slug no longer resolves.
8. Audit view shows recommendation and operational changes.

## Deploy to Neon + Node hosting

1. Provision a Neon Postgres database. Use its pooled connection for
   `DATABASE_URL`; use a direct connection for `DIRECT_DATABASE_URL` when Neon
   supplies one.
2. Configure the required production variables in the hosting secret store:
   `DATABASE_URL`, `CUSTOMER_SESSION_SECRET`, `MERCHANT_SESSION_SECRET`, and
   `PLATFORM_ADMIN_EMAILS`. Add `RESEND_API_KEY` and
   `TRANSACTIONAL_EMAIL_FROM` if customer OTP and staff email delivery are
   required.
3. Install the locked dependencies with `npm ci`.
4. Apply migrations before starting the new release:
   `npm run db:migrate`.
5. Build with `npm run build:portable`.
6. Start the application with `npm run start` and route the public HTTPS domain
   to that process. The host must provide `PORT` when it assigns a dynamic
   port; Vinext reads the hosting runtime's port configuration.
7. Configure Gemini and Razorpay only after the base app is healthy. For
   Razorpay, use test credentials until live approval, and set the webhook URL
   to `https://YOUR_DOMAIN/api/webhooks/razorpay`.
8. Run the smoke-test checklist below, then configure backups, logs, alerts,
   WAF/rate limiting, and a custom domain.

Never commit `.env`, database URLs, session secrets, email keys, or live
Razorpay credentials. Run migrations as a release step with a database identity
that can migrate; the application runtime only needs the permissions required
by the app.

### Deployment smoke test

After each deployment:

1. Open `/` and verify merchant sign-up/sign-in and sign-out.
2. Open an active `/store/<slug>` URL and verify catalogue loading.
3. Register a customer and verify that a password sign-in works. If Resend is
   configured, request and consume an OTP as well.
4. Submit a recommendation and confirm that checkout is blocked until the
   explicit confirmation step.
5. With Razorpay test credentials, create one test link and deliver one signed
   webhook. Without credentials, confirm the UI labels the simulation clearly.
6. Check `/admin`, staff permissions, orders and audit events with authorized
   accounts only.

## Troubleshooting

### Missing DATABASE_URL

Copy `.env.example` to `.env` and set `DATABASE_URL` to your Neon connection
string, then run `npm run db:migrate` before starting the dev server.

### Port already in use

Use the alternative URL printed by Vite, or start on a chosen port:

```powershell
npm run dev:portable -- --port 4173
```

### Razorpay remains in simulation mode

Confirm all required keys are in `.env`, use `rzp_test_...` credentials, and
restart the development server after changing environment values.

### Invited user has no merchant access

The signed-in email must exactly match the invitation email. Confirm the
membership is active and that the account completed its password setup. For a
local-only identity test, verify `DEV_USER_EMAIL` and restart the development
server; do not carry that setting into production.

### Production session failures

Confirm both session secrets are present and unchanged across instances. A
secret change invalidates existing sessions. Also confirm the deployment uses
HTTPS, because production session cookies include the `Secure` attribute.

### Migration or build failures

Run `npm run db:generate` if the Prisma client is missing, then retry the build.
For migration errors, verify that `DIRECT_DATABASE_URL` is reachable from the
CI/CD runner and that the migration identity can modify the schema. Do not
delete migration files or reset a shared production database.
