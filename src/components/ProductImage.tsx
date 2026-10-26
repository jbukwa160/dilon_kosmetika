"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  alt: string;
  /** Picture size in px: small pictures are never blown up beyond 1.4× their size. */
  iw: number;
  ih: number;
  sizes: string;
  priority?: boolean;
  /** Inset of the picture inside its tile, in % of the tile. */
  inset?: number;
  className?: string;
};

/** A product photo on its tile. Lazy pictures fade in once loaded; pictures above the fold appear at once. */
export function ProductImage({ src, alt, iw, ih, sizes, priority = false, inset = 9, className = "" }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(priority);

  // A picture that finished loading before React took over never fires onLoad.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true);
  }, [src]);

  return (
    <div className="pointer-events-none absolute flex items-center justify-center" style={{ inset: `${inset}%` }}>
      <div className="relative size-full" style={{ maxWidth: Math.round(iw * 1.4), maxHeight: Math.round(ih * 1.4) }}>
        <Image
          ref={ref}
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          quality={75}
          priority={priority}
          className={`tile-img ${className}`}
          data-loaded={loaded}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </div>
  );
}
