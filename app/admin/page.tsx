"use client";

import { useEffect, useRef, useState } from "react";
import type { TraceEntry } from "@/lib/agent";

type LogEntry = {
  id: number;
  timestamp: string;
  customerId: string;
  userMessage: string;
  reply: string;
  trace: TraceEntry[];
};

export function getVerdict(trace: TraceEntry[]): "approved" | "denied" | null {
  for (const step of trace) {
    if (step.type === "tool_call" && step.tool === "approve_refund")
      return "approved";
    if (step.type === "tool_call" && step.tool === "deny_refund")
      return "denied";
  }
  return null;
}

type ToolResult = {
  error?: string;
  eligible?: boolean;
  reason?: string;
  refundAmount?: number;
  includeShipping?: boolean;
  status?: string;
  orderId?: string;
  item?: string;
  price?: number;
  category?: string;
  deliveryDaysAgo?: number;
  condition?: string;
  refunded?: boolean;
};

export function formatResult(tool: string, result: ToolResult): string {
  if (result?.error) return `Error — ${result.error}`;

  switch (tool) {
    case "get_order_details":
      return `${result.item} — ₹${result.price}, ${result.category}, ${result.status}, delivered ${result.deliveryDaysAgo} day(s) ago, condition: ${result.condition}${result.refunded ? ", already refunded" : ""}.`;

    case "check_refund_eligibility": {
      const amount =
        result.eligible && result.refundAmount
          ? ` Refund would be ₹${result.refundAmount}${result.includeShipping ? " (including shipping)" : ""}.`
          : "";
      return `${result.eligible ? "Eligible" : "Not eligible"} — ${result.reason}${amount}`;
    }

    case "approve_refund":
      return `Approved — ₹${result.refundAmount}${result.includeShipping ? " including shipping" : ""} refunded for order ${result.orderId}.`;

    case "deny_refund":
      return `Denied — ${result.reason}`;

    default:
      return JSON.stringify(result);
  }
}

export default function AdminPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchLogs() {
    try {
      const res = await fetch("/api/logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {}
  }

  useEffect(() => {
    intervalRef.current = setInterval(fetchLogs, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const reversedLogs = [...logs].reverse();

  return (
    <main className="min-h-screen bg-paper px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs tracking-[0.2em] uppercase text-gold font-mono mb-1">
          Internal
        </p>
        <h1 className="font-display text-3xl text-ink mb-1">
          Reasoning Ledger
        </h1>
        <p className="text-sm text-ink-muted mb-8">
          Live agent tool calls and decisions. Refreshes every 2 seconds.
        </p>

        {reversedLogs.length === 0 && (
          <p className="text-ink-muted text-sm">
            No conversations yet — go chat with the agent on the main page.
          </p>
        )}

        <div className="space-y-5">
          {reversedLogs.map((log) => {
            const verdict = getVerdict(log.trace);
            return (
              <div
                key={log.id}
                className="relative bg-white rounded-2xl border border-line p-5
                           shadow-[0_1px_3px_rgba(31,35,32,0.06)] overflow-hidden"
              >
                {verdict && (
                  <div
                    className={`absolute top-4 right-4 rotate-[-8deg] border-2 rounded-md
                                px-3 py-1 text-xs font-mono font-bold uppercase tracking-widest
                                ${
                                  verdict === "approved"
                                    ? "border-approve text-approve"
                                    : "border-deny text-deny"
                                }`}
                  >
                    {verdict}
                  </div>
                )}

                <div className="flex justify-between items-baseline mb-3 pr-24">
                  <span className="font-mono text-xs text-ink-muted">
                    {log.customerId}
                  </span>
                  <span className="font-mono text-xs text-ink-muted">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <p className="text-sm text-ink border-l-2 border-gold pl-3 mb-3 italic">
                  <span className="text-ink-muted font-mono text-xs uppercase mr-2 not-italic">
                    Customer
                  </span>
                  {log.userMessage}
                </p>

                {log.trace.length > 0 && (
                  <div className="bg-paper-dim border border-line rounded-xl p-3 mb-3 space-y-1.5">
                    {log.trace.map((step, i) => (
                      <div key={i} className="text-xs font-mono">
                        {step.type === "tool_call" && (
                          <div className="text-ink-muted">
                            <span className="text-gold">→</span> calling{" "}
                            <b className="text-ink">{step.tool}</b>(
                            {JSON.stringify(step.args)})
                          </div>
                        )}
                        {step.type === "tool_result" && (
                          <div className="text-ink-muted whitespace-pre-wrap pl-4 font-sans not-italic">
                            <span className="text-approve font-mono">←</span>{" "}
                            {formatResult(step.tool, step.result as ToolResult)}
                          </div>
                        )}
                        {step.type === "final_answer" && (
                          <div className="text-ink-muted italic pl-4">
                            — final answer generated
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-sm text-ink">
                  <span className="text-ink-muted font-mono text-xs uppercase mr-2">
                    Agent
                  </span>
                  {log.reply}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
