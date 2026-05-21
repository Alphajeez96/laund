# Messaging (Gupshup Partner Portal, V3) - LaundryOps Notes

This doc is a "mental map" of what we can do for messaging in LaundryOps using Gupshup Partner Portal + V3 (passthrough) APIs.

It is intentionally organized by "entities/capabilities" (tokens, subscriptions, message types, templates, flows) rather than by the order Gupshup shows pages.

## 1) Big Picture: What Is An "App" In Our System?

In LaundryOps, each Laundry we onboard maps to a single Gupshup Partner Portal **app** (`appId`):

1. We create the app via Partner APIs.
2. The laundry owner completes embedded onboarding to link their WABA + phone number to that app.
3. That app then becomes the identity used for:
   - sending WhatsApp messages (outbound)
   - receiving WhatsApp messages + statuses (inbound) on our webhook

Partner Portal is explicitly designed for partners to manage WABA applications either created by the partner's customers or created on behalf of customers. See "Introduction".  
Docs: https://partner-docs.gupshup.io/docs/introduction

## 2) Tokens (Auth): Partner Token vs Partner App Token

### 2.1 Partner Token
Used for partner-level operations (creating apps, onboarding ops, fetching app token).

In our codebase today, this is what we currently fetch from the partner login (`account/login`) flow.

### 2.2 Partner App Token (aka App Access Token)
This token is app-scoped and is used for app-level APIs: sending messages, managing subscriptions, templates, media, business profile, blocking, etc.

Get it here:

- `GET /partner/app/{appId}/token` (header: `token: <PARTNER_TOKEN>`)
  - Docs: https://partner-docs.gupshup.io/reference/get_partner-app-appid-token

Important: in V3, the message + subscription endpoints typically expect the app token as `Authorization: <PARTNER_APP_TOKEN>` (some reference pages label it `token`, but the official request header field shown in multiple endpoints is `Authorization`).

Example references:

- V3 Text message: `POST /partner/app/{appId}/v3/message` (header `Authorization`)
  - Docs: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-message-14
- Set subscription: `POST /partner/app/{appId}/subscription` (header `Authorization`)
  - Docs: https://partner-docs.gupshup.io/reference/setsubscription-api-v3
- Get all subscriptions: `GET /partner/app/{appId}/subscription` (header `Authorization`)
  - Docs: https://partner-docs.gupshup.io/reference/get_partner-app-appid-subscription

## 3) Conversations + The 24-Hour Window (The Core Constraint)

WhatsApp Business messaging is organized into **24-hour conversations**.

Gupshup's WhatsApp messages overview calls these "24-hour message threads" and notes you can open conversations using free-form (session) or template messages.  
Docs: https://partner-docs.gupshup.io/docs/whatsapp-messages

Practical rules you should design around:

- "Free-form / session" messages are what you send during an active conversation window.
- If you need to message someone outside the window, you use an approved **template** message.

For LaundryOps, that translates into:

- Order capture / back-and-forth chat: session messages (as long as the window is open).
- Scheduled reminders / re-engagement: template messages.

## 4) Webhooks + Subscriptions (How Inbound Reaches Us)

### 4.1 Webhook expectations
Your webhook should:

- return 2xx with an empty body fast
- process async, ACK sync
- be publicly accessible

Docs: https://partner-docs.gupshup.io/docs/webhook-key-points

### 4.2 Subscription management (V3)
You configure what you receive using:

- `POST /partner/app/{appId}/subscription` (Set subscription)
  - Docs: https://partner-docs.gupshup.io/reference/setsubscription-api-v3
- `GET /partner/app/{appId}/subscription` (List subscriptions)
  - Docs: https://partner-docs.gupshup.io/reference/get_partner-app-appid-subscription
- `PUT /partner/app/{appId}/subscription/{subscriptionId}` (Update subscription)
  - Docs: https://partner-docs.gupshup.io/reference/put_partner-app-appid-subscription-subscriptionid

Note: `modes` is documented as a **string** form field in the subscription API reference (partners commonly pass a comma-separated string).

### 4.3 V3 inbound payloads
V3 (passthrough) inbound payloads are in Meta-like shape and include `gs_app_id`, `entry[]`, `changes[]`, and typically `field: "messages"` for message/status events.

- Passthrough (V3) Incoming events:
  - Docs: https://partner-docs.gupshup.io/docs/passthrough-v3-incoming-events
- WhatsApp passthrough APIs for partners (has example inbound "Event - V3 - Message" and "Event - V3 - Status"):
  - Docs: https://partner-docs.gupshup.io/docs/whatsapp-passthrough-apis-for-partners

## 5) Outbound Messaging (V3 / Passthrough)

All V3 message types are sent via:

- `POST /partner/app/{appId}/v3/message`

