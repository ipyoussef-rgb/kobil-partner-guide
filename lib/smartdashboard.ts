/**
 * Server-side helper that logs into SmartDashboard via Keycloak (form-post flow)
 * and exposes a session for creating MiniApp services and publishing branches.
 *
 * Credentials come from environment variables:
 *   SMARTDASHBOARD_USERNAME
 *   SMARTDASHBOARD_PASSWORD
 *
 * Never hard-code these — committing real credentials to a public repo grants
 * tenant access to anyone who clones it. Set them in `.env.local` locally and
 * in the Vercel project's Environment Variables for deploys.
 */

const DEFAULT_CATEGORY_ID = "fbc33089-93ff-4bce-ad3d-16645e9edf15";
const USER_AGENT = "Mozilla/5.0 (compatible; KOBIL-Partner-Guide/1.0)";

// --- Cookie jar (host-scoped) -------------------------------------------------

class CookieJar {
  private byHost = new Map<string, Map<string, string>>();

  ingest(setCookies: string[], host: string) {
    let bucket = this.byHost.get(host);
    if (!bucket) {
      bucket = new Map();
      this.byHost.set(host, bucket);
    }
    for (const sc of setCookies) {
      const semi = sc.indexOf(";");
      const kv = semi >= 0 ? sc.slice(0, semi) : sc;
      const eq = kv.indexOf("=");
      if (eq < 0) continue;
      const name = kv.slice(0, eq).trim();
      const value = kv.slice(eq + 1).trim();
      if (!name) continue;
      bucket.set(name, value);
    }
  }

  header(host: string): string {
    const bucket = this.byHost.get(host);
    if (!bucket || bucket.size === 0) return "";
    return [...bucket.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  hosts(): string[] {
    return [...this.byHost.keys()];
  }
}

// --- Fetch with cookie jar + manual redirect following ------------------------

type JarFetchInit = Omit<RequestInit, "redirect" | "cache">;

type JarFetchResult = {
  response: Response;
  finalUrl: string;
  text: string;
};

async function fetchWithJar(
  startUrl: string,
  init: JarFetchInit,
  jar: CookieJar,
  options: { maxRedirects?: number } = {},
): Promise<JarFetchResult> {
  const maxRedirects = options.maxRedirects ?? 10;
  let currentUrl = startUrl;
  let currentInit: RequestInit = { ...init };

  for (let i = 0; i <= maxRedirects; i++) {
    const u = new URL(currentUrl);
    const headers = new Headers(currentInit.headers);
    if (!headers.has("User-Agent")) headers.set("User-Agent", USER_AGENT);
    if (!headers.has("Accept")) {
      headers.set(
        "Accept",
        "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
      );
    }
    const cookie = jar.header(u.host);
    if (cookie) headers.set("Cookie", cookie);

    const resp = await fetch(currentUrl, {
      ...currentInit,
      headers,
      redirect: "manual",
      cache: "no-store",
    });

    const setCookies = readSetCookies(resp);
    if (setCookies.length > 0) jar.ingest(setCookies, u.host);

    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc) {
        const text = await resp.text();
        return { response: resp, finalUrl: currentUrl, text };
      }
      currentUrl = new URL(loc, currentUrl).toString();
      if (resp.status === 301 || resp.status === 302 || resp.status === 303) {
        const h = new Headers(currentInit.headers);
        h.delete("content-type");
        h.delete("content-length");
        currentInit = { method: "GET", headers: h };
      }
      // 307/308: keep method + body
      continue;
    }

    const text = await resp.text();
    return { response: resp, finalUrl: currentUrl, text };
  }
  throw new Error("Too many redirects while following SmartDashboard auth flow");
}

function readSetCookies(resp: Response): string[] {
  const headers = resp.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }
  const single = resp.headers.get("set-cookie");
  return single ? [single] : [];
}

