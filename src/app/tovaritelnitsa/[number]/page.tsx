import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WaybillPanel } from "@/components/waybill/WaybillPanel";
import { price } from "@/lib/format";
import { findOrder, where } from "@/lib/orders";
import { getCarrier, parcelWeightKg, trackingUrl } from "@/lib/shipping";
import { CARRIERS } from "@/lib/site";
import { getShipment, isWaybillKey } from "@/lib/waybills";

export const metadata: Metadata = { title: "Товарителница", robots: { index: false, follow: false }, referrer: "no-referrer" };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ k?: string }> };

/** For the shop only: opened from the "Създай товарителница" button in the order e-mail. */
export default async function WaybillPage({ params, searchParams }: Props) {
  const { number } = await params;
  const { k } = await searchParams;
  if (!isWaybillKey(number, k)) notFound();
  const order = await findOrder(number);
  if (!order) notFound();
  const shipment = await getShipment(number);
  const carrier = order.delivery.carrier;
  const created = new Date(order.createdAt).toLocaleString("bg-BG", { timeZone: "Europe/Sofia", dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="shell max-w-3xl pb-20 pt-8 md:pt-12">
      <p className="eyebrow text-garnet">Само за магазина</p>
      <h1 className="display mt-2 text-[2.4rem] sm:text-[3rem]">Товарителница</h1>
      <p className="mt-2 text-ink-2">
        Поръчка <strong className="num font-semibold text-ink">{order.number}</strong> от {created}
      </p>

      <div className="mt-8 grid gap-6 rounded-2xl bg-cream p-5 sm:grid-cols-2 sm:p-7">
        <section>
          <h2 className="eyebrow">Получател</h2>
          <p className="mt-2 font-semibold">{order.customer.name}</p>
          <p className="num text-ink-2">{order.customer.phone}</p>
          <p className="break-all text-ink-2">{order.customer.email}</p>
        </section>
        <section>
          <h2 className="eyebrow">Доставка</h2>
          <p className="mt-2 font-semibold">{order.delivery.label}</p>
          <p className="text-ink-2">{where(order).replace(/^(Офис\/автомат|Адрес): /, "")}</p>
        </section>
        <section className="sm:col-span-2">
          <h2 className="eyebrow">Продукти</h2>
          <ul className="mt-2 divide-y divide-line text-[0.9375rem]">
            {order.lines.map((l) => (
              <li key={l.sku} className="flex justify-between gap-4 py-2">
                <span>
                  {l.brand ? `${l.brand} ` : ""}
                  {l.name} <span className="num text-ink-3">× {l.qty}</span>
                </span>
                <span className="num shrink-0">{price(l.total)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex justify-between gap-4 border-t border-line pt-3 font-semibold">
            <span>Наложен платеж (с доставката)</span>
            <span className="num">{price(order.total)}</span>
          </p>
          {order.note ? <p className="mt-3 rounded-lg bg-tile/60 px-3 py-2 text-[0.875rem] text-ink-2">Бележка: {order.note}</p> : null}
        </section>
      </div>

      <div className="mt-8">
        <WaybillPanel
          number={order.number}
          k={k!}
          carrier={carrier ? CARRIERS[carrier] : null}
          connected={carrier ? getCarrier(carrier).isConfigured() : false}
          locker={carrier === "boxnow"}
          weightKg={parcelWeightKg(order.lines)}
          goodsValue={Math.round((order.subtotal - order.discount) * 100) / 100}
          shipment={
            shipment
              ? {
                  trackingNumber: shipment.trackingNumber,
                  createdAt: shipment.createdAt,
                  weightKg: shipment.weightKg,
                  parcels: shipment.parcels,
                  codAmount: shipment.codAmount,
                  trackingUrl: trackingUrl(shipment.carrier, shipment.trackingNumber),
                }
              : null
          }
        />
      </div>
    </div>
  );
}
