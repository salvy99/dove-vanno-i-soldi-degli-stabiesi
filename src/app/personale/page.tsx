import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { LineChart } from "@/components/line-chart";
import { personale } from "@/lib/dati";
import { euro, euroCompatto, leggibile, numero, percentualeConSegno } from "@/lib/format";

export const metadata: Metadata = {
  title: "Chi lavora per il Comune",
  description: "Quanti dipendenti ha il Comune di Castellammare di Stabia dal 2010 a oggi e quanto costa il personale.",
};

export default function PersonalePage() {
  const d = personale.dipendenti;
  const primo = d[0];
  const ultimo = d.at(-1)!;
  const variazione = ((ultimo.tempoIndeterminato - primo.tempoIndeterminato) / primo.tempoIndeterminato) * 100;
  const costo = personale.costo2020.filter((c) => c.centesimi > 0);
  const totaleCosto = costo.reduce((a, c) => a + c.centesimi, 0) / 100;
  const principali = costo.slice(0, 10);

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Il Comune</p>
        <h1>Chi lavora per il Comune</h1>
        <p className="lead">
          Nel {ultimo.anno} il Comune aveva <strong>{numero(ultimo.tempoIndeterminato)} dipendenti stabili</strong>; nel {primo.anno} erano{" "}
          {numero(primo.tempoIndeterminato)} ({percentualeConSegno(variazione)}). A questi si aggiunge il lavoro flessibile: circa{" "}
          {numero(Math.round(ultimo.flessibili))} unità nel {ultimo.anno}.
        </p>
      </section>

      <section className="section">
        <div className="panel">
          <p className="panel-title">Dipendenti a tempo indeterminato al 31 dicembre</p>
          <LineChart
            label={`Dipendenti stabili del Comune dal ${primo.anno} al ${ultimo.anno}`}
            punti={d.map((r) => ({ x: r.anno, y: r.tempoIndeterminato, display: `${numero(r.tempoIndeterminato)} dipendenti` }))}
            unita="numero"
          />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Anno</th>
                <th className="n">Stabili</th>
                <th className="n">Flessibili</th>
                <th className="n">Donne</th>
                <th className="n">Uomini</th>
              </tr>
            </thead>
            <tbody>
              {[...d].reverse().map((r) => (
                <tr key={r.anno}>
                  <td>{r.anno}</td>
                  <td className="n">{numero(r.tempoIndeterminato)}</td>
                  <td className="n">{numero(Math.round(r.flessibili))}</td>
                  <td className="n">{numero(Math.round(r.donne))}</td>
                  <td className="n">{numero(Math.round(r.uomini))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Quanto costa il personale (2020)</h2>
          <p>
            Il dettaglio del costo del lavoro è pubblicato, per ora, solo per il 2020: <strong>{euroCompatto(totaleCosto)}</strong> in tutto,
            fra stipendi, contributi, IRAP e altre voci.
          </p>
        </div>
        <div className="panel">
          <BarList
            label="Principali voci del costo del personale nel 2020"
            items={principali.map((c) => ({ id: `${c.codice}-${c.contratto}`, label: leggibile(c.voce), value: c.centesimi / 100, display: euro(c.centesimi / 100) }))}
          />
          <details className="more">
            <summary>Tutte le {costo.length} voci</summary>
            <div className="table-wrap">
              <table>
                <tbody>
                  {costo.map((c) => (
                    <tr key={`${c.codice}-${c.contratto}`}>
                      <td>{leggibile(c.voce)}</td>
                      <td className="n">{euro(c.centesimi / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
        <Fonte dataset={personale} />
      </section>
    </div>
  );
}
