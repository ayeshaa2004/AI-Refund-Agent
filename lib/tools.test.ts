import { checkRefundEligibility, executeTool } from "./tools";
import type { Order } from "./data";

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    orderId: "ORD-TEST",
    customerId: "CUST-TEST",
    customerName: "Test Customer",
    email: "test@example.com",
    item: "Test Item",
    price: 1000,
    category: "standard",
    status: "delivered",
    deliveryDaysAgo: 1,
    condition: "unused",
    digitalAccessed: false,
    refunded: false,
    ...overrides,
  };
}

describe("checkRefundEligibility", () => {
  it("denies a refund if the order hasn't been delivered yet", () => {
    const result = checkRefundEligibility(makeOrder({ status: "shipped" }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/not been delivered/i);
  });

  it("denies a refund if the order was already refunded", () => {
    const result = checkRefundEligibility(makeOrder({ refunded: true }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/already been refunded/i);
  });

  it("denies a refund for final-sale items regardless of timing", () => {
    const result = checkRefundEligibility(
      makeOrder({ category: "final_sale", deliveryDaysAgo: 0 }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/final sale/i);
  });

  it("denies a refund for damage caused by the customer", () => {
    const result = checkRefundEligibility(
      makeOrder({ condition: "damaged_by_customer", deliveryDaysAgo: 1 }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/damaged by the customer/i);
  });

  it("approves a defective item within the 14-day window, including shipping", () => {
    const result = checkRefundEligibility(
      makeOrder({ condition: "defective", price: 500, deliveryDaysAgo: 14 }),
    );
    expect(result).toMatchObject({
      eligible: true,
      refundAmount: 500,
      includeShipping: true,
    });
  });

  it("denies a defective item once it's past the 14-day window", () => {
    const result = checkRefundEligibility(
      makeOrder({ condition: "defective", deliveryDaysAgo: 15 }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/more than 14 days/i);
  });

  it("denies a digital item that has already been accessed", () => {
    const result = checkRefundEligibility(
      makeOrder({
        category: "digital",
        digitalAccessed: true,
        deliveryDaysAgo: 1,
      }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/already been accessed/i);
  });

  it("approves an unaccessed digital item within the 5-day window, no shipping", () => {
    const result = checkRefundEligibility(
      makeOrder({
        category: "digital",
        digitalAccessed: false,
        deliveryDaysAgo: 5,
        price: 200,
      }),
    );
    expect(result).toMatchObject({
      eligible: true,
      refundAmount: 200,
      includeShipping: false,
    });
  });

  it("denies an unaccessed digital item once it's past the 5-day window", () => {
    const result = checkRefundEligibility(
      makeOrder({
        category: "digital",
        digitalAccessed: false,
        deliveryDaysAgo: 6,
      }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/more than 5 days/i);
  });

  it("approves a standard unused item within the 7-day window", () => {
    const result = checkRefundEligibility(
      makeOrder({ deliveryDaysAgo: 7, price: 750 }),
    );
    expect(result).toMatchObject({
      eligible: true,
      refundAmount: 750,
      includeShipping: false,
    });
  });

  it("denies a standard unused item once it's past the 7-day window", () => {
    const result = checkRefundEligibility(makeOrder({ deliveryDaysAgo: 8 }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/more than 7 days/i);
  });
});

describe("executeTool", () => {
  it("returns order details for a known order", async () => {
    const result = (await executeTool("get_order_details", {
      orderId: "ORD-1001",
    })) as {
      orderId: string;
      item: string;
    };

    expect(result.orderId).toBe("ORD-1001");
    expect(result.item).toBeTruthy();
  });

  it("returns an error for an unknown order id", async () => {
    const result = (await executeTool("get_order_details", {
      orderId: "ORD-9999",
    })) as {
      error: string;
    };

    expect(result.error).toMatch(/no order found/i);
  });

  it("returns eligible: true for the seeded defective-item order (ORD-1006)", async () => {
    const result = (await executeTool("check_refund_eligibility", {
      orderId: "ORD-1006",
    })) as { eligible: boolean };

    expect(result.eligible).toBe(true);
  });

  it("returns eligible: false for the seeded final-sale order (ORD-1003)", async () => {
    const result = (await executeTool("check_refund_eligibility", {
      orderId: "ORD-1003",
    })) as { eligible: boolean };

    expect(result.eligible).toBe(false);
  });

  it("returns an error for an unrecognized tool name", async () => {
    const result = (await executeTool("not_a_real_tool", {})) as {
      error: string;
    };

    expect(result.error).toMatch(/unknown tool/i);
  });
});

beforeEach(() => {
  jest.resetModules();
});

describe("executeTool: approve_refund / deny_refund (isolated)", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("approves an eligible order and marks it refunded", async () => {
    const { executeTool: freshExecuteTool } = await import("./tools");

    // ORD-1009: standard, unused, delivered 2 days ago -- eligible.
    const before = (await freshExecuteTool("get_order_details", {
      orderId: "ORD-1009",
    })) as { refunded: boolean };

    expect(before.refunded).toBe(false);

    const approval = (await freshExecuteTool("approve_refund", {
      orderId: "ORD-1009",
    })) as {
      status: string;
      orderId: string;
      refundAmount: number;
    };

    expect(approval).toMatchObject({
      status: "approved",
      orderId: "ORD-1009",
    });

    expect(approval.refundAmount).toBeGreaterThan(0);

    const after = (await freshExecuteTool("get_order_details", {
      orderId: "ORD-1009",
    })) as { refunded: boolean };

    expect(after.refunded).toBe(true);
  });

  it("refuses to approve an ineligible order", async () => {
    const { executeTool: freshExecuteTool } = await import("./tools");

    const result = (await freshExecuteTool("approve_refund", {
      orderId: "ORD-1003",
    })) as { error: string };

    expect(result.error).toMatch(/not eligible/i);
  });

  it("records a denial with its reason, without checking eligibility", async () => {
    const { executeTool: freshExecuteTool } = await import("./tools");

    const result = (await freshExecuteTool("deny_refund", {
      orderId: "ORD-1002",
      reason: "Outside the return window.",
    })) as {
      status: string;
      orderId: string;
      reason: string;
    };

    expect(result).toEqual({
      status: "denied",
      orderId: "ORD-1002",
      reason: "Outside the return window.",
    });
  });
});
