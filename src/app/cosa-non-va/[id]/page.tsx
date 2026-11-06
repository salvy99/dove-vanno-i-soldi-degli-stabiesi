import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Condividi } from "@/components/condividi";
import { segnali } from "@/lib/dati";

export function generateStaticParams() {
  return segnali.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = segnali.find((x) => x.id === id);
  if (!s) return {};
  return {
    title: s.titolo,
    description: `${s.dato} · ${s.confronto}. Fonte: ${s.fonte}.`,
  };
}

// La lettura di `params` sta dentro un <Suspense>: le pagine sono comunque generate
// in anticipo (generateStaticParams), ma la navigazione dall'elenco resta istantanea.
export default function SegnalePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="wrap hero"><p className="kicker">Cosa non va</p></div>}>
      <Segnale params={params} />
    </Suspense>
  );
}

async function Segnale({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = segnali.find((x) => x.id === id);
  if (!s) notFound();
  const testo = `${s.titolo}: ${s.dato} (${s.confronto}). Fonte: ${s.fonte}.`;

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">
          <Link href="/cosa-non-va">Cosa non va</Link> · {s.area}
        </p>
        <h1>{s.titolo}</h1>
      </section>

      <div className="grid-2">
        <div className="panel">
          <div className="figure">
            <span className="label">Il dato</span>
            <span className="value" style={{ fontSize: 26 }}>
              {s.dato}
            </span>
            <span className="exact">{s.confronto}</span>
          </div>
          <p>{s.spiegazione}</p>
          <p className="callout">
            <strong>Da chiedere:</strong> {s.domanda}
          </p>
          <p className="note">
            Fonte: {s.fonte} · <Link href={s.link}>Approfondisci i dati →</Link>
          </p>
        </div>
        <div className="panel">
          <p className="panel-title">Condividi questo punto</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- immagine generata, già nelle dimensioni finali */}
          <img src={`/cosa-non-va/${s.id}/opengraph-image`} alt={`Scheda da condividere: ${s.titolo}`} width={1200} height={630} style={{ width: "100%", height: "auto", border: "1px solid var(--line)" }} />
          <Condividi testo={testo} immagine={`/cosa-non-va/${s.id}/opengraph-image`} />
          <p className="note">Chi apre il link vede questa scheda in anteprima e arriva qui, con la fonte e la domanda da fare.</p>
        </div>
      </div>

      <p className="callout warn" style={{ marginTop: 24 }}>
        Questo punto ti dice dove guardare. Per accertare sprechi, errori o illeciti servono gli atti.
      </p>
      <p style={{ marginTop: 16 }}>
        <Link href="/cosa-non-va">← Tutti i punti dello specchietto</Link>
      </p>
    </div>
  );
}
