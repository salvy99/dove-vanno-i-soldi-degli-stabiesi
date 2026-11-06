import type { Metadata } from "next";
import { BarList } from "@/components/bar-list";
import { Fonte } from "@/components/fonte";
import { isComune, pnrr } from "@/lib/dati";
import { data, euro, euroCompatto, euroMln, leggibile, numero } from "@/lib/format";

export const metadata: Metadata = {
  title: "PNRR in città",
  description: "Tutti i progetti del Piano nazionale di ripresa e resilienza localizzati a Castellammare di Stabia, con importi, soggetti e stato.",
};

const attribuito = (p: (typeof pnrr.progetti)[number]) => (p.finanziamentoAttribuitoCentesimi ?? 0) / 100;

export default function PnrrPage() {
  const progetti = pnrr.progetti;
  const totale = progetti.reduce((a, p) => a + attribuito(p), 0);
  const delComune = progetti.filter((p) => isComune(p.soggettoAttuatore));
  const totComune = delComune.reduce((a, p) => a + attribuito(p), 0);
  const conclusi = progetti.filter((p) => p.stato === "Concluso").length;

  const perMissione = Object.values(
    progetti.reduce<Record<string, { nome: string; euro: number; n: number }>>((acc, p) => {
      const k = p.missioneDescrizione;
      acc[k] ??= { nome: k, euro: 0, n: 0 };
      acc[k].euro += attribuito(p);
      acc[k].n += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.euro - a.euro);

  const perSoggetto = Object.values(
    progetti.reduce<Record<string, { nome: string; euro: number; n: number }>>((acc, p) => {
      const k = p.soggettoAttuatore;
      acc[k] ??= { nome: k, euro: 0, n: 0 };
      acc[k].euro += attribuito(p);
      acc[k].n += 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.euro - a.euro)
    .slice(0, 10);

  const ordinati = [...progetti].sort((a, b) => attribuito(b) - attribuito(a));

  return (
    <div className="wrap">
      <section className="hero">
        <p className="kicker">Soldi che arrivano da fuori</p>
        <h1>Il PNRR a Castellammare</h1>
        <p className="lead">
          {numero(progetti.length)} progetti del Piano nazionale di ripresa e resilienza riguardano la città, per{" "}
          <strong>{euroCompatto(totale)}</strong> attribuiti a Castellammare. Il Comune ne gestisce {delComune.length}, per{" "}
          {euroCompatto(totComune)}; gli altri sono di scuole, Regione, ASL, ministeri e imprese.
        </p>
      </section>

      <div className="grid-3">
        <div className="panel figure">
          <span className="label">Finanziamento attribuito alla città</span>
          <span className="value">{euroCompatto(totale)}</span>
          <span className="exact">{euro(totale)}</span>
        </div>
        <div className="panel figure">
          <span className="label">Progetti gestiti dal Comune</span>
          <span className="value">{euroCompatto(totComune)}</span>
          <span className="exact">{delComune.length} progetti</span>
        </div>
        <div className="panel figure">
          <span className="label">Stato dei progetti</span>
          <span className="value">
            {conclusi} conclusi
          </span>
          <span className="exact">{progetti.length - conclusi} in corso</span>
        </div>
      </div>

      <section className="section grid-2">
        <div className="panel">
          <h2>Per obiettivo del Piano</h2>
          <BarList label="Finanziamento PNRR per missione" items={perMissione.map((m) => ({ id: m.nome, label: m.nome, value: m.euro, display: euroMln(m.euro), sub: `${m.n} ${m.n === 1 ? "progetto" : "progetti"}` }))} />
        </div>
        <div className="panel">
          <h2>Chi gestisce i progetti</h2>
          <BarList
            label="Primi dieci soggetti attuatori"
            items={perSoggetto.map((s) => ({ id: s.nome, label: leggibile(s.nome), value: s.euro, display: euroMln(s.euro), sub: `${s.n} ${s.n === 1 ? "progetto" : "progetti"}`, alt: isComune(s.nome) }))}
          />
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Tutti i progetti</h2>
          <p>
            Le righe in giallo, con l&apos;etichetta <span className="tag up">Comune</span>, sono i progetti che il Comune di
            Castellammare gestisce direttamente: ne risponde l&apos;amministrazione comunale. Gli altri li gestiscono ministeri,
            Regione, scuole e altri enti.
          </p>
          <p>In ordine di importo attribuito a Castellammare. Con il codice CUP ritrovi ogni progetto su OpenCUP.</p>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Progetto</th>
                <th>Chi lo gestisce</th>
                <th className="n">A Castellammare</th>
                <th className="n">Totale progetto</th>
                <th>Stato</th>
                <th>Fine prevista</th>
              </tr>
            </thead>
            <tbody>
              {ordinati.map((p) => (
                <tr key={`${p.cup}-${p.titolo}-${p.soggettoAttuatore}`} className={isComune(p.soggettoAttuatore) ? "me" : undefined}>
                  <td style={{ minWidth: 260 }}>
                    {leggibile(p.titolo)}
                    <div className="note">
                      {isComune(p.soggettoAttuatore) && <span className="tag up">Comune</span>}
                      {p.submisura} ·{" "}
                      <a href={`https://www.opencup.gov.it/portale/web/opencup/home/progetto/-/cup/${p.cup}`}>CUP {p.cup}</a>
                    </div>
                  </td>
                  <td style={{ minWidth: 180 }}>{leggibile(p.soggettoAttuatore)}</td>
                  <td className="n">{euro(attribuito(p))}</td>
                  <td className="n">
                    {euro((p.finanziamentoTotaleCentesimi ?? 0) / 100)}
                    {p.localizzazioni > 1 && <div className="note">{p.localizzazioni} Comuni</div>}
                  </td>
                  <td>{p.stato}</td>
                  <td>{data(p.fineEffettiva ?? p.finePrevista)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Fonte dataset={pnrr} />
      </section>
    </div>
  );
}
