import { getVerdict, formatResult } from "./page";
import type { TraceEntry } from "@/lib/agent";

describe("getVerdict", () => {
  it("returns 'approved' when the trace includes an approve_refund call", () => {
    const trace: TraceEntry[] = [
      { type: "tool_call", tool: "get_order_details", args: {} },
      { type: "tool_call", tool: "check_refund_eligibility", args: {} },
      { type: "tool_call", tool: "approve_refund", args: {} },
    ];
    expect(getVerdict(trace)).toBe("approved");
  });

  it("returns 'denied' when the trace includes a deny_refund call", () => {
    const trace: TraceEntry[] = [
      { type: "tool_call", tool: "deny_refund", args: {} },
    ];
    expect(getVerdict(trace)).toBe("denied");
  });

  it("returns null when no decision has been made yet", () => {
    const trace: TraceEntry[] = [
      { type: "tool_call", tool: "get_order_details", args: {} },
      { type: "final_answer", content: "Let me check that for you." },
    ];
    expect(getVerdict(trace)).toBeNull();
  });
});

describe("formatResult", () => {
  it("formats an error result the same way regardless of tool", () => {
    expect(formatResult("get_order_details", { error: "No order found" })).toBe(
      "Error — No order found"
    );
  });

  it("formats get_order_details as a readable sentence", () => {
    const text = formatResult("get_order_details", {
      item: "Yoga Mat Premium",
      price: 1200,
      category: "standard",
      status: "delivered",
      deliveryDaysAgo: 3,
      condition: "unused",
      refunded: false,
    });
    expect(text).toBe(
      "Yoga Mat Premium — ₹1200, standard, delivered, delivered 3 day(s) ago, condition: unused."
    );
  });

  it("notes when an order was already refunded", () => {
    const text = formatResult("get_order_details", {
      item: "Wool Scarf",
      price: 500,
      category: "standard",
      status: "delivered",
      deliveryDaysAgo: 10,
      condition: "unused",
      refunded: true,
    });
    expect(text).toMatch(/already refunded/);
  });

  it("formats an eligible check_refund_eligibility result with the refund amount", () => {
    const text = formatResult("check_refund_eligibility", {
      eligible: true,
      reason: "Standard item, unused, within the 7-day return window.",
      refundAmount: 999,
      includeShipping: true,
    });
    expect(text).toBe(
      "Eligible — Standard item, unused, within the 7-day return window. Refund would be ₹999 (including shipping)."
    );
  });

  it("formats an ineligible check_refund_eligibility result without a refund amount", () => {
    const text = formatResult("check_refund_eligibility", {
      eligible: false,
      reason: "This item is marked as final sale.",
    });
    expect(text).toBe("Not eligible — This item is marked as final sale.");
  });

  it("formats approve_refund", () => {
    const text = formatResult("approve_refund", {
      status: "approved",
      orderId: "ORD-1009",
      refundAmount: 1500,
      includeShipping: false,
    });
    expect(text).toBe("Approved — ₹1500 refunded for order ORD-1009.");
  });

  it("formats deny_refund", () => {
    const text = formatResult("deny_refund", {
      status: "denied",
      reason: "Outside the return window.",
    });
    expect(text).toBe("Denied — Outside the return window.");
  });

  it("falls back to JSON for an unrecognized tool", () => {
    const text = formatResult(
      "some_future_tool",
      { foo: "bar" } as unknown as Parameters<typeof formatResult>[1]
    );
    expect(text).toBe('{"foo":"bar"}');
  });
});