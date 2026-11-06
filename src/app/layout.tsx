import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import { Marchio } from "@/components/marchio";
import { Nav } from "@/components/nav";
import "./globals.css";

// Barlow Condensed per titoli e numeri grandi, Barlow per il testo: leggibili e
// con un carattere un po' "da stadio", diversi dal sito nazionale.
const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const barlowCondensed = Barlow_Condensed({ variable: "--font-barlow-condensed", subsets: ["latin"], weight: ["600", "700", "800"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "600"] });

// Indirizzo pubblico del sito, per i link assoluti delle anteprime social.
// Su Vercel arriva da solo; altrimenti si imposta NEXT_PUBLIC_SITE_URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  openGraph: { locale: "it_IT", siteName: "Dove vanno i soldi degli stabiesi", type: "website" },
  title: {
    default: "Dove vanno i soldi degli stabiesi",
    template: "%s · Dove vanno i soldi degli stabiesi",
  },
  description:
    "Quanto versi, come spende il Comune e quali altri soldi pubblici arrivano a Castellammare di Stabia: dati ufficiali, ogni numero con fonte e data.",
};

export const viewport: Viewport = {
  themeColor: "#0b2a5e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${barlow.variable} ${barlowCondensed.variable} ${plexMono.variable}`}>
      <body>
        <a className="skip" href="#contenuto">
          Vai al contenuto
        </a>
        <header className="site-header">
          <div className="wrap">
            <Link className="brand" href="/" aria-label="Dove vanno i soldi degli stabiesi: pagina iniziale">
              <Marchio className="brand-mark" />
              <span className="brand-text">
                <strong>Dove vanno i soldi</strong>
                <span className="brand-sub">degli stabiesi</span>
              </span>
            </Link>
            <Nav />
          </div>
        </header>
        <main id="contenuto">{children}</main>
        <footer className="site-footer">
          <div className="wrap">
            <p className="footer-brand">Dove vanno i soldi degli stabiesi</p>
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
