import { NextResponse } from "next/server";
import { getAllOrders } from "@/lib/data";

export async function GET() {
  const orders = getAllOrders();
  const customers = orders.map((o) => ({
    customerId: o.customerId,
    customerName: o.customerName,
    orderId: o.orderId,
    item: o.item,
  }));
  return NextResponse.json({ customers });
}