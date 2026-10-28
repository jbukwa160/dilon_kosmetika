import { after, NextResponse, type NextRequest } from "next/server";
import {
  buildOrder, checkOffice, deliveryIssues, isOwnMessage, mailOrder, MESSAGES, OrderError, orderSchema, recordOrder, saveOrder,
  tooManyAttempts, tooManyOrders, where,
} from "@/lib/orders";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: MESSAGES.invalid }, { status: 400 });
  }
  if (tooManyAttempts(ip)) return NextResponse.json({ error: MESSAGES.busy }, { status: 429 });

  const parsed = orderSchema().safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = typeof body === "object" && body ? deliveryIssues(body as Record<string, unknown>) : {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      // zod's own default messages are English and technical; replace them with a plain "fill in this field".
      fields[key] ??= isOwnMessage(issue.message) ? issue.message : MESSAGES.required;
    }
    // A filled honeypot means a bot: answer like a success so it does not retry, but save nothing.
    if (fields.website) return NextResponse.json({ number: "OM-000000-0000", total: 0 });
    return NextResponse.json({ error: MESSAGES.check, fields }, { status: 422 });
  }

  if (tooManyOrders(ip)) return NextResponse.json({ error: MESSAGES.busy }, { status: 429 });

  try {
    const order = buildOrder(await checkOffice(parsed.data));
    await saveOrder(order);
    recordOrder(ip);
    after(() => mailOrder(order));
    return NextResponse.json({
      number: order.number,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      email: order.customer.email,
      delivery: order.delivery.label,
      where: where(order),
      emailSent: Boolean(process.env.SMTP_HOST),
    });
  } catch (err) {
    if (err instanceof OrderError) return NextResponse.json({ error: err.message, fields: err.fields }, { status: Object.keys(err.fields).length ? 422 : 409 });
    console.error("[orders] could not save order", err);
    return NextResponse.json({ error: MESSAGES.failed }, { status: 500 });
  }
}
