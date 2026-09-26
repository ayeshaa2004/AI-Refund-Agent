import { NextResponse } from "next/server";
import { getLogs } from "@/lib/logStore";

export async function GET() {
  return NextResponse.json({ logs: getLogs() });
}



