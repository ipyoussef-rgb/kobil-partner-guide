import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import CodeBlock from "../components/CodeBlock";
import CreateServiceTester from "../components/CreateServiceTester";

export const metadata = { title: "Create a service — Partner Guide" };

const sampleServicePayload = `{
  "title":       { "default": "Acme MiniApp", "locales": [] },
  "description": { "default": "Demo MiniApp",   "locales": [] },
  "type": "MiniApp",
  "behaviour": "Banner",
  "callbackUrl": "https://yourapp.example",
  "consentEnabled": false,
  "webFlowEnabled": false,
  "launchInstructions": { "readOnly": true, "url": "https://yourapp.example" },
  "redirectUris": ["https://yourapp.example"],
  "searchable": true,
  "requirements": {},
  "tags": {
    "categories": ["fbc33089-93ff-4bce-ad3d-16645e9edf15"],
    "keywords": ["acme_miniapp"]
  }
}`;

const sampleResponse = `{
  "id": "f3a17b80-...",            // ← becomes your client_id
  "client_secret": "Hkp9...",       // ← keep this safe
  "callbackUrl": "https://yourapp.example",
  ...
}`;

export default function CreateServicePage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Step 1 of 3"
        title="Create your service"
        tagline="Register a MiniApp service in SmartDashboard. The platform returns your client_id, client_secret, and the well-known configuration you&rsquo;ll use for every API call."
      />

      <h2 className="text-lg font-semibold text-zinc-900">What you&rsquo;ll need</h2>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-zinc-700">
        <li>A SmartDashboard account on your tenant.</li>
        <li>Your tenant slug (e.g. <code>your-tenant</code>) and SmartDashboard base URL.</li>
        <li>A public callback URL where your MiniApp is reachable.</li>
      </ul>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Create a service now</h2>
      <p className="mt-2 text-zinc-700">
        Fill in the form below. The server handles the SmartDashboard login (Keycloak form-post)
        and POSTs your service definition in one go. On success, your <code>client_id</code> and{" "}
        <code>client_secret</code> are saved in your browser and pre-filled in step 2.
      </p>
      <div className="mt-4">
        <CreateServiceTester />
      </div>

      <h2 className="mt-12 text-lg font-semibold text-zinc-900">Two ways to create a service</h2>
      <p className="mt-2 text-zinc-700">
        You can also do this through the SmartDashboard UI, or programmatically using the same
        contract the form above uses. The script <code>create_miniapps.py</code> ships a working
        reference of the full API flow.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">UI flow</h2>
      <div className="mt-4">
        <Steps
          items={[
            { title: "Sign in to SmartDashboard", body: "Open https://{SMARTDASHBOARD_BASE_URL}/dashboard/{TENANT}/app-builder and log in via Keycloak." },
            { title: "Create a new MiniApp service", body: "Set the title, description, callback URL, redirect URIs, and at least one category. Behaviour Banner is the default for MiniApps." },
            {
              title: "Save and copy credentials",
              body: "After save, the service detail view shows the service id (used as client_id) and the client_secret. Store both in your secret manager.",
            },
            {
              title: "Publish the branch",
              body: "Save + publish the branch so the new service is live and discoverable in the SuperApp.",
            },
          ]}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">API flow (programmatic)</h2>
      <p className="mt-2 text-zinc-700">
        This is the exact contract used by <code>create_miniapps.py</code>. POST a service
        definition to the CQRS endpoint; the response carries the credentials.
      </p>
      <div className="mt-3 space-y-4">
        <CodeBlock
          title="POST — create service"
          code={`curl -X POST "{SMARTDASHBOARD_BASE_URL}/{TENANT}/api/v1/smart-screen/cqrs/services/" \\
  -H "Content-Type: application/json" \\
  --cookie "KEYCLOAK_SESSION=..." \\
  -d @service.json`}
        />
        <CodeBlock title="service.json" language="json" code={sampleServicePayload} />
        <CodeBlock title="Response" language="json" code={sampleResponse} />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Publishing the branch</h2>
      <p className="mt-2 text-zinc-700">
        After creating services, save + publish the active branch so they go live. The script
        triggers a no-op homescreen PUT to flip <code>isChanged=true</code>, then save / publish /
        switch under a new branch id.
      </p>
      <div className="mt-3">
        <CodeBlock
          title="POST — save, publish, switch"
          code={`BRANCH_ID=$(date +%s%3N)
BASE="{SMARTDASHBOARD_BASE_URL}/{TENANT}/api/v1/smart-screen/branches_management"

curl -X POST "$BASE/save/branch/$BRANCH_ID/"    -H "Content-Type: application/json" -d '{}' --cookie "$COOKIE"
curl -X POST "$BASE/publish/branch/$BRANCH_ID/" -H "Content-Type: application/json" -d '{}' --cookie "$COOKIE"
curl -X POST "$BASE/switch/branch/$BRANCH_ID/?discardChanges=true" -H "Content-Type: application/json" -d '{}' --cookie "$COOKIE"`}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Well-known configuration</h2>
      <p className="mt-2 text-zinc-700">
        Once your service exists, you can pull the OpenID configuration for your tenant. It lists
        the token endpoint, JWKS, issuer, and supported grant types &mdash; the inputs you need for
        the next step.
      </p>
      <div className="mt-3">
        <CodeBlock
          title="GET — well-known configuration"
          code={`curl {KEYCLOAK_URL}/realms/{TENANT}/.well-known/openid-configuration`}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/get-token"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Next: get a token →
        </Link>
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Back to overview
        </Link>
      </div>
    </Container>
  );
}
