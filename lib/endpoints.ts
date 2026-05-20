// Per-product API operation catalog rendered as Swagger-style forms in the
// agent wizard. Endpoint shapes are drawn from KOBIL's public docs:
//   Identity getUserInfo — https://developer.kobil.com/api/idp#tag/Users/operation/getUserInfo
//   Chat / Pay / Signature / TMS — https://documentation.cloud.kobil.com/api/

export type Category = "identity" | "chat" | "pay" | "signature" | "tms";

export type ParamLocation = "path" | "query" | "header" | "body";

export type Param = {
  name: string;
  in: ParamLocation;
  type: "string" | "number" | "boolean";
  required: boolean;
  description?: string;
  // Pre-fill source from the conversation state.
  defaultFrom?: "tenant" | "clientId" | "userId" | "callbackUrl";
  // Hint for the body — when set, this becomes the JSON key of the request body.
  bodyKey?: string;
  // Sample / placeholder for the field.
  example?: string;
};

export type Endpoint = {
  id: string;
  name: string;
  summary: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  // Endpoint base. If 'idp', we derive from the well-known config's issuer or
  // a user-provided IDP base; if 'kobil-api', we ask the user for a base URL
  // for that product (Chat/Pay/TMS host).
  base: "idp" | "kobil-api";
  pathTemplate: string;
  params: Param[];
  docsUrl?: string;
};

export type CategoryInfo = {
  key: Category;
  label: string;
  tagline: string;
  description: string;
  steps: string[];
  endpoints: Endpoint[];
};

