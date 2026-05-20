/**
 * Single source of truth for the default KOBIL environment host. The agent
 * defaults every URL to this so the developer only needs to type the tenant.
 *
 * Override via NEXT_PUBLIC_KOBIL_ENV_HOST in the deployment env if you want
 * the demo to point at a different cluster.
 */
export const DEFAULT_ENV_HOST =
  process.env.NEXT_PUBLIC_KOBIL_ENV_HOST ?? "gondor-pt-cityappdev-pgbuy.gondor.dev.kobil.com";

export const DEFAULT_SMARTDASHBOARD_BASE_URL = `https://smartdashboard.${DEFAULT_ENV_HOST}`;

/** Derive the well-known URL from env host + tenant. The tenant is URL-encoded
 *  unless it's a literal placeholder like `{tenant}` (for display use). */
export function defaultWellKnownUrl(tenant: string, envHost: string = DEFAULT_ENV_HOST): string {
  const looksLikePlaceholder = /^\{.+\}$/.test(tenant);
  const encoded = looksLikePlaceholder ? tenant : encodeURIComponent(tenant);
  return `https://idp.${envHost}/auth/realms/${encoded}/.well-known/openid-configuration`;
}

/** Per-product host prefixes. */
export const PRODUCT_PREFIXES = {
  idp: "idp",
  mercury: "mercury",
  pay: "pay",
  asts: "asts",
} as const;
