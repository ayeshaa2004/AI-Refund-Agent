"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Customer = {
  customerId: string;
  customerName: string;
  orderId: string;
  item: string;
};

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then((data) => setCustomers(data.customers));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !customerId || loading) return;

    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          message: userMsg.content,
          history: messages,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.reply },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Something went wrong reaching the server.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper flex justify-center px-4 py-10">
      <div className="w-full max-w-2xl flex flex-col h-[calc(100vh-5rem)]">
        {/* Header */}
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-gold font-mono mb-1">
                Refund Desk
              </p>
              <h1 className="font-display text-3xl text-ink">
                AI Customer Support
              </h1>
            </div>

            <Link
              href="/admin"
              className="shrink-0 bg-white border border-line rounded-full px-4 py-2
                         text-sm text-ink hover:border-gold hover:text-gold
                         transition flex items-center gap-1.5"
            >
              <span className="font-mono text-xs">⌁</span>
              Admin Dashboard
            </Link>
          </div>
          <div className="h-px bg-line mt-4" />
        </div>
        {/* Customer selector */}
        <div className="mb-5">
          <label className="text-xs uppercase tracking-wide text-ink-muted font-mono block mb-1.5">
            Logged in as
          </label>
          <select
            className="w-full bg-white border border-line rounded-xl px-4 py-3 text-ink
                       focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold
                       transition"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setMessages([]);
            }}
          >
            <option value="">-- select customer --</option>
            {customers.map((c) => (
              <option key={c.customerId} value={c.customerId}>
                {c.customerName} — {c.item} ({c.orderId})
              </option>
            ))}
          </select>
        </div>

        {/* Chat window */}
        <div
          className="flex-1 overflow-y-auto rounded-2xl border border-line bg-white/70
                     shadow-[0_1px_3px_rgba(31,35,32,0.06)] p-5 mb-5 space-y-4"
        >
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-center">
              <p className="text-ink-muted text-sm max-w-xs">
                Select a customer above, then say something like{" "}
                <span className="italic">
                  &quot;I want a refund for my order&quot;
                </span>
                .
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`rounded-2xl px-4 py-3 max-w-[80%] whitespace-pre-wrap text-[15px] leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-ink text-paper rounded-br-md"
                    : "bg-paper-dim text-ink border border-line rounded-bl-md"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-ink-muted text-sm font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse [animation-delay:300ms]" />
              <span className="ml-1">agent is thinking</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            className="flex-1 bg-white border border-line rounded-full px-5 py-3 text-ink
                       placeholder:text-ink-muted focus:outline-none focus:ring-2
                       focus:ring-gold/40 focus:border-gold transition"
            placeholder={
              customerId ? "Type your message..." : "Select a customer first"
            }
            value={input}
            disabled={!customerId || loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={!customerId || loading}
            className="bg-ink text-paper px-6 py-3 rounded-full font-medium
                       hover:bg-ink/90 disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
