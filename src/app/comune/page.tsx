import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { LineChart } from "@/components/line-chart";
import { opencivitas, pagamenti, siope, siopeAnno, totaleProprio, ultimoAnnoSiope, type EnteSiope } from "@/lib/dati";
import { euro, euroCompatto, euroMln, nomeMese, numero, percentualeConSegno } from "@/lib/format";

export const metadata: Metadata = {
  title: "Il Comune: entrate e uscite",
  description: "Quanto incassa e quanto paga il Comune di Castellammare di Stabia, voce per voce, e come spende rispetto al fabbisogno standard.",
};

const SPIEGAZIONI: Record<string, string> = {
  "incassi:1": "IMU, TARI, addizionale IRPEF e fondo di solidarietà comunale",
  "incassi:2": "Contributi da Stato, Regione e altri enti per la gestione ordinaria",
  "incassi:3": "Multe, affitti, tariffe dei servizi, interessi",
  "incassi:4": "Contributi per investimenti, vendite di beni (PNRR compreso)",
  "incassi:6": "Nuovi mutui e prestiti",
  "incassi:9": "Soldi solo di passaggio: ritenute, depositi, IVA",
  "pagamenti:1": "Stipendi, servizi (rifiuti, pulizia, illuminazione), acquisti, contributi",
  "pagamenti:2": "Opere pubbliche, manutenzioni straordinarie, acquisto di beni durevoli",
  "pagamenti:4": "Rate dei mutui e dei prestiti (quota capitale)",
  "pagamenti:7": "Soldi solo di passaggio: ritenute versate, depositi restituiti",
};

function Titoli({ ente, tipo }: { ente: EnteSiope; tipo: "incassi" | "pagamenti" }) {
  const voci = ente.perTitolo.filter((t) => (t.centesimi ?? 0) > 0);
  return (
    <BarList
      label={tipo === "incassi" ? "Incassi per titolo" : "Pagamenti per titolo"}
      max={Math.max(...voci.map((t) => (t.centesimi ?? 0) / 100))}
      items={voci.map((t) => ({
        id: t.codice,
        label: t.voce,
        value: (t.centesimi ?? 0) / 100,
        display: euroMln((t.centesimi ?? 0) / 100),
        sub: SPIEGAZIONI[`${tipo}:${t.codice}`],
        alt: tipo === "pagamenti",
      }))}
    />
  );
}

