# 🧺 LaundryOps — System Overview (MVP)

## 🎯 Purpose

LaundryOps is a **WhatsApp-first automation system** for small laundry businesses.
It enables laundries to:

- Record customer orders via WhatsApp (text-based prompts)
- Automatically track and manage orders
- Send reminders to customers (pickup, ready notifications)
- Maintain lightweight accounting (revenue tracking)
- View customer history and business activity

The system is designed with a core philosophy:

> **“Alerts, not dashboards”** — minimal UI, maximum automation via messaging

---

# 🧠 Core System Model

LaundryOps is a **multi-tenant, event-driven system** where:

- Each **laundry** is a tenant
- Each tenant has:
  - customers
  - orders
  - reminders
  - revenue data

---

## 🔁 Core Flow

1. Laundry sends message via WhatsApp:

   ```
   "record order: 3 shirts, pickup saturday, 0803xxxxxxx"
   ```

2. System:
   - Receives webhook from WhatsApp (Meta Cloud API)
   - Identifies the laundry (tenant)
   - Parses message into structured data
   - Finds or creates customer
   - Creates order + order items
   - Sends confirmation message

3. Later:
   - Scheduler triggers reminders
   - Messages are sent to customer via WhatsApp

---

# 🧩 System Components

## 1. Messaging Layer

- Provider: Meta WhatsApp Cloud API
- Handles:
  - inbound messages (webhooks)
  - outbound messages (notifications)

---

## 2. Backend API

Responsibilities:

- Webhook handling
- Message parsing
- Business logic
- Database interaction
- Scheduling reminders

---

## 3. Parser Engine (MVP)

Initial approach:

- Rule-based (regex + keyword matching)

Parses:

- item quantities (e.g. "3 shirts")
- pickup dates (via chrono parsing)
- phone numbers

---

## 4. Scheduler

- Runs periodically (cron)
- Sends reminders:
  - pickup reminders
  - ready notifications

---

## 5. Database

Relational database (PostgreSQL recommended)

---

# 🗄️ Data Model

## Tables

### LAUNDRIES

- `id (UUID, PK)`
- `name`
- `whatsapp_number (UNIQUE)`
- `created_at`
- `updated_at`

---

### CUSTOMERS

- `id (UUID, PK)`
- `laundry_id (UUID, FK)`
- `phone_number (NOT NULL)`
- `name (nullable)`
- `created_at`
- `updated_at`

**Constraint:**

```
UNIQUE(laundry_id, phone_number)
```

---

### ORDERS

- `id (UUID, PK)`
- `laundry_id (UUID, FK)`
- `customer_id (UUID, FK)`
- `pickup_date (DATE)`
- `status (ENUM: pending, picked_up, in_progress, ready, delivered)`
- `is_paid (BOOLEAN)`
- `total_amount (NUMERIC(18,2))`
- `created_at`
- `updated_at`

---

### ORDER_ITEMS

- `id (UUID, PK)`
- `order_id (UUID, FK)`
- `item_name (TEXT)`
- `quantity (INTEGER)`
- `total_price (NUMERIC(18,2))`

---

### REMINDERS

- `id (UUID, PK)`
- `order_id (UUID, FK)`
- `send_at (TIMESTAMP)`
- `type (ENUM: pickup_reminder, ready_notification)`
- `sent (BOOLEAN)`
- `created_at`

---

# 🔐 Data Integrity Rules

- All primary keys use **UUID**
- Foreign keys must match UUID type
- Composite uniqueness enforced:

  ```
  UNIQUE(laundry_id, phone_number)
  ```

- Monetary values use:

  ```
  NUMERIC(18,2)
  ```

- No FLOAT usage for financial data

---

# 🧠 Key Concepts

## Multi-Tenancy

All data is scoped to a laundry:

```
Laundry → Customers → Orders → Items
```

Every query must respect `laundry_id`

---

## Find-or-Create Pattern

When a message is received:

1. Check if customer exists:

   ```
   WHERE laundry_id + phone_number
   ```

2. If not found → create
3. DB constraint ensures no duplicates

---

## Conversation-Based Messaging

- WhatsApp uses 24-hour conversation windows
- Charges are per conversation, not per message
- System should optimize message timing

---

# 🔄 Order Lifecycle

```
pending → picked_up → in_progress → ready → delivered
```

---

# 🔔 Reminder Types

- `pickup_reminder`
  - sent before pickup date

- `ready_notification`
  - sent when order is ready

---

# ⚙️ API Responsibilities

## Webhook Endpoint

- Receives WhatsApp messages
- Extracts:
  - sender number
  - message text

---

## Message Flow

```
Webhook → Extract Message → Identify Laundry → Parse → Persist → Respond
```

---

# 🧪 MVP Scope

## Included

- Order recording via WhatsApp
- Customer auto-creation
- Order + item storage
- Reminder scheduling
- Confirmation messages
- Basic revenue tracking

---

## Excluded (for now)

- Payment processing
- Advanced NLP parsing
- Admin dashboards
- Multi-number customer linking
- Catalog-based pricing

---

# 🚀 Future Enhancements

- Voice message parsing (speech-to-text)
- AI-powered parsing (LLM)
- Customer deduplication across numbers
- Analytics dashboards
- Pricing templates per laundry
- Payment integrations

---

# 🧭 Engineering Principles

- Start simple, iterate fast
- Enforce data integrity at DB level
- Avoid premature abstraction
- Prefer explicit over implicit logic
- Optimize for reliability over complexity

---

# 🧱 Tech Stack (Recommended)

- Backend: Node.js (Fastify or Express)
- Database: PostgreSQL
- ORM: Prisma (optional)
- Messaging: Meta WhatsApp Cloud API
- Scheduler: cron-based (node-cron)

---

# 🔑 Summary

LaundryOps is a:

- **multi-tenant**
- **event-driven**
- **WhatsApp-native**
- **automation-first**

system that transforms manual laundry workflows into structured, trackable, and automated operations.

---

**End of Document**