// --- HTML login-form parser ---------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x3D;/gi, "=")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function attr(tag: string, name: string): string | null {
  const r = new RegExp(`\\b${name}=("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(r);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

type LoginForm = { action: string; fields: Record<string, string> };

function parseLoginForm(html: string, baseUrl: string): LoginForm | null {
  const formStart = html.search(/<form\b/i);
  if (formStart < 0) return null;
  const formEnd = html.toLowerCase().indexOf("</form>", formStart);
  if (formEnd < 0) return null;
  const formChunk = html.slice(formStart, formEnd);

  const openEnd = formChunk.indexOf(">");
  if (openEnd < 0) return null;
  const openTag = formChunk.slice(0, openEnd + 1);
  const inner = formChunk.slice(openEnd + 1);

  const rawAction = attr(openTag, "action");
  if (!rawAction) return null;
  const action = new URL(rawAction, baseUrl).toString();

  const fields: Record<string, string> = {};
  for (const m of inner.matchAll(/<input\b[^>]*>/gi)) {
    const tag = m[0];
    const name = attr(tag, "name");
    const value = attr(tag, "value") ?? "";
    if (name) fields[name] = value;
  }
  return { action, fields };
}

function looksLikeLoginPage(html: string): boolean {
  if (/class=["'][^"']*\bkc-form-login\b/i.test(html)) return true;
  if (/id=["'][^"']*\bkc-form-login\b/i.test(html)) return true;
  if (/action=["'][^"']*login-actions\/authenticate/i.test(html)) return true;
  // A *rendered* password input is the surest sign — SPA shells don't ship one.
  return /<input[^>]+type=["']?password\b/i.test(html);
}

// --- Service payload ----------------------------------------------------------

export type ServiceDefinition = {
  name: string;
  description?: string;
  callbackUrl: string;
  keywords?: string[];
  categoryIds?: string[];
};

export function buildServicePayload(s: ServiceDefinition) {
  const name = s.name.trim();
  const callbackUrl = s.callbackUrl.trim();
  const keywords =
    s.keywords && s.keywords.length > 0
      ? s.keywords
      : [name.toLowerCase().replace(/\s+/g, "_") || "service"];
  const categories =
    s.categoryIds && s.categoryIds.length > 0 ? s.categoryIds : [DEFAULT_CATEGORY_ID];
  return {
    title: { default: name, locales: [] },
    description: { default: s.description ?? "", locales: [] },
    type: "MiniApp",
    behaviour: "Banner",
    callbackUrl,
    consentEnabled: false,
    webFlowEnabled: false,
    launchInstructions: { readOnly: true, url: callbackUrl },
    redirectUris: [callbackUrl],
    searchable: true,
    requirements: {},
    tags: { categories, keywords },
  };
}

// --- Client -------------------------------------------------------------------

export type AuthTraceStep = {
  step: string;
  url?: string;
  status?: number;
  isLoginPage?: boolean;
  formAction?: string;
  fieldCount?: number;
  cookieHostsTracked?: string[];
  htmlPreview?: string;
  error?: string;
};

export class SmartDashboardClient {
  readonly baseUrl: string;
  readonly tenant: string;
  private readonly username: string;
  private readonly password: string;
  private readonly jar = new CookieJar();
  private readonly trace: AuthTraceStep[] = [];
  private authed = false;

  constructor(opts: { baseUrl: string; tenant: string; username?: string; password?: string }) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.tenant = opts.tenant;
    this.username = opts.username ?? process.env.SMARTDASHBOARD_USERNAME ?? "";
    this.password = opts.password ?? process.env.SMARTDASHBOARD_PASSWORD ?? "";
  }

  static fromEnv(opts: { baseUrl: string; tenant: string }) {
    return new SmartDashboardClient(opts);
  }

  hasCredentials(): boolean {
    return !!(this.username && this.password);
  }

  getTrace(): AuthTraceStep[] {
    return this.trace;
  }

  async authenticate(): Promise<void> {
    if (this.authed) return;
    if (!this.hasCredentials()) {
      throw new Error(
        "Server is missing SMARTDASHBOARD_USERNAME / SMARTDASHBOARD_PASSWORD environment variables.",
      );
    }
    const appUrl = `${this.baseUrl}/dashboard/${this.tenant}/app-builder`;
    const initial = await fetchWithJar(appUrl, { method: "GET" }, this.jar);
    const initialIsLogin = looksLikeLoginPage(initial.text);
    this.trace.push({
      step: "initial-get",
      url: initial.finalUrl,
      status: initial.response.status,
      isLoginPage: initialIsLogin,
      htmlPreview: initial.text.slice(0, 300),
    });

    if (!initialIsLogin) {
      this.authed = true;
      return;
    }

    const form = parseLoginForm(initial.text, initial.finalUrl);
    this.trace.push({
      step: "parse-form",
      formAction: form?.action,
      fieldCount: form ? Object.keys(form.fields).length : 0,
    });
    if (!form) throw new Error("Could not locate Keycloak login form");

    form.fields.username = this.username;
    form.fields.password = this.password;

    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(form.fields)) body.set(k, v);

    const submit = await fetchWithJar(
      form.action,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      this.jar,
    );
    this.trace.push({
      step: "login-submit",
      url: submit.finalUrl,
      status: submit.response.status,
      isLoginPage: looksLikeLoginPage(submit.text),
      htmlPreview: submit.text.slice(0, 300),
      cookieHostsTracked: this.jar.hosts(),
    });

    const verify = await fetchWithJar(appUrl, { method: "GET" }, this.jar);
    const verifyIsLogin = looksLikeLoginPage(verify.text);
    this.trace.push({
      step: "verify",
      url: verify.finalUrl,
      status: verify.response.status,
      isLoginPage: verifyIsLogin,
      htmlPreview: verify.text.slice(0, 300),
      cookieHostsTracked: this.jar.hosts(),
    });

    if (verifyIsLogin) {
      throw new Error("Authentication failed — credentials rejected by SmartDashboard");
    }
    this.authed = true;
  }

  async createService(def: ServiceDefinition): Promise<{
    status: number;
    body: unknown;
    payload: ReturnType<typeof buildServicePayload>;
    clientId?: string;
    clientSecret?: string;
    requestUrl: string;
  }> {
    await this.authenticate();
    const payload = buildServicePayload(def);
    const url = `${this.baseUrl}/${this.tenant}/api/v1/smart-screen/cqrs/services/`;
    const result = await fetchWithJar(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      },
      this.jar,
    );

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(result.text);
    } catch {
      parsedBody = result.text;
    }

    let clientId: string | undefined;
    let clientSecret: string | undefined;
    if (parsedBody && typeof parsedBody === "object") {
      const obj = parsedBody as Record<string, unknown>;
      const inner =
        obj.data && typeof obj.data === "object"
          ? (obj.data as Record<string, unknown>)
          : obj;
      if (typeof inner.id === "string") clientId = inner.id;
      if (typeof inner.client_secret === "string") clientSecret = inner.client_secret;
    }

    return {
      status: result.response.status,
      body: parsedBody,
      payload,
      clientId,
      clientSecret,
      requestUrl: url,
    };
  }

  async publishCurrentBranch(): Promise<{
    ok: boolean;
    branchId: string;
    touch: StepResult;
    save: StepResult;
    publish: StepResult;
    switch: StepResult;
  }> {
    await this.authenticate();
    const base = `${this.baseUrl}/${this.tenant}/api/v1/smart-screen`;
    const branchesBase = `${base}/branches_management`;
    const touchResult = await this.touchHomescreen(base);
    const branchId = String(Date.now());
    const saveResult = await this.postJson(`${branchesBase}/save/branch/${branchId}/`, {
      description: "Created via KOBIL Partner Guide",
    });
    const publishResult = await this.postJson(
      `${branchesBase}/publish/branch/${branchId}/`,
      {},
    );
    const switchResult = await this.postJson(
      `${branchesBase}/switch/branch/${branchId}/?discardChanges=true`,
      {},
    );
    const ok =
      touchResult.ok && saveResult.ok && publishResult.ok && switchResult.ok;
    return { ok, branchId, touch: touchResult, save: saveResult, publish: publishResult, switch: switchResult };
  }

  private async touchHomescreen(base: string): Promise<StepResult> {
    const listUrl = `${base}/homescreens/`;
    try {
      const r = await fetchWithJar(listUrl, { method: "GET" }, this.jar);
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(r.text);
      } catch {
        parsed = null;
      }
      const list = extractScreens(parsed);
      if (list.length === 0) {
        return {
          ok: false,
          status: r.response.status,
          url: listUrl,
          error: "No homescreens to touch",
        };
      }
      const first = list[0] as Record<string, unknown>;
      const id = typeof first.id === "string" ? first.id : "";
      const putUrl = `${base}/homescreens/${id}/`;
      const sections = Array.isArray(first.sections)
        ? (first.sections as Record<string, unknown>[])
            .filter((s) => typeof s.id === "string")
            .map((s) => ({ id: s.id as string }))
        : [];
      const payload = {
        label: typeof first.label === "string" ? first.label : "Home Screen",
        sections,
        audiences: Array.isArray(first.audiences) ? first.audiences : [],
        type: typeof first.type === "string" ? first.type : "legacy",
      };
      return await this.put(putUrl, payload);
    } catch (e) {
      return {
        ok: false,
        status: 0,
        url: listUrl,
        error: e instanceof Error ? e.message : "Touch failed",
      };
    }
  }

  private async postJson(url: string, body: unknown): Promise<StepResult> {
    try {
      const r = await fetchWithJar(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        },
        this.jar,
      );
      return summarize(r, url);
    } catch (e) {
      return {
        ok: false,
        status: 0,
        url,
        error: e instanceof Error ? e.message : "Network error",
      };
    }
  }

  private async put(url: string, body: unknown): Promise<StepResult> {
    try {
      const r = await fetchWithJar(
        url,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        },
        this.jar,
      );
      return summarize(r, url);
    } catch (e) {
      return {
        ok: false,
        status: 0,
        url,
        error: e instanceof Error ? e.message : "Network error",
      };
    }
  }
}

export type StepResult = {
  ok: boolean;
  status: number;
  url: string;
  body?: unknown;
  error?: string;
};

function summarize(r: JarFetchResult, url: string): StepResult {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(r.text);
  } catch {
    parsed = r.text.slice(0, 300);
  }
  return {
    ok: r.response.status >= 200 && r.response.status < 300,
    status: r.response.status,
    url,
    body: parsed,
  };
}

function extractScreens(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const data = (parsed as Record<string, unknown>).data;
    if (Array.isArray(data)) return data;
  }
  return [];
}
