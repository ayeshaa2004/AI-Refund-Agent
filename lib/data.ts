import fs from "fs";
import path from "path";

export type Order = {
  orderId: string;
  customerId: string;
  customerName: string;
  email: string;
  item: string;
  price: number;
  category: "standard" | "final_sale" | "digital";
  status: "delivered" | "shipped" | "processing";
  deliveryDaysAgo: number;
  condition: "unused" | "damaged_by_customer" | "defective";
  digitalAccessed: boolean;
  refunded: boolean;
};

const DATA_PATH = path.join(process.cwd(), "data", "customers.json");

const orders: Order[] = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

export function getAllOrders(): Order[] {
  return orders;
}

export function findOrderById(orderId: string): Order | undefined {
  return orders.find((o) => o.orderId === orderId);
}

export function findOrdersByCustomerId(customerId: string): Order[] {
  return orders.filter((o) => o.customerId === customerId);
}

export function markOrderRefunded(orderId: string): Order | undefined {
  const order = findOrderById(orderId);
  if (order) {
    order.refunded = true;
  }
  return order;
}
