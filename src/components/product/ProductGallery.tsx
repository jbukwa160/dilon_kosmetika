"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import type { GalleryPicture } from "@/lib/types";

/**
 * The product photos on a large tile. With a mouse, hovering zooms in and the zoom follows the pointer (a closer look
 * at a shade or a label); on touch screens a sideways swipe moves to the next photo. Below, a strip of thumbnails when
 * there is more than one photo.
 */
export function ProductGallery({ pictures, alt }: { pictures: GalleryPicture[]; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const pic = pictures[active] ?? pictures[0];
  const many = pictures.length > 1;
  // Zooming only helps when the picture is big enough to show more detail.
  const canZoom = Math.min(pic.w, pic.h) >= 600;
  const go = (step: number) => setActive((i) => (i + step + pictures.length) % pictures.length);
  const move = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  return (
    <div>
      <div
        ref={ref}
        className={`tile aspect-square w-full ${many ? "touch-pan-y" : ""} ${canZoom ? "[@media(hover:hover)_and_(pointer:fine)]:cursor-zoom-in" : ""}`}
        onPointerEnter={(e) => {
          if (canZoom && e.pointerType === "mouse") {
            move(e);
            setZoom(true);
          }
        }}
        onPointerMove={(e) => {
          if (zoom) move(e);
        }}
        onPointerLeave={() => setZoom(false)}
        onPointerDown={(e) => {
          if (many && e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={(e) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - start.y)) go(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div
          className="absolute inset-0 transition-transform duration-500 ease-out"
          style={{ transform: zoom ? "scale(1.9)" : "none", transformOrigin: origin }}
        >
          <ProductImage
            key={pic.src}
            src={pic.src}
            alt={many ? `${alt} — снимка ${active + 1} от ${pictures.length}` : alt}
            iw={pic.w}
            ih={pic.h}
            sizes="(min-width: 64rem) 46vw, 100vw"
            priority={active === 0}
            unoptimized={pic.direct}
            inset={10}
          />
        </div>
        {many ? (
          <span className="num pointer-events-none absolute bottom-3 right-3 rounded-full bg-cream/90 px-2.5 py-1 text-[0.75rem] text-ink-2 lg:hidden" aria-hidden="true">
            {active + 1} / {pictures.length}
          </span>
        ) : null}
      </div>

      {many ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Снимки на продукта">
          {pictures.map((p, i) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Снимка ${i + 1} от ${pictures.length}`}
              aria-current={i === active ? "true" : undefined}
              className={`tile relative size-16 shrink-0 rounded-md transition-shadow duration-150 sm:size-[4.5rem] ${
                i === active ? "shadow-[inset_0_0_0_1.5px_var(--color-ink)]" : "opacity-80 hover:opacity-100"
              }`}
            >
              <Image
                src={p.direct ? p.src.replace(/([?&]width=)\d+/, (_, key: string) => `${key}200`) : p.src}
                alt=""
                fill
                sizes="72px"
                quality={75}
                unoptimized={p.direct}
                className="tile-img !opacity-100 p-1.5"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
