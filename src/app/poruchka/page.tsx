import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Breadcrumbs } from "@/components/listing/Listing";

export const metadata: Metadata = { title: "Поръчка", robots: { index: false, follow: false } };

export default function CheckoutPage() {
  return (
    <div className="shell pt-6 md:pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Начало" }, { label: "Поръчка" }]} />
      <h1 className="display mt-6 text-[2.8rem] sm:text-[3.4rem] md:mt-8">Поръчка</h1>
      <p className="mt-3 max-w-xl text-ink-2">Три кратки стъпки — без регистрация. Плащате при получаване.</p>
      <div className="mt-10 md:mt-12">
        <CheckoutForm />
      </div>
    </div>
  );
}
