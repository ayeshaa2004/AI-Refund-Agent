import { TraceEntry } from "./agent";

export type LogEntry = {
  id: number;
  timestamp: string;
  customerId: string;
  userMessage: string;
  reply: string;
  trace: TraceEntry[];
};

const logs: LogEntry[] = [];
let nextId = 1;

export function addLog(entry: Omit<LogEntry, "id" | "timestamp">) {
  const full: LogEntry = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  logs.push(full);
  return full;
}

export function getLogs(): LogEntry[] {
  return logs;
}
