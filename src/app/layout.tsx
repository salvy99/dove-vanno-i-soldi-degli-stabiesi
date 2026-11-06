import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// Indirizzo pubblico del sito, per i link assoluti delle anteprime social.
// Su Vercel arriva da solo; altrimenti si imposta NEXT_PUBLIC_SITE_URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: { locale: "it_IT", siteName: "Dove vanno i soldi · Castellammare di Stabia", type: "website" },
  title: {
    default: "Dove vanno i soldi · Castellammare di Stabia",
    template: "%s · Dove vanno i soldi · Castellammare di Stabia",
  },
  description:
    "Quanto versi, come spende il Comune e quali altri soldi pubblici arrivano a Castellammare di Stabia: dati ufficiali, ogni numero con fonte e data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <a className="skip" href="#contenuto">
          Vai al contenuto
        </a>
        <header className="site-header">
          <div className="wrap">
            <Link className="brand" href="/">
              <strong>Dove vanno i soldi</strong>
              <span>Castellammare di Stabia · 80053</span>
            </Link>
            <Nav />
          </div>
        </header>
        <main id="contenuto">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p>
              Progetto civico indipendente. Ogni numero riporta fonte, periodo e limiti: un dato insolito indica dove
              guardare meglio, non dimostra da solo uno spreco o un illecito.
            </p>
            <p>
              Versione cittadina di{" "}
              <a href="https://github.com/Italian-Builders-Org/DoveVannoINostriSoldi">DoveVannoINostriSoldi</a>, da cui
              provengono gli snapshot dei dati ufficiali. Codice libero sotto licenza{" "}
              <a href="https://www.gnu.org/licenses/agpl-3.0.html">GNU AGPL v3</a>; i dati restano soggetti alle licenze
              delle rispettive fonti. <Link href="/fonti">Fonti e metodo</Link>.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
