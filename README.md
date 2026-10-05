# AI Refund Support Agent

An AI-powered customer support agent for an e-commerce store that autonomously processes or denies refund requests. Built with Next.js, TypeScript, Groq, and Upstash Redis, using raw function/tool calling to enforce a strict refund policy.

> Built as a take-home assignment for the Next.js Developer role at Jobform Automator.

## Demo Video

📺 [Watch the full walkthrough](YOUR_LOOM_LINK)

## What It Does

A customer chats with the agent about a refund. The agent doesn't guess whether the refund is allowed — it calls tools that retrieve order information and check the request against a written refund policy.

The refund decision is enforced in code, so the LLM cannot approve an ineligible refund on its own.

Every tool call, tool result, and final decision is recorded and shown on an admin dashboard.

## Features

- 🛍️ **Mock CRM** — 15 customer profiles / orders designed to exercise different refund-policy rules
- 📜 **Strict written refund policy** — the policy is provided to the agent and enforced by application code
- 🤖 **Agent loop with real tool calling** — implemented using raw function calling without LangGraph or CrewAI
- 🔒 **Policy enforced in code** — `approve_refund` re-checks eligibility before processing the refund
- 💬 **Chat interface** — customer-facing, WhatsApp-style conversation UI
- 📊 **Admin dashboard** — displays customer requests, tool calls, tool results, and final decisions
- 🧾 **APPROVED / DENIED verdict stamps** — determined from the actual tool calls
- 💾 **Persistent storage with Upstash Redis** — orders, refund status, and activity logs are stored outside the server's local memory
- 🧪 **Automated tests** — Jest and React Testing Library tests cover refund logic, tools, log storage, and UI behavior
- 🚀 **Vercel deployment** — deployed as a serverless Next.js application

## Tech Stack

| **Layer** | **Choice** |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| LLM | Groq API — `openai/gpt-oss-120b` |
| Agent pattern | Raw function/tool calling |
| Database | Upstash Redis |
| Testing | Jest + React Testing Library |
| Deployment | Vercel |

**Why raw function calling instead of a framework?**

I wanted the reasoning loop to be fully transparent and easy to walk through in code, rather than hidden inside a framework's internals. Every tool call and decision point is visible in `lib/agent.ts`.

**Why Groq?**

Groq provides fast inference and supports tool calling, which makes it a good fit for an interactive customer-support agent.

**Why Upstash Redis?**

The application runs on Vercel's serverless infrastructure, where different requests can run in different function instances. Using Redis provides shared persistent storage so order state and activity logs can be accessed consistently across requests.

## Architecture

```text
Browser (Chat UI)
│
│ POST /api/chat
│ { customerId, message, history }
▼
/api/chat
│
▼
lib/agent.ts (runAgent)
│
│ system prompt + refund policy
│
├──▶ Groq API
│
│    Tool call requested
│
▼
lib/tools.ts
│
├─ get_order_details
├─ check_refund_eligibility
├─ approve_refund
└─ deny_refund
│
│
▼
lib/data.ts
│
▼
Upstash Redis
│
│ Order data / refund status
│
└──────────────────────────────┐
                               │
runAgent returns reply + trace │
                               ▼
                         /api/chat
                               │
                               ▼
                         lib/logStore.ts
                               │
                               ▼
                         Upstash Redis
                               │
                               ▼
                         /api/logs
                               │
                               ▼
                     Admin Dashboard
                     app/admin/page.tsx
```

The agent continues the tool-calling loop until the model returns a final answer.

Each tool call and tool result is also added to a trace, which is returned to the API route and stored for the admin dashboard.

Refund Policy

Full policy: data/refund-policy.md

A refund is approved only when the order has been delivered, hasn't already been refunded, isn't a final-sale item, and at least one of:

Unused standard item within 7 days of delivery
Confirmed defective item within 14 days of delivery
Digital product that has not been accessed within 5 days of delivery

Everything else is denied.

The rules are implemented in checkRefundEligibility() in lib/tools.ts.

approve_refund also re-checks eligibility before marking an order as refunded, providing an additional safety layer against incorrect LLM decisions.

Project Structure
```
ai-refund-agent/
├── data/
│   ├── customers.json        # 15 mock customer/order records
│   └── refund-policy.md      # Written refund policy
│
├── lib/
│   ├── data.ts               # Redis-backed order data access
│   ├── redis.ts              # Upstash Redis client
│   ├── tools.ts              # Policy logic and tool implementations
│   ├── agent.ts              # Tool-calling loop
│   ├── logStore.ts           # Redis-backed activity log storage
│   ├── tools.test.ts         # Tool and refund-policy tests
│   └── logStore.test.ts      # Log storage tests
│
├── app/
│   ├── page.tsx              # Customer-facing chat UI
│   ├── page.test.tsx         # Chat UI tests
│   ├── admin/
│   │   └── page.tsx          # Admin reasoning-log dashboard
│   │
│   └── api/
│       ├── chat/route.ts     # Runs the agent
│       ├── logs/route.ts     # Returns stored logs
│       └── customers/route.ts # Returns customer list
│
└── README.md
```
Getting Started
Prerequisites
Node.js 20.9+
A Groq API key
An Upstash Redis database
Setup
git clone YOUR_REPOSITORY_URL
cd AI-Refund-Agent
npm install

Create a .env.local file in the project root:

GROQ_API_KEY=your_groq_api_key_here
UPSTASH_REDIS_REST_URL=your_upstash_redis_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token

Do not commit .env.local or any API keys to GitHub.

Run the development server
npm run dev

Open:

http://localhost:3000

Admin dashboard:

http://localhost:3000/admin
Try It
Open the chat UI.
Select a customer from the dropdown.
Ask something like:
I want a refund for my order.
Open /admin in another tab.
Watch the agent's tool calls, results, and final decision appear in the dashboard.

Some customers to try:

Customer	Expected result	Why
Alice Kumar	✅ Approved	Standard item within the return window
Priya Singh	❌ Denied	Final-sale item
Vikram Nair	✅ Approved	Defective item within 14-day exception
Rohan Verma	❌ Denied	Outside the 7-day window

The complete test data is available in data/customers.json.

Testing

The project uses Jest and React Testing Library.

Run the test suite:

npm test

The tests cover:

Refund eligibility rules
Tool execution
Approving and denying refunds
Refund state changes
Redis-backed log storage
Customer chat UI behavior
Admin dashboard logic

A production build can also be checked with:

npm run build
Deployment

The application is deployed on Vercel.

The production application uses:

Vercel for hosting
Upstash Redis for persistent shared storage
Groq API for the LLM

Required Vercel environment variables:

GROQ_API_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

Redis is used instead of local in-memory storage because Vercel can handle different requests using different serverless function instances. Redis provides a shared data store across those requests.

Known Limitations & Next Steps

This was built as a time-boxed assignment, so some production features could be improved further:

Mock CRM data — the application uses seeded mock customer/order data rather than a real e-commerce database.
No voice pipeline — voice integration was not implemented because it was outside the main assignment scope.
Redis writes — the current implementation writes the updated order collection back to Redis. A production system could use more granular database operations.
LLM retry/backoff — a production version could add retry and backoff handling for transient Groq API failures and rate limits.
Authentication — the customer selection simulates an already-authenticated customer session rather than implementing a complete authentication system.
Author

Built by Ayesha Aziz for the Jobform Automator hiring assignment.
