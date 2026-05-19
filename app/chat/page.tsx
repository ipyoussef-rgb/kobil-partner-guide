import Link from "next/link";
import Container from "../components/Container";
import PageHeader from "../components/PageHeader";
import Steps from "../components/Steps";
import CodeBlock from "../components/CodeBlock";

export const metadata = { title: "KOBIL Chat — Partner Guide" };

export default function ChatPage() {
  return (
    <Container>
      <PageHeader
        eyebrow="Core integration"
        title="KOBIL Chat"
        tagline="Send encrypted, signed messages to SuperApp users and receive their replies on a callback endpoint."
      />

      <h2 className="text-lg font-semibold text-zinc-900">What it does</h2>
      <p className="mt-2 text-zinc-700">
        Chat lets your MiniApp push messages into a user&rsquo;s SuperApp inbox: plain text,
        multi-choice prompts, attachments, and PDF signature requests. User responses are POSTed
        back to a callback URL you register with the SuperApp Admin.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-zinc-900">Integration steps</h2>
      <div className="mt-4">
        <Steps
          items={[
            { title: "Complete the Identity integration", body: "You need a valid access token before any Chat call." },
            { title: "Get an access token", body: "Exchange client_id and client_secret for a token via the service-account flow." },
            { title: "Send a message", body: "POST your message payload (text, choices, attachments, or signature request) to the Chat API." },
            { title: "Register a callback URL", body: "Set a public POST endpoint on your backend; SuperApp Admin maps it to your service." },
            { title: "Handle user responses", body: "Replies, choice selections, and signed PDFs are forwarded to your callback as JSON." },
          ]}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">Send a plain text message</h2>
      <div className="mt-3">
        <CodeBlock
          title="POST — Chat send message"
          code={`curl -X POST {CHAT_BASE}/v1/messages \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "type": "text",
    "body": "Your order #1234 has shipped.",
    "callbackUrl": "https://yourapp.example/chat-callback"
  }'`}
        />
      </div>

      <h2 className="mt-10 text-lg font-semibold text-zinc-900">PDF signature message</h2>
      <p className="mt-2 text-zinc-700">
        Sending a PDF for signature reuses the Chat channel. The user signs in the SuperApp and the
        signed document is delivered back to your callback.
      </p>
      <div className="mt-3">
        <CodeBlock
          title="POST — Chat sign request"
          code={`curl -X POST {CHAT_BASE}/v1/messages \\
  -H "Authorization: Bearer $ACCESS_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "USER_ID",
    "type": "signature",
    "title": "Sign your contract",
    "pdf": "data:application/pdf;base64,...",
    "callbackUrl": "https://yourapp.example/chat-callback"
  }'`}
        />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/get-token"
          className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Get a token →
        </Link>
        <Link
          href="/api-tester?product=chat"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:border-zinc-900"
        >
          Open Chat in the API tester
        </Link>
      </div>
    </Container>
  );
}
