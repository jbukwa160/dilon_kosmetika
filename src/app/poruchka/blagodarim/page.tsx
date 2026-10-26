import type { Metadata } from "next";
import { Suspense } from "react";
import { ThankYou } from "@/components/checkout/ThankYou";

export const metadata: Metadata = { title: "Благодарим за поръчката", robots: { index: false, follow: false } };

export default function ThankYouPage() {
  return (
    <div className="shell pb-8 pt-12 md:pt-20">
      <Suspense fallback={<div className="h-96" />}>
        <ThankYou />
      </Suspense>
    </div>
  );
}
