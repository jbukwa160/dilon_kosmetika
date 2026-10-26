import { Noto_Serif_Display, Sofia_Sans } from "next/font/google";

// Display serif for headings and the wordmark. Normal and italic are two instances on purpose: asking for both
// styles in one call breaks `next build` with Turbopack (Next 16.4).
export const display = Noto_Serif_Display({
  subsets: ["latin", "cyrillic"],
  variable: "--nf-display",
  display: "swap",
});

export const displayItalic = Noto_Serif_Display({
  subsets: ["latin", "cyrillic"],
  style: "italic",
  variable: "--nf-display-italic",
  display: "swap",
  preload: false,
});

// Text face. Sofia Sans is drawn by a Bulgarian studio and has the Bulgarian forms of the Cyrillic letters
// (they appear with lang="bg").
export const sans = Sofia_Sans({
  subsets: ["latin", "cyrillic"],
  variable: "--nf-sans",
  display: "swap",
});

export const fontVariables = `${display.variable} ${displayItalic.variable} ${sans.variable}`;
