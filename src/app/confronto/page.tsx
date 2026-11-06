import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { irpef, opencivitas, redditoMedio, siope, siopeAnno, titolo, totaleProprio, ultimoAnnoSiope } from "@/lib/dati";
import { euro, numero, percentualeConSegno } from "@/lib/format";

export const metadata: Metadata = {
  title: "Confronto con i Comuni vicini",
  description: "Castellammare di Stabia confrontata con dodici Comuni vicini o di dimensione simile: spesa, tributi, servizi e redditi.",
};

export default function ConfrontoPage() {
  const anno = ultimoAnnoSiope;
  const pag = siopeAnno("pagamenti", anno);
  const inc = siopeAnno("incassi", anno);
  const ocAnno = opencivitas.serie.at(-1)!.anno;
  const ocCm = opencivitas.serie.at(-1)!.castellammare;

  const righe = [
    { nome: "Castellammare di Stabia", me: true, p: pag.castellammare, i: inc.castellammare, oc: ocCm, irpef: irpef.castellammare },
    ...pag.confronto.map((p) => ({
      nome: p.nome,
      me: false,
      p,
      i: inc.confronto.find((x) => x.nome === p.nome)!,
      oc: opencivitas.confronto2022.find((x) => x.nome === p.nome)!,
      irpef: irpef.confronto.find((x) => x.nome.toUpperCase() === p.nome.toUpperCase())!,
    })),
  ].map((r) => ({
    nome: r.nome,
    me: r.me,
    abitanti: r.p.popolazione,
    spesaAb: totaleProprio(r.p, "pagamenti") / r.p.popolazione,
    correnteAb: titolo(r.p, "1") / r.p.popolazione,
    tributiAb: titolo(r.i, "1") / r.i.popolazione,
    scarto: r.oc ? r.oc.differenzaPuntiBase / 100 : null,
    servizi: r.oc?.livelloServizi ?? null,
    reddito: redditoMedio(r.irpef),
  }));

  const perSpesa = [...righe].sort((a, b) => b.correnteAb - a.correnteAb);

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Confronto</p>
        <h1>Castellammare e i Comuni vicini</h1>
        <p className="lead">
          Dodici Comuni della Città metropolitana di Napoli, vicini o di dimensioni simili. Tutti i valori sono per abitante, così
          puoi confrontare città grandi e piccole.
        </p>
      </section>

      <section className="section">
        <div className="panel">
          <h2>Spesa corrente per abitante, {anno}</h2>
          <p className="note">Stipendi, servizi, acquisti e contributi pagati nell&apos;anno, diviso per gli abitanti.</p>
          <BarList
            label={`Spesa corrente per abitante ${anno}`}
            items={perSpesa.map((r) => ({ id: r.nome, label: r.me ? <strong>{r.nome}</strong> : r.nome, value: r.correnteAb, display: euro(r.correnteAb), alt: r.me }))}
          />
        </div>
      </section>

      <section className="section">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Comune</th>
                <th className="n">Abitanti</th>
                <th className="n">Pagamenti propri / ab. {anno}</th>
                <th className="n">Tributi incassati / ab. {anno}</th>
                <th className="n">Spesa vs standard {ocAnno}</th>
                <th className="n">Servizi {ocAnno} (0-10)</th>
                <th className="n">Reddito medio {irpef.annoImposta}</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.nome} className={r.me ? "me" : undefined}>
                  <td>{r.nome}</td>
                  <td className="n">{numero(r.abitanti)}</td>
                  <td className="n">{euro(r.spesaAb)}</td>
                  <td className="n">{euro(r.tributiAb)}</td>
                  <td className="n">{r.scarto === null ? "Non disponibile" : percentualeConSegno(r.scarto)}</td>
                  <td className="n">{numero(r.servizi)}</td>
                  <td className="n">{euro(r.reddito)}</td>
                </tr>
              ))}
            </tbody>
            <caption>
              Spesa vs standard: differenza tra spesa storica e fabbisogno standard nelle funzioni fondamentali. Servizi: livello
              OpenCivitas rispetto ai Comuni della stessa fascia.
            </caption>
          </table>
        </div>
        <Fonte dataset={siope} avvertenze={false} />
        <Fonte dataset={opencivitas} avvertenze={false} />
        <Fonte dataset={irpef} avvertenze={false} />
      </section>
    </div>
  );
}