export const CATEGORIES: CategoryInfo[] = [
  {
    key: "identity",
    label: "Identity",
    tagline: "Single Sign-On for SuperApp users via OpenID Connect.",
    description:
      "Authenticate users once and share their identity across MiniApps. The standard OIDC authorization-code flow gives you ID and access tokens; service-to-service calls use the client_credentials grant.",
    steps: [
      "Redirect the user to the Identity login page with your client_id, redirect_uri, and scope=openid.",
      "Receive a one-time authorization code at your redirect URI.",
      "Exchange the code (or client_credentials) for an access token at the token endpoint.",
      "Validate the token signature against the JWKS published in the well-known config and call protected APIs with Authorization: Bearer …",
    ],
    endpoints: [
      {
        id: "get-user-info",
        name: "Get user info",
        summary: "Fetch a user record from the KOBIL IDP user directory.",
        method: "GET",
        base: "idp",
        pathTemplate: "/realms/{tenantId}/v3_user/{userId}",
        docsUrl: "https://developer.kobil.com/api/idp#tag/Users/operation/getUserInfo",
        params: [
          {
            name: "tenantId",
            in: "path",
            type: "string",
            required: true,
            description: "Name of the realm (your tenant).",
            defaultFrom: "tenant",
          },
          {
            name: "userId",
            in: "path",
            type: "string",
            required: true,
            description: "Username of the user to look up.",
            example: "alice@example.com",
          },
          {
            name: "firstName",
            in: "query",
            type: "string",
            required: false,
            description: "Filter by first name.",
          },
          {
            name: "limit",
            in: "query",
            type: "string",
            required: false,
            description: "Maximum number of users to return.",
          },
          {
            name: "pageNumber",
            in: "query",
            type: "string",
            required: false,
            description: "Page number for paginated results.",
          },
        ],
      },
    ],
  },
  {
    key: "chat",
    label: "Chat",
    tagline: "Send encrypted, signed messages to SuperApp users and receive their replies.",
    description:
      "Push messages into the user's SuperApp inbox: plain text, multi-choice prompts, attachments, or PDF signature requests. User responses are POSTed back to your registered callback URL.",
    steps: [
      "Complete the Identity integration and obtain an access token.",
      "POST your message payload to the Chat API.",
      "Register a public callback URL with SuperApp Admin.",
      "Receive replies, choice selections, and signed PDFs as JSON on your callback.",
    ],
    endpoints: [
      {
        id: "send-text",
        name: "Send text message",
        summary: "Deliver a plain-text message to a SuperApp user.",
        method: "POST",
        base: "kobil-api",
        pathTemplate: "/v1/messages",
        params: [
          { name: "userId", in: "body", bodyKey: "userId", type: "string", required: true, description: "Target SuperApp user." },
          { name: "type", in: "body", bodyKey: "type", type: "string", required: true, description: "Message type.", example: "text" },
          { name: "body", in: "body", bodyKey: "body", type: "string", required: true, description: "Message text.", example: "Your order #1234 has shipped." },
          { name: "callbackUrl", in: "body", bodyKey: "callbackUrl", type: "string", required: true, description: "URL where user replies are POSTed.", defaultFrom: "callbackUrl" },
        ],
      },
    ],
  },
  {
    key: "pay",
    label: "Pay",
    tagline: "One-click checkout and full payment lifecycle inside the SuperApp.",
    description:
      "Create, inquire, cancel, or refund transactions. Users confirm in the SuperApp Pay UI and the outcome is delivered to your registered callback.",
    steps: [
      "Get an access token via the service-account flow.",
      "Create a transaction with amount, currency, callbackUrl, and any extra params.",
      "Pay returns a transactionId; the user confirms in the Pay UI.",
      "Receive the outcome at your callback. Use the transactionId for status checks, void, or refund.",
    ],
    endpoints: [
      {
        id: "create-transaction",
        name: "Create payment transaction",
        summary: "Start a one-click checkout for a SuperApp user.",
        method: "POST",
        base: "kobil-api",
        pathTemplate: "/v1/transactions",
        params: [
          { name: "userId", in: "body", bodyKey: "userId", type: "string", required: true, description: "SuperApp user paying." },
          { name: "amount", in: "body", bodyKey: "amount", type: "number", required: true, description: "Amount to charge.", example: "19.99" },
          { name: "currency", in: "body", bodyKey: "currency", type: "string", required: true, description: "ISO 4217 currency code.", example: "EUR" },
          { name: "description", in: "body", bodyKey: "description", type: "string", required: false, description: "Human description shown in Pay UI.", example: "Order #1234" },
          { name: "callbackUrl", in: "body", bodyKey: "callbackUrl", type: "string", required: true, description: "Outcome callback URL.", defaultFrom: "callbackUrl" },
          { name: "preAuthorized", in: "body", bodyKey: "preAuthorized", type: "boolean", required: false, description: "Pre-authorize without capture.", example: "false" },
        ],
      },
    ],
  },
  {
    key: "signature",
    label: "Signature",
    tagline: "PDF and transaction signing through Chat and TMS.",
    description:
      "Signature is delivered through two channels: Chat (PDF signature messages) and TMS (transaction signing). Both require a valid access token from Identity first.",
    steps: [
      "Get an access token from Identity.",
      "For document signing → send a Chat message of type 'signature' with a base64-encoded PDF.",
      "For transaction signing → POST a TMS transaction; the user reviews and signs in the SuperApp.",
      "Signed result arrives at your callback (Chat) or via TMS result GET.",
    ],
    endpoints: [
      {
        id: "chat-pdf-sign",
        name: "PDF signature via Chat",
        summary: "Ask a user to sign a PDF; signed document arrives at your callback.",
        method: "POST",
        base: "kobil-api",
        pathTemplate: "/v1/messages",
        params: [
          { name: "userId", in: "body", bodyKey: "userId", type: "string", required: true, description: "Signer." },
          { name: "type", in: "body", bodyKey: "type", type: "string", required: true, example: "signature" },
          { name: "title", in: "body", bodyKey: "title", type: "string", required: true, description: "Heading shown to the user.", example: "Sign your contract" },
          { name: "pdf", in: "body", bodyKey: "pdf", type: "string", required: true, description: "Base64 data URI for the PDF.", example: "data:application/pdf;base64,JVBERi0xLjQK..." },
          { name: "callbackUrl", in: "body", bodyKey: "callbackUrl", type: "string", required: true, description: "Where the signed document is POSTed.", defaultFrom: "callbackUrl" },
        ],
      },
    ],
  },
  {
    key: "tms",
    label: "TMS",
    tagline: "Authenticate and confirm high-trust transactions with the SuperApp user.",
    description:
      "TMS lets you ask a user to confirm or reject a specific action — a login, transfer, or admin change. The user signs in the SuperApp and you receive the signed result.",
    steps: [
      "Get an access token from Identity.",
      "POST a TMS transaction with userId, tmsData, and timeout.",
      "Poll status by transactionId.",
      "GET the signed result once the user confirms.",
    ],
    endpoints: [
      {
        id: "start-tx",
        name: "Start TMS transaction",
        summary: "Ask a user to confirm a specific operation.",
        method: "POST",
        base: "kobil-api",
        pathTemplate: "/v1/transactions",
        params: [
          { name: "userId", in: "body", bodyKey: "userId", type: "string", required: true, description: "Confirming user." },
          { name: "tmsData", in: "body", bodyKey: "tmsData", type: "string", required: true, description: "Data shown to the user for confirmation.", example: "Login attempt from new device — confirm?" },
          { name: "timeoutSeconds", in: "body", bodyKey: "timeoutSeconds", type: "number", required: false, description: "Confirmation window.", example: "60" },
        ],
      },
    ],
  },
];

export function findCategory(key: string | undefined): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.key === key);
}
