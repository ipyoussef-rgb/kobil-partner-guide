# KOBIL Partner Developer Guide

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fipyoussef-rgb%2Fkobil-partner-guide&project-name=kobil-partner-guide&repository-name=kobil-partner-guide)

An interactive partner-developer guide for building on the **KOBIL SuperApp** platform. Walks
a new integrator from zero to a working API call against KOBIL **Identity**, **Chat**, **Pay**,
**Signature**, and **TMS** in three steps.

- **Step 1** — Create a service in SmartDashboard and get back `client_id`, `client_secret`,
  and the well-known OpenID configuration. Mirrors the flow in `create_miniapps.py`.
- **Step 2** — Exchange `client_id` / `client_secret` for an access token via the service-account
  (`client_credentials`) flow. The form proxies through a Next.js route handler so it works
  cross-origin.
- **Step 3** — Send real requests to the KOBIL APIs from your browser with pre-built samples
  for each product.

## Stack

- Next.js 16 (App Router) + Turbopack
- React 19
- Tailwind CSS v4

## Local development

```bash
cp .env.example .env.local   # then fill in real values
npm install
npm run dev
```

Open <http://localhost:3000>.

## Environment variables

Step 1 logs into SmartDashboard via Keycloak on the server. Two env vars are required:

| Variable                  | Used in                                         |
| ------------------------- | ----------------------------------------------- |
| `SMARTDASHBOARD_USERNAME` | `lib/smartdashboard.ts` — Keycloak login submit |
| `SMARTDASHBOARD_PASSWORD` | `lib/smartdashboard.ts` — Keycloak login submit |

- **Locally**, put them in `.env.local` (gitignored).
- **On Vercel**, add them in **Project Settings → Environment Variables**. Without them, the
  create-service form returns a 500 with a clear error.

Credentials are never sent to the browser — they only exist on the server route.

## Deploy

This site deploys to Vercel with zero config:

1. Push to GitHub (already done).
2. Import the repo at <https://vercel.com/new> (or click the **Deploy with Vercel** badge above).
3. In the import dialog, add the two env vars from the table above.
4. Hit Deploy.

## Source of truth

The wording and API shapes are drawn from KOBIL&rsquo;s official documentation:

- <https://documentation.cloud.kobil.com/>
- <https://documentation.cloud.kobil.com/api/>
- <https://documentation.cloud.kobil.com/guides/category/core-integrations/>

This is an **unofficial** guide intended for partner-developer onboarding. Always cross-check
endpoints, request bodies, and field names against the official API reference for your tenant.
