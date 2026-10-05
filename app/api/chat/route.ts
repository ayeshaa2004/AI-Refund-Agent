import { NextRequest, NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { addLog } from "@/lib/logStore";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, message, history } = body;

    if (!customerId || !message) {
      return NextResponse.json(
        { error: "customerId and message are required." },
        { status: 400 },
      );
    }

    const { reply, trace } = await runAgent(customerId, message, history || []);

    await addLog({ customerId, userMessage: message, reply, trace });

    return NextResponse.json({ reply, trace });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
