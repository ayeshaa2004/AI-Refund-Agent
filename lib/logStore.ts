import { redis } from "./redis";
import { TraceEntry } from "./agent";

export type LogEntry = {
  id: string;
  timestamp: string;
  customerId: string;
  userMessage: string;
  reply: string;
  trace: TraceEntry[];
};

const LOGS_KEY = "refund-agent:logs";

export async function addLog(entry: Omit<LogEntry, "id" | "timestamp">) {
  const logs = (await redis.get<LogEntry[]>(LOGS_KEY)) || [];

  const full: LogEntry = {
    // Date.now() + a random suffix is unique enough for a log id here --
    // unlike the old nextId++ counter, this doesn't require asking Redis
    // "what's the next number" first, so it's one less network round-trip.
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  logs.push(full);
  await redis.set(LOGS_KEY, logs);
  return full;
}

export async function getLogs(): Promise<LogEntry[]> {
  return (await redis.get<LogEntry[]>(LOGS_KEY)) || [];
}