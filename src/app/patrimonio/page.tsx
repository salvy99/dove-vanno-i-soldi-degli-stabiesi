import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { patrimonio } from "@/lib/dati";
import { leggibile, numero } from "@/lib/format";

export const metadata: Metadata = {
  title: "Immobili pubblici",
  description: "Gli immobili pubblici a Castellammare di Stabia dichiarati al censimento del MEF, compresi quelli non utilizzati.",
};

const mq = (n: number | null) => (n === null ? "superficie non dichiarata" : `${numero(Math.round(n))} m²`);

export default function PatrimonioPage() {
  const fermi = patrimonio.fabbricatiFermi;
  const fermiComune = fermi.filter((f) => /CASTELLAMMARE/.test(f.ente));
  const nonUsati = fermiComune.filter((f) => f.utilizzo !== "In ristrutturazione/manutenzione");
  const totNonUsati = nonUsati.reduce((a, f) => a + (f.fabbricati ?? 0), 0);

  const perEnte = Object.values(
    patrimonio.beni.reduce<Record<string, { ente: string; beni: number; mq: number }>>((acc, b) => {
      acc[b.ente] ??= { ente: b.ente, beni: 0, mq: 0 };
      acc[b.ente].beni += b.beni ?? 0;
      acc[b.ente].mq += b.superficieMq ?? 0;
      return acc;
    }, {}),
  ).sort((a, b) => b.beni - a.beni);

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Il patrimonio</p>
        <h1>Immobili pubblici in città</h1>
        <p className="lead">
          Il Comune ha dichiarato <strong>{numero(totNonUsati)} fabbricati non utilizzati o inutilizzabili</strong> a Castellammare
          nel censimento 2023 del Ministero dell&apos;Economia, più altri in ristrutturazione. Un immobile pubblico vuoto è un costo
          e un&apos;occasione: vale la pena sapere quali sono.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Fabbricati fermi</h2>
          <p>Stato d&apos;uso dichiarato dall&apos;ente proprietario.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Proprietario</th>
                <th>Tipo di bene</th>
                <th>Stato</th>
                <th className="n">Fabbricati</th>
                <th className="n">Superficie</th>
              </tr>
            </thead>
            <tbody>
              {fermi.map((f, i) => (
                <tr key={i}>
                  <td>{leggibile(f.ente)}</td>
                  <td>{f.tipologiaBene}</td>
                  <td>{f.utilizzo}</td>
                  <td className="n">{numero(f.fabbricati)}</td>
                  <td className="n">{mq(f.superficieMq)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="panel">
          <h2>Chi possiede immobili pubblici a Castellammare</h2>
          <BarList
            label="Beni per ente proprietario"
            items={perEnte.map((e) => ({ id: e.ente, label: leggibile(e.ente), value: e.beni, display: `${numero(e.beni)} beni`, sub: mq(e.mq), alt: /CASTELLAMMARE/.test(e.ente) }))}
          />
          <p className="note">Comprende abitazioni, uffici, aree e terreni dichiarati da ciascun ente; il Comune è evidenziato in ambra.</p>
        </div>
        <Fonte dataset={patrimonio} />
      </section>
    </div>
  );
}
