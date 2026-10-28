"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { IconBox, IconCheck } from "@/components/Icons";
import { price } from "@/lib/format";

type Saved = { trackingNumber: string; createdAt: string; weightKg: number; parcels: number; codAmount: number; trackingUrl: string };

type Props = {
  number: string;
  k: string;
  /** The courier's name, null for orders placed before the couriers were connected. */
  carrier: string | null;
  connected: boolean;
  locker: boolean;
  weightKg: number;
  goodsValue: number;
  shipment: Saved | null;
};

/** Creates the order's waybill with its courier, then shows the label, tracking and cancel. */
export function WaybillPanel({ number, k, carrier, connected, locker, weightKg, goodsValue, shipment }: Props) {
  const router = useRouter();
  const [weight, setWeight] = useState(String(weightKg).replace(".", ","));
  const [parcels, setParcels] = useState(1);
  const [boxSize, setBoxSize] = useState<1 | 2 | 3>(2);
  const [declare, setDeclare] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const busy = sending || refreshing;

  async function send(body: Record<string, unknown>) {
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/waybill", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ number, k, ...body }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Нещо се обърка. Опитайте отново.");
        return;
      }
      setConfirmCancel(false);
      startRefresh(() => router.refresh());
    } catch {
      setError("Няма връзка със сървъра. Опитайте отново.");
    } finally {
      setSending(false);
    }
  }

  const errorBox = error ? (
    <p role="alert" className="mt-4 rounded-lg bg-blush px-4 py-3 text-[0.875rem] text-garnet">
      {error}
    </p>
  ) : null;

  if (!carrier || !connected) {
    return (
      <div className="rounded-2xl border border-line-strong p-5 sm:p-7">
        <h2 className="font-display text-[1.6rem]">Товарителница в сайта на куриера</h2>
        <p className="mt-2 text-ink-2">
          {carrier
            ? `${carrier} още не е свързан с магазина (липсва работещ вход в .env.local). Създайте товарителницата в профила си при ${carrier} с данните по-горе.`
            : "Поръчката е направена, преди куриерите да бъдат свързани. Създайте товарителницата в сайта на куриера с данните по-горе."}
        </p>
      </div>
    );
  }

  if (shipment) {
    const created = new Date(shipment.createdAt).toLocaleString("bg-BG", { timeZone: "Europe/Sofia", dateStyle: "medium", timeStyle: "short" });
    return (
      <div className="rounded-2xl border border-ink p-5 shadow-[inset_0_0_0_1px_var(--color-ink)] sm:p-7">
        <p className="flex items-center gap-2 font-semibold text-sage">
          <IconCheck size={18} /> Товарителницата е създадена
        </p>
        <p className="num mt-2 text-[2rem] font-semibold tracking-wide">{shipment.trackingNumber}</p>
        <p className="mt-1 text-[0.875rem] text-ink-3">
          {carrier} · {created} · {String(shipment.weightKg).replace(".", ",")} кг{shipment.parcels > 1 ? ` · ${shipment.parcels} пакета` : ""} · наложен платеж{" "}
          {price(shipment.codAmount)}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href={`/api/waybill/label?n=${encodeURIComponent(number)}&k=${encodeURIComponent(k)}`} target="_blank" rel="noreferrer" className="btn btn-ink">
            <IconBox size={18} /> Отпечатай етикета
          </a>
          <a href={shipment.trackingUrl} target="_blank" rel="noreferrer" className="btn btn-line">
            Проследяване
          </a>
        </div>
        <div className="mt-8 border-t border-line pt-5">
          {confirmCancel ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[0.9375rem]">Да анулираме ли товарителницата?</p>
              <button type="button" className="btn btn-garnet btn-sm" disabled={busy} aria-busy={busy} onClick={() => send({ action: "cancel" })}>
                {busy ? "Анулиране…" : "Да, анулирай"}
              </button>
              <button type="button" className="btn btn-line btn-sm" disabled={busy} onClick={() => setConfirmCancel(false)}>
                Не
              </button>
            </div>
          ) : (
            <button type="button" className="link text-[0.875rem] text-ink-3" onClick={() => setConfirmCancel(true)}>
              Анулирай товарителницата
            </button>
          )}
          <p className="mt-2 text-[0.8125rem] text-ink-3">Може само докато куриерът не е взел пратката.</p>
        </div>
        {errorBox}
      </div>
    );
  }

  const kg = Number(weight.replace(",", "."));
  const weightOk = Number.isFinite(kg) && kg >= 0.1 && kg <= 50;
  return (
    <form
      className="rounded-2xl border border-line-strong p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault();
        if (!weightOk || busy) return;
        send({ action: "create", weightKg: kg, parcels, declare, ...(locker ? { boxSize } : {}) });
      }}
    >
      <h2 className="font-display text-[1.6rem]">Нова товарителница · {carrier}</h2>
      <p className="mt-1 text-[0.875rem] text-ink-3">Теглото е изчислено от продуктите — коригирайте го, ако пакетът е по-тежък.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="field">
          <label htmlFor="wb-weight" className="field-label">
            Тегло, кг
          </label>
          <input
            id="wb-weight"
            className="input num"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            aria-invalid={weightOk ? undefined : "true"}
            aria-describedby={weightOk ? undefined : "wb-weight-e"}
          />
          {weightOk ? null : (
            <p id="wb-weight-e" className="field-error">
              От 0,1 до 50 кг
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="wb-parcels" className="field-label">
            Брой пакети
          </label>
          <select id="wb-parcels" className="input num" value={parcels} onChange={(e) => setParcels(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        {locker ? (
          <div className="field">
            <label htmlFor="wb-box" className="field-label">
              Клетка на автомата
            </label>
            <select id="wb-box" className="input" value={boxSize} onChange={(e) => setBoxSize(Number(e.target.value) as 1 | 2 | 3)}>
              <option value={1}>Малка</option>
              <option value={2}>Средна</option>
              <option value={3}>Голяма</option>
            </select>
          </div>
        ) : null}
      </div>
      <label className="mt-5 flex cursor-pointer gap-3 text-[0.9375rem]">
        <input type="checkbox" className="check mt-0.5" checked={declare} onChange={(e) => setDeclare(e.target.checked)} />
        <span>
          Обявена стойност {price(goodsValue)} <span className="text-ink-3">(застраховка на пратката срещу допълнителна такса)</span>
        </span>
      </label>
      <button type="submit" className="btn btn-garnet mt-6 w-full sm:w-auto" disabled={busy || !weightOk} aria-busy={busy}>
        {busy ? "Създаване…" : "Създай товарителница"}
      </button>
      {errorBox}
    </form>
  );
}
