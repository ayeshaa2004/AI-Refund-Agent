import fs from "fs";
import path from "path";
import { redis } from "./redis";

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

const ORDERS_KEY = "refund-agent:orders";

// Reads the original mock data from disk -- used only once, the very
// first time the app runs and Redis doesn't have any data yet.
function loadSeedData(): Order[] {
  const DATA_PATH = path.join(process.cwd(), "data", "customers.json");
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
}

// Every function here is now `async`, because talking to Redis happens
// over the network -- it takes a little time, unlike reading from a
// plain in-memory array which was instant. Every place that calls these
// functions elsewhere in the app will need to `await` them now.

export async function getAllOrders(): Promise<Order[]> {
  const existing = await redis.get<Order[]>(ORDERS_KEY);
  if (existing) return existing;

  // First-ever run: nothing in Redis yet, so seed it from the JSON file.
  const seed = loadSeedData();
  await redis.set(ORDERS_KEY, seed);
  return seed;
}

export async function findOrderById(orderId: string): Promise<Order | undefined> {
  const orders = await getAllOrders();
  return orders.find((o) => o.orderId === orderId);
}

export async function findOrdersByCustomerId(customerId: string): Promise<Order[]> {
  const orders = await getAllOrders();
  return orders.filter((o) => o.customerId === customerId);
}

export async function markOrderRefunded(orderId: string): Promise<Order | undefined> {
  const orders = await getAllOrders();
  const order = orders.find((o) => o.orderId === orderId);
  if (order) {
    order.refunded = true;
    await redis.set(ORDERS_KEY, orders); // write the WHOLE updated list back
  }
  return order;
}