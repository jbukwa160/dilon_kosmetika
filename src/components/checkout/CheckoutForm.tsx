"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useId, useRef, useState } from "react";
import { FreeShippingMeter, QtyStepper } from "@/components/cart/CartDrawer";
import { MAX_PER_LINE, useCart } from "@/components/cart/CartProvider";
import { IconCash, IconTrash } from "@/components/Icons";
import { price } from "@/lib/format";
import { ORDER_KEY, SHIPPING, shippingPrice, type ShippingMethodId } from "@/lib/site";

type Errors = Record<string, string>;

/** Lets a field drop its own error as soon as the customer edits it. */
const ClearErrorCtx = createContext<(name: string) => void>(() => {});

export function CheckoutForm() {
  const { lines, ready, subtotal, setQty, remove, clear } = useCart();
  const router = useRouter();
  const [method, setMethod] = useState<ShippingMethodId>("speedy-office");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [sending, setSending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const clearError = (name: string) =>
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      if (!Object.keys(next).length) setFormError("");
      return next;
    });
  const shipping = shippingPrice(method, subtotal);
  const needs = SHIPPING.methods.find((m) => m.id === method)!.needs;

  if (!ready) return <div className="h-96" aria-busy="true" />;

  if (!lines.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="font-display text-[2.2rem]">Количката е празна</p>
        <p className="mt-2 text-ink-2">Добавете продукти, за да направите поръчка.</p>
        <Link href="/" className="btn btn-ink mt-7">
          Към магазина
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    const fd = new FormData(e.currentTarget);
    const value = (k: string) => String(fd.get(k) ?? "");
    const payload = {
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      method,
      city: value("city"),
      postcode: value("postcode"),
      office: value("office"),
      address: value("address"),
      note: value("note"),
      terms: fd.get("terms") === "on",
      website: value("website"),
      items: lines.map((l) => ({ sku: l.sku, qty: l.qty })),
    };
    setSending(true);
    setFormError("");
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields ?? {});
        setFormError(data.error ?? "Поръчката не беше изпратена. Опитайте отново.");
        requestAnimationFrame(() => {
          const first = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
          (first ?? document.getElementById("form-error"))?.focus();
        });
        return;
      }
      try {
        sessionStorage.setItem(ORDER_KEY, JSON.stringify({ ...data, lines: lines.map((l) => ({ name: l.name, brand: l.brand, qty: l.qty, image: l.image })) }));
      } catch {
        // Not important: the thank-you page also works with the number from the URL.
      }
      clear();
      router.replace(`/poruchka/blagodarim?n=${encodeURIComponent(data.number)}`);
    } catch {
      setFormError("Няма връзка със сървъра. Проверете интернета и опитайте отново.");
    } finally {
      setSending(false);
    }
  }

  return (
    <ClearErrorCtx.Provider value={clearError}>
      <form ref={formRef} onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16">
        <div className="min-w-0 space-y-12">
          <Step n={1} title="Вашите данни">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Име и фамилия" name="name" autoComplete="name" errors={errors} className="sm:col-span-2" />
              <Field label="Телефон" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="0888 123 456" errors={errors} hint="Куриерът ще ви се обади преди доставка." />
              <Field label="Имейл" name="email" type="email" autoComplete="email" inputMode="email" errors={errors} hint="Ще получите потвърждение на поръчката." />
            </div>
          </Step>

          <Step n={2} title="Доставка">
            <fieldset>
              <legend className="sr-only">Начин на доставка</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {SHIPPING.methods.map((m) => {
                  const checked = method === m.id;
                  const cost = shippingPrice(m.id, subtotal);
                  return (
                    <label
                      key={m.id}
                      className={`relative flex cursor-pointer flex-col rounded-xl border p-4 transition-[border-color,box-shadow,background-color] duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-garnet ${
                        checked ? "border-ink bg-cream shadow-[inset_0_0_0_1px_var(--color-ink)]" : "border-line-strong hover:border-ink/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={m.id}
                        checked={checked}
                        onChange={() => {
                          setMethod(m.id);
                          ["office", "address", "postcode"].forEach(clearError);
                        }}
                        className="sr-only"
                      />
                      <span className="text-[0.9375rem] font-semibold">{m.short}</span>
                      <span className="mt-1 text-[0.8125rem] leading-snug text-ink-3">{m.label}</span>
                      <span className="num mt-3 text-[0.9375rem] font-semibold">{cost ? price(cost) : <span className="text-sage">Безплатна</span>}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_9rem]">
              <Field label="Населено място" name="city" autoComplete="address-level2" errors={errors} className={needs === "address" ? "" : "sm:col-span-2"} />
              {needs === "address" ? <Field label="Пощенски код" name="postcode" autoComplete="postal-code" inputMode="numeric" maxLength={4} errors={errors} /> : null}
              {needs === "office" ? (
                <Field
                  key="office"
                  label={method === "speedy-office" ? "Офис или автомат на Speedy" : "Офис или автомат на Еконт"}
                  name="office"
                  errors={errors}
                  className="sm:col-span-2"
                  hint="Напишете името или адреса на офиса — ще го потвърдим по телефона."
                />
              ) : (
                <Field key="address" label="Адрес" name="address" autoComplete="street-address" errors={errors} className="sm:col-span-2" hint="Улица, номер, блок, вход, етаж, апартамент." />
              )}
            </div>
          </Step>

          <Step n={3} title="Плащане">
            <div className="flex gap-4 rounded-xl border border-ink bg-cream p-4 shadow-[inset_0_0_0_1px_var(--color-ink)]">
              <IconCash size={24} className="mt-0.5 shrink-0 text-garnet" />
              <div>
                <p className="text-[0.9375rem] font-semibold">Наложен платеж</p>
                <p className="mt-0.5 text-[0.875rem] text-ink-2">Плащате на куриера, когато получите пратката.</p>
              </div>
            </div>
            <div className="mt-5 field">
              <label htmlFor="note" className="field-label">
                Бележка към поръчката <span className="font-normal text-ink-3">(по желание)</span>
              </label>
              <textarea id="note" name="note" rows={3} maxLength={500} className="input" />
            </div>
          </Step>

          {/* Honeypot: invisible to people and screen readers. */}
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label>
              Уебсайт <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        </div>

        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="rounded-2xl bg-cream p-5 shadow-[0_1px_0_var(--color-line),0_30px_60px_-45px_rgb(27_22_20/0.5)] sm:p-6">
            <h2 className="font-display text-[1.7rem]">Вашата поръчка</h2>
            <ul className="mt-4 divide-y divide-line">
              {lines.map((l) => (
                <li key={l.sku} className="flex gap-3 py-3.5">
                  <span className="tile relative size-16 shrink-0 rounded-md">
                    <Image src={l.image} alt="" fill sizes="64px" quality={75} className="object-contain p-1.5 mix-blend-multiply" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {l.brand ? <p className="eyebrow truncate">{l.brand}</p> : null}
                    <p className="clamp-2 text-[0.875rem] leading-snug">{l.name}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <QtyStepper qty={l.qty} max={Math.min(MAX_PER_LINE, l.stock)} onChange={(v) => setQty(l.sku, v)} label={l.name} />
                      <span className="num text-[0.875rem] font-semibold">{price(l.price * l.qty)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => remove(l.sku)} className="icon-btn -mr-2 size-8 self-start text-ink-3" aria-label={`Премахни ${l.name}`}>
                    <IconTrash size={16} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-line pt-4">
              <FreeShippingMeter subtotal={subtotal} />
            </div>
            <dl className="mt-5 space-y-2 text-[0.9375rem]">
              <div className="flex justify-between">
                <dt className="text-ink-2">Продукти</dt>
                <dd className="num">{price(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-2">Доставка</dt>
                <dd className="num">{shipping ? price(shipping) : "безплатна"}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-semibold">Общо</dt>
                <dd className="num text-[1.4rem] font-semibold">{price(subtotal + shipping)}</dd>
              </div>
            </dl>
            <p className="mt-1 text-right text-[0.75rem] text-ink-3">Цените са с ДДС</p>

            <div className="mt-5">
              <Check name="terms" errors={errors}>
                Приемам{" "}
                <Link href="/info/obshti-usloviya" target="_blank" className="link font-semibold text-ink">
                  общите условия
                </Link>{" "}
                и съм запознат(а) с{" "}
                <Link href="/info/poveritelnost" target="_blank" className="link font-semibold text-ink">
                  политиката за поверителност
                </Link>
                .
              </Check>
            </div>

            {formError ? (
              <p id="form-error" tabIndex={-1} role="alert" className="mt-4 rounded-lg bg-blush px-4 py-3 text-[0.875rem] text-garnet outline-none">
                {formError}
              </p>
            ) : null}

            <button type="submit" className="btn btn-ink mt-5 w-full" disabled={sending} aria-busy={sending}>
              {sending ? "Изпращане…" : `Поръчай · ${price(subtotal + shipping)}`}
            </button>
            <p className="mt-3 text-center text-[0.75rem] text-ink-3">Ще потвърдим поръчката по телефона в работно време.</p>
          </div>
        </aside>
      </form>
    </ClearErrorCtx.Provider>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-baseline gap-3 text-[1.9rem] leading-none">
        <span className="num font-sans text-[0.8125rem] font-semibold tracking-[0.12em] text-garnet">0{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  name,
  errors,
  hint,
  className = "",
  ...input
}: { label: string; name: string; errors: Errors; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const clear = useContext(ClearErrorCtx);
  const error = errors[name];
  return (
    <div className={`field ${className}`}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        onInput={() => clear(name)}
        className="input"
        {...input}
      />
      {error || hint ? (
        <p id={`${id}-d`} className={error ? "field-error" : "text-[0.8125rem] text-ink-3"}>
          {error || hint}
        </p>
      ) : null}
    </div>
  );
}

function Check({ name, errors, children }: { name: string; errors: Errors; children: React.ReactNode }) {
  const id = useId();
  const clear = useContext(ClearErrorCtx);
  const error = errors[name];
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer gap-3 text-[0.875rem]">
        <input
          id={id}
          name={name}
          type="checkbox"
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-e` : undefined}
          onChange={() => clear(name)}
          className="check mt-0.5"
        />
        <span className="text-ink-2">{children}</span>
      </label>
      {error ? (
        <p id={`${id}-e`} className="field-error mt-1 pl-[1.9rem]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
