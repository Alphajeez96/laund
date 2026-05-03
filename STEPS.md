# Gupshup Integration Roadmap (LaundryOps MVP)

This document turns `context.md` into a concrete checklist for moving from:

- "We can create a Gupshup app per laundry"

to:

- "A laundry can onboard its WhatsApp Business account (WABA), we can receive inbound WhatsApp messages, and we can send outbound confirmations + scheduled reminders reliably."

## Current State (Implemented)

In `src/integrations/gupshup/auth.ts`, we currently support:

- Partner login (partner token)
  - `POST /partner/account/login`
- App management (partner token)
  - `POST /partner/app` (create app)
  - `GET /partner/app/{appId}/details` (fetch app details)
  - `GET /partner/app/{appId}/token` (get app token for the app)

We also persist:

- `Laundry.appId` (Gupshup app ID per tenant).

## MVP Messaging Goals (From context.md)

1. Inbound order capture (WhatsApp -> our webhook -> parse -> persist).
2. Outbound confirmations (immediate response messages).
3. Scheduled reminders:
   - pickup reminders
   - ready notifications

The practical implication: we must implement both:

- inbound webhooks (to ingest messages/events)
- outbound messaging APIs (to send messages)

## Why "Create App" Is Not Enough

Creating a Gupshup app is the start of onboarding. The laundry still needs to complete WhatsApp onboarding so the app becomes "live".

When onboarding completes, Gupshup emits a **Go-Live (onboarding-event)** to your callback, including:

- `appId`
- `phone`
- `waId` (WABA ID)
- `namespace` (Meta template namespace)

## Next Capabilities & Endpoints To Add

This section lists the remaining Gupshup endpoints we should implement in our integration layer, grouped by capability.

### 1) Onboarding (Make a Laundry "Live")

These are Partner Portal onboarding APIs. Most use the **partner token** header:

- `PUT /partner/app/{appId}/onboarding/contact`
  - Set `contactEmail`, `contactName`, `contactNumber` for the WABA onboarding journey.
- `GET /partner/app/{appId}/onboarding/embed/link`
  - Generate the signed embedded onboarding link the laundry owner must complete.
- `PUT /partner/app/{appId}`
  - Update onboarding settings such as `templateMessaging` and `storageRegion`.
- `GET /partner/app/list`
  - List/filter apps (admin/ops and debugging).
- Optional recovery:
  - `POST /partner/app/{appId}/onboarding/contact/email/resend`
    - Resend verification email if the owner missed it.

**Data to store after onboarding completes (from Go-Live event payload):**

- `wabaId` (aka `waId`)
- `namespace`
- `businessPhone` (the WABA phone for that app)
- `status`: sandbox vs live (and any restrictions/events we care about)

### 2) Subscriptions + Webhook (Receive Messages, Status, Go-Live, Template Events)

To receive inbound messages and system events, we must register a callback via the **Subscription API**.

Subscription endpoints (app token):

- `POST /partner/app/{appId}/subscription`
- `GET /partner/app/{appId}/subscription`
- `GET /partner/app/{appId}/subscription/{subscriptionId}`
- `PUT /partner/app/{appId}/subscription/{subscriptionId}`
- `DELETE /partner/app/{appId}/subscription/{subscriptionId}`
- Optional bulk cleanup:
  - `DELETE /partner/app/{appId}/subscription`

**Backend work required (non-Gupshup endpoints):**

- Add a public webhook route (e.g. `POST /v1/webhooks/gupshup`)
  - Must ACK quickly: HTTP 2xx with an empty response body.
  - Process asynchronously after ACK.
- Routing logic:
  - Use `gs_app_id` / `appId` from webhook payloads to find the tenant (`Laundry.appId`).
- Event handling (minimum set for MVP):
  - inbound messages (to drive order capture)
  - message status updates (sent/delivered/read/failed)
  - onboarding/system events (Go-Live)
  - template events (approved/rejected), if using templates for reminders

**What to store for operations/debugging:**

- `subscriptionId`, callback `url`, modes/version
- last webhook received time and last error (optional but very useful)

### 3) Outbound Messaging (Confirmations + Reminders)

For MVP you need two outbound capabilities:

1. Session messages (for real-time confirmations, when the customer messages first).
2. Template messages (for scheduled reminders and any business-initiated messages).

Two tracks exist:

- Preferred: v3 messaging
  - `POST /partner/app/{appId}/v3/message`
  - Used for text and template-based messages in a more structured format.
- Fallback/alternative: template messaging API
  - `POST /partner/app/{appId}/template/msg`

Note: In the docs, some app-level endpoints use `Authorization: <PARTNER_APP_TOKEN>`, while others use `token: <PARTNER_APP_TOKEN>`.
Plan for our integration client to support both header names per endpoint.

### 4) Templates (Required For Scheduled Reminders)

If we want to send "pickup reminder" and "ready notification" outside the 24-hour session window, we should manage templates.

Template endpoints (app token):

- `POST /partner/app/{appId}/templates`
  - Create templates (typically UTILITY for reminders).
- `GET /partner/app/{appId}/templates`
  - List templates, approval status, rejection reason.

Optional (only when needed):

- media upload endpoints (for image/document templates)
- edit/delete templates (if we start iterating template content frequently)

## Recommended End-to-End Flow (MVP)

1. Laundry registers in LaundryOps.
2. We create a Gupshup app for that laundry:
   - store `Laundry.appId`.
3. We collect/set contact details for onboarding (owner/admin).
4. We generate an embedded onboarding link and deliver it to the owner (UI or WhatsApp message).
5. We set subscription callback (version 3) for the app.
6. Owner completes onboarding.
7. We receive Go-Live event:
   - persist `wabaId`, `namespace`, `businessPhone`, and mark laundry as live/enabled.
8. We create/get reminder templates and wait for approval.
9. Messaging goes live:
   - inbound messages -> create orders -> confirmations
   - scheduled reminders -> template messages

## Practical Build Order (What To Implement Next)

If you want the shortest path to "we can send reminders":

1. Subscription API wrapper + webhook route in our backend (ingest events).
2. Go-Live event handling + persist `wabaId/namespace/phone/status`.
3. Template create/list wrappers + template event handling.
4. Outbound send wrappers:
   - confirmations (session message)
   - reminders (template message)