export default function ComunePage() {
  const anno = ultimoAnnoSiope;
  const inc = siopeAnno("incassi", anno).castellammare;
  const pag = siopeAnno("pagamenti", anno).castellammare;
  const pop = pag.popolazione;
  const anniTabella = [...new Set(siope.anni.map((a) => a.anno))].sort();
  const serie = opencivitas.serie.filter((s) => s.castellammare);
  const ultimaOc = serie.at(-1)!;
  const funzioni = opencivitas.funzioni;

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Il Comune</p>
        <h1>Quanto entra e quanto esce dalle casse del Comune</h1>
        <p className="lead">
          Sono i movimenti di cassa registrati dalla tesoreria: i soldi davvero incassati e pagati nell&apos;anno, voce per voce.
          Nel {anno} il Comune ha pagato <strong>{euro(totaleProprio(pag, "pagamenti") / pop)}</strong> per ogni abitante.
        </p>
      </section>

      <div className="grid-3">
        <div className="panel figure">
          <span className="label">Incassi propri {anno}</span>
          <span className="value">{euroCompatto(totaleProprio(inc, "incassi"))}</span>
          <span className="exact">{euro(totaleProprio(inc, "incassi") / pop)} per abitante</span>
        </div>
        <div className="panel figure">
          <span className="label">Pagamenti propri {anno}</span>
          <span className="value">{euroCompatto(totaleProprio(pag, "pagamenti"))}</span>
          <span className="exact">{euro(totaleProprio(pag, "pagamenti") / pop)} per abitante</span>
        </div>
        <div className="panel figure">
          <span className="label">Abitanti considerati</span>
          <span className="value">{numero(pop)}</span>
          <span className="exact">popolazione usata dalla fonte SIOPE</span>
        </div>
      </div>
      <p className="note" style={{ marginTop: 8 }}>
        &quot;Propri&quot; significa al netto delle partite di giro, dei conti per terzi e dei movimenti ancora da regolarizzare, che
        sono soldi solo di passaggio.
      </p>

      <section className="section grid-2" aria-label={`Incassi e pagamenti ${anno}`}>
        <div className="panel">
          <h2>Da dove arrivano i soldi</h2>
          <p className="note">Incassi {anno} · totale {euroCompatto(inc.totaleCentesimi / 100)}</p>
          <Titoli ente={inc} tipo="incassi" />
        </div>
        <div className="panel">
          <h2>Come escono</h2>
          <p className="note">Pagamenti {anno} · totale {euroCompatto(pag.totaleCentesimi / 100)}</p>
          <Titoli ente={pag} tipo="pagamenti" />
        </div>
      </section>

      <section className="section">
        <h2>Anno per anno</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Voce</th>
                {anniTabella.map((a) => {
                  const y = siopeAnno("pagamenti", a);
                  return (
                    <th key={a} className="n">
                      {a}
                      {!y.completo && ` (gen-${nomeMese(y.ultimoMese).slice(0, 3)})`}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["incassi", "1", "Tributi"],
                  ["incassi", "2", "Trasferimenti correnti"],
                  ["incassi", "3", "Entrate extratributarie"],
                  ["incassi", "4", "Entrate per investimenti"],
                  ["pagamenti", "1", "Spese correnti"],
                  ["pagamenti", "2", "Investimenti"],
                  ["pagamenti", "4", "Rimborso prestiti"],
                ] as const
              ).map(([tipo, cod, label]) => (
                <tr key={`${tipo}${cod}`}>
                  <td>
                    {tipo === "incassi" ? "↓ " : "↑ "}
                    {label}
                  </td>
                  {anniTabella.map((a) => {
                    const t = siopeAnno(tipo, a).castellammare.perTitolo.find((x) => x.codice === cod);
                    return (
                      <td key={a} className="n">
                        {euroMln((t?.centesimi ?? 0) / 100)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <caption>↓ incassi · ↑ pagamenti. Il {anniTabella.at(-1)} è parziale: confrontalo con cautela con gli anni interi.</caption>
          </table>
        </div>
        <Fonte dataset={siope} />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Spesa rispetto al fabbisogno standard, negli anni</h2>
          <p>
            Spesa del Comune per le funzioni fondamentali, per abitante. Nel {ultimaOc.anno}:{" "}
            <strong>{euro(ultimaOc.castellammare.storicaPerAbitanteCentesimi / 100)}</strong> contro uno standard di{" "}
            {euro(ultimaOc.castellammare.standardPerAbitanteCentesimi / 100)} (
            {percentualeConSegno(ultimaOc.castellammare.differenzaPuntiBase / 100)}). Livello dei servizi:{" "}
            {numero(ultimaOc.castellammare.livelloServizi)}/10.
          </p>
        </div>
        <div className="panel">
          <p className="panel-title">Spesa storica per abitante</p>
          <LineChart
            label="Spesa del Comune per abitante nelle funzioni fondamentali, anni 2015-2022"
            punti={serie.map((s) => ({ x: s.anno, y: s.castellammare.storicaPerAbitanteCentesimi / 100, display: euro(s.castellammare.storicaPerAbitanteCentesimi / 100) }))}
            unita="euro"
          />
          <p className="note">Il 2020 non è pubblicato dalla fonte: la linea collega 2019 e 2021.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Voce (per abitante)</th>
                {funzioni.map((f) => (
                  <th key={f.anno} className="n">
                    {f.anno}
                  </th>
                ))}
                <th className="n">Standard {funzioni.at(-1)!.anno}</th>
              </tr>
            </thead>
            <tbody>
              {funzioni.at(-1)!.funzioni.map((f) => (
                <tr key={f.id}>
                  <td>{f.voce}</td>
                  {funzioni.map((y) => {
                    const v = y.funzioni.find((x) => x.id === f.id)?.castellammare;
                    return (
                      <td key={y.anno} className="n">
                        {v ? euro(v.storicaPerAbitanteCentesimi / 100) : "Non disponibile"}
                      </td>
                    );
                  })}
                  <td className="n">{euro(f.castellammare.standardPerAbitanteCentesimi / 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Fonte dataset={opencivitas} />
      </section>

      <Pagamenti />
    </div>
  );
}

const giorni = (n: number | null) => (n === null ? "Non disponibile" : `${n > 0 ? "+" : n < 0 ? "−" : ""}${numero(Math.abs(Math.round(n)))} giorni`);

/** Puntualità nei pagamenti ai fornitori e debito commerciale scaduto. */
function Pagamenti() {
  const cm = pagamenti.comuni.find((c) => c.ipa === "c_c129")!;
  const ultimo = cm.tempi.filter((t) => t.completo).at(-1)!;
  const vicini = pagamenti.comuni
    .map((c) => ({ nome: c.nome, me: c.ipa === "c_c129", t: c.tempi.find((t) => t.periodo === ultimo.periodo) }))
    .filter((x) => x.t && x.t.pagamentoGiorni !== null)
    .sort((a, b) => (a.t!.pagamentoGiorni as number) - (b.t!.pagamentoGiorni as number));
  return (
    <section className="section" id="pagamenti">
      <div className="section-head">
        <h2>Paga in tempo i fornitori?</h2>
        <p>
          Nel {ultimo.periodo} il Comune ha pagato le fatture in media <strong>{numero(Math.round(ultimo.pagamentoGiorni ?? 0))} giorni</strong> dopo
          averle ricevute, cioè {ultimo.ritardoGiorni !== null && ultimo.ritardoGiorni < 0 ? `${numero(Math.round(-ultimo.ritardoGiorni))} giorni prima` : `${giorni(ultimo.ritardoGiorni)} rispetto alla`} scadenza.
        </p>
      </div>
      <div className="grid-2">
        <div className="panel">
          <p className="panel-title">Giorni medi per pagare una fattura, {ultimo.periodo}</p>
          <BarList
            label="Tempo medio di pagamento, Comuni a confronto"
            items={vicini.map((x) => ({
              id: x.nome,
              label: x.me ? <strong>{x.nome}</strong> : x.nome,
              value: x.t!.pagamentoGiorni as number,
              display: `${numero(Math.round(x.t!.pagamentoGiorni as number))} giorni`,
              sub: `${giorni(x.t!.ritardoGiorni)} rispetto alla scadenza`,
              alt: x.me,
            }))}
          />
          <p className="note">Dal più veloce al più lento. Un numero negativo rispetto alla scadenza vuol dire che in media si paga in anticipo.</p>
        </div>
        <div className="panel">
          <p className="panel-title">Castellammare nel tempo</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fatture del</th>
                  <th className="n">Tempo di pagamento</th>
                  <th className="n">Rispetto alla scadenza</th>
                  <th className="n">Fatture</th>
                </tr>
              </thead>
              <tbody>
                {cm.tempi.map((t) => (
                  <tr key={t.periodo}>
                    <td>{t.periodo}</td>
                    <td className="n">{numero(Math.round(t.pagamentoGiorni ?? 0))} giorni</td>
                    <td className="n">{giorni(t.ritardoGiorni)}</td>
                    <td className="n">{numero(t.fatture)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Debito scaduto al</th>
                  <th className="n">Importo</th>
                  <th>Chi lo ha calcolato</th>
                </tr>
              </thead>
              <tbody>
                {cm.debito.map((x) => (
                  <tr key={x.periodo}>
                    <td>{x.periodo}</td>
                    <td className="n">{x.centesimi === null ? "Non disponibile" : euro(x.centesimi / 100)}</td>
                    <td>{x.tipo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <Fonte dataset={pagamenti} />
    </section>
  );
}
