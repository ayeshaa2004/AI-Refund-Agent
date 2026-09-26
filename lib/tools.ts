import { findOrderById, markOrderRefunded, Order } from "./data";

type EligibilityResult = {
  eligible: boolean;
  reason: string;
  refundAmount?: number;
  includeShipping?: boolean;
};

export function checkRefundEligibility(order: Order): EligibilityResult {
  if (order.status !== "delivered") {
    return {
      eligible: false,
      reason:
        "Order has not been delivered yet. A refund cannot be processed until delivery; the customer may request a cancellation instead.",
    };
  }
  if (order.refunded) {
    return {
      eligible: false,
      reason:
        "This order has already been refunded. Only one refund is allowed per order.",
    };
  }
  if (order.category === "final_sale") {
    return {
      eligible: false,
      reason:
        "This item is marked as final sale / clearance, which is non-refundable regardless of condition or time since delivery.",
    };
  }
  if (order.condition === "damaged_by_customer") {
    return {
      eligible: false,
      reason:
        "The item was damaged by the customer, which is never eligible for a refund.",
    };
  }
  if (order.condition === "defective") {
    if (order.deliveryDaysAgo <= 14) {
      return {
        eligible: true,
        reason:
          "Item is defective and within the 14-day manufacturer defect window.",
        refundAmount: order.price,
        includeShipping: true,
      };
    }
    return {
      eligible: false,
      reason:
        "Item is defective, but it has been more than 14 days since delivery, exceeding even the extended defect window.",
    };
  }
  if (order.category === "digital") {
    if (order.digitalAccessed) {
      return {
        eligible: false,
        reason:
          "Digital product has already been accessed, making it non-refundable.",
      };
    }
    if (order.deliveryDaysAgo <= 5) {
      return {
        eligible: true,
        reason:
          "Digital product, not yet accessed, within the 5-day digital refund window.",
        refundAmount: order.price,
        includeShipping: false,
      };
    }
    return {
      eligible: false,
      reason:
        "Digital product was not accessed, but it has been more than 5 days since delivery.",
    };
  }
  // Standard physical item, unused
  if (order.deliveryDaysAgo <= 7) {
    return {
      eligible: true,
      reason: "Standard item, unused, within the 7-day return window.",
      refundAmount: order.price,
      includeShipping: false,
    };
  }
  return {
    eligible: false,
    reason: "Standard item, but it has been more than 7 days since delivery.",
  };
}

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "get_order_details",
      description: "Look up an order's full details by its order ID.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The order ID, e.g. ORD-1001",
          },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_refund_eligibility",
      description:
        "Check whether an order is eligible for a refund under the store's refund policy. Always call this before approving or denying a refund.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "The order ID to check." },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "approve_refund",
      description:
        "Approve and process a refund for an order. Only call this after check_refund_eligibility has returned eligible: true.",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string", description: "The order ID to refund." },
        },
        required: ["orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deny_refund",
      description:
        "Deny a refund request and record the reason. Call this after check_refund_eligibility has returned eligible: false.",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The order ID being denied.",
          },
          reason: { type: "string", description: "Why the refund was denied." },
        },
        required: ["orderId", "reason"],
      },
    },
  },
];

function getOrderDetailsTool(args: { orderId: string }) {
  const order = findOrderById(args.orderId);
  if (!order) return { error: `No order found with ID ${args.orderId}` };
  return order;
}

function checkRefundEligibilityTool(args: { orderId: string }) {
  const order = findOrderById(args.orderId);
  if (!order) return { error: `No order found with ID ${args.orderId}` };
  return checkRefundEligibility(order);
}

function approveRefundTool(args: { orderId: string }) {
  const order = findOrderById(args.orderId);
  if (!order) return { error: `No order found with ID ${args.orderId}` };
  const eligibility = checkRefundEligibility(order);
  if (!eligibility.eligible) {
    return {
      error: `Cannot approve: order ${args.orderId} is not eligible. Reason: ${eligibility.reason}`,
    };
  }
  markOrderRefunded(args.orderId);
  return {
    status: "approved",
    orderId: args.orderId,
    refundAmount: eligibility.refundAmount,
    includeShipping: eligibility.includeShipping,
  };
}

function denyRefundTool(args: { orderId: string; reason: string }) {
  return { status: "denied", orderId: args.orderId, reason: args.reason };
}

export function executeTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_order_details":
      return getOrderDetailsTool({ orderId: args.orderId as string });
    case "check_refund_eligibility":
      return checkRefundEligibilityTool({ orderId: args.orderId as string });
    case "approve_refund":
      return approveRefundTool({ orderId: args.orderId as string });
    case "deny_refund":
      return denyRefundTool({
        orderId: args.orderId as string,
        reason: args.reason as string,
      });
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
