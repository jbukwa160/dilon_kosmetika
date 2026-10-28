// The waybill page's actions: { number, k, action: "create", weightKg, parcels, declare, boxSize } or { …, action: "cancel" }.
// POST only, so mail scanners that open the e-mail's link never create anything.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { findOrder } from "@/lib/orders";
import { cancelWaybill, createWaybill, isWaybillKey } from "@/lib/waybills";

const schema = z.object({
  number: z.string().max(40),
  k: z.string().max(64),
  action: z.enum(["create", "cancel"]),
  weightKg: z.number().min(0.1).max(50).optional(),
  parcels: z.number().int().min(1).max(10).optional(),
  declare: z.boolean().optional(),
  boxSize: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Невалидна заявка." }, { status: 400 });
  const input = parsed.data;
  if (!isWaybillKey(input.number, input.k)) return NextResponse.json({ error: "Линкът не е валиден." }, { status: 404 });
  const order = await findOrder(input.number);
  if (!order) return NextResponse.json({ error: "Поръчката не е намерена." }, { status: 404 });

  const result =
    input.action === "cancel"
      ? await cancelWaybill(order)
      : await createWaybill(order, {
          weightKg: Math.round((input.weightKg ?? 1) * 100) / 100,
          parcels: input.parcels ?? 1,
          declaredValue: input.declare ? Math.round((order.subtotal - order.discount) * 100) / 100 : 0,
          boxSize: input.boxSize,
        });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json({ ok: true });
}
