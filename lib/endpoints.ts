// Per-product API operation catalog. Source: the Core Integrations Postman
// collection (`/Users/youssefmoufakhir/Documents/Core Integrations.postman_collection.json`).
//
// Variable conventions mirrored from Postman:
//   {{base_url_idp_host}}  → https://idp.{env}
//   {{base_url_pay_host}}  → https://pay.{env}
//   {{base_url_tms_host}}  → https://tms.{env}     (derived from convention)
//   {{tenant_name}} / {{tenant_id}}  → realm = tenant from step 1
//   {{client_id}} / {{client_secret}} → from the service created in step 1
//   {{chat_user_id}} / {{idp_username}} / {{pay_user_id}} / {{tms_user_id}}  → user input
//   {{transaction_id}} / {{tms_id}} / {{media_id}} → result of a prior call
//   {{$randomUUID}} → generated fresh on send
//
// References:
//   - https://documentation.cloud.kobil.com/guides/super-app-services/core-integrations/
//   - https://documentation.cloud.kobil.com/api/
//   - https://developer.kobil.com/api/idp

export type Category = "identity" | "chat" | "pay" | "tms";

export type ParamLocation = "path" | "query" | "header" | "body";

// `asts` is the actual TMS host (KOBIL's "Authentication & Signing Toolkit
// Server"). The documentation source derives it from the IDP host by
// replacing `idp` → `asts`, so the convention is asts.{env}.
export type ProductHost = "idp" | "mercury" | "pay" | "asts";

export type Param = {
  name: string;
  in: ParamLocation;
  type?: "string" | "number" | "boolean";
  required: boolean;
  description?: string;
  defaultFrom?: "tenant" | "clientId" | "callbackUrl";
  example?: string;
};

export type MultipartPartSpec =
  | { kind: "file"; name: string; description?: string; accept?: string }
  | { kind: "text"; name: string; description?: string; defaultJson: string };

export type Endpoint = {
  id: string;
  name: string;
  summary: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  host: ProductHost;
  pathTemplate: string;
  params: Param[];
  /** JSON request body template with {{placeholder}} tokens. Rendered as an
   * editable textarea so devs can tweak before sending. */
  bodyTemplate?: string;
  /** Form-encoded fields (key/value) for OAuth token endpoints. */
  formData?: { key: string; value: string; description?: string }[];
  /** Content-Type override (default: application/json for JSON body, none for
   * GET, application/x-www-form-urlencoded when formData is present). */
  contentType?: string;
  /** Request body shape. Default 'json'. 'multipart' renders per-part inputs. */
  bodyType?: "json" | "form" | "multipart";
  /** When bodyType is 'multipart', the parts that make up the form. */
  multipartParts?: MultipartPartSpec[];
  docsUrl?: string;
  note?: string;
};

export type CategoryInfo = {
  key: Category;
  label: string;
  tagline: string;
  description: string;
  steps: string[];
  endpoints: Endpoint[];
};

const PAY_REGULAR_BODY = `{
  "version": 1,
  "idempotencyId": "{{$randomUUID}}",
  "userId": "00000000-0000-0000-0000-000000000000",
  "merchantId": "{{client_id}}",
  "merchantServiceUUID": "{{client_id}}",
  "merchantName": "Hotels",
  "merchantCallback": "https://webhookaddress.com/",
  "transactionTimeout": 10,
  "amount": 296698,
  "tenantId": "{{tenant_name}}",
  "currency": "USD",
  "paymentContent": [
    [
      { "key": "1 nights, Superior King Room, Deluxe King Room", "value": "$2,966.98" }
    ]
  ]
}`;

