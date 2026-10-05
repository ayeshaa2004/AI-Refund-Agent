# AI Refund Support Agent

An AI-powered customer support agent for an e-commerce store that autonomously processes or denies refund requests. Built with Next.js, TypeScript, and Groq's free LLM API, using raw function/tool calling to enforce a strict refund policy — no exceptions the model invents on its own.

> Built as a take-home assignment for the Next.js Developer role at Jobform Automator.

## Live Demo

🔗 **https://ai-refund-agent-2z2k-1ccpo1eri-ayeshaa2004s-projects.vercel.app/**

📺 [Watch the full video walkthrough](https://www.loom.com/share/229866615bc94888a055e75669c8f9b9)

> Note: data is stored in a free-tier Upstash Redis instance. It may take a
> moment to respond if it's been idle, and the dataset resets periodically
> on the free tier — if the live link ever behaves unexpectedly, the video
> above shows a complete, reliable run-through.

## What It Does

A customer chats with the agent about a refund. The agent doesn't guess whether the refund is allowed — it calls a tool that checks the request against a written refund policy, and only approves or denies based on that tool's real answer. Every tool call, along with its result, is logged and shown live on an admin dashboard, so the agent's reasoning is fully visible rather than a black box.

## Features

- 🛍️ **Mock CRM** — 15 customer profiles / orders, deliberately designed to exercise every rule in the refund policy (boundary cases, exceptions, duplicate refunds, undelivered orders, etc.)
- 📜 **Strict written refund policy** — the same policy document is used both as context for the LLM and as the spec for the code that enforces it
- 🤖 **Agent loop with real tool calling** — implemented as raw function-calling (no framework), using Groq's free, OpenAI-compatible API
- 🔒 **Policy enforced in code, not just prompted** — `approve_refund` independently re-verifies eligibility before processing, so the LLM cannot force through an ineligible refund even if it tries
- 💬 **Chat interface** — customer-facing, WhatsApp-style conversation UI
- 📊 **Admin dashboard** — live feed of every tool call, tool result, and final decision, polling every 2 seconds
- 🧾 **APPROVED / DENIED verdict stamps** — computed directly from the agent's actual tool calls, not guessed from the reply text
- ☁️ **Persistent, shared storage** — orders and logs live in Redis, not in-process memory, so state stays consistent across serverless function instances on Vercel

## Tech Stack

| **Layer**     | **Choice**                                      |
| ------------- | ------------------------------------------------ |
| Framework     | Next.js 14 (App Router)                         |
| Language      | TypeScript                                      |
| Styling       | Tailwind CSS v4                                 |
| LLM           | Groq API — `openai/gpt-oss-120b`                |
| Agent pattern | Raw function/tool calling (no LangGraph/CrewAI) |
| Data storage  | Upstash Redis (serverless-friendly, free tier)  |
| Hosting       | Vercel                                          |

**Why raw function calling instead of a framework?** I wanted the reasoning loop to be fully transparent and easy to walk through in code, rather than hidden inside a framework's internals — every tool call and every decision point is visible in `lib/agent.ts`.

**Why Groq?** It offers a genuinely free API tier with fast inference and solid tool-calling support, which matters for a live demo where response time affects how the walkthrough feels.

**Why Redis instead of a plain in-memory array?** Vercel runs API routes as short-lived serverless functions — different requests can be handled by different, isolated instances, each with its own fresh memory. A plain in-memory array (fine for `localhost`) would make orders and logs inconsistent across requests once deployed. Upstash Redis, accessed over its REST API, gives every function instance a shared, consistent source of truth instead.

## Architecture
```
Browser (Chat UI)
│
│ POST /api/chat { customerId, message, history }
▼
lib/agent.ts (runAgent)
│
│ system prompt = identity + full refund policy text + rules
│
├──▶ Groq API (openai/gpt-oss-120b)
│ │
│ │ "I need to call check_refund_eligibility(orderId)"
│ ▼
├──▶ lib/tools.ts (executeTool dispatcher)
│ │
│ ├─ get_order_details ─────────┐
│ ├─ check_refund_eligibility ──┼──▶ lib/data.ts ──▶ Upstash Redis
│ ├─ approve_refund ────────────┘ (orders, shared across all
│ └─ deny_refund serverless function instances)
│ │
│ ▼
│ result fed back into the conversation
│
◀──── loop continues until Groq returns a final text answer (no more tool_calls)
│
├──▶ every step pushed into a trace array
│
▼
lib/logStore.ts ──▶ Upstash Redis (logs, same shared store)
│
▼
GET /api/logs ──▶ app/admin/page.tsx (polls every 2s, renders the trace)
```

## Refund Policy (Summary)

Full text: [`data/refund-policy.md`](https://github.com/ayeshaa2004/AI-Refund-Agent/blob/main/data/refund-policy.md)

A refund is approved only when the order has been delivered, hasn't already been refunded, isn't a final-sale item, **and** at least one of:

- Unused, standard item, within **7 days** of delivery
- Confirmed **defective**, within **14 days** of delivery (overrides the 7-day window)
- **Digital product**, not yet accessed, within **5 days** of delivery

Everything else is denied. Rules are checked in a specific precedence order in `checkRefundEligibility()` (see `lib/tools.ts`) — final-sale and already-refunded checks happen before anything else, since they override every other rule.

## Project Structure
```
ai-refund-agent/
├── data/
│ ├── customers.json # 15 mock customer/order records (seed data)
│ └── refund-policy.md # the written policy the agent enforces
├── lib/
│ ├── redis.ts # shared Upstash Redis client
│ ├── data.ts # order storage: reads/writes orders in Redis
│ ├── tools.ts # policy logic + tool schemas + tool implementations
│ ├── agent.ts # the tool-calling loop that talks to Groq
│ └── logStore.ts # reasoning-log storage, backed by Redis
├── app/
│ ├── page.tsx # customer-facing chat UI
│ ├── admin/page.tsx # live reasoning-log dashboard
│ └── api/
│ ├── chat/route.ts # runs the agent, returns a reply + trace
│ ├── logs/route.ts # serves the log for the admin dashboard
│ └── customers/route.ts # customer list for the chat dropdown
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Groq API key](https://console.groq.com/) (no credit card required)
- A free [Upstash Redis database](https://upstash.com/) (no credit card required)

### Setup

git clone https://github.com/ayeshaa2004/AI-Refund-Agent.git
cd AI-Refund-Agent
npm install


Create a `.env.local` file in the project root:

GROQ_API_KEY=your_groq_api_key_here
UPSTASH_REDIS_REST_URL=your_upstash_rest_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token_here


Run the dev server:

npm run dev


- Chat UI: [http://localhost:3000](http://localhost:3000)
- Admin dashboard: [http://localhost:3000/admin](http://localhost:3000/admin)

The first request will automatically seed Redis from `data/customers.json` — no manual setup needed beyond the environment variables above.

### Try it

1. Open the chat UI, select a customer from the dropdown (simulating an already-authenticated session).
2. Say something like *"I want a refund for my order."*
3. Open `/admin` in a second tab to watch the agent's tool calls and decision live as you chat.

Some customers to try, to see both outcomes:

| **Customer** | **Expected result** | **Why**                            |
| ------------ | -------------------- | ----------------------------------- |
| Alice Kumar  | ✅ Approved          | Standard item, 5 days, unused      |
| Priya Singh  | ❌ Denied            | Final sale item                    |
| Vikram Nair  | ✅ Approved          | Defective, within 14-day exception |
| Rohan Verma  | ❌ Denied            | 20 days — past the 7-day window    |

Full test matrix in `data/customers.json`.

## Deployment

Deployed on Vercel. To deploy your own copy:

1. Push this repo to your own GitHub account.
2. Import it into Vercel.
3. Add the same three environment variables (`GROQ_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) in Vercel's Project Settings → Environment Variables.
4. Deploy.

No other configuration is needed — the Redis-backed storage means the app behaves consistently across Vercel's serverless function instances, unlike a plain in-memory store.

## Known Limitations & Next Steps

Built as a time-boxed assignment; these are deliberate simplifications I'd address in a larger production version:

- **No voice pipeline** — the bonus voice integration (OpenAI Realtime/ElevenLabs/LiveKit) wasn't implemented, given the timeline.
- **No automated tests** — the eligibility logic was manually verified against all 15 mock customers before writing the TypeScript, but there's no test suite committed.
- **Single LLM call path, no retry/backoff** — a production version should retry transient Groq API failures (rate limits, 5xx errors) rather than surfacing them directly to the customer.
- **Redis free tier limits** — Upstash's free tier has request and storage caps appropriate for a demo, but would need a paid tier or a traditional database (e.g. Postgres) for real production traffic.

## Author

Built by Ayesha Aziz for the Jobform Automator hiring assignment.
