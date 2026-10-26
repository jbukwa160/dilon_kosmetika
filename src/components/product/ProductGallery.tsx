"use client";

import { useRef, useState } from "react";
import { ProductImage } from "@/components/ProductImage";

/**
 * The product photo on a large tile. With a mouse, hovering zooms in and the zoom follows the pointer (a closer look
 * at a shade or a label); on touch screens the photo simply stays put.
 */
export function ProductGallery({ src, alt, iw, ih }: { src: string; alt: string; iw: number; ih: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  // Zooming only helps when the picture is big enough to show more detail.
  const canZoom = Math.min(iw, ih) >= 600;
  const move = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };
  return (
    <div
      ref={ref}
      className={`tile aspect-square w-full ${canZoom ? "[@media(hover:hover)_and_(pointer:fine)]:cursor-zoom-in" : ""}`}
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
    >
      <div
        className="absolute inset-0 transition-transform duration-500 ease-out"
        style={{ transform: zoom ? "scale(1.9)" : "none", transformOrigin: origin }}
      >
        <ProductImage src={src} alt={alt} iw={iw} ih={ih} sizes="(min-width: 64rem) 46vw, 100vw" priority inset={10} />
      </div>
    </div>
  );
}
