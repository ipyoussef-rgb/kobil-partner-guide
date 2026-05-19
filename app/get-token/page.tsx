import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import TokenTester from "../components/TokenTester";
import CodeBlock from "../components/CodeBlock";

export const metadata = { title: "Get an access token — Partner Guide" };

export default function GetTokenPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Step 2 of 3"
        title="Get an access token"
        tagline="Trade your client_id and client_secret for an access token via your service account. The token is what every Identity, Chat, Pay, Signature, and TMS call needs in its Authorization header."
      />

      <p className="text-zinc-700">
        Service-account access uses the OAuth 2.0 <code>client_credentials</code>
        {" "}grant. You don&rsquo;t need a user logged in &mdash; the service authenticates as itself. Fill in the form below;
        the request is proxied through this site to dodge CORS, and the access token is saved in
        your browser for the next step.
      </p>

      <div className="mt-8">
        <TokenTester />
      </div>

      <h2 className="mt-12 text-lg font-semibold text-zinc-900">Equivalent curl</h2>
      <div className="mt-3">
        <CodeBlock
          title="POST — token endpoint"
          code={`curl -X POST {TOKEN_URL} \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=$CLIENT_ID" \\
  -d "client_secret=$CLIENT_SECRET"`}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Where do I get the token URL?</h2>
      <p className="mt-2 text-zinc-700">
        From the well-known configuration that you fetched in step 1. Look for the{" "}
        <code>token_endpoint</code> field. Typical shape:
      </p>
      <div className="mt-3">
        <CodeBlock
          title="Sample"
          code={`https://{KEYCLOAK_HOST}/realms/{TENANT}/protocol/openid-connect/token`}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/api-tester"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Next: try APIs →
        </Link>
        <Link
          href="/create-service"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          ← Back to step 1
        </Link>
      </div>
    </Container>
  );
}
