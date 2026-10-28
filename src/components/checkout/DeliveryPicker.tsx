"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IconSearch } from "@/components/Icons";
import { officeLabel, type City, type Office } from "@/lib/shipping/types";
import { CARRIERS, type ShippingMethod } from "@/lib/site";

export type DeliveryValue = { city: string; cityId: string; postcode: string; officeId: string; office: string; address: string };
export const EMPTY_DELIVERY: DeliveryValue = { city: "", cityId: "", postcode: "", officeId: "", office: "", address: "" };

type Errors = Record<string, string>;
type Props = {
  method: ShippingMethod;
  value: DeliveryValue;
  onChange: (next: DeliveryValue) => void;
  errors: Errors;
  clearError: (name: string) => void;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Where the parcel goes: the place from the courier's own list, then one of its offices or lockers there, or the street
 * address. If the courier's lists cannot be loaded, plain text fields take their place and the shop confirms by phone.
 */
export function DeliveryPicker({ method, value, onChange, errors, clearError }: Props) {
  const [manual, setManual] = useState(false);
  const set = (patch: Partial<DeliveryValue>) => onChange({ ...value, ...patch });
  const office = method.needs === "office";
  const lockersOnly = method.carrier === "boxnow";

  if (manual) {
    return (
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <p className="rounded-lg bg-tile/60 px-4 py-3 text-[0.875rem] text-ink-2 sm:col-span-2">
          Списъкът на {CARRIERS[method.carrier]} не се зареди. Попълнете ръчно — ще потвърдим по телефона.
        </p>
        <TextField label="Населено място" name="city" value={value.city} onChange={(city) => set({ city, cityId: "" })} errors={errors} clearError={clearError} autoComplete="address-level2" className={office ? "sm:col-span-2" : ""} />
        {office ? (
          <TextField
            label={lockersOnly ? "Автомат" : "Офис или автомат"}
            name="office"
            value={value.office}
            onChange={(o) => set({ office: o, officeId: "" })}
            errors={errors}
            clearError={clearError}
            className="sm:col-span-2"
            hint="Името или адресът му."
          />
        ) : (
          <AddressFields value={value} set={set} errors={errors} clearError={clearError} />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
      <CityCombobox
        carrier={method.carrier}
        value={value}
        className={office ? "sm:col-span-2" : ""}
        error={errors.city}
        onPick={(c) => {
          clearError("city");
          onChange({ ...value, city: c.name, cityId: c.id, postcode: c.postcode ?? "", officeId: "", office: "" });
        }}
        onType={(city) => {
          clearError("city");
          onChange({ ...value, city, cityId: "", officeId: "", office: "" });
        }}
        onFail={() => setManual(true)}
      />
      {office ? (
        value.cityId ? (
          <OfficeList
            key={`${method.carrier}:${value.cityId}`}
            carrier={method.carrier}
            city={value.city}
            cityId={value.cityId}
            lockersOnly={lockersOnly}
            selected={value.officeId}
            error={errors.office}
            onPick={(o) => {
              clearError("office");
              set({ officeId: o.id, office: officeLabel(o) });
            }}
            onFail={() => setManual(true)}
          />
        ) : errors.office ? (
          <p className="field-error sm:col-span-2">{errors.office}</p>
        ) : null
      ) : (
        <AddressFields value={value} set={set} errors={errors} clearError={clearError} />
      )}
    </div>
  );
}

function AddressFields({ value, set, errors, clearError }: { value: DeliveryValue; set: (p: Partial<DeliveryValue>) => void; errors: Errors; clearError: (n: string) => void }) {
  return (
    <>
      <TextField
        label="Пощенски код"
        name="postcode"
        value={value.postcode}
        onChange={(postcode) => set({ postcode: postcode.replace(/\D/g, "").slice(0, 4) })}
        errors={errors}
        clearError={clearError}
        autoComplete="postal-code"
        inputMode="numeric"
        maxLength={4}
        className="sm:col-start-2 sm:row-start-1"
      />
      <TextField
        label="Адрес"
        name="address"
        value={value.address}
        onChange={(address) => set({ address })}
        errors={errors}
        clearError={clearError}
        autoComplete="street-address"
        className="sm:col-span-2"
        hint="Улица, номер, блок, вход, етаж, апартамент."
      />
    </>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  errors,
  clearError,
  hint,
  className = "",
  ...input
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  errors: Errors;
  clearError: (n: string) => void;
  hint?: string;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = useId();
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
        value={value}
        onChange={(e) => {
          clearError(name);
          onChange(e.target.value);
        }}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error || hint ? `${id}-d` : undefined}
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

/** Places of the courier as the customer types; picking one sets the courier's id for it. */
function CityCombobox({
  carrier,
  value,
  className,
  error,
  onPick,
  onType,
  onFail,
}: {
  carrier: string;
  value: DeliveryValue;
  className: string;
  error?: string;
  onPick: (c: City) => void;
  onType: (city: string) => void;
  onFail: () => void;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<City[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const q = value.city.trim();
  // Keep the latest callbacks without re-running the search when the parent re-renders.
  const pick = useRef(onPick);
  const fail = useRef(onFail);
  useEffect(() => {
    pick.current = onPick;
    fail.current = onFail;
  });

  // Search while typing; after a courier change, the place already chosen is looked up again with the new courier.
  useEffect(() => {
    if (value.cityId || q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/shipping/cities?carrier=${carrier}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { cities?: City[] };
        if (!res.ok) throw new Error("list");
        const cities = data.cities ?? [];
        setResults(cities);
        setActive(0);
        // After a courier change: the same place with the new courier, taken without asking when the name (or, for
        // places with the same name, the postcode) leaves no doubt; otherwise the list opens for the customer to pick.
        if (!open) {
          const same = cities.filter((c) => c.name.toLocaleLowerCase("bg-BG") === q.toLocaleLowerCase("bg-BG"));
          const sure = same.length === 1 ? same[0] : same.find((c) => value.postcode && c.postcode === value.postcode);
          if (sure) pick.current(sure);
          else setOpen(true);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") fail.current();
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // `open` and `value.postcode` only matter for the moment the search runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, carrier, value.cityId]);

  useEffect(() => {
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const show = open && !value.cityId && results !== null && q.length >= 2;
  const choose = (c: City) => {
    onPick(c);
    setOpen(false);
  };

  return (
    <div ref={box} className={`field relative ${className}`}>
      <label htmlFor={`${id}-input`} className="field-label">
        Населено място
      </label>
      <div className="relative">
        <input
          id={`${id}-input`}
          name="city"
          type="text"
          value={value.city}
          autoComplete="off"
          placeholder="Започнете да пишете, напр. Пловдив"
          role="combobox"
          aria-expanded={show}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={show && results?.length ? `${id}-o${active}` : undefined}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-e` : undefined}
          onChange={(e) => {
            onType(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!show || !results?.length) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="input pr-10"
        />
        {loading ? (
          <span className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-line-strong border-t-ink motion-safe:animate-spin" aria-hidden="true" />
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-e`} className="field-error">
          {error}
        </p>
      ) : null}
      <ul
        id={`${id}-list`}
        role="listbox"
        aria-label="Населени места"
        data-open={show}
        className="pop absolute inset-x-0 top-[calc(100%+0.35rem)] z-30 max-h-72 overflow-y-auto overscroll-contain rounded-xl border border-line bg-cream p-1.5 shadow-[0_24px_50px_-24px_rgb(27_22_20/0.45)]"
      >
        {results?.length ? (
          results.map((c, i) => (
            <li
              key={c.id}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(c)}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer rounded-lg px-3 py-2 transition-colors duration-100 ${i === active ? "bg-tile/70" : ""}`}
            >
              <span className="font-semibold">{c.name}</span>
              {c.postcode ? <span className="num ml-2 text-[0.8125rem] text-ink-3">{c.postcode}</span> : null}
              {c.region ? <span className="block text-[0.75rem] text-ink-3">{c.region}</span> : null}
            </li>
          ))
        ) : (
          <li className="px-3 py-2 text-[0.875rem] text-ink-3">Няма такова населено място{carrier === "boxnow" ? " с автомат на BOX NOW" : ""}.</li>
        )}
      </ul>
    </div>
  );
}

/** The courier's offices and lockers in the chosen place, filterable when there are many. */
function OfficeList({
  carrier,
  city,
  cityId,
  lockersOnly,
  selected,
  error,
  onPick,
  onFail,
}: {
  carrier: string;
  city: string;
  cityId: string;
  lockersOnly: boolean;
  selected: string;
  error?: string;
  onPick: (o: Office) => void;
  onFail: () => void;
}) {
  const id = useId();
  const [offices, setOffices] = useState<Office[] | null>(null);
  const [filter, setFilter] = useState("");
  const fail = useRef(onFail);
  useEffect(() => {
    fail.current = onFail;
  });

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/shipping/offices?carrier=${carrier}&cityId=${encodeURIComponent(cityId)}`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = (await res.json()) as { offices?: Office[] };
        if (!res.ok) throw new Error("list");
        setOffices(data.offices ?? []);
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") fail.current();
      });
    return () => ctrl.abort();
  }, [carrier, cityId]);

  const shown = useMemo(() => {
    const words = filter.toLocaleLowerCase("bg-BG").split(/\s+/).filter(Boolean);
    if (!offices || !words.length) return offices ?? [];
    return offices.filter((o) => {
      const text = `${o.name} ${o.address} ${o.note ?? ""}`.toLocaleLowerCase("bg-BG");
      return words.every((w) => text.includes(w));
    });
  }, [offices, filter]);

  if (offices === null) {
    return (
      <div className="space-y-2 sm:col-span-2" aria-busy="true" aria-label="Зареждане на офисите">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[4.25rem] rounded-xl bg-tile/70 motion-safe:animate-pulse" />
        ))}
      </div>
    );
  }
  if (!offices.length) {
    return (
      <p className="rounded-lg bg-tile/60 px-4 py-3 text-[0.875rem] text-ink-2 sm:col-span-2">
        {CARRIERS[carrier as keyof typeof CARRIERS]} няма {lockersOnly ? "автомати" : "офиси и автомати"} в {city}. Изберете съседно населено място или друг куриер.
      </p>
    );
  }

  const lockers = offices.filter((o) => o.kind === "locker").length;
  const count = lockersOnly
    ? plural(lockers, "автомат", "автомата")
    : [offices.length - lockers ? plural(offices.length - lockers, "офис", "офиса") : "", lockers ? plural(lockers, "автомат", "автомата") : ""].filter(Boolean).join(" и ");

  return (
    <fieldset className="min-w-0 sm:col-span-2" aria-describedby={error ? `${id}-e` : undefined}>
      <legend className="field-label mb-2 flex w-full items-baseline justify-between gap-3">
        <span>{lockersOnly ? "Автомат" : "Офис или автомат"}</span>
        <span className="font-normal text-ink-3">
          {count} в {city}
        </span>
      </legend>
      {offices.length > 6 ? (
        <div className="relative mb-2">
          <IconSearch size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Търсете по квартал, улица или име"
            aria-label="Търсене на офис"
            className="input h-11 pl-10 text-[0.9375rem]"
          />
        </div>
      ) : null}
      <div
        className={`max-h-[22rem] overflow-y-auto overscroll-contain rounded-xl border ${error ? "border-garnet" : "border-line-strong"} divide-y divide-line bg-cream`}
        role="radiogroup"
        aria-label={lockersOnly ? "Автомати" : "Офиси и автомати"}
      >
        {shown.length ? (
          shown.map((o) => (
            <label
              key={o.id}
              className={`flex cursor-pointer gap-3 px-4 py-3 transition-colors duration-150 has-[:focus-visible]:bg-tile/60 ${o.id === selected ? "bg-tile/70" : "hover:bg-tile/40"}`}
            >
              <input type="radio" name="office-pick" className="radio mt-0.5" checked={o.id === selected} onChange={() => onPick(o)} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[0.9375rem] font-semibold">{o.name}</span>
                  {o.kind === "locker" && !lockersOnly ? <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-garnet">Автомат</span> : null}
                </span>
                {o.address ? <span className="block text-[0.8125rem] text-ink-2">{o.address}</span> : null}
                {o.note ? <span className="block text-[0.75rem] text-ink-3">{o.note}</span> : null}
              </span>
            </label>
          ))
        ) : (
          <p className="px-4 py-3 text-[0.875rem] text-ink-3">Нищо не отговаря на „{filter}“.</p>
        )}
      </div>
      {error ? (
        <p id={`${id}-e`} className="field-error mt-1.5">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
