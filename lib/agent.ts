import fs from "fs";
import path from "path";
import { toolDefinitions, executeTool } from "./tools";
import { findOrdersByCustomerId } from "./data";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

const POLICY_TEXT = fs.readFileSync(
  path.join(process.cwd(), "data", "refund-policy.md"),
  "utf8",
);

export type TraceEntry =
  | { type: "tool_call"; tool: string; args: Record<string, unknown> }
  | { type: "tool_result"; tool: string; result: unknown }
  | { type: "final_answer"; content: string };

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: unknown[];
  tool_call_id?: string;
  name?: string;
};

async function callGroq(messages: ChatMessage[]) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error (${res.status}): ${errText}`);
  }

  return res.json();
}

export async function runAgent(
  customerId: string,
  userMessage: string,
  history: ChatMessage[],
): Promise<{ reply: string; trace: TraceEntry[] }> {
  const trace: TraceEntry[] = [];

  const orders = findOrdersByCustomerId(customerId);
  const orderSummary =
    orders.map((o) => `${o.orderId}: ${o.item} (₹${o.price})`).join(", ") ||
    "No orders found for this customer.";

  const systemPrompt = `You are an AI customer support agent for an e-commerce store, handling refund requests.

You are currently speaking with customer ID ${customerId}. Their order on file: ${orderSummary}.

You must follow this refund policy exactly. Do not invent exceptions or make assumptions beyond what is written here:

${POLICY_TEXT}

Rules for how you must behave:
- Don't assume the customer is here about a refund. If they just say hello or haven't told you what's wrong yet, greet them normally and ask how you can help -- don't jump straight into refund questions.
- You already know which order this customer is asking about (the one listed above), so don't ask them to confirm the order ID unless they mention a different one.
- Never guess whether a refund is eligible. Always call the check_refund_eligibility tool first, once the customer has actually described the issue or asked for a refund.
- Never approve or deny a refund without first checking eligibility.
- Explain your decision to the customer in plain, friendly language, referencing the specific policy reason.
- Be concise. Do not quote the policy document verbatim -- summarize the reason in your own words.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  const MAX_STEPS = 6;

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await callGroq(messages);
    const message = response.choices[0].message;

    if (message.tool_calls && message.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: message.content ?? null,
        tool_calls: message.tool_calls,
      });

      for (const call of message.tool_calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        trace.push({ type: "tool_call", tool: call.function.name, args });

        const result = executeTool(call.function.name, args);
        trace.push({ type: "tool_result", tool: call.function.name, result });

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    const reply = message.content ?? "";
    trace.push({ type: "final_answer", content: reply });
    return { reply, trace };
  }

  return {
    reply:
      "I'm having trouble completing this request right now. Please try again or contact a human agent.",
    trace,
  };
}