The message "entity" is basically:

- destination user (`to`)
- message `type`
- type-specific payload (`text`, `image`, `interactive`, `template`, `flow`, ...)

Here are the major V3 send entities we can use:

### 5.1 Text (session)
- Docs: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-message-14

### 5.2 Media (session)
Media types exist as V3 send endpoints referencing the same `/v3/message` route:

- Image: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-image-message
- Video: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-video-message
- Audio: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-audio-message-6
- Sticker: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-sticker-message

### 5.3 Reaction (session)
- Docs: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-reaction-message

### 5.4 Interactive messages (session)
Use for buttons, lists, product messages, etc.

- Docs: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-interactive-message

### 5.5 Contact message (session)
- Docs: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-contact-message-6

### 5.6 Template messages (out-of-session + notifications)
Templates are what you use to (a) send notifications and (b) message users outside the 24-hour window.

There are multiple template send examples in the V3 reference section (for example "Interactive Message Templates" and "Location-based Message Templates"):

- Interactive message templates: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-message-10
- Location-based message templates: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-message-11

### 5.7 Flows (in-WhatsApp form UX)
This is the "in WhatsApp form" experience you noticed in other products.

- Send flow message: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-flow-message-6
- WhatsApp Dynamic Flows guide: https://partner-docs.gupshup.io/docs/whatsapp-dynamic-flows
- Flow management guide: https://partner-docs.gupshup.io/docs/get-started-guide-with-gupshup-flow-management-apis

## 6) Media IDs (Supporting Entity For Media Messages)

To send many media messages, you usually need a `mediaId`.

Gupshup provides a media management API for partner apps:

- `POST /partner/app/{appId}/media` (upload file -> mediaId)
  - Docs: https://partner-docs.gupshup.io/reference/post_partner-app-appid-media

## 7) Templates Lifecycle (Create -> Approval -> Send)

### 7.1 Create / submit a template
- `POST /partner/app/{appId}/templates`
  - Docs (example shown for DOCUMENT, but endpoint is the same and `templateType` controls the type): https://partner-docs.gupshup.io/reference/post_partner-app-appid-templates-document
  - Example showing a template with a FLOW button: https://partner-docs.gupshup.io/reference/post_partner-app-appid-create-flow-8

### 7.2 List templates + see status / rejection reasons
- `GET /partner/app/{appId}/templates`
  - Docs: https://partner-docs.gupshup.io/reference/get_partner-app-appid-templates

### 7.3 Edit a template (if needed later)
- `PUT /partner/app/{appId}/templates/{templateId}`
  - Docs: https://partner-docs.gupshup.io/reference/put_partner-app-appid-templates-templateid-1

### 7.4 Upload sample template media (handleId)
If you are creating media templates, you upload sample media to get a `handleId`:

- `POST /partner/app/{appId}/upload/media`
  - Docs: https://partner-docs.gupshup.io/reference/post_partner-app-appid-upload-media-1

### 7.5 Meta template library (shortcut)
You can also fetch templates from the Meta library:

- `GET /partner/app/{appId}/template/metalibrary`
  - Docs: https://partner-docs.gupshup.io/reference/gettemplatesfromlibrary

## 8) Business Profile (Supporting: what end users see)

This is how you read/update the public WhatsApp business profile for a given app.

- Get profile: https://partner-docs.gupshup.io/reference/get_partner-app-appid-business-profile
- Update profile: https://partner-docs.gupshup.io/reference/put_partner-app-appid-business-profile

## 9) Safety / Controls (Supporting Entities)

### 9.1 Block users
If you need to block abusive users:

- Block users: https://partner-docs.gupshup.io/reference/post_partner-app-appid-user-block

## 10) LaundryOps: What We Actually Need First (MVP Mapping)

Based on `context.md` (MVP = inbound order capture + outbound confirmations + scheduled reminders), we need:

1. Subscriptions + webhooks: receive inbound text + delivery statuses (V3 incoming events).
2. Outbound session text: order confirmation / human-like chat inside the 24h window.
3. Templates lifecycle: create "Utility" templates for reminders, wait for approval, then send templates.
4. Optional: Flows to reduce onboarding friction for laundry owners (form inside WhatsApp).

Where each maps in the docs:

- V3 incoming events payloads: https://partner-docs.gupshup.io/docs/passthrough-v3-incoming-events
- V3 send message: https://partner-docs.gupshup.io/reference/post_partner-app-appid-v3-message-14
- Template create/list: https://partner-docs.gupshup.io/reference/post_partner-app-appid-templates-document and https://partner-docs.gupshup.io/reference/get_partner-app-appid-templates
- Subscriptions: https://partner-docs.gupshup.io/reference/setsubscription-api-v3
