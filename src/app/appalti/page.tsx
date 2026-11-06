import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { appalti } from "@/lib/dati";
import { data, euro, euroCompatto, euroMln, leggibile, numero } from "@/lib/format";

export const metadata: Metadata = {
  title: "Appalti del Comune",
  description: "A chi il Comune di Castellammare di Stabia ha affidato lavori, servizi e forniture: aggiudicazioni ANAC con importi e operatori.",
};

export default function AppaltiPage() {
  const r = appalti.riepilogo;
  const totale = Number(r.awardValue);
  const top = appalti.fornitori
    .filter((f) => (f.importoAttribuitoCentesimi ?? 0) > 0)
    .sort((a, b) => (b.importoAttribuitoCentesimi ?? 0) - (a.importoAttribuitoCentesimi ?? 0))
    .slice(0, 12);
  const perCount = [...appalti.fornitori].sort((a, b) => b.aggiudicazioni - a.aggiudicazioni).slice(0, 8);

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Appalti</p>
        <h1>A chi affida lavori e servizi il Comune</h1>
        <p className="lead">
          {numero(r.awardCount)} aggiudicazioni per <strong>{euroCompatto(totale)}</strong> a {numero(r.awardeeCount)} operatori diversi,
          secondo la banca dati nazionale dei contratti pubblici. È l&apos;importo con cui l&apos;appalto è stato assegnato, non
          quanto è già stato pagato.
        </p>
      </section>

      <section className="section grid-2">
        <div className="panel">
          <h2>Gli operatori con gli importi più alti</h2>
          <BarList
            label="Operatori per importo aggiudicato"
            items={top.map((f) => ({
              id: f.nome,
              label: leggibile(f.nome),
              value: (f.importoAttribuitoCentesimi ?? 0) / 100,
              display: euroMln((f.importoAttribuitoCentesimi ?? 0) / 100),
              sub: `${f.aggiudicazioni} ${f.aggiudicazioni === 1 ? "aggiudicazione" : "aggiudicazioni"}`,
            }))}
          />
          <p className="note">
            {euroCompatto(Number(r.unattributedAwardValue))} riguardano appalti divisi fra più imprese o con identità non risolta:
            restano nel totale ma non sono attribuiti ai singoli operatori.
          </p>
        </div>
        <div className="panel">
          <h2>Gli operatori con più aggiudicazioni</h2>
          <BarList
            label="Operatori per numero di aggiudicazioni"
            items={perCount.map((f) => ({ id: f.nome, label: leggibile(f.nome), value: f.aggiudicazioni, display: numero(f.aggiudicazioni), alt: true }))}
          />
          <p className="callout">Una classifica descrive i dati: non indica irregolarità. Per capire un caso apri il CIG e leggi l&apos;atto.</p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Tutte le aggiudicazioni</h2>
          <p>Dalla più recente. Il CIG è il codice identificativo della gara: cercandolo sul portale ANAC trovi oggetto e procedura.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>CIG</th>
                <th>Aggiudicatario</th>
                <th className="n">Importo</th>
              </tr>
            </thead>
            <tbody>
              {appalti.aggiudicazioni.map((a) => (
                <tr key={`${a.cig}-${a.data}-${a.importoCentesimi}`}>
                  <td style={{ whiteSpace: "nowrap" }}>{data(a.data)}</td>
                  <td>
                    <a className="num" href={`https://dati.anticorruzione.it/superset/dashboard/dettaglio_cig/?cig=${a.cig}&standalone=2`}>
                      {a.cig}
                    </a>
                  </td>
                  <td>{a.fornitori.map(leggibile).join(" · ")}</td>
                  <td className="n">{euro((a.importoCentesimi ?? 0) / 100, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Fonte dataset={appalti} />
      </section>
    </div>
  );
}
