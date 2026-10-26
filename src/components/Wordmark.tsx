import { SITE } from "@/lib/site";

/** "омая" in the display serif with a garnet full stop. lang="bg" keeps the Bulgarian letter forms. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span lang="bg" className={`inline-flex items-baseline font-display leading-none tracking-[-0.02em] ${className}`}>
      {SITE.wordmark}
      <span aria-hidden="true" className="ml-[0.06em] inline-block size-[0.16em] translate-y-[-0.02em] rounded-full bg-garnet" />
    </span>
  );
}
