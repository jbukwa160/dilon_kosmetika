"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="shell py-20 text-center md:py-28">
      <p className="eyebrow">Нещо се обърка</p>
      <h1 className="display mx-auto mt-4 max-w-3xl text-[2.8rem] sm:text-[3.6rem]">Страницата не се зареди</h1>
      <p className="mx-auto mt-5 max-w-lg text-[1.0625rem] text-ink-2">Опитайте отново след малко. Ако проблемът продължи, обадете ни се — ще помогнем с поръчката.</p>
      <div className="mt-9 flex flex-wrap justify-center gap-3">
        <button type="button" className="btn btn-ink" onClick={reset}>
          Опитайте отново
        </button>
        <Link href="/" className="btn btn-line">
          Към началото
        </Link>
      </div>
    </div>
  );
}
