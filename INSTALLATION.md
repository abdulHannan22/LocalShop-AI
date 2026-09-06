# LocalShop AI — Installation and Deployment

## Prerequisites

- Node.js 22.13 or newer (Node 22 LTS recommended)
- npm
- A Neon Postgres database (free tier works)
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
npm install
Copy-Item .env.example .env
# Edit .env and set DATABASE_URL (and optionally DIRECT_DATABASE_URL) to your Neon connection string
npm run db:migrate
npm run dev:portable
```

Open the URL printed by Vite. It is normally `http://localhost:3000`.

## macOS/Linux installation

```bash
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL to your Neon connection string
npm run db:migrate
npm run dev:portable
```

## First-use workflow

1. Open `/`. Sign up or log in as the merchant owner.
2. Open `/store/nova-store` to use the customer experience.
3. Open `/admin` to create another merchant and invite its owner.
4. Return to the merchant workspace and use **Staff** to invite a manager,
   admin or sales agent.
5. To test another identity locally, change `DEV_USER_EMAIL` to the exact
   invited email and restart the development server.

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

## Deploy to Neon + Node hosting

1. Provision a Neon Postgres database and copy the connection string.
2. Set `DATABASE_URL` (and `DIRECT_DATABASE_URL` for migrations) in your
   hosting environment secrets.
3. Run `npm run db:migrate` in your CI/CD pipeline to apply Prisma migrations.
4. Configure all other environment secrets in the hosting dashboard—never in Git.
5. Run the verification commands above and deploy.
6. Configure Razorpay test webhook URL/secret and send a test event.
7. Add rate limits, WAF/bot rules, logs, alerts, backups and a custom domain.

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

The verified/local email must exactly match the invitation email. Confirm the
membership is not suspended and restart local development after changing
`DEV_USER_EMAIL`.
