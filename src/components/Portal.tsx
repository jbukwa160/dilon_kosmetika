"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Renders into <body>. Panels opened from the sticky header need it: the header's backdrop blur makes it the
 * containing block for fixed elements, which would trap a full-screen panel inside the header.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- document.body exists only after mount
  useEffect(() => setTarget(document.body), []);
  return target ? createPortal(children, target) : null;
}
