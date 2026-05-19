import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import CodeBlock from "../components/CodeBlock";

export const metadata = { title: "KOBIL Identity — Partner Guide" };

export default function IdentityPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Core integration"
        title="KOBIL Identity"
        tagline="Single Sign-On for SuperApp users via OpenID Connect. Authenticate once, access every MiniApp."
      />

      <h2 className="text-lg font-semibold text-zinc-900">What it does</h2>
      <p className="mt-2 text-zinc-700">
        KOBIL Identity exposes a standard OpenID Connect provider. Your MiniApp redirects the user
        to the Identity login page, receives an authorization code, and exchanges it for an ID
        token and access token. Service-to-service callers exchange <code>client_id</code> and
        <code> client_secret</code> directly using the <code>client_credentials</code> grant.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Integration steps</h2>
      <div className="mt-4">
        <Steps
          items={[
            {
              title: "Redirect the user to the Identity login page",
              body: "Send unauthenticated users to /authorize with your client_id, redirect_uri, scope=openid, and response_type=code.",
            },
            {
              title: "Receive the authorization code",
              body: "After login, Identity redirects back to your redirect_uri with a one-time code parameter.",
            },
            {
              title: "Exchange the code for tokens",
              body: "Your backend POSTs the code (plus client_id and client_secret) to the token endpoint and gets an id_token + access_token.",
            },
            {
              title: "Validate and use the token",
              body: "Verify the signature against the JWKS published in the well-known configuration. Decode claims to read user info.",
            },
          ]}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Authorization code request</h2>
      <div className="mt-3 space-y-4">
        <CodeBlock
          title="GET — authorization endpoint"
          code={`GET {ISSUER}/protocol/openid-connect/auth
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.example/callback
  &response_type=code
  &scope=openid profile email
  &state=xyz`}
        />
        <CodeBlock
          title="POST — token endpoint (code exchange)"
          code={`curl -X POST {ISSUER}/protocol/openid-connect/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=authorization_code" \\
  -d "code=AUTH_CODE_FROM_REDIRECT" \\
  -d "redirect_uri=https://yourapp.example/callback" \\
  -d "client_id=YOUR_CLIENT_ID" \\
  -d "client_secret=YOUR_CLIENT_SECRET"`}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Well-known configuration</h2>
      <p className="mt-2 text-zinc-700">
        Every tenant publishes its OpenID configuration so clients can discover endpoints, scopes,
        and the JWKS used to verify tokens.
      </p>
      <div className="mt-3">
        <CodeBlock
          title="GET — discovery document"
          code={`curl {ISSUER}/.well-known/openid-configuration`}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/get-token"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Try: get a service-account token →
        </Link>
        <Link
          href="/api-tester?product=identity&sample=well-known"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Try: GET .well-known/openid-configuration
        </Link>
        <Link
          href="/api-tester?product=identity&sample=userinfo"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Try: GET userinfo
        </Link>
      </div>
    </Container>
  );
}
