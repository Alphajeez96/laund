# 🎯 Job Hunt Scraping Interface

## Overview

A **secondary persona** that activates when an inbound WhatsApp message starts with the exact prefix `JOB HUNT`. It switches the system from laundry-ops mode into a job scraping assistant that searches predefined sites, processes results through an LLM with a dedicated prompt, and returns formatted job listings.

---

## Trigger

```
Message starts with "JOB HUNT"
```

The remainder of the message is treated as the job search query (e.g. `JOB HUNT senior react developer remote`).

---

## Message Flow

```
WhatsApp → Webhook (204 ACK)
               │
               ▼
        "JOB HUNT" prefix?
           YES        NO
            │          │
            ▼          ▼
    Send status msg   Normal laundry
    "Searching..."    ops pipeline
            │
            ▼ (setImmediate)
    ┌─────────────────────────────────────┐
    │          JobHuntService             │
    │                                     │
    │  1. Parse query from message        │
    │  2. Run predefined Google searches  │
    │  3. Scrape predefined job sites     │
    │  4. Feed raw results to LLM         │
    │     with job-hunt persona prompt    │
    │  5. LLM filters + formats output    │
    │  6. Send formatted reply via WhatsApp│
    └─────────────────────────────────────┘
```

---

## Architecture

### New Files

| File | Purpose |
|---|---|
| `src/modules/job-hunt/job-hunt.prompt.ts` | The "persona" system prompt — site list, Google queries, filtering rules, output format |
| `src/modules/job-hunt/job-hunt.service.ts` | Orchestrator: parse → search → LLM → format → reply |
| `src/modules/job-hunt/job-hunt.types.ts` | TypeScript types (JobListing, JobSearchConfig, etc.) |
| `src/modules/job-hunt/job-hunt.config.ts` | Predefined site list + Google query templates |
| `src/lib/scraper.ts` | Web scraping utility (fetch + cheerio + per-site parsers) |
| `src/lib/google-search.ts` | Google search client (Custom Search JSON API or SERP scrape) |

### Modified Files

| File | Change |
|---|---|
| `src/modules/webhook/gupshup.service.ts` | Add `msg.startsWith("JOB HUNT")` check → route to `JobHuntService` |

---

## Components

### 1. Trigger Detection (`gupshup.service.ts`)

```ts
const text = msg.body;
if (text.startsWith("JOB HUNT")) {
  const query = text.slice(9).trim();
  await MessagingService.sendText(
    laundry.whatsappNumber,
    from,
    "Searching for jobs, this may take a moment..."
  );
  setImmediate(() => JobHuntService.execute(laundry, from, query));
  return;
}
// ... existing laundry-ops pipeline
```

### 2. Scraping Layer (`scraper.ts`)

- Library: [cheerio](https://github.com/cheeriojs/cheerio) (lightweight, fast, no browser)
- Each site gets a custom parser function (CSS selectors differ per site)
- Fallback to `puppeteer` (headless Chrome) for JS-rendered sites that block simple fetches
- Per-request timeout: 10s
- Sequential requests with 1-2s delay between sites (avoid rate limiting)
- Extracts: title, company, location, description snippet, application link, submission email

```ts
interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  email?: string; // "send resume to X@Y.com"
  source: string; // which site
}
```

### 3. Google Search (`google-search.ts`)

Two options:

| Approach | Pros | Cons |
|---|---|---|
| **Custom Search JSON API** | Reliable, structured JSON, 100 queries/day free | Paid beyond free tier |
| **SERP scraping** | Free | Fragile, may get blocked |

Recommendation: Start with **Custom Search JSON API** for stability. The search engine config (`cx`) should be set to search the entire web.

Google queries are predefined templates in `job-hunt.config.ts`:

```ts
export const GOOGLE_QUERIES = [
  "{query} site:linkedin.com/jobs",
  "{query} site:indeed.com",
  "{query} site:glassdoor.com",
  // Any custom filtered queries
];
```

### 4. The Persona Prompt (`job-hunt.prompt.ts`)

```ts
export const JOB_HUNT_PROMPT = `You are a job search assistant.

WEBSITES (results provided below):
- LinkedIn, Indeed, Glassdoor, and any other sites from Google search

For each job found, extract:
- Job title
- Company name
- Location — detail down to the requirement. Do NOT assume demographic restrictions.
  Only exclude if the posting explicitly says e.g. "Only for candidates in the UK".
- If the posting requires email submission, include the email address
- Direct application link

FILTERING RULES:
- Only exclude a job if it explicitly states a demographic restriction
- Do NOT infer restrictions from location alone
- Do NOT assume visa requirements unless stated

OUTPUT FORMAT:
Return a numbered list. Group by source site.
Include a summary: total found, total excluded, and why.`;
```

### 5. LLM Processing

```
Raw scraped HTML/text
        │
        ▼
Concatenate into one text block
(with site-name headers)
        │
        ▼
Send to Ollama:
  System: JOB_HUNT_PROMPT
  User:  "Query: {query}\n\nResults:\n{rawText}"
        │
        ▼
LLM returns filtered, formatted output
        │
        ▼
Send back via MessagingService.sendText()
```

---

## Dependencies

```bash
pnpm add cheerio
# Optional, for JS-heavy sites:
pnpm add puppeteer
```

---

## Output Format (WhatsApp Reply)

```
🔍 Jobs for "senior react developer"
━━━━━━━━━━━━━━━━━━━━━━━

📌 LinkedIn (3 jobs)
1. Senior React Engineer - Acme Corp
   Location: Remote (US) - open globally
   Apply: https://linkedin.com/jobs/xxx

2. React Developer - Beta Inc
   Location: London, UK - explicitly says "UK only" → EXCLUDED

📌 Indeed (2 jobs)
3. Senior Frontend Engineer - Gamma Co
   Location: Berlin, Germany - no demographic restriction listed
   Email: apply@gamma.co
   Apply: https://indeed.com/viewjob?jk=xxx

4. React Lead - Delta Ltd
   Location: Remote - open globally
   Apply: https://indeed.com/viewjob?jk=yyy

━━━━━━━━━━━━━━━━━━━━━━━
Found: 5 | Excluded: 1 (demographic filter)
```

---

## Implementation Order

1. `pnpm add cheerio puppeteer`
2. Create `src/modules/job-hunt/job-hunt.types.ts`
3. Create `src/modules/job-hunt/job-hunt.config.ts` (site list + Google query templates)
4. Create `src/lib/scraper.ts` (fetch + cheerio + per-site parsers)
5. Create `src/lib/google-search.ts` (Custom Search API or SERP)
6. Create `src/modules/job-hunt/job-hunt.prompt.ts`
7. Create `src/modules/job-hunt/job-hunt.service.ts` (orchestrator)
8. Modify `src/modules/webhook/gupshup.service.ts` (trigger detection + routing)
9. Test end-to-end

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Sites block scraping | User-agent rotation, request delays, puppeteer fallback |
| Google rate limits | Use Custom Search API with backoff, cache results |
| LLM hallucinates details | Always include source URL; instruct LLM to preserve verbatim text |
| Scraping timeouts | 10s per-request limit, skip failing sites, log errors |
| Anti-bot captchas | Skip site, log failure, move to next |
| Outbound messaging not wired | Ensure `MessagingService.sendText()` is uncommented for this path |

---

## Future Enhancements

- Per-laundry site/queries config (stored in DB)
- Scheduled recurring job searches (cron)
- Save job listings to database for history
- Click tracking for application links
- Multiple LLM models per persona (swap based on task complexity)
