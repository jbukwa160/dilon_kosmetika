import type { Metadata, Viewport } from "next";
import { AddedNote } from "@/components/cart/AddedNote";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { CartProvider } from "@/components/cart/CartProvider";
import { FavoritesProvider } from "@/components/favorites/FavoritesProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/header/Header";
import { SITE } from "@/lib/site";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: { type: "website", locale: "bg_BG", siteName: SITE.name },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f6f1eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bg" className={fontVariables} suppressHydrationWarning>
      <head>
        {/* Without JavaScript, pictures never get their "loaded" flag and sections never scroll in: show them. */}
        <noscript>
          <style>{".tile-img{opacity:1!important}.reveal{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      {/* Browser extensions often add attributes to <body>; that is not a real mismatch. */}
      <body suppressHydrationWarning>
        <CartProvider>
          <FavoritesProvider>
            <a href="#main" className="skip-link">
              Към съдържанието
            </a>
            <Header />
            <main id="main">{children}</main>
            <Footer />
            <CartDrawer />
            <AddedNote />
          </FavoritesProvider>
        </CartProvider>
      </body>
    </html>
  );
}
