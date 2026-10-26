"use client";

import { useEffect, useState } from "react";

/** The shop's promises. All three on wide screens; one at a time, gently crossfading, on phones. */
export function Announcements({ messages }: { messages: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || messages.length < 2) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setI((n) => (n + 1) % messages.length);
    }, 4800);
    return () => clearInterval(id);
  }, [messages.length]);
  return (
    <div className="bg-night text-[0.75rem] tracking-[0.06em] text-porcelain/90">
      <div className="shell flex h-9 items-center justify-center">
        <ul className="hidden items-center md:flex">
          {messages.map((m, n) => (
            <li key={m} className="flex items-center">
              {n > 0 ? <span aria-hidden="true" className="mx-6 size-1 rounded-full bg-garnet" /> : null}
              {m}
            </li>
          ))}
        </ul>
        <div className="relative h-full w-full md:hidden" aria-live="off">
          {messages.map((m, n) => (
            <p
              key={m}
              aria-hidden={n !== i}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${n === i ? "opacity-100" : "opacity-0"}`}
            >
              {m}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