const PAY_PREAUTH_BODY = `{
  "version": 1,
  "idempotencyId": "{{$randomUUID}}",
  "userId": "00000000-0000-0000-0000-000000000000",
  "merchantId": "{{client_id}}",
  "merchantServiceUUID": "{{client_id}}",
  "merchantName": "Hotels",
  "merchantCallback": "https://webhookaddress.com/",
  "transactionTimeout": 10,
  "amount": 296698,
  "tenantId": "{{tenant_name}}",
  "paymentTenantType": "preAuth",
  "currency": "USD",
  "paymentContent": [
    [
      { "key": "1 nights, Superior King Room, Deluxe King Room", "value": "$2,966.98" }
    ]
  ]
}`;

const PAY_STATUS_BODY = `{
  "merchantId": "{{client_id}}",
  "merchantCallback": "https://webhookaddress.com/",
  "transactionId": "{{transaction_id}}"
}`;

const PAY_VOID_BODY = `{
  "version": 1,
  "userId": "00000000-0000-0000-0000-000000000000",
  "idempotencyId": "{{$randomUUID}}",
  "merchantServiceUUID": "{{client_id}}",
  "merchantCallback": "https://webhookaddress.com",
  "transactionTimeout": 60,
  "merchantId": "{{client_id}}",
  "paymentTransactionId": "{{transaction_id}}",
  "cancellationMessage": "Cancel"
}`;

const PAY_REFUND_BODY = `{
  "version": 1,
  "userId": "00000000-0000-0000-0000-000000000000",
  "idempotencyId": "{{$randomUUID}}",
  "merchantServiceUUID": "{{client_id}}",
  "merchantCallback": "PAYMENT CALLBACK URL",
  "transactionTimeout": 60,
  "merchantId": "{{client_id}}",
  "merchantUserId": "{{client_id}}",
  "paymentTransactionId": "{{transaction_id}}",
  "cancellationMessage": "Refund",
  "amount": 10300,
  "currency": "USD",
  "merchantServiceProviderId": "{{client_id}}"
}`;

const CHAT_TEXT_BODY = `{
  "serviceUuid": "{{client_id}}",
  "messageType": "processChatMessage",
  "version": 3,
  "messageContent": {
    "messageText": "Hello, this is a Plain Text Message"
  }
}`;

const CHAT_CHOICE_BODY = `{
  "serviceUuid": "{{client_id}}",
  "messageType": "choiceRequest",
  "version": 3,
  "messageContent": {
    "messageText": "Would you like to continue?",
    "choices": [
      { "text": "Yes" },
      { "text": "No" }
    ]
  }
}`;

const CHAT_SMARTSCREEN_BODY = `{
  "serviceUuid": "{{client_id}}",
  "messageType": "smartScreenService",
  "version": 3,
  "messageContent": {
    "messageText": "Hello, this is a SmartScreen Service Message",
    "smartScreenServiceUuid": "{{client_id}}"
  }
}`;

const TMS_START_BODY = `{
  "tmsData": {
    "text": "test TMS",
    "external": false,
    "data": {
      "origin": "KSA",
      "introduction1_en": "Please check your transaction details",
      "authorizationHeader_en": "TRANSACTION VERIFICATION",
      "authorizationData_en": [
        { "key": "Username", "valueText": "Alice Example" }
      ],
      "dataSummary_en": [
        { "key": "Browser", "valueText": "Secure Webview" },
        { "key": "IP", "valueText": "**.***.**.**" },
        { "key": "Date", "valueText": "2026-05-20T08:00:00.000Z" }
      ]
    }
  },
  "retrievalTimeout": 50,
  "tmsTimeout": 40,
  "requireExplicitAuthentication": false,
  "requireFreshnessOfAuthentication": -1,
  "auditMessage": "test TMS auditMessage",
  "userId": "00000000-0000-0000-0000-000000000000"
}`;

