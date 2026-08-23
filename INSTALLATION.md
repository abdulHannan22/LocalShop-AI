# LocalShop AI — Installation and Deployment

## Prerequisites

- Node.js 22.13 or newer (Node 22 LTS recommended)
- npm
- A current Chrome, Edge or Firefox browser
- Optional: Gemini API key, Razorpay **test-mode** credentials and Cloudflare
  account for hosted D1/Workers deployment

Check versions:

```powershell
node --version
npm --version
```

## Windows PowerShell installation

From the extracted project folder:

```powershell
cd D:\Projects\LocalShop-AI
npm install
Copy-Item .env.example .env
New-Item -ItemType Directory -Force .openai
Copy-Item hosting.local.example.json .openai\hosting.json
npm run dev:portable
```

The final two setup commands fix the earlier
`Could not resolve './.openai/hosting.json'` problem and enable a local D1
binding named `DB`. The Vite configuration is also defensive: it can start when
the file is absent, but database-backed multi-user behavior requires the local
binding file.

Open the URL printed by Vite. It is normally `http://localhost:3000`; if that
port is occupied Vite prints another port.

## macOS/Linux installation

```bash
npm install
cp .env.example .env
mkdir -p .openai
cp hosting.local.example.json .openai/hosting.json
npm run dev:portable
```

## First-use workflow

1. Open `/`. The local identity from `.env` bootstraps Nova Store owner access.
2. Open `/store/nova-store` to use the customer experience.
3. Open `/admin` to create another merchant and invite its owner.
4. Return to the merchant workspace and use **Staff** to invite a manager,
   admin or sales agent.
5. To test another identity locally, change `DEV_USER_EMAIL` to the exact
   invited email and restart the development server.

Local D1 state is under the ignored `.wrangler` directory and survives normal
development-server restarts.

## Environment configuration

The safe default `.env` works without external services:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.7-flash
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
PLATFORM_ADMIN_EMAILS=
DEV_USER_EMAIL=owner@nova.local
DEV_USER_NAME=Nova Store Owner
```

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
```

Recommended manual smoke test:

1. Customer search returns products from the selected store only.
2. Checkout fails until confirmation is explicit.
3. The selected product is revalidated for stock.
4. The resulting order appears in the correct merchant's Orders page.
5. Owner/admin can invite staff; non-authorized roles cannot open Staff.
6. Platform admin can create and suspend a merchant.
7. A suspended merchant's store slug no longer resolves.
8. Audit view shows recommendation and operational changes.

## Deploy to a Workers/D1 environment

1. Provision a D1 database and bind it to the Worker as `DB`.
2. Apply every SQL file under `drizzle/` in numeric order through your release
   pipeline. Runtime initialization supports a fresh database, but migrations
   are the production source of truth.
3. Configure environment secrets in the hosting dashboard—never in Git.
4. Configure the verified identity boundary used by protected routes.
5. Run the verification commands above and deploy the Worker build.
6. Configure Razorpay test webhook URL/secret and send a test event.
7. Add rate limits, WAF/bot rules, logs, alerts, backups and a custom domain.

Account-specific `.openai/hosting.json`, `.env`, `.wrangler`, `node_modules` and
build output are intentionally excluded from the downloadable ZIP.

## Troubleshooting

### Missing `.openai/hosting.json`

The source now starts without it. For persistent local D1, run:

```powershell
New-Item -ItemType Directory -Force .openai
Copy-Item hosting.local.example.json .openai\hosting.json
```

### Port already in use

Use the alternative URL printed by Vite, or start on a chosen port:

```powershell
npm run dev:portable -- --port 4173
```

### Dependency installation looks corrupted

Close the dev server, remove only this project's `node_modules`, then run
`npm install` again. Do not use `npm audit fix --force` as a general setup step.

### Razorpay remains in simulation mode

Confirm all required keys are in `.env`, use `rzp_test_...` credentials, and
restart the development server after changing environment values.

### Invited user has no merchant access

The verified/local email must exactly match the invitation email. Confirm the
membership is not suspended and restart local development after changing
`DEV_USER_EMAIL`.
