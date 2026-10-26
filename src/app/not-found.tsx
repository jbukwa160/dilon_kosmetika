import Link from "next/link";
import { navCategories } from "@/lib/catalog";

export default function NotFound() {
  return (
    <div className="shell py-20 text-center md:py-28">
      <p className="eyebrow">Грешка 404</p>
      <h1 className="display mx-auto mt-4 max-w-3xl text-[3rem] sm:text-[4.2rem]">
        Тази страница <em className="text-garnet">я няма</em>
      </h1>
      <p className="mx-auto mt-5 max-w-lg text-[1.0625rem] text-ink-2">
        Може продуктът вече да не се предлага или адресът да е сгрешен. Потърсете го отново или изберете категория:
      </p>
      <ul className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
        {navCategories().map((c) => (
          <li key={c.id}>
            <Link href={`/${c.id}`} className="chip">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/" className="btn btn-ink mt-10">
        Към началото
      </Link>
    </div>
  );
}