export const CATEGORIES: CategoryInfo[] = [
  {
    key: "identity",
    label: "Identity",
    tagline: "Authenticate via OIDC and look up SuperApp users.",
    description:
      "KOBIL Identity has two things you'll do here: get an access token (handled in Step A above) and look up users by email via the IDP getUserInfo endpoint.",
    steps: [
      "Step A — token: POST grant_type=client_credentials to the token endpoint with your service's client_id and client_secret.",
      "Use the returned access_token as Authorization: Bearer … on every subsequent KOBIL API call.",
      "Step B — getUserInfo: GET /auth/realms/{tenant}/v3_user/{userId} where userId is the user's email address.",
    ],
    endpoints: [
      {
        id: "get-user-info",
        name: "Get user info",
        summary:
          "Look up a SuperApp user record by email. Returns id, email, firstName, lastName, attributes, enabled, etc.",
        method: "GET",
        host: "idp",
        pathTemplate: "/auth/realms/{tenant_name}/v3_user/{userId}",
        docsUrl: "https://developer.kobil.com/api/idp#tag/Users/operation/getUserInfo",
        note: "userId here is the user's email (the Keycloak username). Requires admin role on the service account — a vanilla service-account token will return 401.",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          {
            name: "userId",
            in: "path",
            required: true,
            description: "User's email address (Keycloak username).",
            example: "alice@example.com",
          },
          { name: "firstName", in: "query", required: false, description: "Filter by first name." },
          { name: "limit", in: "query", required: false, description: "Max users to return." },
          { name: "pageNumber", in: "query", required: false, description: "Page number." },
        ],
      },
    ],
  },
  {
    key: "chat",
    label: "Chat",
    tagline: "Send messages, choices, attachments, and signature requests to SuperApp users.",
    description:
      "KOBIL Chat delivers messages into a user's SuperApp inbox via the Mercury host. The recipient is identified by userId — for Chat, userId is the user's email address. All write endpoints require serviceUuid (= your service's client_id).",
    steps: [
      "Complete the Identity integration and obtain an access token via client_credentials.",
      "POST a message to /mpower/v1/users/{userId}/message — userId is the user's email.",
      "Register a callback endpoint with the SuperApp Admin to receive user replies.",
      "For attachments, upload to /media; download with the returned media_id.",
    ],
    endpoints: [
      {
        id: "send-text",
        name: "Send plain-text message",
        summary: "Push a one-way text message to the user's chat inbox.",
        method: "POST",
        host: "mercury",
        pathTemplate: "/auth/realms/{tenant_name}/mpower/v1/users/{userId}/message",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "userId", in: "path", required: true, description: "Recipient's email address.", example: "alice@example.com" },
        ],
        bodyTemplate: CHAT_TEXT_BODY,
      },
      {
        id: "send-choice",
        name: "Send multi-choice prompt",
        summary: "Ask the user to pick one of several options.",
        method: "POST",
        host: "mercury",
        pathTemplate: "/auth/realms/{tenant_name}/mpower/v1/users/{userId}/message",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "userId", in: "path", required: true, description: "Recipient's email address.", example: "alice@example.com" },
        ],
        bodyTemplate: CHAT_CHOICE_BODY,
      },
      {
        id: "send-smartscreen",
        name: "Send SmartScreen service",
        summary: "Push a link to another MiniApp (SmartScreen service) into the chat.",
        method: "POST",
        host: "mercury",
        pathTemplate: "/auth/realms/{tenant_name}/mpower/v1/users/{userId}/message",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "userId", in: "path", required: true, description: "Recipient's email address.", example: "alice@example.com" },
        ],
        bodyTemplate: CHAT_SMARTSCREEN_BODY,
      },
      {
        id: "send-attachment",
        name: "Upload attachment",
        summary: "Send a media attachment to the user's chat inbox.",
        method: "POST",
        host: "mercury",
        pathTemplate: "/auth/realms/{tenant_name}/mpower/v1/users/{userId}/media",
        bodyType: "multipart",
        note: "multipart/form-data with two parts: attachment (the file) + message (JSON metadata for the chat message wrapping it).",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "userId", in: "path", required: true, description: "Recipient's email address.", example: "alice@example.com" },
        ],
        multipartParts: [
          { kind: "file", name: "attachment", description: "Media file to upload." },
          {
            kind: "text",
            name: "message",
            description: "JSON metadata for the chat message that wraps the attachment.",
            defaultJson: `{
  "serviceUuid": "{{client_id}}",
  "messageType": "processChatMessage",
  "version": 3,
  "messageContent": {
    "messageText": "Here is the attachment you requested."
  }
}`,
          },
        ],
      },
      {
        id: "get-attachment",
        name: "Download attachment",
        summary: "Download a previously uploaded attachment by its media_id.",
        method: "GET",
        host: "pay",
        pathTemplate: "/v1/mpower/tenants/{tenant_name}/media/{media_id}/download",
        note: "Served from the Pay host. Returns binary — JSON response viewer below may render as raw text.",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "media_id", in: "path", required: true, description: "ID returned by the upload call.", example: "media-abc123" },
        ],
      },
      {
        id: "initiate-pdf-signature",
        name: "Initiate PDF signature",
        summary: "Ask the user to sign a PDF. Signed document arrives at your callback.",
        method: "POST",
        host: "mercury",
        pathTemplate: "/auth/realms/{tenant_name}/mpower/v1/users/{userId}/signature",
        bodyType: "multipart",
        note: "multipart/form-data with two parts: signatureFile (the PDF) + signatureData (JSON metadata: page/coords/callback).",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "userId", in: "path", required: true, description: "Recipient's email address.", example: "alice@example.com" },
        ],
        multipartParts: [
          { kind: "file", name: "signatureFile", description: "PDF document to sign.", accept: "application/pdf" },
          {
            kind: "text",
            name: "signatureData",
            description: "JSON metadata: page number, signature rectangle coords, prompt text, callback URL.",
            defaultJson: `{
  "serviceUuid": "{{client_id}}",
  "pageNumber": 1,
  "bottomLeftXCoordinate": 100,
  "bottomLeftYCoordinate": 100,
  "topRightXCoordinate": 300,
  "topRightYCoordinate": 200,
  "messageText": "Please sign this document",
  "callbackUrl": "https://yourapp.example/signature-callback"
}`,
          },
        ],
      },
    ],
  },
  {
    key: "pay",
    label: "Pay",
    tagline: "One-click checkout with full lifecycle: create, pre-auth, post-auth, status, void, refund.",
    description:
      "KOBIL Pay runs on a dedicated Pay host. The merchant (your service) is identified by merchantId + merchantServiceUUID (both = your client_id). The payer is identified by userId — note this is a KOBIL user UUID, not an email. Every call carries an idempotencyId so retries are safe.",
    steps: [
      "Get a service-account access token.",
      "Initialize a regular transaction (immediate capture) or pre-auth (capture later).",
      "User confirms in the SuperApp Pay UI; outcome is POSTed to your merchantCallback.",
      "Use status / void / refund / postauth as needed, all keyed by the returned transactionId.",
    ],
    endpoints: [
      {
        id: "create-regular",
        name: "Regular payment initialization",
        summary: "Create an immediate-capture payment transaction.",
        method: "POST",
        host: "pay",
        pathTemplate: "/mpay-merchant/create/transaction",
        params: [],
        bodyTemplate: PAY_REGULAR_BODY,
      },
      {
        id: "create-preauth",
        name: "Pre-auth payment initialization",
        summary: "Pre-authorize a payment for later capture via post-auth.",
        method: "POST",
        host: "pay",
        pathTemplate: "/mpay-merchant/create/transaction",
        params: [],
        bodyTemplate: PAY_PREAUTH_BODY,
      },
      {
        id: "postauth",
        name: "Post-auth payment finalization",
        summary: "Capture a previously pre-authorized payment.",
        method: "GET",
        host: "pay",
        pathTemplate: "/mpay-merchant/create/transaction/postauth",
        params: [
          { name: "id", in: "query", required: true, description: "transactionId from the pre-auth response.", example: "{{transaction_id}}" },
          { name: "idempotencyId", in: "query", required: true, example: "{{$randomUUID}}" },
          { name: "amount", in: "query", required: true, example: "AMOUNT" },
          { name: "merchantCallback", in: "query", required: true, example: "YOUR_PAYMENT_CALLBACK_ADDRESS" },
        ],
      },
      {
        id: "status",
        name: "Transaction status",
        summary: "Read the current state of a payment transaction.",
        method: "POST",
        host: "pay",
        pathTemplate: "/mpay-merchant/create/transaction/status",
        params: [],
        bodyTemplate: PAY_STATUS_BODY,
      },
      {
        id: "void",
        name: "Cancel transaction (void)",
        summary: "Cancel a transaction before capture.",
        method: "POST",
        host: "pay",
        pathTemplate: "/mpay-merchant/create/transaction/void",
        params: [],
        bodyTemplate: PAY_VOID_BODY,
      },
      {
        id: "refund",
        name: "Refund transaction",
        summary: "Refund a captured payment.",
        method: "POST",
        host: "pay",
        pathTemplate: "/mpay-merchant/create/transaction/refund",
        params: [],
        bodyTemplate: PAY_REFUND_BODY,
      },
    ],
  },
  {
    key: "tms",
    label: "TMS",
    tagline: "Transaction confirmation: start, check status, retrieve signed result.",
    description:
      "KOBIL TMS runs on the ASTS host — `asts.{env}`, derived from the IDP host by replacing 'idp' with 'asts'. Ask a user to confirm or reject a specific action; the user reviews and signs on their device. The payload's userId is a KOBIL user UUID (not an email — different from Chat).",
    steps: [
      "Get an access token from Identity.",
      "POST a TMS transaction with tmsData, timeouts, and userId (UUID).",
      "Poll status by tms_id until the user acts.",
      "GET the result to read the signed payload + signer info.",
    ],
    endpoints: [
      {
        id: "start-tms",
        name: "Start TMS",
        summary: "Open a TMS transaction for user confirmation.",
        method: "POST",
        host: "asts",
        pathTemplate: "/v1/tenants/{tenant_name}/tms",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
        ],
        bodyTemplate: TMS_START_BODY,
      },
      {
        id: "get-tms-status",
        name: "Get TMS status",
        summary: "Read the pending/completed state of a TMS transaction.",
        method: "GET",
        host: "asts",
        pathTemplate: "/v1/tenants/{tenant_name}/tms/{tms_id}/status",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "tms_id", in: "path", required: true, description: "ID returned by Start TMS.", example: "tms-abc123" },
        ],
      },
      {
        id: "get-tms-result",
        name: "Get TMS result",
        summary: "Read the signed result after the user confirms.",
        method: "GET",
        host: "asts",
        pathTemplate: "/v1/tenants/{tenant_name}/tms/{tms_id}/result",
        params: [
          { name: "tenant_name", in: "path", required: true, defaultFrom: "tenant" },
          { name: "tms_id", in: "path", required: true, example: "tms-abc123" },
        ],
      },
    ],
  },
];

export function findCategory(key: string | undefined): CategoryInfo | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

/**
 * Derive per-product host names from the SmartDashboard base URL.
 *   smartdashboard.{env}  → idp.{env} | mercury.{env} | pay.{env} | asts.{env}
 *
 * Confirmed against documentation.cloud.kobil.com source bundles:
 *   - env-config.js exposes IDP_HOST / PAY_HOST / CHAT_HOST (= mercury)
 *   - TMS endpoints take the IDP host and replace 'idp' with 'asts'
 */
export function deriveProductBase(
  productHost: ProductHost,
  smartdashboardBaseUrl: string,
): string {
  try {
    const u = new URL(smartdashboardBaseUrl);
    const baseHost = u.host.replace(/^smartdashboard\./i, "");
    return `${u.protocol}//${productHost}.${baseHost}`;
  } catch {
    return "";
  }
}
