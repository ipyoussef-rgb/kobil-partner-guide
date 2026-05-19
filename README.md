# KOBIL Partner Developer Guide

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
npm install
npm run dev
```

Open <http://localhost:3000>.

## Deploy

This site deploys to Vercel with zero config. Either:

- Push to GitHub, then import the repo at <https://vercel.com/new>, **or**
- Run `vercel deploy` from this directory with the [Vercel CLI](https://vercel.com/docs/cli).

## Source of truth

The wording and API shapes are drawn from KOBIL&rsquo;s official documentation:

- <https://documentation.cloud.kobil.com/>
- <https://documentation.cloud.kobil.com/api/>
- <https://documentation.cloud.kobil.com/guides/category/core-integrations/>

This is an **unofficial** guide intended for partner-developer onboarding. Always cross-check
endpoints, request bodies, and field names against the official API reference for your tenant.
